import { NextRequest, NextResponse } from 'next/server';

interface TurnDeciderRequest {
  playerId: string;
  choice: 'odd' | 'even';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = params;
    const body: TurnDeciderRequest = await request.json();
    const { playerId, choice } = body;

    console.log(`🎯 Bot turn decider proxy: matchId=${matchId}, playerId=${playerId}, choice=${choice}`);

    if (!matchId || !playerId || !choice) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (!['odd', 'even'].includes(choice)) {
      return NextResponse.json(
        { success: false, error: 'Invalid choice. Must be "odd" or "even"' },
        { status: 400 }
      );
    }

    // Get Go backend URL from environment
    const GO_BACKEND_URL = process.env.GO_BACKEND_URL || 'https://dashdice-go-backend-production.up.railway.app';

    // Make request to Go backend turn decider endpoint
    const response = await fetch(`${GO_BACKEND_URL}/matches/${matchId}/turn-decider`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        playerId: playerId,
        choice: choice
      })
    });

    if (!response.ok) {
      console.error(`❌ Go backend turn decider failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      return NextResponse.json(
        { success: false, error: `Go backend error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log(`✅ Bot turn decider choice successful:`, result);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Bot turn decider proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}