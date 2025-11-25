// SIMPLE VERSION - Copy and paste this entire code block into your browser console
// Run this on your deployed DashDice site while logged in

(async function initializeBackgrounds() {
  console.log('🎬 Starting background initialization...');
  
  // Import Firebase from your app
  const { db } = window; // Your app should expose this
  
  if (!db) {
    console.error('❌ Firestore not found. Make sure you are on the DashDice site and logged in.');
    return;
  }
  
  // Get Firebase functions
  const { collection, getDocs, doc, updateDoc } = await import('firebase/firestore');
  
  const defaultTurnDecider = { id: 'crazy-cough', name: 'Crazy Cough', rarity: 'RARE' };
  const defaultVictory = { id: 'wind-blade', name: 'Wind Blade', rarity: 'EPIC' };
  
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    let updated = 0;
    let skipped = 0;
    
    for (const userDoc of snapshot.docs) {
      const data = userDoc.data();
      const updates = {};
      
      if (!data.inventory?.turnDeciderBackgroundEquipped) {
        updates['inventory.turnDeciderBackgroundEquipped'] = defaultTurnDecider;
      }
      
      if (!data.inventory?.victoryBackgroundEquipped) {
        updates['inventory.victoryBackgroundEquipped'] = defaultVictory;
      }
      
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'users', userDoc.id), updates);
        console.log(`✅ Updated user: ${userDoc.id}`);
        updated++;
      } else {
        skipped++;
      }
    }
    
    console.log(`\n✅ Complete! Updated: ${updated}, Skipped: ${skipped}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
