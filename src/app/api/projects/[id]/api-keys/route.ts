import { NextRequest } from 'next/server';
import { proxyJson } from '@/lib/api/proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJson(request, `/api/projects/${id}/api-keys`, { method: 'GET' });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJson(request, `/api/projects/${id}/api-keys`, { method: 'POST' });
}
