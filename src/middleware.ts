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

async function getSession(request: NextRequest) {
  try {
    // Get the session cookie
    const sessionCookie = request.cookies.get('sessionId');
    if (!sessionCookie?.value) return null;

    // Call the backend to validate the session
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/api/auth/session`, {
      headers: {
        Cookie: `sessionId=${sessionCookie.value}`,
      },
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    return data?.data || null;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

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

  // Get the user session
  const session = await getSession(request);
  const isAuthenticated = !!session;

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  // Redirect unauthenticated users to login for protected routes
  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect unauthenticated users from root to login
  if (pathname === '/' && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users from root to app
  if (pathname === '/' && isAuthenticated) {
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