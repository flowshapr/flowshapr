import { NextRequest } from 'next/server';
import { proxyJson } from '@/lib/api/proxy';

export async function GET(request: NextRequest) {
  return proxyJson(request, '/api/flows', { method: 'GET' });
}

export async function POST(request: NextRequest) {
  return proxyJson(request, '/api/flows', { method: 'POST' });
}
