import { NextRequest, NextResponse } from 'next/server';
import { MatchLifecycleService } from '@/services/matchLifecycleService';

/**
 * 🔧 Admin API for Match Lifecycle Management
 * Provides monitoring, statistics, and manual cleanup controls
 */

// GET - Get match lifecycle statistics
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' }, 
        { status: 401 }
      );
    }

    // Get abandoned match statistics
    const stats = await MatchLifecycleService.getAbandonedMatchStats(24);

    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      stats: {
        ...stats,
        configuration: {
          timeoutMinutes: 10,
          cleanupIntervalMinutes: 2,
          isAutoCleanupEnabled: true
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error getting match lifecycle stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get match lifecycle statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// POST - Force manual cleanup
export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Admin: Starting manual match lifecycle cleanup...');

    // Check admin authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' }, 
        { status: 401 }
      );
    }

    // Get request body to check for specific actions
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'cleanup';

    let results: any = {
      action,
      timestamp: new Date().toISOString(),
      success: false
    };

    switch (action) {
      case 'cleanup':
        // Force cleanup of stagnant matches
        const cleanupResults = await MatchLifecycleService.forceCleanup();
        results = {
          ...results,
          success: true,
          cleaned: cleanupResults.cleaned,
          errors: cleanupResults.errors,
          message: `Successfully cleaned up ${cleanupResults.cleaned} stagnant matches`
        };
        break;

      case 'stats':
        // Get detailed statistics
        const stats = await MatchLifecycleService.getAbandonedMatchStats(24);
        results = {
          ...results,
          success: true,
          stats,
          message: 'Statistics retrieved successfully'
        };
        break;

      case 'user-cleanup':
        // Clean up matches for a specific user
        const userId = body.userId;
        if (!userId) {
          return NextResponse.json(
            { error: 'userId required for user-cleanup action' },
            { status: 400 }
          );
        }

        const userCleanedCount = await MatchLifecycleService.cleanupUserMatches(userId, 'admin_cleanup');
        results = {
          ...results,
          success: true,
          cleaned: userCleanedCount,
          userId,
          message: `Cleaned up ${userCleanedCount} matches for user ${userId}`
        };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: cleanup, stats, user-cleanup` },
          { status: 400 }
        );
    }

    console.log(`✅ Admin cleanup completed:`, results);
    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ Admin cleanup failed:', error);
    return NextResponse.json(
      { 
        error: 'Manual cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}

// PUT - Update match lifecycle configuration
export async function PUT(request: NextRequest) {
  try {
    // Check admin authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    let results: any = {
      action,
      timestamp: new Date().toISOString(),
      success: false
    };

    switch (action) {
      case 'stop-cleanup':
        MatchLifecycleService.stopCleanupScheduler();
        results = {
          ...results,
          success: true,
          message: 'Automatic cleanup scheduler stopped'
        };
        break;

      case 'start-cleanup':
        MatchLifecycleService.initialize();
        results = {
          ...results,
          success: true,
          message: 'Automatic cleanup scheduler started'
        };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: stop-cleanup, start-cleanup` },
          { status: 400 }
        );
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ Error updating match lifecycle configuration:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}