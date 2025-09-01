import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { AuthenticatedUser } from '../types';

// Define subjects (resources) that can be controlled
export type Subjects = 
  | 'Organization' 
  | 'Team' 
  | 'Project' 
  | 'Flow' 
  | 'Prompt' 
  | 'Dataset' 
  | 'Trace' 
  | 'ApiKey'
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

export type AppAbility = ReturnType<typeof createMongoAbility<[Actions, Subjects]>>;

// User context with roles across different levels
export interface UserContext {
  user: AuthenticatedUser;
  organizationRole?: string;
  teamRoles?: Array<{ teamId: string; role: string }>;
  projectRoles?: Array<{ projectId: string; role: string }>;
}

/**
 * Define abilities for a user based on their roles across organizations, teams, and projects
 * Similar to Laravel Gates but with CASL's MongoDB-query-like conditions
 */
export function defineAbilitiesFor(context: UserContext) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility<[Actions, Subjects]>);
  const { user, organizationRole, teamRoles = [], projectRoles = [] } = context;

  // Global abilities for authenticated users
  can('read', 'Organization', { ownerId: user.id });
  can('read', 'Team', { organization: { ownerId: user.id } });

  // Organization-level abilities
  if (organizationRole === 'owner') {
    can('manage', 'Organization', { ownerId: user.id });
    can('manage', 'Team', { organization: { ownerId: user.id } });
    can('create', 'Project', { organizationId: user.organizationId });
    can('read', 'Project', { organizationId: user.organizationId });
  }

  // Team-level abilities
  teamRoles.forEach(({ teamId, role }) => {
    if (role === 'admin') {
      can('manage', 'Team', { id: teamId });
      can('invite', 'Team', { id: teamId });
      can('create', 'Project', { teamId });
      can('read', 'Project', { teamId });
    } else if (role === 'developer') {
      can('read', 'Team', { id: teamId });
      can('read', 'Project', { teamId });
    }
  });

  // Project-level abilities - most granular level
  projectRoles.forEach(({ projectId, role }) => {
    const projectCondition = { id: projectId };
    const projectResourceCondition = { projectId };

    switch (role) {
      case 'owner':
        can('manage', 'Project', projectCondition);
        can('manage', 'Flow', projectResourceCondition);
        can('manage', 'Prompt', projectResourceCondition);
        can('manage', 'Dataset', projectResourceCondition);
        can('manage', 'ApiKey', projectResourceCondition);
        can('view_traces', 'Trace', projectResourceCondition);
        can('invite', 'Project', projectCondition);
        can('deploy', 'Flow', projectResourceCondition);
        break;

      case 'admin':
        can('read', 'Project', projectCondition);
        can('update', 'Project', projectCondition);
        can('manage', 'Flow', projectResourceCondition);
        can('manage', 'Prompt', projectResourceCondition);
        can('manage', 'Dataset', projectResourceCondition);
        can('read', 'ApiKey', projectResourceCondition);
        can('view_traces', 'Trace', projectResourceCondition);
        can('invite', 'Project', projectCondition);
        can('deploy', 'Flow', projectResourceCondition);
        can('publish', 'Flow', projectResourceCondition);
        break;

      case 'developer':
        can('read', 'Project', projectCondition);
        can('create', 'Flow', projectResourceCondition);
        can('read', 'Flow', projectResourceCondition);
        can('update', 'Flow', projectResourceCondition);
        can('create', 'Prompt', projectResourceCondition);
        can('read', 'Prompt', projectResourceCondition);
        can('update', 'Prompt', projectResourceCondition);
        can('read', 'Dataset', projectResourceCondition);
        can('execute', 'Flow', projectResourceCondition);
        can('view_traces', 'Trace', projectResourceCondition);
        // Cannot delete flows, deploy, or manage API keys
        break;

      case 'viewer':
        can('read', 'Project', projectCondition);
        can('read', 'Flow', projectResourceCondition);
        can('read', 'Prompt', projectResourceCondition);
        can('read', 'Dataset', projectResourceCondition);
        can('execute', 'Flow', projectResourceCondition);
        can('view_traces', 'Trace', projectResourceCondition);
        // Read-only access
        break;
    }
  });

  // Additional constraints
  // Users can only manage their own API keys within their access level
  can('manage_keys', 'ApiKey', { createdBy: user.id });
  
  // Users can always read their own traces
  can('view_traces', 'Trace', { executedBy: user.id });

  return build();
}

/**
 * Helper function to check if user has specific ability
 */
export function checkAbility(context: UserContext, action: Actions, subject: Subjects, resource?: any) {
  const ability = defineAbilitiesFor(context);
  return ability.can(action, subject, resource);
}

/**
 * Get user context with all their roles
 * This would typically query the database to get user's roles across organizations, teams, and projects
 */
export async function getUserContext(userId: string): Promise<UserContext | null> {
  // This is a placeholder - in real implementation, this would:
  // 1. Query user's organization memberships
  // 2. Query user's team memberships
  // 3. Query user's project memberships
  // 4. Return complete context
  
  // For now, return basic context
  return {
    user: { id: userId } as AuthenticatedUser,
    // These would be populated from database queries
    organizationRole: undefined,
    teamRoles: [],
    projectRoles: []
  };
}