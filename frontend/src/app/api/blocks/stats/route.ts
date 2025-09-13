import { NextRequest, NextResponse } from 'next/server';

/**
 * Frontend API proxy for blocks stats - forwards to backend server
 * GET /api/blocks/stats - Get block registry statistics
 */
export async function GET(request: NextRequest) {
  try {
    const serverUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    
    const response = await fetch(`${serverUrl}/api/blocks/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward session cookies if any
        ...(request.headers.get('cookie') && { 'Cookie': request.headers.get('cookie')! })
      }
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error proxying stats request:', error);
    return NextResponse.json(
      { 
        error: { 
          message: 'Failed to fetch stats from server',
          code: 'PROXY_ERROR' 
        } 
      }, 
      { status: 500 }
    );
  }
}