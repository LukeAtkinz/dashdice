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
    console.log(`[Proxy] Attempting Go backend request: ${url}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    console.log(`[Proxy] Go backend response: ${response.status} ${response.statusText}`);
    
    // Consider any response as "available" - let caller handle status codes
    backendUnavailableUntil = 0;
    return response;
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('[Proxy] Go backend request timed out');
    } else {
      console.log('[Proxy] Go backend error:', error.message);
    }
    // Mark as unavailable for a while only on network/timeout errors
    backendUnavailableUntil = Date.now() + BACKEND_RETRY_DELAY;
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    
    console.log(`[Proxy] Fetching specific match: ${matchId}`);
    
    // Validate matchId format
    if (!matchId || typeof matchId !== 'string') {
      console.log(`[Proxy] Invalid matchId format: ${matchId}`);
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid match ID format', 
          code: 'INVALID_MATCH_ID',
          message: `Match ID '${matchId}' is not valid`
        },
        { status: 400 }
      );
    }
    
    const response = await tryGoBackend(
      `${GO_BACKEND_URL}/api/v1/matches/${matchId}`,
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
          console.log(`[Proxy] Go backend success for match ${matchId}:`, { 
            status: response.status, 
            hasData: !!data,
            matchId: data?.matchId || data?.id || 'unknown'
          });
          return NextResponse.json(data, { status: response.status });
        } else {
          // Not JSON, likely HTML error page - check if it's a 404 (match not found)
          const text = await response.text();
          console.log(`[Proxy] Go backend returned non-JSON for match ${matchId}:`, {
            status: response.status,
            contentType,
            textPreview: text.substring(0, 200)
          });
          
          // Handle both 404 and 500 errors as "match not found" since Go backend
          // returns 500 HTML error pages for non-existent matches
          if (response.status === 404 || (response.status === 500 && text.includes('<!DOCTYPE html>'))) {
            return NextResponse.json(
              { 
                success: false,
                error: 'Match not found', 
                code: 'MATCH_NOT_FOUND',
                message: `Match '${matchId}' does not exist in Go backend`,
                details: {
                  matchId,
                  backendStatus: response.status,
                  isHtmlResponse: text.includes('<!DOCTYPE html>')
                }
              },
              { status: 404 }
            );
          }
          
          // For other non-JSON responses, return 502
          return NextResponse.json(
            { 
              success: false,
              error: 'Backend returned HTML instead of JSON', 
              code: 'BACKEND_HTML_RESPONSE',
              message: `Go backend returned HTML response for match ${matchId}`,
              details: {
                backendStatus: response.status,
                contentType,
                isHtml: text.includes('<!DOCTYPE html>')
              }
            },
            { status: 502 }
          );
        }
      } catch (parseError) {
        console.log(`[Proxy] Failed to parse Go backend response for match ${matchId}:`, parseError);
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to parse backend response', 
            code: 'BACKEND_PARSE_ERROR',
            message: `Could not parse response from Go backend for match ${matchId}`,
            details: { parseError: parseError instanceof Error ? parseError.message : String(parseError) }
          },
          { status: 502 }
        );
      }
    }

    // Go backend is unavailable
    console.log(`[Proxy] Go backend unavailable for match ${matchId}`);
    return NextResponse.json(
      { 
        success: false,
        error: 'Backend service unavailable', 
        code: 'BACKEND_UNAVAILABLE',
        message: `Go backend service is currently unavailable for match ${matchId}`,
        debugInfo: {
          matchId,
          backendUrl: GO_BACKEND_URL,
          expectedPath: `/api/v1/matches/${matchId}`,
          retryAfter: Math.ceil((backendUnavailableUntil - Date.now()) / 1000)
        }
      },
      { status: 503 }
    );
  } catch (error) {
    console.error(`[Proxy] Unexpected error in GET /api/proxy/matches/:`, error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while processing the request'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const body = await request.text();
  
  try {
    const parsedBody = JSON.parse(body);
    console.log(`[Proxy] Updating match: ${matchId}`, {
      action: parsedBody.action,
      playerId: parsedBody.playerId,
      playerName: parsedBody.playerName,
      playerType: parsedBody.playerType
    });
  } catch (e) {
    console.log(`[Proxy] Updating match: ${matchId}`, { bodyLength: body.length });
  }
  
  const response = await tryGoBackend(
    `${GO_BACKEND_URL}/api/v1/matches/${matchId}`,
    {
      method: 'PUT',
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
        console.log(`[Proxy] Match update success for ${matchId}:`, {
          status: response.status,
          hasData: !!data,
          success: data.success,
          error: data.error
        });
        return NextResponse.json(data);
      } else {
        // Not JSON, likely HTML - treat as error
        const text = await response.text();
        console.log(`[Proxy] Go backend returned non-JSON for match update ${matchId}:`, {
          status: response.status,
          contentType,
          textPreview: text.substring(0, 200)
        });
        // Fall through to 503 response
      }
    } catch (parseError) {
      console.log(`[Proxy] Failed to parse Go backend response for match update ${matchId}:`, parseError);
      // Fall through to 503 response
    }
  }

  // Return 503 to trigger fallback behavior
  console.log(`[Proxy] Go backend unavailable for match update: ${matchId}`);
  return NextResponse.json(
    { 
      error: 'Go backend unavailable for match update', 
      code: 'BACKEND_UNAVAILABLE',
      matchId 
    },
    { status: 503 }
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  
  console.log(`[Proxy] Deleting match: ${matchId}`);
  
  const response = await tryGoBackend(
    `${GO_BACKEND_URL}/api/v1/matches/${matchId}`,
    {
      method: 'DELETE',
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
        console.log(`[Proxy] Match deletion success for ${matchId}`);
        return NextResponse.json(data);
      } else {
        // Not JSON, likely HTML - treat as error
        const text = await response.text();
        console.log(`[Proxy] Go backend returned non-JSON for match deletion ${matchId}:`, {
          status: response.status,
          contentType,
          textPreview: text.substring(0, 200)
        });
        // Fall through to 503 response
      }
    } catch (parseError) {
      console.log(`[Proxy] Failed to parse Go backend response for match deletion ${matchId}:`, parseError);
      // Fall through to 503 response
    }
  }

  // Return 503 to trigger fallback behavior
  return NextResponse.json(
    { 
      error: 'Go backend unavailable for match deletion', 
      code: 'BACKEND_UNAVAILABLE',
      matchId 
    },
    { status: 503 }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}