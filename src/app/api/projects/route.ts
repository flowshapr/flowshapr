import { NextRequest } from 'next/server';
import { proxyJson } from '@/lib/api/proxy';

export async function GET(request: NextRequest) {
  return proxyJson(request, '/api/projects', { method: 'GET' });
}

export async function POST(request: NextRequest) {
  return proxyJson(request, '/api/projects', { method: 'POST' });
}
