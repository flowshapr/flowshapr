import { NextRequest } from 'next/server';
import { proxyJson } from '@/lib/api/proxy';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; promptId: string }> }) {
  const { id, promptId } = await params;
  return proxyJson(request, `/api/projects/${id}/prompts/${promptId}`, { method: 'PUT' });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; promptId: string }> }) {
  const { id, promptId } = await params;
  return proxyJson(request, `/api/projects/${id}/prompts/${promptId}`, { method: 'DELETE' });
}
