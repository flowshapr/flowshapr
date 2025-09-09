import { Request, Response } from 'express';
import { tracesService } from '../services/TracesService';

export class TracesController {
  async listByFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as any; // flowId
      const rows = await tracesService.listByFlow(id);
      res.json({ success: true, data: rows });
    } catch (e) {
      res.status(500).json({ success: false, error: { message: 'Failed to list traces' } });
    }
  }

  async getByExecutionId(req: Request, res: Response): Promise<void> {
    try {
      const { executionId } = req.params as any;
      const trace = await tracesService.getByExecutionId(executionId);
      if (!trace) { res.status(404).json({ success: false, error: { message: 'Trace not found' } }); return; }
      res.json({ success: true, data: trace });
    } catch (e) {
      res.status(500).json({ success: false, error: { message: 'Failed to get trace' } });
    }
  }
}

export const tracesController = new TracesController();
