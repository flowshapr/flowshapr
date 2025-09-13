import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check - you can extend this to check database connectivity, etc.
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      service: 'flowshapr-frontend'
    };

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    const errorHealth = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'flowshapr-frontend'
    };

    return NextResponse.json(errorHealth, { status: 503 });
  }
}

export async function HEAD() {
  // For simple health checks that don't need response body
  return new Response(null, { status: 200 });
}