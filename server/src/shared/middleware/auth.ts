import { Request, Response, NextFunction } from "express";
import { authService } from "../../domains/auth/services/AuthService";
import { auth } from "../../infrastructure/auth/auth";
import { UnauthorizedError } from "../utils/errors";
import type { AuthenticatedUser, RequestContext } from "../types/index";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      context?: RequestContext;
      authMethod?: 'session' | 'token';
    }
  }
}

/**
 * Unified authentication middleware similar to Laravel Sanctum
 * Supports both session-based (web) and token-based (API) authentication
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let user: AuthenticatedUser | null = null;
    let authMethod: 'session' | 'token' | null = null;

    // 1. Try token-based authentication first (API requests)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // Verify session with Better Auth
        const session = await auth.api.getSession({
          headers: new Headers({
            authorization: `Bearer ${token}`,
          }),
        });

        if (session?.user) {
          user = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            image: session.user.image ?? undefined,
            emailVerified: session.user.emailVerified,
          };
          authMethod = 'token';
        }
      } catch (error) {
        // Token auth failed, continue to try session auth
        console.warn('Token authentication failed:', error);
      }
    }

    // 2. If token auth failed, try session-based authentication (web requests)
    if (!user) {
      const sessionId = req.cookies?.sessionId;
      if (sessionId) {
        try {
          const sessionData = await authService.getSession(sessionId);
          if (sessionData?.user) {
            user = {
              id: sessionData.user.id,
              email: sessionData.user.email,
              name: sessionData.user.name,
              image: sessionData.user.image ?? undefined,
              emailVerified: sessionData.user.emailVerified,
            };
            authMethod = 'session';
          }
        } catch (error) {
          console.warn('Session authentication failed:', error);
        }
      }
    }

    // 3. If both methods failed, reject the request
    if (!user || !authMethod) {
      throw new UnauthorizedError("Authentication required. Please provide a valid session or API token.");
    }

    // 4. Set request context
    req.user = user;
    req.authMethod = authMethod;
    req.context = {
      user,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication - doesn't fail if user is not authenticated
 * Useful for endpoints that have enhanced features for logged-in users
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    await requireAuth(req, res, (error) => {
      if (error) {
        // Log the error but don't fail the request
        console.debug('Optional auth failed:', error.message);
      }
      next(); // Always continue, regardless of auth success/failure
    });
  } catch (error) {
    // If requireAuth throws synchronously, just continue
    next();
  }
}

/**
 * Require session-based authentication only (web app only)
 * Useful for endpoints that should only be accessible via web interface
 */
export async function requireSessionAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      throw new UnauthorizedError("Session authentication required. Please log in through the web interface.");
    }

    const sessionData = await authService.getSession(sessionId);
    if (!sessionData?.user) {
      throw new UnauthorizedError("Invalid or expired session. Please log in again.");
    }

    const user: AuthenticatedUser = {
      id: sessionData.user.id,
      email: sessionData.user.email,
      name: sessionData.user.name,
      image: sessionData.user.image ?? undefined,
      emailVerified: sessionData.user.emailVerified,
    };

    req.user = user;
    req.authMethod = 'session';
    req.context = {
      user,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Require token-based authentication only (API only)
 * Useful for endpoints that should only be accessible via API tokens
 */
export async function requireTokenAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError("API token required. Please provide a Bearer token.");
    }

    const token = authHeader.substring(7);
    
    // Verify session with Better Auth
    const session = await auth.api.getSession({
      headers: new Headers({
        authorization: `Bearer ${token}`,
      }),
    });

    if (!session?.user) {
      throw new UnauthorizedError("Invalid or expired API token.");
    }

    const user: AuthenticatedUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image ?? undefined,
      emailVerified: session.user.emailVerified,
    };

    req.user = user;
    req.authMethod = 'token';
    req.context = {
      user,
    };

    next();
  } catch (error) {
    next(error);
  }
}