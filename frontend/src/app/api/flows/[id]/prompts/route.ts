import { NextRequest } from 'next/server';
import { proxyJson } from '@/lib/api/proxy';

// Flow-scoped prompts proxy that forwards directly to backend flow routes.

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJson(request, `/api/flows/${id}/prompts`, { method: 'GET' });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJson(request, `/api/flows/${id}/prompts`, { method: 'POST' });
}
