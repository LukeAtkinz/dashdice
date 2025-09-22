import { NextRequest, NextResponse } from 'next/server';













interface GameStatusRequest {
  match_id?: string;
  user_id?: string;
}

interface GameStatusResponse {
  match_id: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  players?: Array<{
    user_id: string;
    status: 'connected' | 'disconnected' | 'ready';
    score?: number;
  }>;
  game_state?: any;
  created_at?: string;
  updated_at?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('match_id');
    const userId = searchParams.get('user_id');
    
    if (!matchId && !userId) {
      return NextResponse.json(
        { 
          error: 'Either match_id or user_id parameter is required',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }
    
    // Get match service URL from environment
    const matchServiceUrl = process.env.MATCH_SERVICE_URL || 'http://localhost:8081';
    
    let endpoint = '';
    if (matchId) {
      endpoint = `${matchServiceUrl}/api/v1/matches/${matchId}`;
    } else if (userId) {
      endpoint = `${matchServiceUrl}/api/v1/matches/user/${userId}`;
    }
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'DashDice-Vercel-Proxy/1.0',
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          {
            error: 'Match not found',
            code: 'MATCH_NOT_FOUND'
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        {
          error: 'Match service unavailable',
          code: 'SERVICE_ERROR'
        },
        { status: response.status }
      );
    }
    
    const matchData: GameStatusResponse = await response.json();
    
    return NextResponse.json({
      ...matchData,
      timestamp: new Date().toISOString(),
      deployment: 'vercel'
    });
    
  } catch (error) {
    console.error('Game status API error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields for game action
    if (!body.match_id || !body.user_id || !body.action) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: match_id, user_id, and action are required',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }
    
    // Forward game action to match service
    const matchServiceUrl = process.env.MATCH_SERVICE_URL || 'http://localhost:8081';
    
    const response = await fetch(`${matchServiceUrl}/api/v1/matches/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DashDice-Vercel-Proxy/1.0',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Match action service error:', errorData);
      
      return NextResponse.json(
        {
          error: 'Game action failed',
          code: 'ACTION_FAILED',
          details: response.status === 500 ? 'Internal server error' : errorData
        },
        { status: response.status }
      );
    }
    
    const result = await response.json();
    
    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
      deployment: 'vercel'
    });
    
  } catch (error) {
    console.error('Game action API error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
