import { Router } from 'express';
import { userController } from './controllers/UserController';
import { requireAuth } from '../../shared/middleware/auth';
import { validate } from '../../shared/middleware/validation';
import { updateUserProfileSchema, getUserProfileSchema } from './validation/schemas';

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// User profile routes
// GET /api/users/me - Get current user's profile
router.get('/me', (req, res, next) => userController.getCurrentProfile(req, res, next));

// PUT /api/users/me - Update current user's profile  
router.put('/me', validate(updateUserProfileSchema), (req, res, next) => userController.updateProfile(req, res, next));

// GET /api/users/:id - Get user profile by ID
router.get('/:id', validate(getUserProfileSchema), (req, res, next) => userController.getProfile(req, res, next));

export { router as userRoutes };