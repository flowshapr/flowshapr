import { eq, and, or, like, desc, count } from "drizzle-orm";
import { db } from "../../../infrastructure/database/connection";
import * as schema from "../../../infrastructure/database/schema/index";
import { generateId, generateSlug } from "../../../shared/utils/crypto";
import { ConflictError, NotFoundError, ForbiddenError } from "../../../shared/utils/errors";
import { Flow, FlowMember } from "../types";

export class FlowService {
  async createFlow(
    data: {
      name: string;
      alias: string;
      description?: string;
      organizationId: string;
      teamId?: string;
    },
    createdBy: string
  ): Promise<Flow> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    try {
      let slug = generateSlug(data.name);

      // Ensure slug is unique within the organization
      let counter = 1;
      let originalSlug = slug;
      
      while (true) {
        const existingFlow = await db
          .select()
          .from(schema.project)
          .where(
            and(
              eq(schema.project.slug, slug),
              eq(schema.project.organizationId, data.organizationId)
            )
          )
          .limit(1);

        if (existingFlow.length === 0) break;
        slug = `${originalSlug}-${counter}`;
        counter++;
      }

      // Check if alias is unique within the organization
      const existingAlias = await db
        .select()
        .from(schema.flow)
        .where(
          and(
            eq(schema.flow.alias, data.alias),
            eq(schema.flow.organizationId, data.organizationId)
          )
        )
        .limit(1);

      if (existingAlias.length > 0) {
        throw new ConflictError(`Flow with alias '${data.alias}' already exists in this organization`);
      }

      // First create the project (workspace)
      const projectId = generateId();
      const newProject = {
        id: projectId,
        name: data.name,
        slug,
        description: data.description,
        organizationId: data.organizationId,
        teamId: data.teamId,
        createdBy,
      };

      await db.insert(schema.project).values(newProject);

      // Then create the initial flow within the project
      const flowId = generateId();
      const newFlow = {
        id: flowId,
        name: data.name,
        alias: data.alias,
        description: data.description,
        version: "1.0.0",
        isLatest: true,
        status: "draft" as const,
        nodes: [],
        edges: [],
        metadata: {},
        config: {},
        projectId,
        organizationId: data.organizationId,
        createdBy,
      };

      await db.insert(schema.flow).values(newFlow);

      // Add creator as owner of the project
      await db.insert(schema.projectMember).values({
        id: generateId(),
        role: "owner",
        projectId,
        userId: createdBy,
      });

      return {
        ...newFlow,
        slug,
        organizationId: data.organizationId,
        teamId: data.teamId,
        createdAt: new Date(),
        updatedAt: new Date(),
        memberRole: "owner",
      };
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new ConflictError("Flow with this name already exists in the organization");
      }
      throw error;
    }
  }

  async getFlowById(flowId: string, userId: string): Promise<Flow | null> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    const result = await db
      .select({
        id: schema.flow.id,
        name: schema.flow.name,
        alias: schema.flow.alias,
        description: schema.flow.description,
        version: schema.flow.version,
        isLatest: schema.flow.isLatest,
        status: schema.flow.status,
        nodes: schema.flow.nodes,
        edges: schema.flow.edges,
        metadata: schema.flow.metadata,
        config: schema.flow.config,
        createdAt: schema.flow.createdAt,
        updatedAt: schema.flow.updatedAt,
        publishedAt: schema.flow.publishedAt,
        createdBy: schema.flow.createdBy,
        projectId: schema.flow.projectId,
        slug: schema.project.slug,
        organizationId: schema.project.organizationId,
        teamId: schema.project.teamId,
        memberRole: schema.projectMember.role,
      })
      .from(schema.flow)
      .innerJoin(schema.project, eq(schema.flow.projectId, schema.project.id))
      .leftJoin(
        schema.projectMember,
        and(
          eq(schema.projectMember.projectId, schema.project.id),
          eq(schema.projectMember.userId, userId)
        )
      )
      .where(eq(schema.flow.id, flowId))
      .limit(1);

    if (result.length === 0 || !result[0].memberRole) {
      return null;
    }

    // Convert null to undefined for optional fields
    return {
      ...result[0],
      description: result[0].description ?? undefined,
      teamId: result[0].teamId ?? undefined,
      publishedAt: result[0].publishedAt ?? undefined,
      metadata: result[0].metadata ?? undefined,
      config: result[0].config ?? undefined,
    } as Flow;
  }

  async getUserFlows(
    userId: string,
    options: {
      organizationId?: string;
      teamId?: string;
      search?: string;
      limit: number;
      offset: number;
    }
  ): Promise<Flow[]> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Apply filters
    const conditions = [];

    if (options.organizationId) {
      conditions.push(
        eq(schema.project.organizationId, options.organizationId)
      );
    }

    if (options.teamId) {
      conditions.push(eq(schema.project.teamId, options.teamId));
    }

    if (options.search) {
      conditions.push(
        or(
          like(schema.flow.name, `%${options.search}%`),
          like(schema.flow.description, `%${options.search}%`)
        )
      );
    }

    const baseQuery = db
      .select({
        id: schema.flow.id,
        name: schema.flow.name,
        alias: schema.flow.alias,
        description: schema.flow.description,
        version: schema.flow.version,
        isLatest: schema.flow.isLatest,
        status: schema.flow.status,
        nodes: schema.flow.nodes,
        edges: schema.flow.edges,
        metadata: schema.flow.metadata,
        config: schema.flow.config,
        createdAt: schema.flow.createdAt,
        updatedAt: schema.flow.updatedAt,
        publishedAt: schema.flow.publishedAt,
        createdBy: schema.flow.createdBy,
        projectId: schema.flow.projectId,
        slug: schema.project.slug,
        organizationId: schema.project.organizationId,
        teamId: schema.project.teamId,
        memberRole: schema.projectMember.role,
      })
      .from(schema.flow)
      .innerJoin(schema.project, eq(schema.flow.projectId, schema.project.id))
      .innerJoin(
        schema.projectMember,
        and(
          eq(schema.projectMember.projectId, schema.project.id),
          eq(schema.projectMember.userId, userId)
        )
      );

    const queryWithConditions = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    const results = await queryWithConditions
      .orderBy(desc(schema.flow.updatedAt))
      .limit(options.limit)
      .offset(options.offset);

    // Convert null to undefined for optional fields
    return results.map(result => ({
      ...result,
      description: result.description ?? undefined,
      teamId: result.teamId ?? undefined,
      publishedAt: result.publishedAt ?? undefined,
      metadata: result.metadata ?? undefined,
      config: result.config ?? undefined,
    })) as Flow[];
  }

  async updateFlow(
    flowId: string,
    updateData: {
      name?: string;
      description?: string;
    },
    userId: string
  ): Promise<Flow> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Check if user has permission to update
    const existingFlow = await this.getFlowById(flowId, userId);
    if (!existingFlow) {
      throw new NotFoundError("Flow not found or you don't have access to it");
    }

    if (!["owner", "admin", "developer"].includes(existingFlow.memberRole)) {
      throw new ForbiddenError("You don't have permission to update this flow");
    }

    // Generate new slug if name is being updated
    let slug = existingFlow.slug;
    if (updateData.name && updateData.name !== existingFlow.name) {
      slug = generateSlug(updateData.name);
      
      // Ensure slug is unique within the organization
      let counter = 1;
      let originalSlug = slug;
      
      while (true) {
        const existingWithSlug = await db
          .select()
          .from(schema.project)
          .where(
            and(
              eq(schema.project.slug, slug),
              eq(schema.project.organizationId, existingFlow.organizationId)
            )
          )
          .limit(1);

        if (existingWithSlug.length === 0 || existingWithSlug[0].id === flowId) break;
        slug = `${originalSlug}-${counter}`;
        counter++;
      }
    }

    // Update both project and flow tables
    await db
      .update(schema.project)
      .set({
        name: updateData.name || existingFlow.name,
        slug,
        description: updateData.description,
        updatedAt: new Date(),
      })
      .where(eq(schema.project.id, existingFlow.projectId));

    await db
      .update(schema.flow)
      .set({
        name: updateData.name || existingFlow.name,
        description: updateData.description,
        updatedAt: new Date(),
      })
      .where(eq(schema.flow.id, flowId));

    const updatedFlow = await this.getFlowById(flowId, userId);
    if (!updatedFlow) {
      throw new Error("Failed to retrieve updated flow");
    }
    return updatedFlow;
  }

  async deleteFlow(flowId: string, userId: string): Promise<void> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    const flow = await this.getFlowById(flowId, userId);
    if (!flow) {
      throw new NotFoundError("Flow not found or you don't have access to it");
    }

    if (flow.memberRole !== "owner") {
      throw new ForbiddenError("Only flow owners can delete flows");
    }

    // Get projectId first
    const projectId = (flow as any).projectId;
    if (projectId) {
      await db.delete(schema.project).where(eq(schema.project.id, projectId));
    }
  }

  // Flow definition methods
  async saveFlowDefinition(
    flowId: string,
    definition: {
      nodes: any[];
      edges: any[];
      metadata?: any;
    },
    userId: string
  ): Promise<Flow> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    const flow = await this.getFlowById(flowId, userId);
    if (!flow) {
      throw new NotFoundError("Flow not found or you don't have access to it");
    }

    if (!["owner", "admin", "developer"].includes(flow.memberRole)) {
      throw new ForbiddenError("You don't have permission to update this flow");
    }

    await db
      .update(schema.flow)
      .set({
        nodes: definition.nodes,
        edges: definition.edges,
        metadata: { ...flow.metadata, ...definition.metadata },
        updatedAt: new Date(),
      })
      .where(eq(schema.flow.id, flowId));

    const updatedFlow = await this.getFlowById(flowId, userId);
    if (!updatedFlow) {
      throw new Error("Failed to retrieve updated flow");
    }
    return updatedFlow;
  }

  async publishFlow(
    flowId: string,
    options: {
      version?: string;
      changelog?: string;
    },
    userId: string
  ): Promise<Flow> {
    if (!db) {
      throw new Error("Database connection not available");
    }

    const flow = await this.getFlowById(flowId, userId);
    if (!flow) {
      throw new NotFoundError("Flow not found or you don't have access to it");
    }

    if (!["owner", "admin"].includes(flow.memberRole)) {
      throw new ForbiddenError("You don't have permission to publish this flow");
    }

    // Create a new version if specified
    if (options.version && options.version !== flow.version) {
      // Create version record
      await db.insert(schema.flowVersion).values({
        id: generateId(),
        version: flow.version,
        changelog: `Previous version: ${flow.version}`,
        nodes: flow.nodes,
        edges: flow.edges,
        metadata: flow.metadata,
        config: flow.config,
        flowId,
        createdBy: userId,
      });

      // Update current flow
      await db
        .update(schema.flow)
        .set({
          version: options.version,
          status: "published",
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.flow.id, flowId));
    } else {
      // Just publish current version
      await db
        .update(schema.flow)
        .set({
          status: "published",
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.flow.id, flowId));
    }

    const updatedFlow = await this.getFlowById(flowId, userId);
    if (!updatedFlow) {
      throw new Error("Failed to retrieve updated flow");
    }
    return updatedFlow;
  }

  // Member management methods (delegated to project methods for now)
  async addFlowMember(
    flowId: string,
    memberData: { userId?: string; email?: string; role: string },
    currentUserId: string
  ): Promise<FlowMember> {
    // For now, delegate to project member methods
    // In the future, we might want flow-specific member management
    throw new Error("Flow member management not yet implemented");
  }

  async updateFlowMemberRole(
    flowId: string,
    memberId: string,
    role: string,
    currentUserId: string
  ): Promise<FlowMember> {
    throw new Error("Flow member management not yet implemented");
  }

  async removeFlowMember(
    flowId: string,
    memberId: string,
    currentUserId: string
  ): Promise<void> {
    throw new Error("Flow member management not yet implemented");
  }
}

export const flowService = new FlowService();