import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import type { AuthenticatedUser } from '../types';

// Define subjects (resources) that can be controlled
export type Subjects = 
  | 'Organization' 
  | 'Team' 
  | 'Flow' 
  | 'Prompt' 
  | 'Dataset' 
  | 'Trace' 
  | 'ApiKey'
  | 'User'
  | 'all';

// Define actions that can be performed
export type Actions = 
  | 'manage'   // wildcard for any action
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete'
  | 'invite'   // invite members
  | 'execute'  // execute flows
  | 'deploy'   // deploy flows
  | 'publish'  // publish flows
  | 'archive'  // archive resources
  | 'view_traces' // view execution traces
  | 'manage_keys'; // manage API keys

export type AppAbility = MongoAbility<[Actions, Subjects]>;

// User context with roles across different levels
export interface UserContext {
  user: AuthenticatedUser;
  organizationId?: string;
  organizationRole?: string;
  teamRoles?: Array<{ teamId: string; role: string }>;
}

/**
 * Define abilities for a user based on their roles across organizations, teams, and projects
 * Similar to Laravel Gates but using simple subject-based permissions
 * 
 * Note: Conditions are currently simplified due to TypeScript/CASL type compatibility issues
 * In production, you may want to implement more granular condition-based permissions
 */
export function defineAbilitiesFor(context: UserContext): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
  const { user, organizationRole, teamRoles = [] } = context;

  // Global abilities for authenticated users
  can('read', 'Organization');
  can('read', 'Team');

  // Organization-level abilities
  if (organizationRole === 'owner') {
    can('manage', 'Organization');
    can('manage', 'Team');
    can('create', 'Flow');
    can('read', 'Flow');
    can('manage', 'Flow');
  }

  // Team-level abilities
  teamRoles.forEach(({ teamId, role }) => {
    if (role === 'admin') {
      can('manage', 'Team');
      can('invite', 'Team');
      can('create', 'Flow');
      can('read', 'Flow');
      can('manage', 'Flow');
    } else if (role === 'developer') {
      can('read', 'Team');
      can('read', 'Flow');
    }
  });

  // Additional permissions for authenticated users
  can('manage_keys', 'ApiKey');
  can('view_traces', 'Trace');
  can('read', 'Prompt');
  can('read', 'Dataset');

  return build();
}

/**
 * Helper function to check if user has specific ability
 * Note: Resource-based checking is simplified - implement proper resource validation in services
 */
export function checkAbility(
  context: UserContext, 
  action: Actions, 
  subject: Subjects, 
  resource?: Record<string, unknown>
): boolean {
  const ability = defineAbilitiesFor(context);
  
  // For now, just check subject-level permissions
  // In production, you'd want to properly match resource conditions
  return ability.can(action, subject);
}

/**
 * Get user context with all their roles
 * This would typically query the database to get user's roles across organizations, teams, and projects
 */
export async function getUserContext(userId: string): Promise<UserContext | null> {
  // This is a placeholder - in real implementation, this would:
  // 1. Query user's organization memberships
  // 2. Query user's team memberships
  // 3. Return complete context
  
  // For now, return basic context
  return {
    user: { 
      id: userId,
      email: '',
      name: '',
      emailVerified: false
    } as AuthenticatedUser,
    // These would be populated from database queries
    organizationRole: undefined,
    teamRoles: [],
  };
}
