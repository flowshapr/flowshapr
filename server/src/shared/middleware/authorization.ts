import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '@casl/ability';
import { defineAbilitiesFor, getUserContext, Actions, Subjects, checkAbility, UserContext } from '../authorization/abilities';
import { db } from '../../infrastructure/database/connection';
import * as schema from '../../infrastructure/database/schema';
import { eq, and } from 'drizzle-orm';
import { UnauthorizedError } from '../utils/errors';
import { logError } from '../utils/logger';

// Extend Express Request to include ability
declare global {
  namespace Express {
    interface Request {
      ability?: ReturnType<typeof defineAbilitiesFor>;
      userContext?: UserContext | null;
    }
  }
}

/**
 * Middleware to load user's complete authorization context
 * Similar to Laravel's authorization but using CASL
 */
export async function loadUserAbilities(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next();
    }

    // Get user's roles across all levels
    const userContext = await getUserCompleteContext(req.user.id);
    
    if (userContext) {
      req.userContext = userContext;
      req.ability = defineAbilitiesFor(userContext);
    }

    next();
  } catch (error) {
    logError('Error loading user abilities:', error);
    next(error);
  }
}

/**
 * Authorization middleware factory - checks if user can perform action on subject
 * Usage: authorize('update', 'Flow', (req) => ({ id: req.params.flowId }))
 */
export function authorize(
  action: Actions, 
  subject: Subjects, 
  resourceFn?: (req: Request) => any
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.ability) {
        throw new UnauthorizedError('User abilities not loaded');
      }

      const resource = resourceFn ? resourceFn(req) : undefined;
      
      // Use CASL's ForbiddenError for consistent error handling
      ForbiddenError.from(req.ability).throwUnlessCan(action, subject, resource);
      
      next();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        res.status(403).json({
          success: false,
          error: {
            message: `Access denied: ${error.message}`,
            code: 'FORBIDDEN'
          }
        });
        return;
      }
      next(error);
    }
  };
}

// Project-specific authorization removed

/**
 * Flow-specific authorization middleware
 */
export function authorizeFlow(action: Actions) {
  return authorize(action, 'Flow', (req) => ({
    id: req.params.flowId || req.params.id
  }));
}

/**
 * Helper function to check abilities programmatically in services
 */
export async function checkUserAbility(userId: string, action: Actions, subject: Subjects, resource?: any): Promise<boolean> {
  const userContext = await getUserCompleteContext(userId);
  if (!userContext) return false;
  
  return checkAbility(userContext, action, subject, resource);
}

/**
 * Get complete user context with all roles from database
 */
export async function getUserCompleteContext(userId: string) {
  if (!db) {
    throw new Error('Database not available');
  }

  try {
    // Get user's organization ownership
    const userOrganizations = await db
      .select({
        organizationId: schema.organization.id,
      })
      .from(schema.organization)
      .where(eq(schema.organization.ownerId, userId));

    // Get user's team memberships
    const teamMemberships = await db
      .select({
        teamId: schema.teamMember.teamId,
        role: schema.teamMember.role
      })
      .from(schema.teamMember)
      .where(eq(schema.teamMember.userId, userId));

    // Projects deprecated: no project roles

    // Get user info
    const [userInfo] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    if (!userInfo) {
      return null;
    }

    return {
      user: { 
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        image: userInfo.image ?? undefined,
        emailVerified: userInfo.emailVerified
      },
      organizationId: userOrganizations[0]?.organizationId,
      organizationRole: userOrganizations.length > 0 ? 'owner' : undefined,
      teamRoles: teamMemberships.map(t => ({ 
        teamId: t.teamId as string, 
        role: t.role as string 
      })),
    };
  } catch (error) {
    logError('Error getting user context:', error);
    return null;
  }
}

/**
 * Middleware to ensure user has access to specific project
 * Loads project and checks permissions
 */
// Project access removed
