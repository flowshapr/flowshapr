import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '@casl/ability';
import { defineAbilitiesFor, getUserContext, Actions, Subjects, checkAbility, UserContext } from '../authorization/abilities';
import { db } from '../../infrastructure/database/connection';
import * as schema from '../../infrastructure/database/schema';
import { user } from '../../infrastructure/database/schema';
import { eq, and } from 'drizzle-orm';
import { UnauthorizedError } from '../utils/errors';

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
    console.error('Error loading user abilities:', error);
    next(error);
  }
}

/**
 * Authorization middleware factory - checks if user can perform action on subject
 * Usage: authorize('create', 'Project')
 * Usage: authorize('update', 'Flow', (req) => ({ projectId: req.params.projectId }))
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

/**
 * Project-specific authorization middleware
 * Checks if user has access to a specific project
 */
export function authorizeProject(action: Actions, resourceType: Subjects = 'Project') {
  return authorize(action, resourceType, (req) => {
    const projectId = req.params.projectId || req.params.id;
    return projectId ? { projectId } : { id: projectId };
  });
}

/**
 * Flow-specific authorization middleware
 */
export function authorizeFlow(action: Actions) {
  return authorize(action, 'Flow', (req) => ({
    projectId: req.params.projectId,
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
async function getUserCompleteContext(userId: string) {
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

    // Get user's project memberships
    const projectMemberships = await db
      .select({
        projectId: schema.projectMember.projectId,
        role: schema.projectMember.role
      })
      .from(schema.projectMember)
      .where(eq(schema.projectMember.userId, userId));

    // Get user's project ownerships (through project creation)
    const ownedProjects = await db
      .select({
        projectId: schema.project.id,
      })
      .from(schema.project)
      .where(eq(schema.project.createdBy, userId));

    // Combine project memberships and ownerships
    const allProjectRoles = [
      ...projectMemberships.map(p => ({ 
        projectId: p.projectId as string, 
        role: p.role as string 
      })),
      ...ownedProjects.map(p => ({ 
        projectId: p.projectId, 
        role: 'owner' 
      }))
    ];

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
      projectRoles: allProjectRoles
    };
  } catch (error) {
    console.error('Error getting user context:', error);
    return null;
  }
}

/**
 * Middleware to ensure user has access to specific project
 * Loads project and checks permissions
 */
export function requireProjectAccess(action: Actions = 'read') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const projectId = req.params.projectId || req.params.id;
      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Project ID is required',
            code: 'MISSING_PROJECT_ID'
          }
        });
      }

      // Load project to verify it exists
      if (!db) {
        throw new Error('Database not available');
      }
      
      const project = await db
        .select()
        .from(schema.project)
        .where(eq(schema.project.id, projectId))
        .limit(1);

      if (project.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
          }
        });
      }

      // Check if user has required access
      const hasAccess = await checkUserAbility(req.user.id, action, 'Project', { id: projectId });
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            message: `Access denied: You don't have permission to ${action} this project`,
            code: 'FORBIDDEN'
          }
        });
      }

      // Attach project to request for use in controllers
      req.project = project[0];
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Extend Request interface for project
declare global {
  namespace Express {
    interface Request {
      project?: typeof schema.project.$inferSelect;
    }
  }
}