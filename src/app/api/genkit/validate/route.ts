import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy validation requests to the server-side blocks API
 * POST /api/genkit/validate - Validate flow nodes using server-side validation
 */
export async function POST(request: NextRequest) {
  try {
    const { nodes, edges } = await request.json();
    
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return NextResponse.json(
        { error: 'Nodes and edges must be arrays' },
        { status: 400 }
      );
    }

    // Convert nodes to the format expected by the server validation
    const blocksToValidate = nodes.map(node => ({
      blockType: node.type || node.data?.type || 'unknown',
      config: node.data?.config || {}
    }));

    // Forward to server-side validation
    const serverUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const response = await fetch(`${serverUrl}/api/blocks/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward any session cookies
        ...(request.headers.get('cookie') && { 'Cookie': request.headers.get('cookie')! })
      },
      body: JSON.stringify({ blocks: blocksToValidate })
    });

    const validationResult = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(validationResult, { status: response.status });
    }

    // Convert server response back to frontend format
    const errors = validationResult.data?.errors || [];
    
    return NextResponse.json({
      isValid: validationResult.data?.isValid || false,
      errors: errors.map((error: any) => ({
        message: error.message,
        nodeId: null, // Server validation doesn't include nodeId
        severity: error.severity || 'error',
        field: error.field
      }))
    });

  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to validate flow',
        isValid: false,
        errors: [{
          message: 'Server validation failed',
          severity: 'error'
        }]
      },
      { status: 500 }
    );
  }
}