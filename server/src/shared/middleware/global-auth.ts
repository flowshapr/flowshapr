import { Request, Response, NextFunction } from 'express';
import { authService } from '../../domains/auth/services/AuthService';
import { auth } from '../../infrastructure/auth/auth';
import { db } from '../../infrastructure/database/connection';
import * as schema from '../../infrastructure/database/schema';
import { hashToken } from '../utils/crypto';
import { eq } from 'drizzle-orm';
import { UnauthorizedError } from '../utils/errors';
import type { AuthenticatedUser, RequestContext } from '../types/index';
import { logWarn, logDebug, logInfo } from '../utils/logger';
import { getRouteAuthRequirement, getRequiredScopes } from '../config/auth-routes';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      context?: RequestContext;
      authMethod?: 'session' | 'token';
      isAuthenticated?: boolean;
    }
  }
}

/**
 * Global Authentication Middleware
 *
 * This middleware is applied to ALL routes and handles authentication
 * based on the route configuration. Routes are secure by default.
 *
 * Authentication flow:
 * 1. Check route requirement (public, optional, required, scoped)
 * 2. For non-public routes, attempt authentication (token first, then session)
 * 3. Set request context based on authentication result
 * 4. For required/scoped routes, enforce authentication
 */
export function globalAuth(req: Request, res: Response, next: NextFunction) {
  const path = req.path;
  const authRequirement = getRouteAuthRequirement(path);

  logDebug(`[AUTH] ${req.method} ${path} - Requirement: ${authRequirement}`);

  // For public routes, skip authentication entirely
  if (authRequirement === 'public') {
    logDebug(`[AUTH] Public route, skipping authentication`);
    return next();
  }

  // For all other routes, attempt authentication
  authenticateRequest(req, res, (error) => {
    if (error) {
      return next(error);
    }

    // Check authentication requirements based on route type
    switch (authRequirement) {
      case 'optional':
        // Optional auth routes proceed regardless of authentication status
        logDebug(`[AUTH] Optional auth route, proceeding with auth status: ${!!req.user}`);
        return next();

      case 'required':
        // Required routes must have authenticated user
        if (!req.user) {
          logWarn(`[AUTH] Authentication required for ${path}, but no user found`);
          return next(new UnauthorizedError('Authentication required'));
        }
        logDebug(`[AUTH] Required route authenticated successfully`);
        return next();

      case 'scoped':
        // Scoped routes require authentication + specific scopes
        if (!req.user) {
          logWarn(`[AUTH] Authentication required for scoped route ${path}`);
          return next(new UnauthorizedError('Authentication required'));
        }

        const requiredScopes = getRequiredScopes(path);
        // TODO: Implement scope checking once scope system is defined
        logDebug(`[AUTH] Scoped route authenticated, required scopes: ${requiredScopes.join(', ')}`);
        return next();

      default:
        // This should never happen, but fail securely
        logWarn(`[AUTH] Unknown auth requirement: ${authRequirement} for ${path}`);
        return next(new UnauthorizedError('Authentication required'));
    }
  });
}

/**
 * Core authentication logic - attempts to authenticate the request
 * Sets req.user, req.context, req.authMethod, and req.isAuthenticated
 */
async function authenticateRequest(req: Request, res: Response, callback: (error?: Error) => void) {
  try {
    let user: AuthenticatedUser | null = null;
    let authMethod: 'session' | 'token' | null = null;

    // 1. Try token authentication first (Bearer token hashed lookup)
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
          // Create service user context based on token
          user = {
            id: `token_${key.id}`,
            email: '',
            name: key.name || 'API Token',
            image: undefined,
            emailVerified: true,
          };
          (req as any).token = {
            id: key.id,
            flowId: (key as any).flowId,
            scopes: (key as any).scopes || [],
            rateLimit: (key as any).rateLimit || undefined
          };
          // Update last used timestamp (best-effort)
          try {
            await (db as any)
              .update((schema as any).flowApiKey)
              .set({ lastUsedAt: new Date() })
              .where(((schema as any).flowApiKey.id as any).eq(key.id));
          } catch (updateError) {
            logWarn('Failed to update API key last used timestamp:', updateError);
          }
          authMethod = 'token';
          logDebug(`[AUTH] Token authentication successful for key: ${key.name}`);
        }
      } catch (error) {
        logWarn('API token authentication failed:', (error as any)?.message || error);
      }

      // If not our API token, try Better Auth bearer session as fallback
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
            logDebug(`[AUTH] Better Auth bearer session successful for user: ${user.email}`);
          }
        } catch (err) {
          logWarn('Better Auth bearer session failed:', (err as any)?.message || err);
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
            const { db } = await import('../../infrastructure/database/connection.js');
            const schemaAll = await import('../../infrastructure/database/schema/index.js');
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
                logDebug(`[AUTH] Reconstructed session from uid cookie for user: ${row.email}`);
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
            logDebug(`[AUTH] Session authentication successful for user: ${user.email}`);
          }
        } catch (error) {
          logWarn('Session authentication failed:', error);
        }
      }
    }

    // 3. Set request context
    req.user = user || undefined;
    req.authMethod = authMethod || undefined;
    req.isAuthenticated = !!user;
    req.context = user ? { user } : undefined;

    if (user) {
      logInfo(`[AUTH] User authenticated: ${user.email} via ${authMethod}`);
    } else {
      logDebug(`[AUTH] No authentication found`);
    }

    callback();
  } catch (error) {
    logWarn('Authentication error:', error);
    callback(error as Error);
  }
}