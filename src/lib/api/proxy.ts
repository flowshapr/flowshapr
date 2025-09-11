import { NextRequest, NextResponse } from 'next/server';

// Centralized backend URL resolution
export function backendBaseUrl(): string {
  return process.env.BACKEND_URL || 'http://127.0.0.1:3001';
}

// Build absolute backend URL from a path or from an incoming request URL
export function buildBackendUrlFromPath(path: string, search = ''): string {
  const base = backendBaseUrl().replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}${search || ''}`;
}

export function buildBackendUrlFromRequest(request: NextRequest): string {
  const url = new URL(request.url);
  return buildBackendUrlFromPath(url.pathname, url.search);
}

// Extract session cookie as a Cookie header string if present
export function getCookieHeader(request: NextRequest): string | null {
  const sessionCookie = request.cookies.get('sessionId');
  if (sessionCookie?.value) return `sessionId=${sessionCookie.value}`;
  const header = request.headers.get('cookie');
  return header && header.length > 0 ? header : null;
}

// Standard JSON responses
export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function internalError(message = 'Internal error') {
  return NextResponse.json({ error: message }, { status: 500 });
}

// Attempt to parse JSON; fall back to text if needed
async function parseJsonOrText(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    try {
      const text = await response.text();
      return { message: text };
    } catch {
      return {};
    }
  }
}

// Proxy with JSON semantics and auth by default
export async function proxyJson(
  request: NextRequest,
  pathOrAbsoluteUrl: string,
  init?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    requireAuth?: boolean;
  }
) {
  try {
    const requireAuth = init?.requireAuth ?? true;
    const cookieHeader = getCookieHeader(request);
    if (requireAuth && !cookieHeader) return unauthorized();

    const url = pathOrAbsoluteUrl.startsWith('http')
      ? pathOrAbsoluteUrl
      : buildBackendUrlFromPath(pathOrAbsoluteUrl);

    const method = init?.method || request.method || 'GET';
    const fetchInit: RequestInit = {
      method,
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    };

    if (method !== 'GET' && method !== 'HEAD') {
      const body = init?.body ?? (await request.json().catch(() => ({})));
      fetchInit.body = JSON.stringify(body);
    }

    const resp = await fetch(url, fetchInit);
    const data = await parseJsonOrText(resp);
    return NextResponse.json(data, { status: resp.status });
  } catch (e) {
    return internalError();
  }
}

// Proxy expecting a text response (e.g., exporting as plain text)
export async function proxyText(
  request: NextRequest,
  pathOrAbsoluteUrl: string,
  init?: { method?: string; requireAuth?: boolean; headers?: Record<string, string>; contentType?: string }
) {
  try {
    const requireAuth = init?.requireAuth ?? true;
    const cookieHeader = getCookieHeader(request);
    if (requireAuth && !cookieHeader) return unauthorized();

    const url = pathOrAbsoluteUrl.startsWith('http')
      ? pathOrAbsoluteUrl
      : buildBackendUrlFromPath(pathOrAbsoluteUrl);

    const method = init?.method || request.method || 'GET';
    const fetchInit: RequestInit = {
      method,
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...(init?.headers || {}),
      },
    };

    if (method !== 'GET' && method !== 'HEAD') {
      const bodyText = await request.text();
      fetchInit.body = bodyText;
    }

    const resp = await fetch(url, fetchInit);
    const text = await resp.text().catch(() => '');
    return new NextResponse(text, {
      status: resp.status,
      headers: { 'Content-Type': init?.contentType || 'text/plain; charset=utf-8' },
    });
  } catch (e) {
    return internalError();
  }
}

// Full passthrough proxy (for auth/teams/organizations catch-all routes)
export async function proxyPassthrough(request: NextRequest) {
  const backendUrl = buildBackendUrlFromRequest(request);
  const isBodyless = request.method === 'GET' || request.method === 'HEAD';
  const body = isBodyless ? undefined : await request.text();

  console.log(`[PROXY] ${request.method} ${request.url} -> ${backendUrl}`);
  console.log(`[PROXY] Backend base URL: ${backendBaseUrl()}`);
  
  try {
    const resp = await fetch(backendUrl, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        host: new URL(backendBaseUrl()).host,
      } as HeadersInit,
      body,
    });

    console.log(`[PROXY] Response: ${resp.status} ${resp.statusText}`);
    const respBody = await resp.text();
    
    return new Response(respBody, {
      status: resp.status,
      statusText: resp.statusText,
      headers: resp.headers,
    });
  } catch (error) {
    console.error(`[PROXY] Error connecting to backend:`, error);
    return new Response(JSON.stringify({
      error: 'Backend connection failed',
      details: error instanceof Error ? error.message : String(error),
      backendUrl
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

