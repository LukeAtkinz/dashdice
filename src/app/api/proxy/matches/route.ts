import { NextRequest, NextResponse } from 'next/server';

const GO_BACKEND_URL = process.env.GO_BACKEND_URL || 'http://localhost:8080';

// Simple in-memory cache to avoid hitting unavailable backend repeatedly
let backendUnavailableUntil = 0;
const BACKEND_RETRY_DELAY = 5 * 60 * 1000; // 5 minutes

// Cache reset mechanism - force retry if environment changed
const CACHE_RESET_MARKER = process.env.GO_BACKEND_URL || 'default';
let lastEnvironmentMarker = CACHE_RESET_MARKER;

function checkAndResetCache() {
  if (lastEnvironmentMarker !== CACHE_RESET_MARKER) {
    console.log('[Proxy] Environment changed - resetting backend cache');
    backendUnavailableUntil = 0;
    lastEnvironmentMarker = CACHE_RESET_MARKER;
  }
}

async function tryGoBackend(url: string, options: RequestInit): Promise<Response | null> {
  // Check for environment changes and reset cache if needed
  checkAndResetCache();
  
  // Force cache reset if GO_BACKEND_URL contains Railway (our fix)
  if (GO_BACKEND_URL.includes('railway.app') && backendUnavailableUntil > 0) {
    console.log('[Proxy] Railway backend detected - forcing cache reset');
    backendUnavailableUntil = 0;
  }
  
  // If backend is marked as unavailable and we're still in the retry delay, skip
  if (Date.now() < backendUnavailableUntil) {
    console.log('[Proxy] Skipping Go backend - marked unavailable');
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    if (response.ok) {
      // Reset the unavailable marker on success
      backendUnavailableUntil = 0;
      return response;
    } else {
      console.log(`[Proxy] Go backend responded with status: ${response.status}`);
      // Mark as unavailable for a while if it's consistently failing
      backendUnavailableUntil = Date.now() + BACKEND_RETRY_DELAY;
      return null;
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('[Proxy] Go backend request timed out');
    } else {
      console.log('[Proxy] Go backend error:', error.message);
    }
    // Mark as unavailable for a while
    backendUnavailableUntil = Date.now() + BACKEND_RETRY_DELAY;
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  
  const response = await tryGoBackend(
    `${GO_BACKEND_URL}/api/v1/matches/${queryString ? `?${queryString}` : ''}`,
    {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    }
  );

  if (response) {
    const data = await response.json();
    return NextResponse.json(data);
  }

  // Return 503 to trigger Firebase fallback
  return NextResponse.json(
    { error: 'Go backend unavailable', code: 'BACKEND_UNAVAILABLE' },
    { status: 503 }
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  
  const response = await tryGoBackend(
    `${GO_BACKEND_URL}/api/v1/matches/`,
    {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body,
    }
  );

  if (response) {
    const data = await response.json();
    return NextResponse.json(data);
  }

  // Return 503 to trigger Firebase fallback
  return NextResponse.json(
    { error: 'Go backend unavailable', code: 'BACKEND_UNAVAILABLE' },
    { status: 503 }
  );
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
