import { NextRequest } from 'next/server';
import { proxyJson } from '@/lib/api/proxy';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; keyId: string }> }) {
  const { id, keyId } = await params;
  return proxyJson(request, `/api/flows/${id}/api-keys/${keyId}`, { method: 'DELETE' });
}

