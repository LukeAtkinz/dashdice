import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/services/firebaseAdmin';
import { ALL_PREDEFINED_ABILITIES } from '@/data/predefinedAbilities';

/**
 * Admin API to unlock all abilities for a specific user
 * POST /api/admin/unlock-abilities
 * Body: { username: "Hero1" }
 */
export async function POST(request: NextRequest) {
  try {
    const { username, secret } = await request.json();
    
    // Simple security check
    if (secret !== 'unlock-abilities-admin-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }
    
    console.log(`🔍 Looking for user: ${username}`);
    
    // Find user by username
    const usersSnapshot = await adminDb.collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    
    console.log(`✅ Found user: ${userId} (${userData.username})`);
    
    // Get all ability IDs
    const allAbilityIds = ALL_PREDEFINED_ABILITIES.map(ability => ability.id);
    
    console.log(`🚀 Unlocking ${allAbilityIds.length} abilities...`);
    
    // Batch operations for better performance
    const batch = adminDb.batch();
    let unlockedCount = 0;
    
    // Check existing abilities first
    const existingAbilities = await adminDb.collection('userAbilities')
      .where('userId', '==', userId)
      .get();
    
    const existingAbilityIds = new Set(
      existingAbilities.docs.map(doc => doc.data().abilityId)
    );
    
    // Unlock each ability that's not already unlocked
    for (const abilityId of allAbilityIds) {
      if (!existingAbilityIds.has(abilityId)) {
        const userAbilityRef = adminDb.collection('userAbilities').doc();
        batch.set(userAbilityRef, {
          userId,
          abilityId,
          unlockedAt: new Date(),
          timesUsed: 0,
          successRate: 100,
          isEquipped: false
        });
        unlockedCount++;
      }
    }
    
    // Update user progression
    const progressionRef = adminDb.collection('userProgression').doc(userId);
    batch.set(progressionRef, {
      userId,
      level: 50,
      xp: 100000,
      xpToNextLevel: 0,
      totalWins: 100,
      totalMatches: 120,
      winStreak: 10,
      maxStarPoints: 25,
      unlockedAbilities: allAbilityIds,
      stats: {
        abilitiesUsed: 500,
        mostUsedAbility: 'lucky_reroll',
        favoriteCategory: 'utility',
        averageMatchXP: 850
      },
      milestones: ['first_ability', 'level_10', 'level_25', 'all_abilities'],
      updatedAt: new Date()
    }, { merge: true });
    
    // Create ultimate loadout
    const loadoutRef = adminDb.collection('userLoadouts').doc();
    batch.set(loadoutRef, {
      userId,
      name: `${username} Ultimate Loadout`,
      abilities: {
        tactical: 'lucky_reroll',
        attack: 'grand_slam', 
        defense: 'shield_wall',
        utility: 'time_warp',
        gamechanger: 'grand_theft'
      },
      totalStarCost: 20,
      maxStarPoints: 25,
      isActive: true,
      createdAt: new Date(),
      lastUsed: new Date()
    });
    
    // Execute all operations
    await batch.commit();
    
    console.log(`✅ Successfully unlocked ${unlockedCount} new abilities`);
    console.log(`📈 Updated progression to level 50`);
    console.log(`⚔️ Created ultimate loadout`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully unlocked all abilities for ${username}`,
      data: {
        userId,
        username: userData.username,
        newAbilitiesUnlocked: unlockedCount,
        totalAbilities: allAbilityIds.length,
        level: 50,
        starPoints: 25
      }
    });
    
  } catch (error) {
    console.error('Error unlocking abilities:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET method to check if the endpoint is working
 */
export async function GET() {
  return NextResponse.json({
    message: 'Admin unlock abilities endpoint is active',
    usage: 'POST with { username: "Hero1", secret: "unlock-abilities-admin-2025" }'
  });
}