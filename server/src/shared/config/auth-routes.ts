/**
 * Authentication Route Configuration
 *
 * This file defines which routes require authentication and which are public.
 * By default, ALL routes are protected unless explicitly listed as public.
 */

export interface AuthRouteConfig {
  /** Routes that don't require any authentication */
  publicRoutes: string[];

  /** Routes that enhance functionality if authenticated but work without auth */
  optionalAuthRoutes: string[];

  /** Routes that require specific scopes/permissions beyond basic auth */
  scopedRoutes: Array<{
    pattern: string;
    scopes: string[];
  }>;
}

/**
 * Global authentication configuration
 *
 * Security-first approach: All routes are protected by default.
 * Only explicitly listed routes are public or optional.
 */
export const authConfig: AuthRouteConfig = {
  // Public routes - no authentication required
  publicRoutes: [
    // Health and system endpoints
    '/health',
    '/api/system/status',

    // Authentication endpoints
    '/api/auth/sign-up/email',
    '/api/auth/sign-in/email',
    '/api/auth/sign-out',
    '/api/auth/session',

    // Social auth callbacks (if enabled)
    '/api/auth/callback/**',

    // Telemetry endpoints for Genkit
    '/telemetry/**',

    // Public flow execution (by alias)
    '/api/flows/by-alias/*/execute',
  ],

  // Optional auth routes - work without auth but provide enhanced features when authenticated
  optionalAuthRoutes: [
    '/api/flows/by-alias/**', // Public flows but show more details if authenticated
    '/api/blocks/**', // Block metadata - public but may show user-specific info if authenticated
  ],

  // Scoped routes - require specific permissions beyond basic authentication
  scopedRoutes: [
    {
      pattern: '/api/flows/*/execute',
      scopes: ['flow:execute']
    },
    {
      pattern: '/api/organizations/**',
      scopes: ['org:read']
    },
    {
      pattern: '/api/teams/**',
      scopes: ['team:read']
    }
  ]
};

/**
 * Check if a route pattern matches a given path
 * Supports wildcards (* and **)
 */
export function matchesRoutePattern(pattern: string, path: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\*\*/g, '.*') // ** matches any characters including /
    .replace(/(?<!\*)\*(?!\*)/g, '[^/]*') // * matches any characters except /
    .replace(/\./g, '\\.'); // Escape dots

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Determine the authentication requirement for a given route
 */
export function getRouteAuthRequirement(path: string): 'public' | 'optional' | 'required' | 'scoped' {
  // Check public routes first
  if (authConfig.publicRoutes.some(pattern => matchesRoutePattern(pattern, path))) {
    return 'public';
  }

  // Check optional auth routes
  if (authConfig.optionalAuthRoutes.some(pattern => matchesRoutePattern(pattern, path))) {
    return 'optional';
  }

  // Check scoped routes
  if (authConfig.scopedRoutes.some(route => matchesRoutePattern(route.pattern, path))) {
    return 'scoped';
  }

  // Default: all other routes require authentication
  return 'required';
}

/**
 * Get required scopes for a scoped route
 */
export function getRequiredScopes(path: string): string[] {
  const scopedRoute = authConfig.scopedRoutes.find(route =>
    matchesRoutePattern(route.pattern, path)
  );

  return scopedRoute?.scopes || [];
}