import { Router } from 'express';
import { telemetryController } from './controllers/TelemetryController';

const router = Router();

// No requireAuth here; protected by exporter secret to accept external runtime telemetry
router.post('/genkit', (req, res) => telemetryController.ingestGenkit(req, res));

export { router as telemetryRoutes };

