import { Router } from 'express';
import { telemetryController } from './controllers/TelemetryController';
import {logInfo} from "@/shared/utils/logger";

const router = Router();

// Add request logging middleware
router.use((req, res, next) => {
  console.log(`🔍 [TELEMETRY] ${req.method} ${req.url} - Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`🔍 [TELEMETRY] Body:`, JSON.stringify(req.body, null, 2));
  logInfo(`🔍 [TELEMETRY] ${req.method} ${req.url} - Headers:`, JSON.stringify(req.headers, null, 2));
  next();
});

// Genkit-compatible telemetry server endpoints (matching official telemetry server API)
router.get('/api/__health', (req, res) => telemetryController.apiHealth(req, res));
router.get('/api/traces', (req, res, next) => telemetryController.listTraces(req, res, next));
router.get('/api/traces/:traceId', (req, res, next) => telemetryController.getTrace(req, res, next));
router.post('/api/traces', (req, res, next) => telemetryController.createTrace(req, res, next));

// Also try root-level endpoints in case Genkit expects them there
router.get('/__health', (req, res) => telemetryController.apiHealth(req, res));
router.get('/traces', (req, res, next) => telemetryController.listTraces(req, res, next));
router.get('/traces/:traceId', (req, res, next) => telemetryController.getTrace(req, res, next));
router.post('/traces', (req, res, next) => telemetryController.createTrace(req, res, next));

// Legacy endpoints for backward compatibility
router.get('/health', (req, res) => telemetryController.health(req, res));

// Catch-all to see what other endpoints Genkit might be trying to access
router.all('*', (req, res) => {
  console.log(`❓ [TELEMETRY] Unknown endpoint: ${req.method} ${req.url}`);
  res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.url}` });
});

// Error handling middleware
router.use((error: any, req: any, res: any, next: any) => {
  console.error('❌ [TELEMETRY] API error:', error);
  res.status(500).json({ 
    error: error instanceof Error ? error.message : 'Internal server error' 
  });
});

export { router as telemetryRoutes };

