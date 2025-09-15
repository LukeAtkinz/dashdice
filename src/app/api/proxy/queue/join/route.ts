import { NextRequest, NextResponse } from 'next/server';

// Static export configuration for Capacitor builds
export const dynamic = 'force-static';
export const revalidate = false;

const GO_BACKEND_URL = process.env.GO_BACKEND_URL || 'https://dashdice-production-55b7.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    // Try Go backend first
    const response = await fetch(`${GO_BACKEND_URL}/api/v1/queue/join`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body,
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }

    // If Go backend fails, return error to let client handle Firebase fallback
    return NextResponse.json(
      { error: 'Go backend unavailable', code: 'BACKEND_UNAVAILABLE' },
      { status: 503 }
    );
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Go backend unavailable', code: 'BACKEND_UNAVAILABLE' },
      { status: 503 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
