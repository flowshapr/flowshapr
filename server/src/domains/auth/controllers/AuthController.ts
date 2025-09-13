import { Request, Response } from "express";
import { authService } from "../services/AuthService";
import { ConflictError, UnauthorizedError } from "../../../shared/utils/errors";
import { logError } from "../../../shared/utils/logger";

export class AuthController {
  async signUp(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body;
      const result = await authService.signUp({ name, email, password });

      res.json({
        data: {
          user: result.user
        }
      });
    } catch (error: any) {
      logError("Registration error:", error);

      if (error instanceof ConflictError) {
        res.status(error.statusCode).json({
          error: {
            message: error.message,
            code: "USER_EXISTS"
          }
        });
      } else {
        res.status(500).json({
          error: {
            message: "Registration failed. Please try again.",
            code: "INTERNAL_ERROR"
          }
        });
      }
    }
  }

  async signIn(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.signIn({ email, password });

      const response = {
        data: {
          session: {
            id: result.session!.id,
            userId: result.user.id,
            token: result.session!.token
          },
          user: result.user
        }
      };

      // Set session cookie for cross-origin requests
      res.cookie('sessionId', result.session!.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost'
      });
      // Also set a lightweight uid cookie (non-httpOnly) to allow session reconstruction after dev restarts
      res.cookie('uid', result.user.id, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost'
      });

      res.json(response);
    } catch (error: any) {
      logError("Login error:", error);

      if (error instanceof UnauthorizedError) {
        res.status(error.statusCode).json({
          error: {
            message: error.message,
            code: "INVALID_CREDENTIALS"
          }
        });
      } else {
        res.status(500).json({
          error: {
            message: "Login failed. Please try again.",
            code: "INTERNAL_ERROR"
          }
        });
      }
    }
  }

  async signOut(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.cookies?.sessionId;
      const result = await authService.signOut(sessionId);

      // Clear cookie
      if (sessionId) {
        res.clearCookie('sessionId');
      }

      res.json({ data: result });
    } catch (error: any) {
      logError("Sign out error:", error);
      res.status(500).json({
        error: {
          message: "Sign out failed. Please try again.",
          code: "SIGNOUT_ERROR"
        }
      });
    }
  }

  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.cookies?.sessionId;
      const sessionData = await authService.getSession(sessionId);

      if (!sessionData) {
        res.json({ data: null });
        return;
      }

      // Return session data in the format the frontend expects
      res.json({
        data: sessionData
      });
    } catch (error: any) {
      logError("Session check error:", error);
      res.json({ data: null });
    }
  }
}

export const authController = new AuthController();
