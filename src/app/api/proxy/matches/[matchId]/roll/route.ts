import { NextRequest, NextResponse } from 'next/server';

interface RollDiceRequest {
  playerId: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = params;
    const body: RollDiceRequest = await request.json();
    const { playerId } = body;

    console.log(`🎲 Bot roll dice proxy: matchId=${matchId}, playerId=${playerId}`);

    if (!matchId || !playerId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get Go backend URL from environment
    const GO_BACKEND_URL = process.env.GO_BACKEND_URL || 'https://dashdice-go-backend-production.up.railway.app';

    // Make request to Go backend roll dice endpoint
    const response = await fetch(`${GO_BACKEND_URL}/matches/${matchId}/roll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        playerId: playerId
      })
    });

    if (!response.ok) {
      console.error(`❌ Go backend roll dice failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      return NextResponse.json(
        { success: false, error: `Go backend error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log(`✅ Bot roll dice successful:`, result);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Bot roll dice proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}