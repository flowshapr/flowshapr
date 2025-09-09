import { Request, Response } from 'express';
import { connectionsService } from '../services/ConnectionsService';
import { flowService } from '../../flows/services/FlowService';

export class ConnectionsController {
  async listByFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as any;
      const flow = await flowService.getFlowById(id, req.user!.id);
      if (!flow) { res.status(404).json({ success: false, error: { message: 'Flow not found' } }); return; }
      const rows = await connectionsService.listByFlow(id);
      res.json({ success: true, data: rows });
    } catch (e) {
      res.status(500).json({ success: false, error: { message: 'Failed to list connections' } });
    }
  }

  async createForFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as any;
      const flow = await flowService.getFlowById(id, req.user!.id);
      if (!flow) { res.status(404).json({ success: false, error: { message: 'Flow not found' } }); return; }
      const created = await connectionsService.createForFlow(id, req.user!.id, req.body || {});
      res.status(201).json({ success: true, data: created });
    } catch (e) {
      console.error('Create connection error:', (e as any)?.message || e);
      res.status(500).json({ success: false, error: { message: 'Failed to create connection', details: (e as any)?.message || String(e) } });
    }
  }

  async updateForFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id, connectionId } = req.params as any;
      const flow = await flowService.getFlowById(id, req.user!.id);
      if (!flow) { res.status(404).json({ success: false, error: { message: 'Flow not found' } }); return; }
      const conn = await connectionsService.getById(connectionId);
      if (!conn || conn.flowId !== flow.id) { res.status(404).json({ success: false, error: { message: 'Connection not found' } }); return; }
      const updated = await connectionsService.update(connectionId, req.user!.id, req.body || {});
      res.json({ success: true, data: updated });
    } catch (e) {
      res.status(500).json({ success: false, error: { message: 'Failed to update connection' } });
    }
  }

  async deleteForFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id, connectionId } = req.params as any;
      const flow = await flowService.getFlowById(id, req.user!.id);
      if (!flow) { res.status(404).json({ success: false, error: { message: 'Flow not found' } }); return; }
      const conn = await connectionsService.getById(connectionId);
      if (!conn || conn.flowId !== flow.id) { res.status(404).json({ success: false, error: { message: 'Connection not found' } }); return; }
      await connectionsService.delete(connectionId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: { message: 'Failed to delete connection' } });
    }
  }
}

export const connectionsController = new ConnectionsController();
