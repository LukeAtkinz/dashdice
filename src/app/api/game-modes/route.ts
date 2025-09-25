import { NextRequest, NextResponse } from 'next/server';









































export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') as 'desktop' | 'mobile' || 'desktop';
    
    const { GameModeService } = await import('@/services/gameModeService');
    const gameModes = await GameModeService.getAvailableGameModes(platform);
    
    return NextResponse.json({
      success: true,
      gameModes
    });
  } catch (error) {
    console.error('Error fetching game modes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch game modes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { modeId } = await request.json();
    
    if (!modeId) {
      return NextResponse.json(
        { success: false, error: 'Mode ID is required' },
        { status: 400 }
      );
    }
    
    const { GameModeService } = await import('@/services/gameModeService');
    const gameMode = await GameModeService.getGameMode(modeId);
    
    if (!gameMode) {
      return NextResponse.json(
        { success: false, error: 'Game mode not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      gameMode
    });
  } catch (error) {
    console.error('Error fetching game mode:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch game mode' },
      { status: 500 }
    );
  }
}
