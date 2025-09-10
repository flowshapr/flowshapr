import { Request, Response, NextFunction } from 'express';
import { userService, UpdateUserProfileData } from '../services/UserService';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
      };
    }
  }
}

export class UserController {
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED'
          }
        });
        return;
      }

      const userId = req.user.id;
      const updates: UpdateUserProfileData = req.body;

      const updatedUser = await userService.updateProfile(userId, updates);

      res.json({
        success: true,
        data: {
          user: updatedUser
        }
      });
    } catch (error: any) {
      if (error.message === 'Email address is already in use') {
        res.status(400).json({
          error: {
            message: error.message,
            code: 'EMAIL_ALREADY_EXISTS'
          }
        });
        return;
      }

      if (error.message === 'User not found') {
        res.status(404).json({
          error: {
            message: error.message,
            code: 'USER_NOT_FOUND'
          }
        });
        return;
      }

      if (error.message === 'At least one field must be provided for update') {
        res.status(400).json({
          error: {
            message: error.message,
            code: 'VALIDATION_ERROR'
          }
        });
        return;
      }

      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED'
          }
        });
        return;
      }

      const requestingUserId = req.user.id;
      const targetUserId = req.params.id || requestingUserId; // Default to own profile

      const userProfile = await userService.getProfile(requestingUserId, targetUserId);

      res.json({
        success: true,
        data: {
          user: userProfile
        }
      });
    } catch (error: any) {
      if (error.message === 'User not found') {
        res.status(404).json({
          error: {
            message: error.message,
            code: 'USER_NOT_FOUND'
          }
        });
        return;
      }

      next(error);
    }
  }

  async getCurrentProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED'
          }
        });
        return;
      }

      const userId = req.user.id;
      const userProfile = await userService.getProfile(userId, userId);

      res.json({
        success: true,
        data: {
          user: userProfile
        }
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const userController = new UserController();