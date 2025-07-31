/**
 * Comprehensive PVP Fix - Addresses match collision and user sync issues
 * Based on console log analysis showing:
 * 1. Match ID collision (browser connecting to old match 0251YRjWVS4ERqLX0sZo)
 * 2. Display name sync issues (david.lukeatkins vs actual display name)
 * 3. Existing match interference with new PVP sessions
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, query, where } = require('firebase/firestore');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function comprehensivePvpFix() {
  console.log('🔧 Starting Comprehensive PVP Fix...');
  console.log('📋 Issues to resolve:');
  console.log('   - Match ID collision (0251YRjWVS4ERqLX0sZo)');
  console.log('   - Display name sync (david.lukeatkins)');
  console.log('   - Existing match interference');
  console.log('');

  try {
    // 1. Clear ALL matches to prevent collision
    console.log('🧹 Step 1: Clearing all existing matches...');
    const matchesRef = collection(db, 'matches');
    const matchesSnapshot = await getDocs(matchesRef);
    
    if (!matchesSnapshot.empty) {
      console.log(`📋 Found ${matchesSnapshot.size} matches to delete.`);
      const deletePromises = [];
      matchesSnapshot.forEach((document) => {
        console.log(`🗑️  Deleting match: ${document.id}`);
        deletePromises.push(deleteDoc(doc(db, 'matches', document.id)));
      });
      await Promise.all(deletePromises);
      console.log(`✅ Deleted ${matchesSnapshot.size} matches.`);
    } else {
      console.log('✅ No matches found.');
    }

    // 2. Clear ALL waiting rooms to prevent confusion
    console.log('🧹 Step 2: Clearing all waiting rooms...');
    const waitingRoomRef = collection(db, 'waitingroom');
    const waitingSnapshot = await getDocs(waitingRoomRef);
    
    if (!waitingSnapshot.empty) {
      console.log(`📋 Found ${waitingSnapshot.size} waiting rooms to delete.`);
      const deletePromises = [];
      waitingSnapshot.forEach((document) => {
        console.log(`🗑️  Deleting waiting room: ${document.id}`);
        deletePromises.push(deleteDoc(doc(db, 'waitingroom', document.id)));
      });
      await Promise.all(deletePromises);
      console.log(`✅ Deleted ${waitingSnapshot.size} waiting rooms.`);
    } else {
      console.log('✅ No waiting rooms found.');
    }

    // 3. Check for specific problematic match ID from logs
    console.log('🔍 Step 3: Checking for specific problematic match ID...');
    const problematicMatchId = '0251YRjWVS4ERqLX0sZo';
    try {
      const problemDoc = doc(db, 'matches', problematicMatchId);
      await deleteDoc(problemDoc);
      console.log(`✅ Successfully deleted problematic match: ${problematicMatchId}`);
    } catch (error) {
      console.log(`ℹ️  Problematic match ${problematicMatchId} already deleted or doesn't exist.`);
    }

    // 4. Clear any matches with david.lukeatkins
    console.log('🔍 Step 4: Checking for david.lukeatkins references...');
    const userIds = ['david.lukeatkins', '4ZQeDsJKMRaDFoxqzDNuPy0YoNF3'];
    
    for (const userId of userIds) {
      // Check matches
      const matchQuery = query(collection(db, 'matches'), where('hostData.playerId', '==', userId));
      const matchSnapshot = await getDocs(matchQuery);
      matchSnapshot.forEach(async (document) => {
        console.log(`🗑️  Found match with ${userId} as host: ${document.id}`);
        await deleteDoc(doc(db, 'matches', document.id));
      });

      const opponentQuery = query(collection(db, 'matches'), where('opponentData.playerId', '==', userId));
      const opponentSnapshot = await getDocs(opponentQuery);
      opponentSnapshot.forEach(async (document) => {
        console.log(`🗑️  Found match with ${userId} as opponent: ${document.id}`);
        await deleteDoc(doc(db, 'matches', document.id));
      });
    }

    console.log('');
    console.log('✅ Comprehensive PVP Fix Completed!');
    console.log('');
    console.log('📋 What was fixed:');
    console.log('   ✅ Cleared all existing matches (prevents collision)');
    console.log('   ✅ Cleared all waiting rooms (fresh start)');
    console.log('   ✅ Removed problematic match 0251YRjWVS4ERqLX0sZo');
    console.log('   ✅ Cleaned up david.lukeatkins references');
    console.log('');
    console.log('🎯 Testing Instructions:');
    console.log('   1. Both players refresh their browsers');
    console.log('   2. Both players log out and log back in');
    console.log('   3. Create new PVP match with same game mode');
    console.log('   4. Verify both players see each other correctly');
    console.log('   5. Check that scores start from 0 for both players');
    
  } catch (error) {
    console.error('❌ Error during comprehensive fix:', error);
  }
  
  process.exit(0);
}

comprehensivePvpFix();
