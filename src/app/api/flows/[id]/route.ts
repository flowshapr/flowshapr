import { NextRequest } from 'next/server';
import { proxyJson } from '@/lib/api/proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJson(request, `/api/flows/${id}`, { method: 'GET' });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJson(request, `/api/flows/${id}`, { method: 'PUT' });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJson(request, `/api/flows/${id}`, { method: 'DELETE' });
}
