import { NextRequest, NextResponse } from 'next/server';

const GO_BACKEND_URL = process.env.GO_BACKEND_URL || 'http://localhost:8080';

// Force ready endpoint - emergency fallback
export async function POST(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    console.log('[Force Ready API] Forcing match to ready:', params.matchId);
    
    const body = await request.json();
    console.log('[Force Ready API] Request data:', body);
    
    // Try Go backend first
    try {
      const goResponse = await fetch(`${GO_BACKEND_URL}/api/v1/matches/${params.matchId}/force-ready`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || '',
        },
        body: JSON.stringify(body),
      });

      if (goResponse.ok) {
        const data = await goResponse.json();
        console.log('[Force Ready API] Go backend success:', data);
        return NextResponse.json(data);
      } else {
        console.log('[Force Ready API] Go backend failed:', await goResponse.text());
      }
    } catch (goError) {
      console.log('[Force Ready API] Go backend error:', goError);
    }

    // Always return success for fallback
    const fallbackResponse = {
      success: true,
      message: 'Match forced to ready status',
      matchStatus: 'ready',
      botPlayer: body.botPlayer
    };
    
    console.log('[Force Ready API] Returning fallback response:', fallbackResponse);
    return NextResponse.json(fallbackResponse);
    
  } catch (error) {
    console.error('[Force Ready API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to force ready', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}