/**
 * Server-side script to initialize turn decider and victory backgrounds for all users
 * Run with: node initialize-backgrounds-admin.js
 * 
 * This uses Firebase Admin SDK to update all user documents
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // You need to download this from Firebase Console

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Default backgrounds to add
const defaultTurnDecider = { 
  id: 'crazy-cough', 
  name: 'Crazy Cough', 
  category: 'Videos',
  rarity: 'COMMON' 
};

const defaultVictory = { 
  id: 'wind-blade', 
  name: 'Wind Blade', 
  category: 'Videos',
  rarity: 'LEGENDARY' 
};

async function initializeBackgrounds() {
  console.log('🎬 Starting background initialization for all users...\n');
  
  try {
    // Get all users from the 'users' collection
    const usersSnapshot = await db.collection('users').get();
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    console.log(`📊 Found ${usersSnapshot.size} total users\n`);
    
    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      try {
        // Check if user already has these backgrounds
        const hasTurnDecider = userData.inventory?.turnDeciderBackgroundEquipped;
        const hasVictory = userData.inventory?.victoryBackgroundEquipped;
        
        if (!hasTurnDecider || !hasVictory) {
          console.log(`Updating user: ${userId}`);
          console.log(`  Display Name: ${userData.displayName || 'N/A'}`);
          
          const updates = {};
          
          if (!hasTurnDecider) {
            updates['inventory.turnDeciderBackgroundEquipped'] = defaultTurnDecider;
            console.log(`  ✅ Adding turn decider background (Crazy Cough)`);
          } else {
            console.log(`  ⏭️  Already has turn decider: ${hasTurnDecider.name || hasTurnDecider.id}`);
          }
          
          if (!hasVictory) {
            updates['inventory.victoryBackgroundEquipped'] = defaultVictory;
            console.log(`  ✅ Adding victory background (Wind Blade)`);
          } else {
            console.log(`  ⏭️  Already has victory: ${hasVictory.name || hasVictory.id}`);
          }
          
          // Only update if there are changes to make
          if (Object.keys(updates).length > 0) {
            await userDoc.ref.update(updates);
            updated++;
            console.log(`  ✅ Successfully updated\n`);
          } else {
            skipped++;
          }
        } else {
          skipped++;
          console.log(`⏭️  Skipping user ${userId} (already has both backgrounds)`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error updating user ${userId}:`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ INITIALIZATION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   • Total users found:    ${usersSnapshot.size}`);
    console.log(`   • Users updated:        ${updated}`);
    console.log(`   • Users skipped:        ${skipped}`);
    console.log(`   • Errors:               ${errors}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Fatal error during initialization:', error);
  } finally {
    // Close the Firebase connection
    process.exit(0);
  }
}

// Run the initialization
initializeBackgrounds();
