// Run this in the browser console on your deployed site to initialize turn decider and victory backgrounds for all users
// This will add the default backgrounds to existing users who don't have them

(async function initializeBackgrounds() {
  console.log('🎬 Starting background initialization for all users...');
  
  const { getFirestore, collection, getDocs, doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  // Get Firestore instance from your app
  const db = getFirestore();
  
  // Default backgrounds
  const defaultTurnDecider = { id: 'crazy-cough', name: 'Crazy Cough', rarity: 'RARE' };
  const defaultVictory = { id: 'wind-blade', name: 'Wind Blade', rarity: 'EPIC' };
  
  try {
    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let updated = 0;
    let skipped = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Check if user already has these backgrounds
      const hasTurnDecider = userData.inventory?.turnDeciderBackgroundEquipped;
      const hasVictory = userData.inventory?.victoryBackgroundEquipped;
      
      if (!hasTurnDecider || !hasVictory) {
        console.log(`Updating user ${userId}...`);
        
        const userRef = doc(db, 'users', userId);
        const updates = {};
        
        if (!hasTurnDecider) {
          updates['inventory.turnDeciderBackgroundEquipped'] = defaultTurnDecider;
          console.log(`  ✅ Adding turn decider background`);
        }
        
        if (!hasVictory) {
          updates['inventory.victoryBackgroundEquipped'] = defaultVictory;
          console.log(`  ✅ Adding victory background`);
        }
        
        await updateDoc(userRef, updates);
        updated++;
      } else {
        skipped++;
      }
    }
    
    console.log(`\n✅ Initialization complete!`);
    console.log(`   Updated: ${updated} users`);
    console.log(`   Skipped: ${skipped} users (already had backgrounds)`);
    console.log(`   Total: ${usersSnapshot.size} users`);
    
  } catch (error) {
    console.error('❌ Error initializing backgrounds:', error);
  }
})();
