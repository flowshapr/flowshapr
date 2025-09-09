import { NextRequest } from 'next/server';
import { proxyJson } from '@/lib/api/proxy';

export async function POST(request: NextRequest, { params }: { params: Promise<{ alias: string }> }) {
  const { alias } = await params;
  // Forward bearer token if provided; allow token-only calls (no session cookie required)
  const auth = request.headers.get('authorization') || undefined;
  return proxyJson(request, `/api/flows/by-alias/${alias}/execute`, {
    method: 'POST',
    requireAuth: false,
    headers: auth ? { Authorization: auth } : {},
  });
}

