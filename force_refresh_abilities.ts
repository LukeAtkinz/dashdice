/**
 * Force refresh Firebase abilities collection
 * This will update Firebase with the latest ability definitions including correct icon paths
 */

import { AbilitiesService } from '@/services/abilitiesService';

console.log('🔄 FORCE REFRESH FIREBASE ABILITIES');
console.log('=====================================');

async function forceRefreshAbilities() {
  try {
    console.log('1. Clearing existing abilities collection...');
    
    // Force refresh abilities (this will seed the latest versions)
    console.log('2. Seeding latest ability definitions...');
    await AbilitiesService.refreshAllAbilities();
    
    console.log('3. Verifying updated abilities...');
    const abilities = await AbilitiesService.getAllAbilities();
    
    console.log(`✅ Successfully refreshed ${abilities.length} abilities`);
    
    // Verify Pan Slap and Luck Turner specifically
    const panSlap = abilities.find(a => a.id === 'pan_slap');
    const luckTurner = abilities.find(a => a.id === 'luck_turner');
    
    if (panSlap) {
      console.log('\n🥄 Pan Slap Details:');
      console.log('- Name:', panSlap.name);
      console.log('- Category:', panSlap.category);
      console.log('- Icon URL:', panSlap.iconUrl);
      console.log('- AURA Cost:', panSlap.auraCost);
      console.log('- Is Active:', panSlap.isActive);
    } else {
      console.log('❌ Pan Slap not found after refresh!');
    }
    
    if (luckTurner) {
      console.log('\n🎯 Luck Turner Details:');
      console.log('- Name:', luckTurner.name);
      console.log('- Category:', luckTurner.category);
      console.log('- Icon URL:', luckTurner.iconUrl);
      console.log('- AURA Cost:', luckTurner.auraCost);
      console.log('- Is Active:', luckTurner.isActive);
    } else {
      console.log('❌ Luck Turner not found after refresh!');
    }
    
    console.log('\n✅ Firebase refresh completed!');
    console.log('💡 Now refresh your browser to see the updated abilities');
    
    return { success: true, abilities };
    
  } catch (error) {
    console.error('❌ Failed to refresh Firebase abilities:', error);
    return { success: false, error };
  }
}

// Make it available for browser console
if (typeof window !== 'undefined') {
  (window as any).forceRefreshAbilities = forceRefreshAbilities;
  console.log('🛠️ Available in browser: window.forceRefreshAbilities()');
}

export default forceRefreshAbilities;