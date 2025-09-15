import { NextResponse } from 'next/server';

export async function GET() {
  const goBackendUrl = process.env.GO_BACKEND_URL || 'NOT_SET';
  
  return NextResponse.json({
    GO_BACKEND_URL: goBackendUrl,
    message: 'This endpoint shows the current GO_BACKEND_URL environment variable',
    instructions: goBackendUrl === 'NOT_SET' 
      ? 'Please set GO_BACKEND_URL=https://api.dashdice.gg in your Vercel environment variables'
      : 'Environment variable is set correctly'
  });
}
