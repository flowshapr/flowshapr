import { db } from "../../../infrastructure/database/connection";
import * as schema from "../../../infrastructure/database/schema";
import { eq, and, ilike, desc, asc, count } from "drizzle-orm";
import { ConflictError, NotFoundError } from "../../../shared/utils/errors";
import { generateId, generateToken, hashToken } from "../../../shared/utils/crypto";
import { 
  CreateProjectData, 
  UpdateProjectData, 
  ProjectWithMembers,
  InviteProjectMemberData 
} from "../types";

export class ProjectService {
  private generateProjectId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateMemberId(): string {
    return `pm_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  async createProject(data: CreateProjectData, createdBy: string): Promise<any> {
    if (!db) {
      throw new Error("Database not available");
    }

    try {
      const projectId = this.generateProjectId();
      let slug = data.name ? this.generateSlug(data.name) : projectId;
      
      // Ensure slug is unique within the organization
      let slugCounter = 1;
      let finalSlug = slug;
      
      while (true) {
        const existingProject = await db
          .select()
          .from(schema.project)
          .where(and(
            eq(schema.project.slug, finalSlug),
            eq(schema.project.organizationId, data.organizationId)
          ))
          .limit(1);

        if (existingProject.length === 0) break;
        
        finalSlug = `${slug}-${slugCounter}`;
        slugCounter++;
      }

      // Create project
      const newProject = await db
        .insert(schema.project)
        .values({
          id: projectId,
          name: data.name,
          slug: finalSlug,
          description: data.description || null,
          settings: data.settings || null,
          organizationId: data.organizationId,
          teamId: data.teamId || null,
          createdBy,
        })
        .returning();

      // Add creator as owner
      await db
        .insert(schema.projectMember)
        .values({
          id: this.generateMemberId(),
          projectId,
          userId: createdBy,
          role: 'owner',
        });

      return newProject[0];
    } catch (error: any) {
      if (error instanceof ConflictError || error instanceof NotFoundError) {
        throw error;
      }
      console.error("Project creation error:", error);
      throw new Error("Failed to create project. Please try again.");
    }
  }

  async getProjectById(id: string, userId: string): Promise<ProjectWithMembers | null> {
    if (!db) {
      throw new Error("Database not available");
    }

    try {
      // Get project with member check
      const projects = await db
        .select({
          id: schema.project.id,
          name: schema.project.name,
          slug: schema.project.slug,
          description: schema.project.description,
          settings: schema.project.settings,
          createdAt: schema.project.createdAt,
          updatedAt: schema.project.updatedAt,
          organizationId: schema.project.organizationId,
          teamId: schema.project.teamId,
          createdBy: schema.project.createdBy,
        })
        .from(schema.project)
        .leftJoin(schema.projectMember, eq(schema.projectMember.projectId, schema.project.id))
        .where(and(
          eq(schema.project.id, id),
          eq(schema.projectMember.userId, userId) // User must be a member
        ))
        .limit(1);

      if (projects.length === 0) {
        return null;
      }

      const project = projects[0];

      // Get all project members
      const members = await db
        .select({
          id: schema.projectMember.id,
          role: schema.projectMember.role,
          joinedAt: schema.projectMember.joinedAt,
          user: {
            id: schema.user.id,
            name: schema.user.name,
            email: schema.user.email,
            image: schema.user.image,
          },
        })
        .from(schema.projectMember)
        .innerJoin(schema.user, eq(schema.user.id, schema.projectMember.userId))
        .where(eq(schema.projectMember.projectId, id))
        .orderBy(asc(schema.projectMember.joinedAt));

      // Get resource counts
      const [flowCount] = await db
        .select({ count: count() })
        .from(schema.flow)
        .where(eq(schema.flow.projectId, id));

      const [promptCount] = await db
        .select({ count: count() })
        .from(schema.prompt)
        .where(eq(schema.prompt.projectId, id));

      const [datasetCount] = await db
        .select({ count: count() })
        .from(schema.dataset)
        .where(eq(schema.dataset.projectId, id));

      const [apiKeyCount] = await db
        .select({ count: count() })
        .from(schema.apiKey)
        .where(eq(schema.apiKey.projectId, id));

      return {
        ...project,
        description: project.description ?? undefined,
        settings: project.settings ?? undefined,
        teamId: project.teamId ?? undefined,
        members: members.map(m => ({
          id: m.id,
          role: m.role as string,
          joinedAt: m.joinedAt,
          user: {
            ...m.user,
            image: m.user.image ?? undefined,
          },
        })),
        _count: {
          flows: flowCount.count,
          prompts: promptCount.count,
          datasets: datasetCount.count,
          apiKeys: apiKeyCount.count,
        },
      } as ProjectWithMembers;
    } catch (error: any) {
      console.error("Get project error:", error);
      throw new Error("Failed to retrieve project.");
    }
  }

  async getUserProjects(
    userId: string, 
    options: {
      organizationId?: string;
      teamId?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<any[]> {
    if (!db) {
      throw new Error("Database not available");
    }

    try {
      // Build filter conditions
      const conditions = [eq(schema.projectMember.userId, userId)];
      
      if (options.organizationId) {
        conditions.push(eq(schema.project.organizationId, options.organizationId));
      }

      if (options.teamId) {
        conditions.push(eq(schema.project.teamId, options.teamId));
      }

      if (options.search) {
        conditions.push(ilike(schema.project.name, `%${options.search}%`));
      }

      const query = db
        .select({
          id: schema.project.id,
          name: schema.project.name,
          slug: schema.project.slug,
          description: schema.project.description,
          createdAt: schema.project.createdAt,
          updatedAt: schema.project.updatedAt,
          organizationId: schema.project.organizationId,
          teamId: schema.project.teamId,
          memberRole: schema.projectMember.role,
        })
        .from(schema.project)
        .innerJoin(schema.projectMember, eq(schema.projectMember.projectId, schema.project.id))
        .where(and(...conditions))
        .orderBy(desc(schema.project.updatedAt))
        .limit(options.limit || 50)
        .offset(options.offset || 0);

      return await query;
    } catch (error: any) {
      console.error("Get user projects error:", error);
      throw new Error("Failed to retrieve projects.");
    }
  }

  // Access Tokens (API Keys)
  private generateApiKeyId(): string {
    return `ak_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  async listApiKeys(projectId: string, userId: string) {
    if (!db) throw new Error("Database not available");
    // Ensure membership
    const project = await this.getProjectById(projectId, userId);
    if (!project) throw new NotFoundError("Project not found or access denied");

    const keys = await db
      .select({
        id: schema.apiKey.id,
        name: schema.apiKey.name,
        prefix: schema.apiKey.prefix,
        scopes: schema.apiKey.scopes,
        rateLimit: schema.apiKey.rateLimit,
        isActive: schema.apiKey.isActive,
        lastUsedAt: schema.apiKey.lastUsedAt,
        usageCount: schema.apiKey.usageCount,
        expiresAt: schema.apiKey.expiresAt,
        createdAt: schema.apiKey.createdAt,
      })
      .from(schema.apiKey)
      .where(and(eq(schema.apiKey.projectId, projectId), eq(schema.apiKey.isActive, true)));
    return keys;
  }

  async createApiKey(projectId: string, data: { name: string; scopes?: string[]; rateLimit?: number; expiresAt?: string }, userId: string) {
    if (!db) throw new Error("Database not available");
    const project = await this.getProjectById(projectId, userId);
    if (!project) throw new NotFoundError("Project not found or access denied");

    const rawToken = `fs_${generateToken()}`;
    const tokenHash = hashToken(rawToken);
    const keyId = this.generateApiKeyId();
    const prefix = rawToken.slice(0, 8);

    const inserted = await db
      .insert(schema.apiKey)
      .values({
        id: keyId,
        name: data.name,
        key: tokenHash,
        prefix,
        scopes: data.scopes || [],
        rateLimit: data.rateLimit || null,
        isActive: true,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        projectId,
        createdBy: userId,
      })
      .returning({ id: schema.apiKey.id, prefix: schema.apiKey.prefix, name: schema.apiKey.name });

    return { id: inserted[0].id, name: inserted[0].name, prefix: inserted[0].prefix, token: rawToken };
  }

  async revokeApiKey(projectId: string, keyId: string, userId: string) {
    if (!db) throw new Error("Database not available");
    const project = await this.getProjectById(projectId, userId);
    if (!project) throw new NotFoundError("Project not found or access denied");

    await db
      .update(schema.apiKey)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.apiKey.projectId, projectId), eq(schema.apiKey.id, keyId)));
    return { success: true };
  }

  async updateProject(
    id: string, 
    data: UpdateProjectData, 
    userId: string
  ): Promise<any> {
    if (!db) {
      throw new Error("Database not available");
    }

    try {
      const updatedProject = await db
        .update(schema.project)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(schema.project.id, id))
        .returning();

      if (updatedProject.length === 0) {
        throw new NotFoundError("Project not found");
      }

      return updatedProject[0];
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error("Update project error:", error);
      throw new Error("Failed to update project.");
    }
  }

  async deleteProject(id: string, userId: string): Promise<void> {
    if (!db) {
      throw new Error("Database not available");
    }

    try {
      const deletedProject = await db
        .delete(schema.project)
        .where(eq(schema.project.id, id))
        .returning();

      if (deletedProject.length === 0) {
        throw new NotFoundError("Project not found");
      }
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error("Delete project error:", error);
      throw new Error("Failed to delete project.");
    }
  }

  async addProjectMember(
    projectId: string, 
    data: { userId?: string; email?: string; role: string },
    invitedBy: string
  ): Promise<any> {
    if (!db) {
      throw new Error("Database not available");
    }

    try {
      let targetUserId = data.userId;

      // If email provided instead of userId, find the user
      if (data.email && !targetUserId) {
        const users = await db
          .select()
          .from(schema.user)
          .where(eq(schema.user.email, data.email))
          .limit(1);

        if (users.length === 0) {
          throw new NotFoundError("User with this email not found");
        }
        targetUserId = users[0].id;
      }

      if (!targetUserId) {
        throw new Error("User ID is required");
      }

      // Check if user is already a member
      const existingMember = await db
        .select()
        .from(schema.projectMember)
        .where(and(
          eq(schema.projectMember.projectId, projectId),
          eq(schema.projectMember.userId, targetUserId)
        ))
        .limit(1);

      if (existingMember.length > 0) {
        throw new ConflictError("User is already a member of this project");
      }

      // Add member
      const newMember = await db
        .insert(schema.projectMember)
        .values({
          id: this.generateMemberId(),
          projectId,
          userId: targetUserId,
          role: data.role as any,
          invitedBy,
        })
        .returning();

      // Get member with user details
      const memberWithUser = await db
        .select({
          id: schema.projectMember.id,
          role: schema.projectMember.role,
          joinedAt: schema.projectMember.joinedAt,
          user: {
            id: schema.user.id,
            name: schema.user.name,
            email: schema.user.email,
            image: schema.user.image,
          },
        })
        .from(schema.projectMember)
        .innerJoin(schema.user, eq(schema.user.id, schema.projectMember.userId))
        .where(eq(schema.projectMember.id, newMember[0].id))
        .limit(1);

      return memberWithUser[0];
    } catch (error: any) {
      if (error instanceof ConflictError || error instanceof NotFoundError) {
        throw error;
      }
      console.error("Add project member error:", error);
      throw new Error("Failed to add project member.");
    }
  }

  async updateProjectMemberRole(
    projectId: string,
    memberId: string,
    role: string,
    updatedBy: string
  ): Promise<any> {
    if (!db) {
      throw new Error("Database not available");
    }

    try {
      const updatedMember = await db
        .update(schema.projectMember)
        .set({
          role: role as any,
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.projectMember.id, memberId),
          eq(schema.projectMember.projectId, projectId)
        ))
        .returning();

      if (updatedMember.length === 0) {
        throw new NotFoundError("Project member not found");
      }

      return updatedMember[0];
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error("Update project member role error:", error);
      throw new Error("Failed to update project member role.");
    }
  }

  async removeProjectMember(
    projectId: string,
    memberId: string,
    removedBy: string
  ): Promise<void> {
    if (!db) {
      throw new Error("Database not available");
    }

    try {
      const deletedMember = await db
        .delete(schema.projectMember)
        .where(and(
          eq(schema.projectMember.id, memberId),
          eq(schema.projectMember.projectId, projectId)
        ))
        .returning();

      if (deletedMember.length === 0) {
        throw new NotFoundError("Project member not found");
      }
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error("Remove project member error:", error);
      throw new Error("Failed to remove project member.");
    }
  }
}

export const projectService = new ProjectService();
