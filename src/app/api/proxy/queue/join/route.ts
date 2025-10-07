import { NextRequest, NextResponse } from 'next/server';

const GO_BACKEND_URL = process.env.GO_BACKEND_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    console.log(`[Queue Join] Attempting connection to: ${GO_BACKEND_URL}`);
    
    // Force Railway backend connection (bypass any cache issues)
    if (GO_BACKEND_URL.includes('railway.app')) {
      console.log('[Queue Join] Railway backend detected - forcing connection');
    }
    
    // Add timeout for Railway backend
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    // Try Go backend first
    const response = await fetch(`${GO_BACKEND_URL}/api/v1/queue/join`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.log('[Queue Join] Go backend success');
      return NextResponse.json(data);
    }

    console.log(`[Queue Join] Go backend returned status: ${response.status}`);
    
    // If Go backend fails, return error to let client handle Firebase fallback
    return NextResponse.json(
      { error: 'Go backend unavailable', code: 'BACKEND_UNAVAILABLE' },
      { status: 503 }
    );
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[Queue Join] Request timed out');
    } else {
      console.error('[Queue Join] Proxy error:', error.message);
    }
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
