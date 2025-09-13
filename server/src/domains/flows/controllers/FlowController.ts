import { Request, Response } from "express";
import { flowService } from "../services/FlowService";
import { ConflictError, NotFoundError } from "../../../shared/utils/errors";
import { logError } from "../../../shared/utils/logger";

export class FlowController {
  async createFlow(req: Request, res: Response): Promise<void> {
    try {
      const { name, alias, description, organizationId, teamId } = req.body;
      
      const flow = await flowService.createFlow(
        { name, alias, description, organizationId, teamId },
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: flow,
        message: "Flow created successfully"
      });
    } catch (error: any) {
      logError("Create flow error:", error);

      if (error instanceof ConflictError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: "FLOW_CONFLICT"
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            message: "Failed to create flow. Please try again.",
            code: "INTERNAL_ERROR"
          }
        });
      }
    }
  }

  async getFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const flow = await flowService.getFlowById(id, req.user!.id);

      if (!flow) {
        res.status(404).json({
          success: false,
          error: {
            message: "Flow not found or you don't have access to it",
            code: "FLOW_NOT_FOUND"
          }
        });
        return;
      }

      res.json({
        success: true,
        data: flow
      });
    } catch (error: any) {
      logError("Get flow error:", error);
      
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to retrieve flow",
          code: "INTERNAL_ERROR"
        }
      });
    }
  }

  async getUserFlows(req: Request, res: Response): Promise<void> {
    try {
      const { 
        organizationId, 
        teamId, 
        search, 
        limit = 50, 
        offset = 0 
      } = req.query as any;

      const flows = await flowService.getUserFlows(req.user!.id, {
        organizationId,
        teamId,
        search,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: flows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: flows.length === parseInt(limit)
        }
      });
    } catch (error: any) {
      logError("Get user flows error:", error);
      
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to retrieve flows",
          code: "INTERNAL_ERROR"
        }
      });
    }
  }

  async updateFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updatedFlow = await flowService.updateFlow(
        id,
        updateData,
        req.user!.id
      );

      res.json({
        success: true,
        data: updatedFlow,
        message: "Flow updated successfully"
      });
    } catch (error: any) {
      logError("Update flow error:", error);

      if (error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: "FLOW_NOT_FOUND"
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            message: "Failed to update flow",
            code: "INTERNAL_ERROR"
          }
        });
      }
    }
  }

  async deleteFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await flowService.deleteFlow(id, req.user!.id);

      res.json({
        success: true,
        message: "Flow deleted successfully"
      });
    } catch (error: any) {
      logError("Delete flow error:", error);

      if (error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: "FLOW_NOT_FOUND"
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            message: "Failed to delete flow",
            code: "INTERNAL_ERROR"
          }
        });
      }
    }
  }

  async addFlowMember(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, email, role } = req.body;

      const member = await flowService.addFlowMember(
        id,
        { userId, email, role },
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: member,
        message: "Flow member added successfully"
      });
    } catch (error: any) {
      logError("Add flow member error:", error);

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
            message: "Failed to add flow member",
            code: "INTERNAL_ERROR"
          }
        });
      }
    }
  }

  async updateFlowMemberRole(req: Request, res: Response): Promise<void> {
    try {
      const { id, memberId } = req.params;
      const { role } = req.body;

      const updatedMember = await flowService.updateFlowMemberRole(
        id,
        memberId,
        role,
        req.user!.id
      );

      res.json({
        success: true,
        data: updatedMember,
        message: "Flow member role updated successfully"
      });
    } catch (error: any) {
      logError("Update flow member role error:", error);

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
            message: "Failed to update flow member role",
            code: "INTERNAL_ERROR"
          }
        });
      }
    }
  }

  async removeFlowMember(req: Request, res: Response): Promise<void> {
    try {
      const { id, memberId } = req.params;

      await flowService.removeFlowMember(id, memberId, req.user!.id);

      res.json({
        success: true,
        message: "Flow member removed successfully"
      });
    } catch (error: any) {
      logError("Remove flow member error:", error);

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
            message: "Failed to remove flow member",
            code: "INTERNAL_ERROR"
          }
        });
      }
    }
  }

  // Flow-specific methods
  async saveFlowDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { nodes, edges, metadata } = req.body;

      const updatedFlow = await flowService.saveFlowDefinition(
        id,
        { nodes, edges, metadata },
        req.user!.id
      );

      res.json({
        success: true,
        data: updatedFlow,
        message: "Flow definition saved successfully"
      });
    } catch (error: any) {
      logError("Save flow definition error:", error);

      if (error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: "FLOW_NOT_FOUND"
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            message: "Failed to save flow definition",
            code: "INTERNAL_ERROR"
          }
        });
      }
    }
  }

  async executeFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as any;

      // Accept direct input (Genkit format) or wrapped input (FlowShapr format)
      let input, nodes, edges, metadata, connections;

      if (req.body && typeof req.body === 'object' && ('input' in req.body || 'nodes' in req.body || 'edges' in req.body)) {
        // FlowShapr wrapped format (for internal use)
        ({ input, nodes, edges, metadata, connections } = req.body);
      } else {
        // Genkit direct format
        input = req.body;
        nodes = undefined;
        edges = undefined;
        metadata = undefined;
        connections = undefined;
      }

      const { flowRunService } = await import('../services/FlowRunService.js');

      const result = await flowRunService.execute({
        flowId: id,
        userId: req.user!.id,
        input,
        nodes,
        edges,
        metadata,
        connections,
        userAgent: (req.headers['user-agent'] as string) || null,
        ipAddress: ((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null) as any,
      });

      // Return direct result (Genkit format)
      res.json(result);
    } catch (error: any) {
      logError('🎯 FlowController: Execute flow error:', error);

      // Handle specific error types with appropriate HTTP status codes
      if (error.message === 'Flow not found') {
        res.status(404).json({ error: 'Flow not found' });
      } else if (error.message === 'Flow validation failed') {
        res.status(400).json({ error: 'Flow validation failed', issues: error.issues });
      } else if (error.message === 'Code generation failed') {
        res.status(400).json({ error: 'Code generation failed', errors: error.errors });
      } else {
        res.status(500).json({ error: error?.message || 'Execution failed' });
      }
    }
  }

  async executeFlowByAlias(req: Request, res: Response): Promise<void> {
    try {
      const { alias } = req.params as any;

      // Accept direct input (Genkit format) or wrapped input (FlowShapr format)
      let input, nodes, edges, metadata, connections;

      if (req.body && typeof req.body === 'object' && ('input' in req.body || 'nodes' in req.body || 'edges' in req.body)) {
        // FlowShapr wrapped format (for internal use)
        ({ input, nodes, edges, metadata, connections } = req.body);
      } else {
        // Genkit direct format
        input = req.body;
        nodes = undefined;
        edges = undefined;
        metadata = undefined;
        connections = undefined;
      }

      // Resolve flow by alias
      const flow = await flowService.getFlowByAlias(alias, req.user!.id);
      if (!flow) {
        res.status(404).json({ error: "Flow not found for alias" });
        return;
      }

      // If using token auth, ensure the token is scoped to this flow
      const token: any = (req as any).token;
      if (token?.flowId && token.flowId !== flow.id) {
        res.status(403).json({ error: 'Token not authorized for this flow' });
        return;
      }

      const { flowRunService } = await import('../services/FlowRunService.js');
      const result = await flowRunService.execute({
        flowId: flow.id,
        userId: req.user!.id,
        input,
        nodes,
        edges,
        metadata,
        connections,
        userAgent: (req.headers['user-agent'] as string) || null,
        ipAddress: ((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null) as any,
      });

      // Return direct result (Genkit format)
      res.json(result);
    } catch (error: any) {
      logError('Execute flow by alias error:', error);

      // Handle specific error types with appropriate HTTP status codes
      if (error.message === 'Flow not found') {
        res.status(404).json({ error: 'Flow not found' });
      } else if (error.message === 'Flow validation failed') {
        res.status(400).json({ error: 'Flow validation failed', issues: error.issues });
      } else if (error.message === 'Code generation failed') {
        res.status(400).json({ error: 'Code generation failed', errors: error.errors });
      } else {
        res.status(500).json({ error: error?.message || 'Execution failed' });
      }
    }
  }

  async publishFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { version, changelog } = req.body;

      const publishedFlow = await flowService.publishFlow(
        id,
        { version, changelog },
        req.user!.id
      );

      res.json({
        success: true,
        data: publishedFlow,
        message: "Flow published successfully"
      });
    } catch (error: any) {
      logError("Publish flow error:", error);

      if (error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: "FLOW_NOT_FOUND"
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            message: "Failed to publish flow",
            code: "INTERNAL_ERROR"
          }
        });
      }
    }
  }
}

export const flowController = new FlowController();
