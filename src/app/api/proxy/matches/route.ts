import { NextRequest, NextResponse } from 'next/server';












// Static export configuration for Capacitor builds
export const dynamic = 'force-static';
export const revalidate = false;
export const fetchCache = 'force-cache';
export const runtime = 'nodejs';
export const preferredRegion = 'auto';

const GO_BACKEND_URL = process.env.GO_BACKEND_URL || process.env.API_GATEWAY_URL || 'https://dashdice-production.up.railway.app';

// Simple in-memory cache to avoid hitting unavailable backend repeatedly
let backendUnavailableUntil = 0;
const BACKEND_RETRY_DELAY = 5 * 1000; // Reduced to 5 seconds for better responsiveness

async function tryGoBackend(url: string, options: RequestInit): Promise<Response | null> {
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
    
    if (response.ok || response.status === 404) {
      // Reset the unavailable marker on success or 404 (valid responses)
      backendUnavailableUntil = 0;
      return response;
    } else {
      console.log(`[Proxy] Go backend responded with status: ${response.status}`);
      // Only mark as unavailable for server errors (5xx), not client errors (4xx)
      if (response.status >= 500) {
        backendUnavailableUntil = Date.now() + BACKEND_RETRY_DELAY;
        console.log(`[Proxy] Marking backend unavailable for ${BACKEND_RETRY_DELAY/1000}s due to server error`);
      }
      return response; // Return the response even if not OK, let caller handle it
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
  
  // Map frontend status names to backend status names
  const status = searchParams.get('status');
  if (status === 'ready' || status === 'in_progress') {
    searchParams.set('status', 'active');
  }
  
  const queryString = searchParams.toString();
  
  const response = await tryGoBackend(
    `${GO_BACKEND_URL}/api/v1/matches${queryString ? `?${queryString}` : ''}`,
    {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    }
  );

  if (response) {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`[Proxy] Go backend success:`, { status: response.status, dataKeys: Object.keys(data) });
        return NextResponse.json(data);
      } else {
        // Not JSON, likely HTML - backend is returning Next.js frontend instead of API
        const text = await response.text();
        console.log(`[Proxy] Go backend returned HTML instead of JSON:`, {
          status: response.status,
          contentType,
          textPreview: text.substring(0, 200)
        });
        // Fall through to unavailable response
      }
    } catch (parseError) {
      console.log(`[Proxy] Failed to parse Go backend response:`, parseError);
      // Fall through to unavailable response
    }
  }

  // Go backend is unavailable - need to fix Railway deployment
  console.log('[Proxy] Go backend unavailable - Railway URL returns Next.js frontend instead of Go API');
  console.log('[Proxy] Backend URL:', GO_BACKEND_URL);
  return NextResponse.json(
    { 
      success: false,
      error: 'Go backend service not properly deployed', 
      code: 'BACKEND_UNAVAILABLE',
      message: 'Go backend API service is not accessible. Railway deployment may be misconfigured.',
      debugInfo: {
        backendUrl: GO_BACKEND_URL,
        expectedPath: '/api/v1/matches',
        issue: 'Railway URL returns Next.js frontend instead of Go API server'
      }
    },
    { status: 503 }
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  
  const response = await tryGoBackend(
    `${GO_BACKEND_URL}/api/v1/matches`,
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
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return NextResponse.json(data);
      } else {
        // Not JSON, likely HTML - backend is returning Next.js frontend instead of API
        const text = await response.text();
        console.log(`[Proxy] Go backend returned HTML for POST:`, {
          status: response.status,
          contentType,
          textPreview: text.substring(0, 200)
        });
        // Fall through to unavailable response
      }
    } catch (parseError) {
      console.log(`[Proxy] Failed to parse Go backend POST response:`, parseError);
      // Fall through to unavailable response
    }
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
