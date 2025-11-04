import { 
  ALL_ABILITIES, 
  ABILITIES_BY_CATEGORY, 
  ABILITIES_BY_RARITY,
  STARTER_ABILITIES,
  getAbilityById,
  ABILITY_MAP,
  PAN_SLAP
} from './src/constants/abilities';
import { AbilityCategory, AbilityRarity } from './src/types/abilityBlueprint';

/**
 * Test script to verify Luck Turner and Pan Slap are properly integrated
 */

console.log('=== ABILITY INTEGRATION TEST ===\n');

// Test 1: Check total abilities
console.log('1. Total abilities in system:', ALL_ABILITIES.length);
console.log('   Expected: 2 (Luck Turner + Pan Slap)');

// Test 2: Check if Luck Turner exists
console.log('\n2. LUCK TURNER:');
const luckTurner = getAbilityById('luck_turner');
console.log('   Available:', !!luckTurner);
if (luckTurner) {
  console.log('   Name:', luckTurner.name);
  console.log('   Category:', luckTurner.category);
  console.log('   AURA Cost:', luckTurner.auraCost);
}

// Test 3: Check if Pan Slap exists
console.log('\n3. PAN SLAP:');
const panSlap = getAbilityById('pan_slap');
console.log('   Available:', !!panSlap);
if (panSlap) {
  console.log('   Name:', panSlap.name);
  console.log('   Category:', panSlap.category);
  console.log('   AURA Cost:', panSlap.auraCost);
  console.log('   Star Cost:', panSlap.starCost);
  console.log('   Rarity:', panSlap.rarity);
}

// Test 4: Check category distribution
console.log('\n4. CATEGORY DISTRIBUTION:');
const tacticalAbilities = ABILITIES_BY_CATEGORY[AbilityCategory.TACTICAL];
const defenseAbilities = ABILITIES_BY_CATEGORY[AbilityCategory.DEFENSE];
console.log('   Tactical abilities:', tacticalAbilities.map(a => a.name));
console.log('   Defense abilities:', defenseAbilities.map(a => a.name));

// Test 5: Check Epic rarity
console.log('\n5. EPIC RARITY ABILITIES:');
const epicAbilities = ABILITIES_BY_RARITY[AbilityRarity.EPIC];
console.log('   Epic abilities:', epicAbilities.map(a => a.name));
console.log('   Count:', epicAbilities.length, '(expected: 2)');

// Test 6: Verify Pan Slap specifics
console.log('\n6. PAN SLAP SPECIFICS:');
if (panSlap) {
  console.log('   Timing constraint:', panSlap.timing?.usableWhen?.[0]);
  console.log('   Effect types:', panSlap.effects?.map(e => e.type));
  console.log('   Cooldown:', panSlap.cooldown, 'turns');
  console.log('   Power Level:', panSlap.balancing?.powerLevel);
  console.log('   Tags:', panSlap.tags);
}

console.log('\n=== TEST COMPLETE ===');

export default function testAbilities() {
  return {
    totalAbilities: ALL_ABILITIES.length,
    luckTurnerAvailable: !!getAbilityById('luck_turner'),
    panSlapAvailable: !!getAbilityById('pan_slap'),
    tacticalCount: ABILITIES_BY_CATEGORY[AbilityCategory.TACTICAL].length,
    defenseCount: ABILITIES_BY_CATEGORY[AbilityCategory.DEFENSE].length,
    epicCount: ABILITIES_BY_RARITY[AbilityRarity.EPIC].length,
    panSlap: getAbilityById('pan_slap'),
    luckTurner: getAbilityById('luck_turner')
  };
}