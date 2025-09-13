import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; connectionId: string }> }) {
  try {
    const { id, connectionId } = await params;
    const sessionCookie = request.cookies.get('sessionId');
    const cookieHeader = sessionCookie ? `sessionId=${sessionCookie.value}` : (request.headers.get('cookie') || '');
    if (!cookieHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3001';
    const resp = await fetch(`${backendUrl}/api/flows/${id}/connections/${connectionId}`, { method: 'PUT', headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await resp.json().catch(async () => ({ message: await resp.text().catch(() => '') }));
    return NextResponse.json(data, { status: resp.status });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; connectionId: string }> }) {
  try {
    const { id, connectionId } = await params;
    const sessionCookie = request.cookies.get('sessionId');
    const cookieHeader = sessionCookie ? `sessionId=${sessionCookie.value}` : (request.headers.get('cookie') || '');
    if (!cookieHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3001';
    const resp = await fetch(`${backendUrl}/api/flows/${id}/connections/${connectionId}`, { method: 'DELETE', headers: { Cookie: cookieHeader } });
    const data = await resp.json().catch(async () => ({ message: await resp.text().catch(() => '') }));
    return NextResponse.json(data, { status: resp.status });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

