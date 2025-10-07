import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://go-backend-production-448a.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    console.log(`[Direct Railway Queue] POST queue/join - Body: ${body}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${RAILWAY_URL}/api/v1/queue/join`, {
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
      console.log(`[Direct Railway Queue] SUCCESS`);
      return NextResponse.json(data);
    } else {
      console.log(`[Direct Railway Queue] ERROR - Status: ${response.status}`);
      const errorText = await response.text();
      console.log(`[Direct Railway Queue] Error response: ${errorText}`);
      
      return NextResponse.json(
        { error: `Railway backend error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
  } catch (error: any) {
    console.error('[Direct Railway Queue] Exception:', error.message);
    return NextResponse.json(
      { error: 'Direct Railway connection failed', details: error.message },
      { status: 503 }
    );
  }
}