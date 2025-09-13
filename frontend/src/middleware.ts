import { NextRequest, NextResponse } from 'next/server';

// Protected routes that require authentication
const protectedPaths = [
  '/app',
  '/dashboard',
  '/flows',
  '/organizations',
  '/settings',
];

// Public routes that don't require authentication
const publicPaths = [
  '/',
  '/login',
  '/register',
  '/api/auth', // Allow auth API calls
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow API routes, static files, and Next.js internals to pass through
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.json') ||
    pathname.endsWith('.xml') ||
    pathname.endsWith('.txt')
  ) {
    return NextResponse.next();
  }

  // Check if the current path is public
  const isPublicPath = publicPaths.some(path =>
    pathname === path || pathname.startsWith(path)
  );

  // Check if the current path requires authentication
  const isProtectedPath = protectedPaths.some(path =>
    pathname === path || pathname.startsWith(path)
  );

  // Simple cookie-based authentication check - no backend validation
  // Let the backend handle authentication validation through API responses
  const sessionCookie = request.cookies.get('sessionId');
  const hasSessionCookie = !!sessionCookie?.value;

  // Redirect users with session cookie away from auth pages
  if (hasSessionCookie && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  // Redirect users without session cookie to login for protected routes
  if (isProtectedPath && !hasSessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect users without session cookie from root to login
  if (pathname === '/' && !hasSessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect users with session cookie from root to app
  if (pathname === '/' && hasSessionCookie) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};