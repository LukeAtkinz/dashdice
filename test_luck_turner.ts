import { 
  ALL_ABILITIES, 
  ABILITIES_BY_CATEGORY, 
  ABILITIES_BY_RARITY,
  STARTER_ABILITIES,
  getAbilityById,
  ABILITY_MAP
} from './src/constants/abilities';
import { AbilityCategory, AbilityRarity } from './src/types/abilityBlueprint';

/**
 * Test script to verify Luck Turner is properly integrated
 */

console.log('=== LUCK TURNER AVAILABILITY TEST ===\n');

// Test 1: Check if Luck Turner exists in ALL_ABILITIES
console.log('1. ALL_ABILITIES contains Luck Turner:', 
  ALL_ABILITIES.some(ability => ability.id === 'luck_turner'));
console.log('   Total abilities:', ALL_ABILITIES.length);

// Test 2: Check if it's in the Tactical category
const tacticalAbilities = ABILITIES_BY_CATEGORY[AbilityCategory.TACTICAL];
console.log('\n2. Tactical abilities:', tacticalAbilities.map(a => a.name));
console.log('   Contains Luck Turner:', 
  tacticalAbilities.some(ability => ability.id === 'luck_turner'));

// Test 3: Check if it's in Epic rarity
const epicAbilities = ABILITIES_BY_RARITY[AbilityRarity.EPIC];
console.log('\n3. Epic abilities:', epicAbilities.map(a => a.name));
console.log('   Contains Luck Turner:', 
  epicAbilities.some(ability => ability.id === 'luck_turner'));

// Test 4: Check getAbilityById function
const luckTurner = getAbilityById('luck_turner');
console.log('\n4. getAbilityById("luck_turner"):', !!luckTurner);
if (luckTurner) {
  console.log('   Name:', luckTurner.name);
  console.log('   Category:', luckTurner.category);
  console.log('   Rarity:', luckTurner.rarity);
  console.log('   AURA Cost:', luckTurner.auraCost);
  console.log('   Star Cost:', luckTurner.starCost);
}

// Test 5: Check ABILITY_MAP
console.log('\n5. ABILITY_MAP["luck_turner"]:', !!ABILITY_MAP['luck_turner']);

// Test 6: Check STARTER_ABILITIES
console.log('\n6. STARTER_ABILITIES:', STARTER_ABILITIES.map(a => a.name));
console.log('   Contains Luck Turner:', 
  STARTER_ABILITIES.some(ability => ability.id === 'luck_turner'));

// Test 7: Check ability structure
if (luckTurner) {
  console.log('\n7. Ability Structure Check:');
  console.log('   Has effects:', (luckTurner.effects?.length || 0) > 0);
  console.log('   Has targeting:', !!luckTurner.targeting);
  console.log('   Has timing:', !!luckTurner.timing);
  console.log('   Has conditions:', (luckTurner.conditions?.length || 0) > 0);
  console.log('   Effect types:', luckTurner.effects?.map(e => e.type));
}

console.log('\n=== TEST COMPLETE ===');

export default function testLuckTurner() {
  return {
    isAvailable: !!getAbilityById('luck_turner'),
    inAllAbilities: ALL_ABILITIES.some(a => a.id === 'luck_turner'),
    inTacticalCategory: ABILITIES_BY_CATEGORY[AbilityCategory.TACTICAL].some(a => a.id === 'luck_turner'),
    inEpicRarity: ABILITIES_BY_RARITY[AbilityRarity.EPIC].some(a => a.id === 'luck_turner'),
    inStarterAbilities: STARTER_ABILITIES.some(a => a.id === 'luck_turner'),
    ability: getAbilityById('luck_turner')
  };
}