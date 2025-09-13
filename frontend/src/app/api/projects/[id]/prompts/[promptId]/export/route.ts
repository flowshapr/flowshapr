import { NextRequest } from 'next/server';
import { proxyText } from '@/lib/api/proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; promptId: string }> }) {
  const { id, promptId } = await params;
  return proxyText(request, `/api/projects/${id}/prompts/${promptId}/export`, { method: 'GET', contentType: 'text/plain; charset=utf-8' });
}
