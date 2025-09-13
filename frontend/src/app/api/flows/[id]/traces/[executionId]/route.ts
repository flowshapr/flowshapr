import { NextRequest } from 'next/server';
import { proxyJson } from '@/lib/api/proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; executionId: string }> }) {
  const { id, executionId } = await params;
  return proxyJson(request, `/api/flows/${id}/traces/${executionId}`, { method: 'GET' });
}
