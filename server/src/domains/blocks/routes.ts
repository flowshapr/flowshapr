import { Router } from 'express';
import { BlocksController } from './controllers/BlocksController';
// import { requireAuth } from '../../shared/middleware/auth';  // Uncomment when auth is ready

const router = Router();
const blocksController = new BlocksController();

/**
 * Block metadata routes
 */
router.get('/blocks', blocksController.getBlocksMetadata);
router.get('/blocks/stats', blocksController.getStats);

/**
 * Block validation and code generation routes
 */
router.post('/blocks/validate', blocksController.validateBlockConfigs);
router.post('/blocks/generate-code', blocksController.generateCode);

export default router;