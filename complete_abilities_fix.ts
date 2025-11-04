/**
 * Complete Abilities Fix Utility
 * This script will:
 * 1. Force refresh Firebase abilities (update icons)
 * 2. Unlock Pan Slap for existing users
 * 3. Verify everything is working
 */

import { AbilitiesService } from '@/services/abilitiesService';
import unlockPanSlapForExistingUsers from './retroactive_unlock';

console.log('🔧 COMPLETE ABILITIES FIX');
console.log('==========================');

async function completeAbilitiesFix() {
  try {
    console.log('🔄 Step 1: Force refresh Firebase abilities...');
    await AbilitiesService.refreshAllAbilities();
    console.log('✅ Step 1 completed');
    
    console.log('\n🔓 Step 2: Unlock Pan Slap for existing users...');
    const unlockResult = await unlockPanSlapForExistingUsers();
    console.log('✅ Step 2 completed:', unlockResult);
    
    console.log('\n🔍 Step 3: Verify abilities...');
    const abilities = await AbilitiesService.getAllAbilities();
    
    const panSlap = abilities.find(a => a.id === 'pan_slap');
    const luckTurner = abilities.find(a => a.id === 'luck_turner');
    
    console.log('\n📊 VERIFICATION RESULTS:');
    
    if (panSlap) {
      console.log('✅ Pan Slap found in Firebase:');
      console.log(`  - Name: ${panSlap.name}`);
      console.log(`  - Category: ${panSlap.category}`);
      console.log(`  - Icon: ${panSlap.iconUrl}`);
      console.log(`  - Active: ${panSlap.isActive}`);
    } else {
      console.log('❌ Pan Slap NOT found in Firebase');
    }
    
    if (luckTurner) {
      console.log('✅ Luck Turner found in Firebase:');
      console.log(`  - Name: ${luckTurner.name}`);
      console.log(`  - Category: ${luckTurner.category}`);
      console.log(`  - Icon: ${luckTurner.iconUrl}`);
      console.log(`  - Active: ${luckTurner.isActive}`);
    } else {
      console.log('❌ Luck Turner NOT found in Firebase');
    }
    
    console.log('\n🎉 ALL FIXES COMPLETE!');
    console.log('💡 Refresh your browser to see the changes');
    console.log('💡 Pan Slap should now appear in Defense category');
    console.log('💡 Both abilities should show proper icons');
    console.log('💡 Existing users should have Pan Slap unlocked');
    
    return {
      success: true,
      abilitiesRefreshed: true,
      usersUnlocked: unlockResult,
      panSlapFound: !!panSlap,
      luckTurnerFound: !!luckTurner
    };
    
  } catch (error) {
    console.error('❌ Complete fix failed:', error);
    return { success: false, error };
  }
}

// Make it available for browser console
if (typeof window !== 'undefined') {
  (window as any).completeAbilitiesFix = completeAbilitiesFix;
  console.log('🛠️ Available in browser: window.completeAbilitiesFix()');
}

export default completeAbilitiesFix;