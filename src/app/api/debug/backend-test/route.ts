import { NextResponse } from 'next/server';





export async function GET() {
  const goBackendUrl = process.env.GO_BACKEND_URL || 'NOT_SET';
  
  // Test the Go backend connection
  let connectionStatus = 'unknown';
  let responseTime = 0;
  let error = null;
  
  try {
    const start = Date.now();
    const response = await fetch(`${goBackendUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    responseTime = Date.now() - start;
    
    if (response.ok) {
      const data = await response.json();
      connectionStatus = 'connected';
      return NextResponse.json({
        status: 'success',
        GO_BACKEND_URL: goBackendUrl,
        connectionStatus,
        responseTime: `${responseTime}ms`,
        backendResponse: data,
        message: 'Go backend is connected and responding!'
      });
    } else {
      connectionStatus = 'error';
      error = `HTTP ${response.status}`;
    }
  } catch (err: any) {
    connectionStatus = 'failed';
    error = err.message;
  }
  
  return NextResponse.json({
    status: connectionStatus === 'connected' ? 'success' : 'error',
    GO_BACKEND_URL: goBackendUrl,
    connectionStatus,
    responseTime: responseTime > 0 ? `${responseTime}ms` : 'timeout',
    error,
    message: connectionStatus === 'connected' 
      ? 'Go backend is connected!'
      : 'Go backend is not available. Using Firebase fallback.',
    instructions: goBackendUrl === 'NOT_SET' 
      ? 'Set GO_BACKEND_URL=https://api.dashdice.gg in Vercel environment variables'
      : connectionStatus === 'failed'
      ? 'Check if the Go backend server is running and accessible'
      : 'Go backend configured but not responding properly'
  });
}
