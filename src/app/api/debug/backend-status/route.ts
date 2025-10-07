import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const goBackendUrl = process.env.GO_BACKEND_URL || 'NOT_SET';
  const nodeEnv = process.env.NODE_ENV || 'NOT_SET';
  
  // Also test the Railway backend directly
  let railwayStatus = 'UNKNOWN';
  let railwayResponse = '';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const testResponse = await fetch('https://go-backend-production-448a.up.railway.app/health', {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    railwayStatus = testResponse.status.toString();
    railwayResponse = await testResponse.text();
  } catch (error) {
    railwayStatus = 'ERROR';
    railwayResponse = (error as Error).message;
  }
  
  return NextResponse.json({
    environment: {
      GO_BACKEND_URL: goBackendUrl,
      NODE_ENV: nodeEnv,
    },
    railway_test: {
      status: railwayStatus,
      response: railwayResponse,
      tested_url: 'https://go-backend-production-448a.up.railway.app/health'
    },
    instructions: goBackendUrl === 'NOT_SET' 
      ? 'GO_BACKEND_URL is not set - this explains the 503 errors'
      : 'Environment variable is set correctly',
    timestamp: new Date().toISOString()
  });
}