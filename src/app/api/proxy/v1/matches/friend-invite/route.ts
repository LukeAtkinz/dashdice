import { NextRequest, NextResponse } from 'next/server';






































const GO_BACKEND_URL = process.env.GO_BACKEND_URL || 'https://dashdice-production.up.railway.app';

// Simple in-memory cache to avoid hitting unavailable backend repeatedly
let backendUnavailableUntil = 0;
const BACKEND_RETRY_DELAY = 5 * 60 * 1000; // 5 minutes

async function tryGoBackend(url: string, options: RequestInit): Promise<Response | null> {
  // If backend is marked as unavailable and we're still in the retry delay, skip
  if (Date.now() < backendUnavailableUntil) {
    console.log('[Friend Invite Proxy] Skipping Go backend - marked unavailable');
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for friend invites
    
    console.log('[Friend Invite Proxy] Calling Go backend:', url);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    if (response.ok) {
      // Reset the unavailable marker on success
      backendUnavailableUntil = 0;
      console.log('[Friend Invite Proxy] Go backend responded successfully');
      return response;
    } else {
      console.log(`[Friend Invite Proxy] Go backend responded with status: ${response.status}`);
      const errorText = await response.text();
      console.log(`[Friend Invite Proxy] Error response: ${errorText}`);
      // Mark as unavailable for a while if it's consistently failing
      backendUnavailableUntil = Date.now() + BACKEND_RETRY_DELAY;
      return null;
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('[Friend Invite Proxy] Go backend request timed out');
    } else {
      console.log('[Friend Invite Proxy] Go backend error:', error.message);
    }
    // Mark as unavailable for a while
    backendUnavailableUntil = Date.now() + BACKEND_RETRY_DELAY;
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    console.log('[Friend Invite Proxy] Handling friend invite request');
    
    const response = await tryGoBackend(
      `${GO_BACKEND_URL}/api/v1/matches/friend-invite`,
      {
        method: 'POST',
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body,
      }
    );

    if (response) {
      const data = await response.json();
      console.log('[Friend Invite Proxy] Successfully proxied to Go backend');
      return NextResponse.json(data);
    }

    // Return 503 to trigger Firebase fallback
    console.log('[Friend Invite Proxy] Go backend unavailable, returning 503');
    return NextResponse.json(
      { 
        error: 'Go backend unavailable for friend invite', 
        code: 'BACKEND_UNAVAILABLE',
        message: 'Friend invite service temporarily unavailable' 
      },
      { status: 503 }
    );
    
  } catch (error) {
    console.error('[Friend Invite Proxy] Error handling friend invite request:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        message: 'Failed to process friend invite request' 
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
