import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/services/firebaseAdmin';
import { ALL_PREDEFINED_ABILITIES } from '@/data/predefinedAbilities';

/**
 * Admin API to initialize all predefined abilities in Firebase
 * POST /api/admin/initialize-abilities
 * Body: { secret: "initialize-abilities-admin-2025" }
 */
export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json();
    
    // Simple security check
    if (secret !== 'initialize-abilities-admin-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('🚀 Starting abilities database initialization...');
    console.log(`📊 Total abilities to initialize: ${ALL_PREDEFINED_ABILITIES.length}`);
    
    // Check if abilities already exist
    const abilitiesRef = adminDb.collection('abilities');
    const existingSnapshot = await abilitiesRef.where('isActive', '==', true).get();
    
    if (existingSnapshot.size > 0) {
      console.log(`⚠️  Found ${existingSnapshot.size} existing abilities. Proceeding to update/add missing ones...`);
    }
    
    let addedCount = 0;
    let updatedCount = 0;
    
    // Use batch operations for better performance
    const batch = adminDb.batch();
    
    // Add each ability to Firestore
    for (const ability of ALL_PREDEFINED_ABILITIES) {
      try {
        const abilityDoc = abilitiesRef.doc(ability.id);
        
        // Check if this specific ability exists
        const existingDoc = await abilityDoc.get();
        
        if (!existingDoc.exists) {
          // Add new ability
          batch.set(abilityDoc, ability);
          addedCount++;
          console.log(`✅ Will add: ${ability.name} (${ability.rarity})`);
        } else {
          // Update existing ability
          batch.set(abilityDoc, ability, { merge: true });
          updatedCount++;
          console.log(`🔄 Will update: ${ability.name} (${ability.rarity})`);
        }
      } catch (error) {
        console.error(`❌ Error with ability ${ability.id}:`, (error as Error).message);
      }
    }
    
    // Commit all changes at once
    console.log('⚡ Committing batch operations...');
    await batch.commit();
    
    console.log('🎉 ABILITIES INITIALIZATION COMPLETE!');
    console.log(`➕ Added: ${addedCount} new abilities`);
    console.log(`🔄 Updated: ${updatedCount} existing abilities`);
    
    // Verify the abilities are in the database
    const finalSnapshot = await abilitiesRef.get();
    console.log(`✅ Database verification: ${finalSnapshot.size} abilities found`);
    
    // Show breakdown by rarity
    const rarities = { common: 0, rare: 0, epic: 0, legendary: 0 };
    finalSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.rarity && data.rarity in rarities) {
        rarities[data.rarity as keyof typeof rarities]++;
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Abilities initialized successfully',
      data: {
        added: addedCount,
        updated: updatedCount,
        total: finalSnapshot.size,
        breakdown: {
          common: rarities.common,
          rare: rarities.rare,
          epic: rarities.epic,
          legendary: rarities.legendary
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error initializing abilities:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET method to check if the endpoint is working
 */
export async function GET() {
  return NextResponse.json({
    message: 'Admin initialize abilities endpoint is active',
    usage: 'POST with { secret: "initialize-abilities-admin-2025" }'
  });
}