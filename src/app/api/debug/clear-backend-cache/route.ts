import { NextRequest, NextResponse } from 'next/server';

// This is a debug endpoint to reset backend availability cache














export async function POST(request: NextRequest) {
  try {
    // Reset cache by clearing module cache for proxy routes
    // This forces a fresh import of proxy modules
    const proxyModules = [
      '/src/app/api/proxy/matches/route',
      '/src/app/api/proxy/queue/route'
    ];
    
    // In development, we can clear the require cache
    if (process.env.NODE_ENV === 'development') {
      Object.keys(require.cache).forEach(key => {
        if (proxyModules.some(module => key.includes(module))) {
          delete require.cache[key];
        }
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Backend cache cleared - next request will retry Go backend',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to clear cache', details: error },
      { status: 500 }
    );
  }
}
