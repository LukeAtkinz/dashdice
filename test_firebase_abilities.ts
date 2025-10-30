import abilityService from './src/services/abilityFirebaseService';

/**
 * Test script to check what abilities are currently in Firebase
 */

async function checkFirebaseAbilities() {
  console.log('=== FIREBASE ABILITIES CHECK ===\n');

  try {
    // Check if we can fetch all abilities from Firebase
    const result = await abilityService.searchAbilities({
      sortBy: 'name',
      sortOrder: 'asc',
      limit: 100
    });

    console.log('1. Firebase abilities count:', result.abilities.length);
    console.log('2. Firebase abilities:', result.abilities.map(a => ({ id: a.id, name: a.name, category: a.category })));

    // Check specifically for Luck Turner
    const luckTurner = result.abilities.find(a => a.id === 'luck_turner');
    console.log('\n3. Luck Turner in Firebase:', !!luckTurner);
    
    if (luckTurner) {
      console.log('   Name:', luckTurner.name);
      console.log('   Category:', luckTurner.category);
      console.log('   Rarity:', luckTurner.rarity);
      console.log('   AURA Cost:', luckTurner.auraCost);
    }

    // Try to get a specific ability by ID
    try {
      const specificAbility = await abilityService.getAbility('luck_turner');
      console.log('\n4. getAbility("luck_turner") success:', !!specificAbility);
    } catch (err) {
      console.log('\n4. getAbility("luck_turner") failed:', err);
    }

  } catch (error) {
    console.error('Error checking Firebase abilities:', error);
  }

  console.log('\n=== CHECK COMPLETE ===');
}

checkFirebaseAbilities();