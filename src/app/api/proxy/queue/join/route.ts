import { NextRequest, NextResponse } from 'next/server';

const GO_BACKEND_URL = process.env.GO_BACKEND_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    console.log(`[Queue Join] URGENT: Attempting connection to: ${GO_BACKEND_URL}`);
    
    // EMERGENCY: Force Railway backend connection (completely bypass any cache)
    const isRailway = GO_BACKEND_URL.includes('railway.app');
    if (isRailway) {
      console.log('[Queue Join] EMERGENCY: Railway backend detected - FORCING CONNECTION');
    }
    
    // Add aggressive timeout for Railway backend
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    console.log(`[Queue Join] Making request to: ${GO_BACKEND_URL}/api/v1/queue/join`);
    
    // Try Go backend first
    const response = await fetch(`${GO_BACKEND_URL}/api/v1/queue/join`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
        'X-Bypass-Cache': 'true', // Custom header to force fresh request
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`[Queue Join] Response status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('[Queue Join] SUCCESS: Go backend responded successfully');
      return NextResponse.json(data);
    }

    console.log(`[Queue Join] ERROR: Go backend returned status: ${response.status}`);
    const errorText = await response.text();
    console.log(`[Queue Join] Error response: ${errorText}`);
    
    // If Go backend fails, return error to let client handle Firebase fallback
    return NextResponse.json(
      { error: 'Go backend unavailable', code: 'BACKEND_UNAVAILABLE' },
      { status: 503 }
    );
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[Queue Join] Request timed out after 15 seconds');
    } else {
      console.error('[Queue Join] Proxy error:', error.message, error.stack);
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
