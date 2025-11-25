/**
 * Initialize backgrounds for all users - Uses existing Firebase config
 * Run with: npx tsx initialize-backgrounds-env.ts
 */

import * as dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

console.log('🔑 Checking Firebase config...');
console.log('   API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Found' : '❌ Missing');
console.log('   Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Found' : '❌ Missing');

// Your Firebase config from environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Validate config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Firebase configuration is missing!');
  console.error('   Make sure .env.local exists with Firebase credentials');
  process.exit(1);
}

console.log('✅ Firebase config loaded\n');

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Default backgrounds
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
    // Get all users
    console.log('📡 Fetching users from Firestore...');
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    console.log(`📊 Found ${usersSnapshot.size} total users\n`);

    if (usersSnapshot.size === 0) {
      console.log('⚠️  No users found. This could mean:');
      console.log('   1. Firebase credentials are incorrect');
      console.log('   2. The database is empty');
      console.log('   3. Permission denied');
      return;
    }

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

          const updates: any = {};

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
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, updates);
            updated++;
            console.log(`  ✅ Successfully updated\n`);
          } else {
            skipped++;
          }
        } else {
          skipped++;
          console.log(`⏭️  Skipping user ${userId} (already has both backgrounds)`);
        }
      } catch (error: any) {
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

  } catch (error: any) {
    console.error('❌ Fatal error during initialization:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
  }
}

// Run the initialization
initializeBackgrounds().then(() => {
  console.log('\n✅ Script complete. Exiting...');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
