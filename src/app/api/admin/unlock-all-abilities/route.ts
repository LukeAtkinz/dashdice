import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/services/firebaseAdmin';

/**
 * Admin API to unlock ALL abilities for ALL users
 * POST /api/admin/unlock-all-abilities
 * Body: { secret: "dashdice-admin-2025" }
 */
export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json();
    
    // Simple security check
    if (secret !== 'dashdice-admin-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('🔓 Starting unlock all abilities for all players...');
    
    // Get all abilities from Firestore
    const abilitiesSnapshot = await adminDb.collection('abilities').get();
    const allAbilityIds = abilitiesSnapshot.docs.map(doc => doc.id);
    console.log(`✅ Found ${allAbilityIds.length} abilities:`, allAbilityIds);
    
    // Get all users
    const usersSnapshot = await adminDb.collection('users').get();
    const allUserIds = usersSnapshot.docs.map(doc => doc.id);
    console.log(`✅ Found ${allUserIds.length} users`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Process in batches of 500 (Firestore limit)
    const batchSize = 500;
    for (let i = 0; i < allUserIds.length; i += batchSize) {
      const batch = adminDb.batch();
      const batchUserIds = allUserIds.slice(i, Math.min(i + batchSize, allUserIds.length));
      
      for (const userId of batchUserIds) {
        try {
          const playerAbilitiesRef = adminDb.collection('playerAbilities').doc(userId);
          
          // Set with merge to create or update
          batch.set(playerAbilitiesRef, {
            playerId: userId,
            unlockedAbilities: allAbilityIds,
            updatedAt: new Date()
          }, { merge: true });
          
          successCount++;
        } catch (error) {
          errorCount++;
          const errorMsg = `Failed for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }
      
      // Commit the batch
      await batch.commit();
      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} committed (${batchUserIds.length} users)`);
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Successfully updated: ${successCount} users`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📋 Total abilities: ${allAbilityIds.length}`);
    
    return NextResponse.json({
      success: true,
      data: {
        totalUsers: allUserIds.length,
        totalAbilities: allAbilityIds.length,
        successCount,
        errorCount,
        abilities: allAbilityIds,
        errors: errors.length > 0 ? errors : undefined
      },
      message: `Successfully unlocked ${allAbilityIds.length} abilities for ${successCount} users`
    });
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
