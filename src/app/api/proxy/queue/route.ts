import { NextRequest, NextResponse } from 'next/server';







































const GO_BACKEND_URL = process.env.GO_BACKEND_URL || process.env.API_GATEWAY_URL || 'https://dashdice-production.up.railway.app';

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

export async function DELETE(request: NextRequest) {
  try {
    // Try Go backend first
    const response = await fetch(`${GO_BACKEND_URL}/api/v1/queue/leave`, {
      method: 'DELETE',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
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

export async function GET(request: NextRequest) {
  try {
    // Try Go backend first
    const response = await fetch(`${GO_BACKEND_URL}/api/v1/queue/status`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
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
