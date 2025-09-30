import { NextRequest, NextResponse } from 'next/server';

const GO_BACKEND_URL = process.env.GO_BACKEND_URL || 'https://dashdice-go-backend-production.up.railway.app';

// Simple in-memory cache to avoid hitting unavailable backend repeatedly
let backendUnavailableUntil = 0;
const BACKEND_RETRY_DELAY = 5 * 60 * 1000; // 5 minutes

async function tryGoBackend(url: string, options: RequestInit): Promise<Response | null> {
  // If backend is marked as unavailable and we're still in the retry delay, skip
  if (Date.now() < backendUnavailableUntil) {
    console.log('[Match Proxy] Skipping Go backend - marked unavailable');
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
      console.log(`[Match Proxy] Go backend responded with status: ${response.status}`);
      return null;
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('[Match Proxy] Go backend request timed out');
    } else {
      console.log('[Match Proxy] Go backend error:', error.message);
    }
    
    // Mark as unavailable for a while
    backendUnavailableUntil = Date.now() + BACKEND_RETRY_DELAY;
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = params;

    if (!matchId) {
      return NextResponse.json(
        { success: false, error: 'Match ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Getting match data for bot automation: ${matchId}`);

    // Try Go backend first
    const response = await tryGoBackend(
      `${GO_BACKEND_URL}/matches/${matchId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    if (response) {
      const data = await response.json();
      console.log(`✅ Match data retrieved from Go backend:`, { matchId, status: data.status, gamePhase: data.gamePhase });
      return NextResponse.json(data);
    }

    // If Go backend is unavailable, return a 503 to indicate service unavailable
    console.log(`❌ Go backend unavailable for match: ${matchId}`);
    return NextResponse.json(
      { success: false, error: 'Backend unavailable', code: 'BACKEND_UNAVAILABLE' },
      { status: 503 }
    );

  } catch (error) {
    console.error('❌ Match proxy GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
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