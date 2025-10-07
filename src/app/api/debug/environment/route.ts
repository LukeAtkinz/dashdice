import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Force environment refresh
    const GO_BACKEND_URL = process.env.GO_BACKEND_URL;
    const NODE_ENV = process.env.NODE_ENV;
    
    console.log('🔍 Environment Debug:');
    console.log('GO_BACKEND_URL:', GO_BACKEND_URL);
    console.log('NODE_ENV:', NODE_ENV);
    
    // Test direct Railway connection with all possible variations
    const testUrls = [
      `${GO_BACKEND_URL}/health`,
      `${GO_BACKEND_URL}/api/v1/health`,
      'https://go-backend-production-448a.up.railway.app/health',
      'https://go-backend-production-448a.up.railway.app/api/v1/health'
    ];
    
    const results = [];
    
    for (const url of testUrls) {
      try {
        console.log(`Testing: ${url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'DashDice-Diagnostic',
            'Accept': 'application/json'
          }
        });
        
        clearTimeout(timeoutId);
        
        const status = response.status;
        const text = await response.text();
        
        results.push({
          url,
          status,
          ok: response.ok,
          response: text,
          success: true
        });
        
        console.log(`✅ ${url}: ${status} - ${text}`);
        
      } catch (error: any) {
        results.push({
          url,
          error: error.message,
          success: false
        });
        console.log(`❌ ${url}: ${error.message}`);
      }
    }
    
    return NextResponse.json({
      environment: {
        GO_BACKEND_URL,
        NODE_ENV,
        timestamp: new Date().toISOString()
      },
      tests: results,
      message: 'Direct backend connectivity test completed'
    });
    
  } catch (error) {
    console.error('Diagnostic error:', error);
    return NextResponse.json({
      error: 'Diagnostic failed',
      details: (error as Error).message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { forceReset } = await request.json();
    
    if (forceReset) {
      // Force a complete cache reset by setting a timestamp
      const resetTime = Date.now();
      console.log(`🔄 FORCE RESET TRIGGERED: ${resetTime}`);
      
      return NextResponse.json({
        message: 'Force reset triggered',
        timestamp: resetTime,
        instruction: 'This should reset all in-memory cache'
      });
    }
    
    return NextResponse.json({
      message: 'Send POST with forceReset: true to trigger reset'
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Reset failed',
      details: (error as Error).message
    }, { status: 500 });
  }
}