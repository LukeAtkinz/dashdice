// Initialize Turn Decider and Victory Backgrounds for All Users
// Run: node initialize-user-backgrounds.js

const admin = require('firebase-admin');
const serviceAccount = require('./dashdice-firebase-adminsdk-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const defaultTurnDecider = { id: 'crazy-cough', name: 'Crazy Cough', rarity: 'RARE' };
const defaultVictory = { id: 'wind-blade', name: 'Wind Blade', rarity: 'EPIC' };

async function initializeBackgrounds() {
  console.log('🎬 Starting background initialization for all users...\n');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        const hasTurnDecider = userData.inventory?.turnDeciderBackgroundEquipped;
        const hasVictory = userData.inventory?.victoryBackgroundEquipped;
        
        if (!hasTurnDecider || !hasVictory) {
          const updates = {};
          
          if (!hasTurnDecider) {
            updates['inventory.turnDeciderBackgroundEquipped'] = defaultTurnDecider;
          }
          
          if (!hasVictory) {
            updates['inventory.victoryBackgroundEquipped'] = defaultVictory;
          }
          
          await userDoc.ref.update(updates);
          console.log(`✅ Updated user: ${userId}`);
          updated++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Error updating user ${userDoc.id}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ INITIALIZATION COMPLETE');
    console.log('='.repeat(50));
    console.log(`Total users:    ${usersSnapshot.size}`);
    console.log(`Updated:        ${updated}`);
    console.log(`Skipped:        ${skipped} (already had backgrounds)`);
    console.log(`Errors:         ${errors}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    process.exit(0);
  }
}

initializeBackgrounds();
