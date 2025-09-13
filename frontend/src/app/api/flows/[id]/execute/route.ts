import { NextRequest } from 'next/server';
import { proxyJson } from '@/lib/api/proxy';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Forward the request body as-is (supports both Genkit direct format and FlowShapr wrapped format)
  return proxyJson(request, `/api/flows/${id}/execute`, { method: 'POST' });
}
