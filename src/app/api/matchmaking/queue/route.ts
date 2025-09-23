import { NextRequest, NextResponse } from 'next/server';

// Matchmaking API proxy for Vercel deployment
// Connects to Go microservices running on Docker containers


















interface MatchmakingRequest {
  game_mode: string;
  user_id: string;
  skill_level?: number;
  preferences?: any;
}

interface MatchmakingResponse {
  message: string;
  queue_entry?: {
    user_id: string;
    game_mode: string;
    joined_at: number;
    queue_position: number;
    estimated_wait: string;
    preference?: string;
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: MatchmakingRequest = await request.json();
    
    // Validate required fields
    if (!body.game_mode || !body.user_id) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: game_mode and user_id are required',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }
    
    // Get Go services URLs from environment variables
    const apiGatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:8080';
    const queueServiceUrl = process.env.QUEUE_SERVICE_URL || 'http://localhost:8082';
    
    // Forward request to Go microservice
    const response = await fetch(`${apiGatewayUrl}/api/v1/queue/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DashDice-Vercel-Proxy/1.0',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Matchmaking service error:', errorData);
      
      return NextResponse.json(
        {
          error: 'Matchmaking service unavailable',
          code: 'SERVICE_ERROR',
          details: response.status === 500 ? 'Internal server error' : errorData
        },
        { status: response.status }
      );
    }
    
    const matchmakingResult: MatchmakingResponse = await response.json();
    
    // Add timestamp and additional metadata for Vercel deployment
    const enhancedResponse = {
      ...matchmakingResult,
      timestamp: new Date().toISOString(),
      deployment: 'vercel',
      service_version: '2.0.0'
    };
    
    // Set appropriate headers for real-time updates
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Cache-Control', 'no-store, max-age=0');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return new NextResponse(JSON.stringify(enhancedResponse), {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Matchmaking API error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to process matchmaking request'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'Missing user_id parameter',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }
    
    // Get queue status from Go service
    const queueServiceUrl = process.env.QUEUE_SERVICE_URL || 'http://localhost:8082';
    
    const response = await fetch(`${queueServiceUrl}/api/v1/queue/status?user_id=${userId}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'DashDice-Vercel-Proxy/1.0',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Queue status unavailable',
          code: 'SERVICE_ERROR'
        },
        { status: response.status }
      );
    }
    
    const queueStatus = await response.json();
    
    return NextResponse.json({
      ...queueStatus,
      timestamp: new Date().toISOString(),
      deployment: 'vercel'
    });
    
  } catch (error) {
    console.error('Queue status API error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'Missing user_id parameter',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }
    
    // Leave queue via Go service
    const apiGatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:8080';
    
    const response = await fetch(`${apiGatewayUrl}/api/v1/queue/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DashDice-Vercel-Proxy/1.0',
      },
      body: JSON.stringify({ user_id: userId }),
    });
    
    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Failed to leave queue',
          code: 'SERVICE_ERROR'
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
    console.error('Leave queue API error:', error);
    
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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
