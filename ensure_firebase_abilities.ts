import { LUCK_TURNER } from './src/constants/abilities';

/**
 * Script to ensure Luck Turner is properly stored in Firebase
 * This will make Firebase the single source of truth for abilities
 */

// For now, let's just show what should be stored
console.log('=== LUCK TURNER FIREBASE STORAGE ===\n');

console.log('Luck Turner ability that should be in Firebase:');
console.log(JSON.stringify(LUCK_TURNER, null, 2));

console.log('\n=== RECOMMENDATION ===');
console.log('1. Firebase should be the single source of truth for abilities');
console.log('2. The useAbilities hook should ONLY load from Firebase');
console.log('3. Constants should only be used for seeding Firebase initially');
console.log('4. PowerTab and all UI should get abilities from Firebase via useAbilities hook');

export default LUCK_TURNER;