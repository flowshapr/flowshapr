import { Request, Response, NextFunction } from "express";
import { auth } from "../../infrastructure/auth/auth";
import { UnauthorizedError } from "../utils/errors";
import type { AuthenticatedUser, RequestContext } from "../types/index";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      context?: RequestContext;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError("Authorization token required");
    }

    const token = authHeader.substring(7);
    
    // Verify session with Better Auth
    const session = await auth.api.getSession({
      headers: new Headers({
        authorization: `Bearer ${token}`,
      }),
    });

    if (!session || !session.user) {
      throw new UnauthorizedError("Invalid or expired token");
    }

    const authenticatedUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image || undefined,
      emailVerified: session.user.emailVerified,
    };

    req.user = authenticatedUser;
    req.context = {
      user: authenticatedUser,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  // Use requireAuth but catch any errors and continue
  requireAuth(req, res, (error) => {
    if (error) {
      // Log the error but don't fail the request
      console.warn('Optional auth failed:', error.message);
    }
    next();
  });
}