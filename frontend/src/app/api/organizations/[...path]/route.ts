import { NextRequest } from 'next/server';
import { proxyPassthrough } from '@/lib/api/proxy';

export async function GET(request: NextRequest) { return proxyPassthrough(request); }
export async function POST(request: NextRequest) { return proxyPassthrough(request); }
export async function PUT(request: NextRequest) { return proxyPassthrough(request); }
export async function DELETE(request: NextRequest) { return proxyPassthrough(request); }
export async function PATCH(request: NextRequest) { return proxyPassthrough(request); }
