import { Request, Response } from 'express';
import { flowApiKeysService } from '../services/FlowApiKeysService';

export class FlowApiKeysController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as any; // flowId
      const keys = await flowApiKeysService.list(id, req.user!.id);
      res.json({ success: true, data: keys });
    } catch (e: any) {
      res.status(500).json({ success: false, error: { message: 'Failed to list API keys', details: e?.message || String(e) } });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as any; // flowId
      const created = await flowApiKeysService.create(id, req.user!.id, req.body || {});
      res.status(201).json({ success: true, data: created, message: 'API key created' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: { message: 'Failed to create API key', details: e?.message || String(e) } });
    }
  }

  async revoke(req: Request, res: Response): Promise<void> {
    try {
      const { id, keyId } = req.params as any; // flowId, keyId
      await flowApiKeysService.revoke(id, keyId, req.user!.id);
      res.json({ success: true, message: 'API key revoked' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: { message: 'Failed to revoke API key', details: e?.message || String(e) } });
    }
  }
}

export const flowApiKeysController = new FlowApiKeysController();

