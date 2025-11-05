/**
 * Unlock All Abilities for All Players
 * 
 * This script unlocks all available abilities for every player in the database.
 * Run this in the browser console after navigating to any page.
 */

const unlockAllAbilitiesForAllPlayers = async () => {
  console.log('🔓 Starting: Unlock All Abilities for All Players');
  console.log('================================================');
  
  try {
    // Import Firebase modules
    const { getFirestore, collection, getDocs, doc, setDoc, updateDoc, getDoc, Timestamp } = await import('firebase/firestore');
    const { db } = await import('../src/lib/firebase');
    
    // Get all abilities from the abilities collection
    console.log('📋 Step 1: Fetching all abilities...');
    const abilitiesSnapshot = await getDocs(collection(db, 'abilities'));
    const allAbilityIds = abilitiesSnapshot.docs.map(doc => doc.id);
    console.log(`✅ Found ${allAbilityIds.length} abilities:`, allAbilityIds);
    
    // Get all users from the users collection
    console.log('\n👥 Step 2: Fetching all users...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const allUserIds = usersSnapshot.docs.map(doc => doc.id);
    console.log(`✅ Found ${allUserIds.length} users`);
    
    // Unlock all abilities for each user
    console.log('\n🔓 Step 3: Unlocking abilities for each user...');
    let successCount = 0;
    let errorCount = 0;
    
    for (const userId of allUserIds) {
      try {
        const playerAbilitiesRef = doc(db, 'playerAbilities', userId);
        const playerAbilitiesDoc = await getDoc(playerAbilitiesRef);
        
        if (playerAbilitiesDoc.exists()) {
          // Update existing document
          await updateDoc(playerAbilitiesRef, {
            unlockedAbilities: allAbilityIds,
            updatedAt: Timestamp.now()
          });
          console.log(`✅ Updated abilities for user: ${userId}`);
        } else {
          // Create new document
          await setDoc(playerAbilitiesRef, {
            playerId: userId,
            unlockedAbilities: allAbilityIds,
            equippedAbilities: {},
            favoriteAbilities: [],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
          console.log(`✅ Created abilities for user: ${userId}`);
        }
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to unlock abilities for user ${userId}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log('==========');
    console.log(`✅ Successfully updated: ${successCount} users`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📋 Total abilities unlocked per user: ${allAbilityIds.length}`);
    console.log(`🎯 Abilities: ${allAbilityIds.join(', ')}`);
    console.log('\n✨ All abilities have been unlocked for all players!');
    console.log('💡 Refresh the page to see the changes in the vault.');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
};

// Run the function
unlockAllAbilitiesForAllPlayers();
