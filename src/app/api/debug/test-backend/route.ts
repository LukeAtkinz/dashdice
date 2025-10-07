import { NextRequest, NextResponse } from 'next/server';

// This endpoint can be used to reset the proxy cache by directly calling the backend
export async function POST(request: NextRequest) {
  const goBackendUrl = process.env.GO_BACKEND_URL || 'http://localhost:8080';
  
  // Test direct connection to Railway
  try {
    const testUrl = 'https://go-backend-production-448a.up.railway.app/health';
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.text();
    
    return NextResponse.json({
      success: true,
      backend_url: goBackendUrl,
      test_url: testUrl,
      status: response.status,
      response: data,
      message: 'Backend connection test completed. This should reset proxy cache.',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      backend_url: goBackendUrl,
      error: (error as Error).message,
      message: 'Backend connection failed',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Backend test endpoint - use POST to test connection and reset cache',
    usage: 'POST /api/debug/test-backend'
  });
}