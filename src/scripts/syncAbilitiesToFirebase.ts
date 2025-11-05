/**
 * Sync Abilities to Firebase
 * 
 * This script syncs ability definitions from code constants to Firebase,
 * following the Ability Management Blueprint hybrid storage strategy.
 * 
 * Usage:
 *   npm run sync-abilities
 *   or run this file directly with ts-node
 */

import { createAbility } from '../services/abilityFirebaseService';
import { ALL_ABILITIES } from '../constants/abilities';

/**
 * Main sync function
 * Uploads all abilities from constants to Firebase
 */
export async function syncAbilitiesToFirebase(): Promise<void> {
  console.log('🔄 Starting ability sync to Firebase...');
  console.log(`📦 Found ${ALL_ABILITIES.length} abilities to sync`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors: { abilityId: string; error: string }[] = [];
  
  for (const ability of ALL_ABILITIES) {
    try {
      console.log(`  ⏳ Syncing: ${ability.name} (${ability.id})...`);
      await createAbility(ability);
      successCount++;
      console.log(`  ✅ Synced: ${ability.name}`);
    } catch (error) {
      errorCount++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ abilityId: ability.id, error: errorMsg });
      console.error(`  ❌ Failed to sync ${ability.name}:`, errorMsg);
    }
  }
  
  console.log('\n📊 Sync Complete:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\n🚨 Errors encountered:');
    errors.forEach(({ abilityId, error }) => {
      console.log(`  - ${abilityId}: ${error}`);
    });
  }
  
  console.log('\n🎉 Ability sync complete!');
}

/**
 * Sync a single ability by ID
 */
export async function syncSingleAbility(abilityId: string): Promise<void> {
  const ability = ALL_ABILITIES.find(a => a.id === abilityId);
  
  if (!ability) {
    throw new Error(`Ability not found: ${abilityId}`);
  }
  
  console.log(`🔄 Syncing single ability: ${ability.name} (${abilityId})`);
  await createAbility(ability);
  console.log(`✅ Successfully synced: ${ability.name}`);
}

// Run if called directly
if (require.main === module) {
  syncAbilitiesToFirebase()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export default {
  syncAbilitiesToFirebase,
  syncSingleAbility
};
