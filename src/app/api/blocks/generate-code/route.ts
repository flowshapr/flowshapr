import { NextRequest, NextResponse } from 'next/server';

/**
 * Frontend API proxy for code generation - forwards to backend server
 * POST /api/blocks/generate-code - Generate Genkit code from flow definition
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const serverUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    
    const response = await fetch(`${serverUrl}/api/blocks/generate-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward session cookies if any
        ...(request.headers.get('cookie') && { 'Cookie': request.headers.get('cookie')! })
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error proxying code generation request:', error);
    return NextResponse.json(
      { 
        error: { 
          message: 'Failed to generate code on server',
          code: 'PROXY_ERROR' 
        } 
      }, 
      { status: 500 }
    );
  }
}