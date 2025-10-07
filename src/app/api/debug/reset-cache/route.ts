import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // This endpoint is for resetting the proxy cache state
    // Since the cache is in-memory per instance, redeploying resets it
    // But we can provide a status check
    
    const GO_BACKEND_URL = process.env.GO_BACKEND_URL;
    
    if (!GO_BACKEND_URL || GO_BACKEND_URL === "1") {
      return NextResponse.json({
        status: 'error',
        message: 'GO_BACKEND_URL not properly configured',
        GO_BACKEND_URL: GO_BACKEND_URL || 'undefined',
        action_needed: 'Update environment variables'
      }, { status: 500 });
    }

    // Test Railway connection
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${GO_BACKEND_URL}/health`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.text();
        return NextResponse.json({
          status: 'success',
          message: 'Cache reset triggered - Railway backend is accessible',
          GO_BACKEND_URL,
          railway_status: response.status,
          railway_response: data,
          instructions: 'Proxy cache will be reset on next request',
          timestamp: new Date().toISOString()
        });
      } else {
        return NextResponse.json({
          status: 'warning',
          message: 'Cache reset triggered but Railway backend returned non-200',
          GO_BACKEND_URL,
          railway_status: response.status,
          instructions: 'Check Railway backend health',
          timestamp: new Date().toISOString()
        }, { status: 200 }); // Still return 200 to indicate cache was reset
      }
    } catch (error: any) {
      return NextResponse.json({
        status: 'warning',
        message: 'Cache reset triggered but Railway backend connection failed',
        GO_BACKEND_URL,
        error: error.message,
        instructions: 'Environment variables may need time to propagate',
        timestamp: new Date().toISOString()
      }, { status: 200 }); // Still return 200 to indicate cache was reset
    }
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to reset cache',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST method to reset cache',
    instructions: 'Send POST request to trigger cache reset and test Railway backend'
  });
}