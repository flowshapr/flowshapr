import { NextRequest, NextResponse } from 'next/server';

// Route configuration - secure by default
const publicPaths = [
  '/',
  '/login',
  '/register',
  '/api/auth', // Allow auth API calls
];

const protectedPaths = [
  '/app',
  '/dashboard',
  '/flows',
  '/organizations',
  '/settings',
];

// Cache for session validation to avoid excessive API calls
const sessionCache = new Map<string, { valid: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Validate session with backend
 * Uses caching to avoid excessive API calls
 */
async function validateSessionWithBackend(sessionId: string): Promise<boolean> {
  // Check cache first
  const cached = sessionCache.get(sessionId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.valid;
  }

  try {
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3001';
    const response = await fetch(`${backendUrl}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Cookie': `sessionId=${sessionId}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-cache',
    });

    // Check both status code AND response data
    // Backend returns {"data": null} for invalid/no sessions
    // Backend returns {"data": {...}} for valid sessions
    let isValid = false;
    if (response.ok) {
      try {
        const data = await response.json();
        isValid = data?.data !== null && data?.data !== undefined;
      } catch (jsonError) {
        console.warn('[MIDDLEWARE] Failed to parse session response:', jsonError);
        isValid = false;
      }
    }

    // Cache the result
    sessionCache.set(sessionId, {
      valid: isValid,
      timestamp: Date.now(),
    });

    return isValid;
  } catch (error) {
    console.warn('[MIDDLEWARE] Session validation failed:', error);
    // Cache negative result to avoid repeated failed requests
    sessionCache.set(sessionId, {
      valid: false,
      timestamp: Date.now(),
    });
    return false;
  }
}

/**
 * Clean up expired cache entries
 */
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of sessionCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      sessionCache.delete(key);
    }
  }
}

/**
 * Check if path matches any pattern in the array
 */
function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some(path => {
    if (path.endsWith('*')) {
      return pathname.startsWith(path.slice(0, -1));
    }
    return pathname === path || pathname.startsWith(path + '/');
  });
}

/**
 * Enhanced middleware with backend session validation
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Clean up cache periodically (1% chance per request)
  if (Math.random() < 0.01) {
    cleanupCache();
  }

  // Allow API routes, static files, and Next.js internals to pass through
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')  // More comprehensive static file check
  ) {
    return NextResponse.next();
  }

  // Check route types
  const isPublicPath = matchesPath(pathname, publicPaths);
  const isProtectedPath = matchesPath(pathname, protectedPaths);

  // Get session cookie
  const sessionCookie = request.cookies.get('sessionId');
  const sessionId = sessionCookie?.value;

  // For public routes, handle authentication-aware redirects
  if (isPublicPath) {
    // If user has session and tries to access auth pages, redirect to app
    if (sessionId && (pathname === '/login' || pathname === '/register')) {
      // Validate session before redirecting
      try {
        const isValidSession = await validateSessionWithBackend(sessionId);
        if (isValidSession) {
          return NextResponse.redirect(new URL('/app', request.url));
        }
        // If session is invalid, clear the cookie and continue to auth page
        const response = NextResponse.next();
        response.cookies.delete('sessionId');
        return response;
      } catch (error) {
        // If validation fails, continue to auth page
        const response = NextResponse.next();
        response.cookies.delete('sessionId');
        return response;
      }
    }

    // Root path handling
    if (pathname === '/') {
      if (sessionId) {
        try {
          const isValidSession = await validateSessionWithBackend(sessionId);
          if (isValidSession) {
            return NextResponse.redirect(new URL('/app', request.url));
          } else {
            // Invalid session - clear cookie and redirect to login
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete('sessionId');
            return response;
          }
        } catch (error) {
          // Validation failed - redirect to login
          const response = NextResponse.redirect(new URL('/login', request.url));
          response.cookies.delete('sessionId');
          return response;
        }
      } else {
        // No session - redirect to login
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    // Allow other public paths
    return NextResponse.next();
  }

  // For protected routes, enforce authentication
  if (isProtectedPath) {
    if (!sessionId) {
      // No session cookie - redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Validate session with backend
    try {
      const isValidSession = await validateSessionWithBackend(sessionId);
      if (!isValidSession) {
        // Invalid session - clear cookie and redirect to login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('sessionId');
        return response;
      }

      // Session is valid - proceed
      return NextResponse.next();
    } catch (error) {
      // Validation failed - redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('sessionId');
      return response;
    }
  }

  // Default: allow the request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes (handled by API layer)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - files with extensions (static assets)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};