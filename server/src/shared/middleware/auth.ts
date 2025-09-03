import { Request, Response, NextFunction } from "express";
import { authService } from "../../domains/auth/services/AuthService";
import { auth } from "../../infrastructure/auth/auth";
import { db } from "../../infrastructure/database/connection";
import * as schema from "../../infrastructure/database/schema";
import { hashToken } from "../utils/crypto";
import { eq } from "drizzle-orm";
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

    // 1. Try our flow API token authentication first (Bearer token hashed lookup)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        if (!db) throw new Error('DB not available');
        const hashed = hashToken(token);
        const result = await db
          .select({
            id: (schema as any).flowApiKey.id,
            name: (schema as any).flowApiKey.name,
            prefix: (schema as any).flowApiKey.prefix,
            scopes: (schema as any).flowApiKey.scopes,
            isActive: (schema as any).flowApiKey.isActive,
            expiresAt: (schema as any).flowApiKey.expiresAt,
            flowId: (schema as any).flowApiKey.flowId,
            createdBy: (schema as any).flowApiKey.createdBy,
          })
          .from((schema as any).flowApiKey)
          .where(eq((schema as any).flowApiKey.key, hashed))
          .limit(1);

        const key = result[0];
        if (key && key.isActive !== false && (!key.expiresAt || key.expiresAt > new Date())) {
          // Populate a service user context based on token
          user = {
            id: `token_${key.id}`,
            email: '',
            name: key.name || 'API Token',
            image: undefined,
            emailVerified: true,
          };
          (req as any).token = { id: key.id, flowId: (key as any).flowId, scopes: (key as any).scopes || [], rateLimit: (key as any).rateLimit || undefined };
          // best-effort usage tracking
          try {
            await (db as any)
              .update((schema as any).flowApiKey)
              .set({ lastUsedAt: new Date() })
              .where(((schema as any).flowApiKey.id as any).eq(key.id));
          } catch {}
          authMethod = 'token';
        }
      } catch (error) {
        // If our API token check fails, we'll try session-based next
        console.warn('API token check failed:', (error as any)?.message || error);
      }

      // If not our API token, try Better Auth bearer session as a fallback
      if (!user) {
        try {
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
        } catch (err) {
          console.warn('Better Auth bearer session check failed:', (err as any)?.message || err);
        }
      }
    }

    // 2. If token auth failed, try session-based authentication (web requests)
    if (!user) {
      const sessionId = req.cookies?.sessionId;
      if (sessionId) {
        try {
          let sessionData = await authService.getSession(sessionId);
          // Dev-resilient: reconstruct session from uid cookie if in-memory session store was reset
          if (!sessionData && req.cookies?.uid) {
            const { db } = await import("../../infrastructure/database/connection.js");
            const schemaAll = await import("../../infrastructure/database/schema/index.js");
            if (db) {
              const rows = await (db as any).select().from((schemaAll as any).user).where(((schemaAll as any).user.id as any).eq(req.cookies.uid)).limit(1);
              const row = rows?.[0];
              if (row) {
                sessionData = {
                  user: {
                    id: row.id,
                    email: row.email,
                    name: row.name,
                    image: row.image ?? undefined,
                    emailVerified: !!row.emailVerified,
                  },
                  session: { id: sessionId, expiresAt: new Date(Date.now() + 24*60*60*1000) },
                } as any;
              }
            }
          }
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
