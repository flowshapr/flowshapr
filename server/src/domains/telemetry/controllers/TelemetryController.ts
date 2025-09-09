import { Request, Response } from 'express';
import { telemetryService } from '../services/TelemetryService';
import { ENV } from '../../../config/env';

export class TelemetryController {
  async ingestGenkit(req: Request, res: Response): Promise<void> {
    try {
      // Simple bearer secret auth for exporter plugin
      const auth = req.headers.authorization || '';
      const secret = (ENV as any).GENKIT_EXPORT_SECRET;
      if (!secret || !auth.startsWith('Bearer ') || auth.substring(7) !== secret) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }
      const payload = req.body || {};
      const result = await telemetryService.ingestGenkit(payload);
      res.status(201).json({ success: true, data: result });
    } catch (e) {
      res.status(500).json({ success: false, error: { message: 'Failed to ingest telemetry' } });
    }
  }
}

export const telemetryController = new TelemetryController();

