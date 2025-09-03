import { Request, Response } from "express";
import { projectService } from "../services/ProjectService";
import { eq } from "drizzle-orm";
import { ConflictError, NotFoundError } from "../../../shared/utils/errors";

export class ProjectController {
  async createProject(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, organizationId, teamId, settings } = req.body;
      
      console.log("Creating project:", { name, organizationId, teamId });

      const project = await projectService.createProject(
        { name, description, organizationId, teamId, settings },
        req.user!.id
      );

      console.log("Project created successfully:", project);

      res.status(201).json({
        success: true,
        data: project,
        message: "Project created successfully"
      });
    } catch (error: any) {
      console.error("Create project error:", error);

      if (error instanceof ConflictError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: "PROJECT_CONFLICT"
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            message: "Failed to create project. Please try again.",
            code: "INTERNAL_ERROR"
          }
        });
      }
    }
  }

  async getProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const project = await projectService.getProjectById(id, req.user!.id);

      if (!project) {
        res.status(404).json({
          success: false,
          error: {
            message: "Project not found or you don't have access to it",
            code: "PROJECT_NOT_FOUND"
          }
        });
        return;
      }

      res.json({
        success: true,
        data: project
      });
    } catch (error: any) {
      console.error("Get project error:", error);
      
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to retrieve project",
          code: "INTERNAL_ERROR"
        }
      });
    }
  }

  async getUserProjects(req: Request, res: Response): Promise<void> {
    try {
      const { 
        organizationId, 
        teamId, 
        search, 
        limit = 50, 
        offset = 0 
      } = req.query as any;

      const projects = await projectService.getUserProjects(req.user!.id, {
        organizationId,
        teamId,
        search,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: projects,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: projects.length === parseInt(limit)
        }
      });
    } catch (error: any) {
      console.error("Get user projects error:", error);
      
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to retrieve projects",
          code: "INTERNAL_ERROR"
        }
      });
    }
  }

  async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updatedProject = await projectService.updateProject(
        id,
        updateData,
        req.user!.id
      );

      res.json({
        success: true,
        data: updatedProject,
        message: "Project updated successfully"
      });
    } catch (error: any) {
      console.error("Update project error:", error);

      if (error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: "PROJECT_NOT_FOUND"
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            message: "Failed to update project",
            code: "INTERNAL_ERROR"
          }
        });
      }
    }
  }

  async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await projectService.deleteProject(id, req.user!.id);

      res.json({
        success: true,
        message: "Project deleted successfully"
      });
    } catch (error: any) {
      console.error("Delete project error:", error);

      if (error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: "PROJECT_NOT_FOUND"
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            message: "Failed to delete project",
            code: "INTERNAL_ERROR"
          }
        });
      }
    }
  }

  // Prompts CRUD
  async listPrompts(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { db } = await import("../../../infrastructure/database/connection");
      const schema = await import("../../../infrastructure/database/schema");
      const rows = await (db as any).select({
        id: (schema as any).prompt.id,
        name: (schema as any).prompt.name,
        description: (schema as any).prompt.description,
        template: (schema as any).prompt.template,
        variables: (schema as any).prompt.variables,
        metadata: (schema as any).prompt.metadata,
        createdAt: (schema as any).prompt.createdAt,
      }).from((schema as any).prompt).where(eq((schema as any).prompt.projectId, id));
      res.json({ success: true, data: rows });
    } catch (e) {
      res.status(500).json({ success: false, error: { message: 'Failed to list prompts' } });
    }
  }

  async createPrompt(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, template, variables, metadata } = req.body;
      const { db } = await import("../../../infrastructure/database/connection");
      const schema = await import("../../../infrastructure/database/schema");
      const promptId = `prm_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const inserted = await (db as any).insert((schema as any).prompt).values({
        id: promptId,
        name,
        description: description || null,
        template,
        variables: variables || [],
        metadata: metadata || {},
        projectId: id,
        createdBy: req.user!.id,
      }).returning();
      res.status(201).json({ success: true, data: inserted[0] });
    } catch (e) {
      res.status(500).json({ success: false, error: { message: 'Failed to create prompt' } });
    }
  }

  async updatePrompt(req: Request, res: Response): Promise<void> {
    try {
      const { id, promptId } = req.params as any;
      const updates: any = { ...req.body, updatedAt: new Date() };
      const { db } = await import("../../../infrastructure/database/connection");
      const schema = await import("../../../infrastructure/database/schema");
      await (db as any).update((schema as any).prompt).set(updates).where(((schema as any).prompt.id as any).eq(promptId));
      const rows = await (db as any).select().from((schema as any).prompt).where(((schema as any).prompt.id as any).eq(promptId)).limit(1);
      res.json({ success: true, data: rows[0] });
    } catch (e) {
      res.status(500).json({ success: false, error: { message: 'Failed to update prompt' } });
    }
  }

  async deletePrompt(req: Request, res: Response): Promise<void> {
    try {
      const { id, promptId } = req.params as any;
      const { db } = await import("../../../infrastructure/database/connection");
      const schema = await import("../../../infrastructure/database/schema");
      await (db as any).delete((schema as any).prompt).where(((schema as any).prompt.id as any).eq(promptId));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: { message: 'Failed to delete prompt' } });
    }
  }

  async exportPromptDotprompt(req: Request, res: Response): Promise<void> {
    try {
      const { id, promptId } = req.params as any;
      const { db } = await import("../../../infrastructure/database/connection");
      const schema = await import("../../../infrastructure/database/schema");
      const rows = await (db as any).select().from((schema as any).prompt).where(((schema as any).prompt.id as any).eq(promptId)).limit(1);
      if (!rows || rows.length === 0) {
        res.status(404).json({ success: false, error: { message: 'Prompt not found' } });
        return;
      }
      const p = rows[0];
      // Generate .prompt (dotprompt) content
      const header = [
        `name: ${p.name}`,
        p.description ? `description: ${p.description}` : undefined,
        p.variables && p.variables.length ? `input: [${p.variables.map((v: string) => `{ name: ${v} }`).join(', ')}]` : undefined,
      ].filter(Boolean).join('\n');
      const content = `${header}\n---\n${p.template}`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${p.name}.prompt"`);
      res.send(content);
    } catch (e) {
      res.status(500).json({ success: false, error: { message: 'Failed to export prompt' } });
    }
  }

  // Access Token (API Key) endpoints
  async listApiKeys(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const keys = await projectService.listApiKeys(id, req.user!.id);
      res.json({ success: true, data: keys });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: 'Failed to list API keys' } });
    }
  }

  async createApiKey(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, scopes, rateLimit, expiresAt } = req.body;
      const created = await projectService.createApiKey(id, { name, scopes, rateLimit, expiresAt }, req.user!.id);
      res.status(201).json({ success: true, data: created, message: 'API key created' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: 'Failed to create API key' } });
    }
  }

  async revokeApiKey(req: Request, res: Response): Promise<void> {
    try {
      const { id, keyId } = req.params as any;
      await projectService.revokeApiKey(id, keyId, req.user!.id);
      res.json({ success: true, message: 'API key revoked' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: 'Failed to revoke API key' } });
    }
  }

  async addProjectMember(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, email, role } = req.body;

      const member = await projectService.addProjectMember(
        id,
        { userId, email, role },
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: member,
        message: "Project member added successfully"
      });
    } catch (error: any) {
      console.error("Add project member error:", error);

      if (error instanceof ConflictError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: "MEMBER_ALREADY_EXISTS"
          }
        });
      } else if (error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: "USER_NOT_FOUND"
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            message: "Failed to add project member",
            code: "INTERNAL_ERROR"
          }
        });
      }
    }
  }

  async updateProjectMemberRole(req: Request, res: Response): Promise<void> {
    try {
      const { id, memberId } = req.params;
      const { role } = req.body;

      const updatedMember = await projectService.updateProjectMemberRole(
        id,
        memberId,
        role,
        req.user!.id
      );

      res.json({
        success: true,
        data: updatedMember,
        message: "Project member role updated successfully"
      });
    } catch (error: any) {
      console.error("Update project member role error:", error);

      if (error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: "MEMBER_NOT_FOUND"
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            message: "Failed to update project member role",
            code: "INTERNAL_ERROR"
          }
        });
      }
    }
  }

  async removeProjectMember(req: Request, res: Response): Promise<void> {
    try {
      const { id, memberId } = req.params;

      await projectService.removeProjectMember(id, memberId, req.user!.id);

      res.json({
        success: true,
        message: "Project member removed successfully"
      });
    } catch (error: any) {
      console.error("Remove project member error:", error);

      if (error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: "MEMBER_NOT_FOUND"
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            message: "Failed to remove project member",
            code: "INTERNAL_ERROR"
          }
        });
      }
    }
  }
}

export const projectController = new ProjectController();
