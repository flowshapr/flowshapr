import { Request, Response } from 'express';
import { promptsService } from '../services/PromptsService';
import { flowService } from '../../flows/services/FlowService';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../shared/utils/errors';
import { logError, logInfo } from '../../../shared/utils/logger';

export class PromptsController {
  // Project-scoped routes removed

  // Flow-scoped
  async listByFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as any; // flowId
      logInfo('Controller: Listing prompts by flow', { flowId: id, userId: req.user?.id });
      
      const flow = await flowService.getFlowById(id, req.user!.id);
      if (!flow) { 
        logInfo('Controller: Flow not found', { flowId: id, userId: req.user?.id });
        res.status(404).json({ success: false, error: { message: 'Flow not found' } }); 
        return; 
      }
      
      logInfo('Controller: Flow found, calling service', { flowId: flow.id });
      const rows = await promptsService.listByFlow(flow.id, req.user!.id);
      
      logInfo('Controller: Service returned rows', { flowId: flow.id, count: rows.length });
      res.json({ success: true, data: rows });
    } catch (e) {
      logError('Controller: Error listing prompts by flow', { 
        error: e, 
        flowId: req.params.id, 
        userId: req.user?.id 
      });
      // Return the actual error instead of empty array
      res.status(500).json({ success: false, error: { message: 'Failed to list prompts', code: 'INTERNAL_ERROR' } });
    }
  }

  async createForFlow(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params as any; // flowId
    const userId = req.user!.id;
    
    logInfo('Creating prompt for flow', { 
      flowId: id, 
      userId, 
      body: req.body 
    });
    
    const flow = await flowService.getFlowById(id, userId);
    if (!flow) { 
      logInfo('Flow not found for prompt creation', { flowId: id, userId });
      res.status(404).json({ 
        success: false, 
        error: { message: 'Flow not found', code: 'FLOW_NOT_FOUND' } 
      }); 
      return; 
    }
    
    const created = await promptsService.createForFlow(flow.id, req.body || {}, userId);
    logInfo('Prompt created successfully', { 
      promptId: created.id, 
      flowId: flow.id, 
      userId 
    });
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    if (e instanceof ValidationError) {
      res.status(400).json({ 
        success: false, 
        error: { message: e.message, code: 'VALIDATION_ERROR' } 
      });
      return;
    }
    if (e instanceof NotFoundError) {
      res.status(404).json({ 
        success: false, 
        error: { message: e.message, code: 'NOT_FOUND' } 
      });
      return;
    }
    if (e instanceof ForbiddenError) {
      res.status(403).json({ 
        success: false, 
        error: { message: e.message, code: 'FORBIDDEN' } 
      });
      return;
    }
    logError('Controller error creating prompt', { 
      error: e, 
      flowId: req.params.id, 
      userId: req.user?.id,
      body: req.body 
    });
    res.status(500).json({ success: false, error: { message: 'Failed to create prompt', code: 'INTERNAL_ERROR' } });
  }
}

  async updateForFlow(req: Request, res: Response): Promise<void> {
  try {
    const { id, promptId } = req.params as any; // flowId, promptId
    const flow = await flowService.getFlowById(id, req.user!.id);
    if (!flow) { 
      res.status(404).json({ 
        success: false, 
        error: { message: 'Flow not found', code: 'FLOW_NOT_FOUND' } 
      }); 
      return; 
    }
    const updated = await promptsService.updateForFlow(flow.id, promptId, req.body || {}, req.user!.id);
    res.json({ success: true, data: updated });
  } catch (e) {
    if (e instanceof ValidationError) {
      res.status(400).json({ 
        success: false, 
        error: { message: e.message, code: 'VALIDATION_ERROR' } 
      });
      return;
    }
    if (e instanceof NotFoundError) {
      res.status(404).json({ 
        success: false, 
        error: { message: e.message, code: 'NOT_FOUND' } 
      });
      return;
    }
    if (e instanceof ForbiddenError) {
      res.status(403).json({ 
        success: false, 
        error: { message: e.message, code: 'FORBIDDEN' } 
      });
      return;
    }
    logError('Error updating prompt:', e);
    res.status(500).json({ success: false, error: { message: 'Failed to update prompt', code: 'INTERNAL_ERROR' } });
  }
}

  async deleteForFlow(req: Request, res: Response): Promise<void> {
  try {
    const { id, promptId } = req.params as any; // flowId, promptId
    const flow = await flowService.getFlowById(id, req.user!.id);
    if (!flow) { 
      res.status(404).json({ 
        success: false, 
        error: { message: 'Flow not found', code: 'FLOW_NOT_FOUND' } 
      }); 
      return; 
    }
    await promptsService.deleteForFlow(flow.id, promptId, req.user!.id);
    res.json({ success: true });
  } catch (e) {
    if (e instanceof ValidationError) {
      res.status(400).json({ 
        success: false, 
        error: { message: e.message, code: 'VALIDATION_ERROR' } 
      });
      return;
    }
    if (e instanceof NotFoundError) {
      res.status(404).json({ 
        success: false, 
        error: { message: e.message, code: 'NOT_FOUND' } 
      });
      return;
    }
    if (e instanceof ForbiddenError) {
      res.status(403).json({ 
        success: false, 
        error: { message: e.message, code: 'FORBIDDEN' } 
      });
      return;
    }
    logError('Error deleting prompt:', e);
    res.status(500).json({ success: false, error: { message: 'Failed to delete prompt', code: 'INTERNAL_ERROR' } });
  }
}

  async exportForFlow(req: Request, res: Response): Promise<void> {
  try {
    const { id, promptId } = req.params as any; // flowId, promptId
    const flow = await flowService.getFlowById(id, req.user!.id);
    if (!flow) { 
      res.status(404).json({ 
        success: false, 
        error: { message: 'Flow not found', code: 'FLOW_NOT_FOUND' } 
      }); 
      return; 
    }
    const p = await promptsService.getById(promptId);
    if (!p) { 
      res.status(404).json({ 
        success: false, 
        error: { message: 'Prompt not found', code: 'PROMPT_NOT_FOUND' } 
      }); 
      return; 
    }
    if (p.flowId && p.flowId !== flow.id) {
      res.status(403).json({ 
        success: false, 
        error: { message: 'Forbidden', code: 'FORBIDDEN' } 
      });
      return;
    }
    const header = [
      `name: ${p.name}`,
      p.description ? `description: ${p.description}` : undefined,
      p.variables && Array.isArray(p.variables) && p.variables.length ? `input: [${p.variables.map((v: string) => `{ name: ${v} }`).join(', ')}]` : undefined,
    ].filter(Boolean).join('\n');
    const content = `${header}\n---\n${p.template}`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${p.name}.prompt"`);
    res.send(content);
  } catch (e) {
    if (e instanceof ValidationError) {
      res.status(400).json({ 
        success: false, 
        error: { message: e.message, code: 'VALIDATION_ERROR' } 
      });
      return;
    }
    if (e instanceof NotFoundError) {
      res.status(404).json({ 
        success: false, 
        error: { message: e.message, code: 'NOT_FOUND' } 
      });
      return;
    }
    if (e instanceof ForbiddenError) {
      res.status(403).json({ 
        success: false, 
        error: { message: e.message, code: 'FORBIDDEN' } 
      });
      return;
    }
    logError('Error exporting prompt:', e);
    res.status(500).json({ success: false, error: { message: 'Failed to export prompt', code: 'INTERNAL_ERROR' } });
  }
}
}

export const promptsController = new PromptsController();
