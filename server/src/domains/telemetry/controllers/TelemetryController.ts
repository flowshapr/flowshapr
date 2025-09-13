import { Request, Response, NextFunction } from 'express';
import { telemetryService } from '../services/TelemetryService';
import { logError, logInfo } from '../../../shared/utils/logger';

export class TelemetryController {
  // Genkit-compatible health endpoint
  async apiHealth(req: Request, res: Response): Promise<void> {
    res.status(200).send('OK');
  }

  // Genkit-compatible trace creation endpoint
  async createTrace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logInfo('📊 [Telemetry] Received trace data:', JSON.stringify(req.body, null, 2));
      
      // Save the trace using our service
      await telemetryService.saveTrace(req.body);
      
      // Also save to file system for local development
      await telemetryService.saveTraceToFile(req.body);
      
      res.status(200).send('OK');
    } catch (error) {
      logError('❌ [Telemetry] Error saving trace:', error);
      next(error);
    }
  }

  // Genkit-compatible trace retrieval endpoint
  async getTrace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { traceId } = req.params;
      logInfo(`🔍 [Telemetry] Getting trace: ${traceId}`);
      
      const trace = await telemetryService.getTrace(traceId);
      if (!trace) {
        res.status(404).json({ error: 'Trace not found' });
        return;
      }
      res.json(trace);
    } catch (error) {
      logError('❌ [Telemetry] Error getting trace:', error);
      next(error);
    }
  }

  // Genkit-compatible trace listing endpoint  
  async listTraces(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const continuationToken = req.query.continuationToken as string | undefined;
      const filter = req.query.filter as string | undefined;
      
      logInfo(`📋 [Telemetry] Listing traces: limit=${limit}, continuationToken=${continuationToken}, filter=${filter}`);
      
      const result = await telemetryService.listTraces(limit, continuationToken, filter);
      res.json(result);
    } catch (error) {
      logError('❌ [Telemetry] Error listing traces:', error);
      next(error);
    }
  }

  // Legacy endpoints for backward compatibility
  async saveTrace(req: Request, res: Response): Promise<void> {
    try {
      const trace = req.body;
      await telemetryService.saveTrace(trace);
      res.status(200).send();
    } catch (error) {
      logError('Error saving trace:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to save trace' 
      });
    }
  }

  async health(req: Request, res: Response): Promise<void> {
    res.send('OK');
  }
}

export const telemetryController = new TelemetryController();

