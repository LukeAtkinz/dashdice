/**
 * Retroactive Ability Unlock Utility
 * Unlocks Pan Slap for existing users who don't have it
 */

import { AbilitiesService } from '@/services/abilitiesService';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/services/firebase';

console.log('🔓 RETROACTIVE ABILITY UNLOCK UTILITY');
console.log('=====================================');

async function unlockPanSlapForExistingUsers() {
  try {
    console.log('1. Finding all existing users...');
    
    // Get all users who have progression data (existing users)
    const progressionQuery = query(collection(db, 'userProgression'));
    const progressionSnapshot = await getDocs(progressionQuery);
    
    const userIds = progressionSnapshot.docs.map(doc => doc.data().userId);
    console.log(`Found ${userIds.length} existing users`);
    
    let unlockCount = 0;
    let alreadyUnlockedCount = 0;
    
    for (const userId of userIds) {
      try {
        console.log(`2. Checking user: ${userId.substring(0, 8)}...`);
        
        // Check if user already has Pan Slap unlocked
        const userAbilities = await AbilitiesService.getUserAbilities(userId);
        const hasPanSlap = userAbilities.some(ua => ua.abilityId === 'pan_slap');
        
        if (hasPanSlap) {
          console.log(`  ✅ Already has Pan Slap`);
          alreadyUnlockedCount++;
        } else {
          console.log(`  🔓 Unlocking Pan Slap...`);
          const success = await AbilitiesService.unlockAbility(userId, 'pan_slap');
          if (success) {
            unlockCount++;
            console.log(`  ✅ Successfully unlocked Pan Slap`);
          } else {
            console.log(`  ❌ Failed to unlock Pan Slap`);
          }
        }
      } catch (userError) {
        console.error(`❌ Error processing user ${userId}:`, userError);
      }
    }
    
    console.log('\n🎉 RETROACTIVE UNLOCK SUMMARY:');
    console.log(`- Total users processed: ${userIds.length}`);
    console.log(`- Pan Slap unlocked for: ${unlockCount} users`);
    console.log(`- Already had Pan Slap: ${alreadyUnlockedCount} users`);
    console.log(`✅ Retroactive unlock completed!`);
    
    return {
      success: true,
      totalUsers: userIds.length,
      newlyUnlocked: unlockCount,
      alreadyUnlocked: alreadyUnlockedCount
    };
    
  } catch (error) {
    console.error('❌ Failed retroactive unlock:', error);
    return { success: false, error };
  }
}

// Make it available for browser console
if (typeof window !== 'undefined') {
  (window as any).unlockPanSlapForExistingUsers = unlockPanSlapForExistingUsers;
  console.log('🛠️ Available in browser: window.unlockPanSlapForExistingUsers()');
}

export default unlockPanSlapForExistingUsers;