import { eq, and, or, like, desc, count, ne } from "drizzle-orm";
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
      const slug = generateSlug(data.name);

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

      // Create the initial flow (flows are top-level)
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
        organizationId: data.organizationId,
        createdBy,
      };

      await db.insert(schema.flow).values(newFlow);

      return {
        ...newFlow,
        slug,
        organizationId: data.organizationId,
        teamId: undefined,
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
        organizationId: schema.flow.organizationId,
      })
      .from(schema.flow)
      .where(eq(schema.flow.id, flowId))
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0] as any;
    const memberRole = row.createdBy === userId ? 'owner' : 'viewer';
    const slug = generateSlug(row.name);

    return {
      ...row,
      slug,
      memberRole,
      description: row.description ?? undefined,
      teamId: undefined,
      publishedAt: row.publishedAt ?? undefined,
      metadata: row.metadata ?? undefined,
      config: row.config ?? undefined,
    } as Flow;
  }

  async getFlowByAlias(alias: string, userId: string): Promise<Flow | null> {
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
        organizationId: schema.flow.organizationId,
      })
      .from(schema.flow)
      .where(eq(schema.flow.alias, alias))
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0] as any;
    const memberRole = row.createdBy === userId ? 'owner' : 'viewer';
    const slug = generateSlug(row.name);

    return {
      ...row,
      slug,
      memberRole,
      description: row.description ?? undefined,
      teamId: undefined,
      publishedAt: row.publishedAt ?? undefined,
      metadata: row.metadata ?? undefined,
      config: row.config ?? undefined,
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
      conditions.push(eq(schema.flow.organizationId, options.organizationId));
    }

    if (options.search) {
      conditions.push(
        or(
          like(schema.flow.name, `%${options.search}%`),
          like(schema.flow.description, `%${options.search}%`),
          like(schema.flow.alias, `%${options.search}%`)
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
        organizationId: schema.flow.organizationId,
      })
      .from(schema.flow);

    const queryWithConditions = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    const results = await queryWithConditions
      .orderBy(desc(schema.flow.updatedAt))
      .limit(options.limit)
      .offset(options.offset);

    // Convert null to undefined for optional fields
    return results.map((row: any) => ({
      ...row,
      slug: generateSlug(row.name),
      memberRole: row.createdBy === userId ? 'owner' : 'viewer',
      description: row.description ?? undefined,
      teamId: undefined,
      publishedAt: row.publishedAt ?? undefined,
      metadata: row.metadata ?? undefined,
      config: row.config ?? undefined,
    })) as Flow[];
  }

  async updateFlow(
    flowId: string,
    updateData: {
      name?: string;
      description?: string;
      alias?: string;
      status?: "draft" | "published" | "archived";
      config?: any;
      deploymentSettings?: any;
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

    // Check if alias is unique within the organization (if being updated)
    if (updateData.alias && updateData.alias !== existingFlow.alias) {
      const existingAliasFlows = await db
        .select({ id: schema.flow.id })
        .from(schema.flow)
        .where(
          and(
            eq(schema.flow.alias, updateData.alias),
            eq(schema.flow.organizationId, existingFlow.organizationId),
            ne(schema.flow.id, flowId)
          )
        )
        .limit(1);

      if (existingAliasFlows.length > 0) {
        throw new Error("Flow alias must be unique within the organization");
      }
    }

    // Prepare update object with only provided fields
    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (updateData.name !== undefined) updateFields.name = updateData.name;
    if (updateData.description !== undefined) updateFields.description = updateData.description;
    if (updateData.alias !== undefined) updateFields.alias = updateData.alias;
    if (updateData.status !== undefined) updateFields.status = updateData.status;
    if (updateData.config !== undefined) updateFields.config = updateData.config;
    if (updateData.deploymentSettings !== undefined) updateFields.deploymentSettings = updateData.deploymentSettings;

    // Update the flow
    await db
      .update(schema.flow)
      .set(updateFields)
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

    await db.delete(schema.flow).where(eq(schema.flow.id, flowId));
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

  // Member management methods - placeholder implementations
  async addFlowMember(
    flowId: string,
    memberData: {
      userId?: string;
      email?: string;
      role: string;
    },
    requestingUserId: string
  ): Promise<any> {
    // For now, return a placeholder - flows don't have traditional member management
    throw new NotFoundError("Flow member management not implemented in this version");
  }

  async updateFlowMemberRole(
    flowId: string,
    memberId: string,
    role: string,
    requestingUserId: string
  ): Promise<any> {
    // For now, return a placeholder - flows don't have traditional member management
    throw new NotFoundError("Flow member management not implemented in this version");
  }

  async removeFlowMember(
    flowId: string,
    memberId: string,
    requestingUserId: string
  ): Promise<void> {
    // For now, return a placeholder - flows don't have traditional member management
    throw new NotFoundError("Flow member management not implemented in this version");
  }
}

export const flowService = new FlowService();
