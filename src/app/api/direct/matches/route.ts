import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://go-backend-production-448a.up.railway.app';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const limit = searchParams.get('limit') || '10';
    
    console.log(`[Direct Railway] GET matches - status: ${status}, limit: ${limit}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${RAILWAY_URL}/api/v1/matches/?status=${status}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
        'User-Agent': 'DashDice-Direct-Bypass'
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.log(`[Direct Railway] SUCCESS - Got ${data.matches?.length || 0} matches`);
      return NextResponse.json(data);
    } else {
      console.log(`[Direct Railway] ERROR - Status: ${response.status}`);
      const errorText = await response.text();
      console.log(`[Direct Railway] Error response: ${errorText}`);
      
      return NextResponse.json(
        { error: `Railway backend error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
  } catch (error: any) {
    console.error('[Direct Railway] Exception:', error.message);
    return NextResponse.json(
      { error: 'Direct Railway connection failed', details: error.message },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    console.log(`[Direct Railway] POST matches - Body: ${body}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${RAILWAY_URL}/api/v1/matches/`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
        'User-Agent': 'DashDice-Direct-Bypass'
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.log(`[Direct Railway] POST SUCCESS`);
      return NextResponse.json(data);
    } else {
      console.log(`[Direct Railway] POST ERROR - Status: ${response.status}`);
      const errorText = await response.text();
      console.log(`[Direct Railway] Error response: ${errorText}`);
      
      return NextResponse.json(
        { error: `Railway backend error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
  } catch (error: any) {
    console.error('[Direct Railway] POST Exception:', error.message);
    return NextResponse.json(
      { error: 'Direct Railway connection failed', details: error.message },
      { status: 503 }
    );
  }
}