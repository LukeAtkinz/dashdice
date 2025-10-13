import { NextRequest, NextResponse } from 'next/server';
import { AbandonedMatchService } from '@/services/abandonedMatchService';
import { NewMatchmakingService } from '@/services/newMatchmakingService';

/**
 * 🧹 Admin API to forcefully clean up stagnant matches
 * This should fix the current 20 stagnant matches in Firebase
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Admin: Starting comprehensive stagnant match cleanup...');

    // Get auth header to ensure this is an admin call
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' }, 
        { status: 401 }
      );
    }

    const results = {
      abandonedMatches: { cleaned: 0, errors: [] as string[] },
      orphanedSessions: { cleaned: 0, errors: [] as string[] },
      totalProcessed: 0,
      timestamp: new Date().toISOString()
    };

    // 1. Force cleanup abandoned matches
    try {
      console.log('🗑️ Running abandoned match cleanup...');
      const abandonedResult = await AbandonedMatchService.forceCleanup();
      results.abandonedMatches = abandonedResult;
      results.totalProcessed += abandonedResult.cleaned;
      console.log(`✅ Abandoned match cleanup: ${abandonedResult.cleaned} matches cleaned`);
    } catch (error) {
      const errorMsg = `Abandoned match cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.abandonedMatches.errors.push(errorMsg);
      console.error('❌', errorMsg);
    }

    // 2. Cleanup orphaned sessions
    try {
      console.log('🔧 Running orphaned session cleanup...');
      await NewMatchmakingService.cleanupAbandonedSessions();
      results.orphanedSessions.cleaned = 1; // Mark as completed
      console.log('✅ Orphaned session cleanup completed');
    } catch (error) {
      const errorMsg = `Orphaned session cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.orphanedSessions.errors.push(errorMsg);
      console.error('❌', errorMsg);
    }

    // 3. Manual direct Firebase cleanup for extremely stagnant matches
    try {
      console.log('🔥 Running direct Firebase cleanup for stagnant matches...');
      const directCleanup = await performDirectFirebaseCleanup();
      results.totalProcessed += directCleanup.cleaned;
      console.log(`✅ Direct cleanup: ${directCleanup.cleaned} documents removed`);
    } catch (error) {
      const errorMsg = `Direct cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌', errorMsg);
    }

    console.log('✅ Comprehensive cleanup completed:', results);

    return NextResponse.json({
      success: true,
      message: 'Stagnant match cleanup completed',
      results
    });

  } catch (error) {
    console.error('❌ Admin cleanup error:', error);
    return NextResponse.json(
      { 
        error: 'Cleanup failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}

/**
 * Direct Firebase cleanup for extremely stagnant matches
 */
async function performDirectFirebaseCleanup(): Promise<{ cleaned: number; errors: string[] }> {
  const { db } = await import('@/services/firebase');
  const { collection, getDocs, deleteDoc, writeBatch, query, where } = await import('firebase/firestore');

  const results = { cleaned: 0, errors: [] as string[] };
  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - (10 * 60 * 1000));
  const batch = writeBatch(db);
  let batchOps = 0;
  const batchLimit = 500;

  try {
    // Collections to forcefully clean
    const collectionsToClean = ['waitingroom', 'gameSessions', 'matches'];

    for (const collectionName of collectionsToClean) {
      try {
        console.log(`🔍 Checking ${collectionName} for stagnant documents...`);
        
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        for (const doc of snapshot.docs) {
          const data = doc.data() as any;
          const createdAt = data.createdAt?.toDate() || new Date(0);
          const lastActivity = data.lastActivity?.toDate() || data.updatedAt?.toDate() || createdAt;
          
          // If older than 10 minutes, mark for deletion
          if (createdAt < tenMinutesAgo && lastActivity < tenMinutesAgo) {
            console.log(`🗑️ Marking stagnant ${collectionName} document for deletion: ${doc.id} (age: ${Math.round((now.getTime() - createdAt.getTime()) / 60000)}min)`);
            
            if (batchOps < batchLimit) {
              batch.delete(doc.ref);
              batchOps++;
            } else {
              await batch.commit();
              const newBatch = writeBatch(db);
              newBatch.delete(doc.ref);
              batchOps = 1;
            }
            
            results.cleaned++;
          }
        }
      } catch (error) {
        const errorMsg = `Error cleaning collection ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }

    // Commit remaining batch operations
    if (batchOps > 0) {
      await batch.commit();
    }

  } catch (error) {
    const errorMsg = `Direct cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    results.errors.push(errorMsg);
    console.error('❌', errorMsg);
  }

  return results;
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger stagnant match cleanup',
    note: 'Requires admin authorization header'
  });
}