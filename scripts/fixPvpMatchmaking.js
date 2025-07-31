#!/usr/bin/env node

/**
 * Fix PVP Matchmaking Issue
 * This script cleans up test data and ensures proper player-to-player connections
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = getFirestore(app);

async function fixPvpMatchmaking() {
  console.log('🔧 Starting PVP Matchmaking Fix...');
  
  try {
    // 1. Clean up test users from waiting room
    console.log('🧹 Cleaning up test data from waiting room...');
    const waitingRoomRef = db.collection('waitingroom');
    const testUserIds = [
      'test-user-1',
      'test-user-2', 
      'test-user-quick-1',
      'test-user-quick-2',
      'computer_gkent'
    ];
    
    // Delete waiting rooms with test users as host
    for (const userId of testUserIds) {
      const hostQuery = waitingRoomRef.where('hostData.playerId', '==', userId);
      const hostSnapshot = await hostQuery.get();
      hostSnapshot.forEach(async (doc) => {
        await doc.ref.delete();
        console.log(`✅ Deleted waiting room hosted by ${userId}: ${doc.id}`);
      });
      
      // Delete waiting rooms with test users as opponent
      const opponentQuery = waitingRoomRef.where('opponentData.playerId', '==', userId);
      const opponentSnapshot = await opponentQuery.get();
      opponentSnapshot.forEach(async (doc) => {
        await doc.ref.delete();
        console.log(`✅ Deleted waiting room with ${userId} as opponent: ${doc.id}`);
      });
    }
    
    // 2. Clean up test users from matches
    console.log('🧹 Cleaning up test data from matches...');
    const matchesRef = db.collection('matches');
    
    for (const userId of testUserIds) {
      const hostMatchQuery = matchesRef.where('hostData.playerId', '==', userId);
      const hostMatchSnapshot = await hostMatchQuery.get();
      hostMatchSnapshot.forEach(async (doc) => {
        await doc.ref.delete();
        console.log(`✅ Deleted match hosted by ${userId}: ${doc.id}`);
      });
      
      const opponentMatchQuery = matchesRef.where('opponentData.playerId', '==', userId);
      const opponentMatchSnapshot = await opponentMatchQuery.get();
      opponentMatchSnapshot.forEach(async (doc) => {
        await doc.ref.delete();
        console.log(`✅ Deleted match with ${userId} as opponent: ${doc.id}`);
      });
    }
    
    // 3. Check for any david.lukeatkins references
    console.log('🔍 Checking for hardcoded user references...');
    const davidQuery = waitingRoomRef.where('hostData.playerId', '==', 'david.lukeatkins');
    const davidSnapshot = await davidQuery.get();
    if (!davidSnapshot.empty) {
      console.log('⚠️  Found hardcoded david.lukeatkins references:');
      davidSnapshot.forEach((doc) => {
        console.log(`   - Waiting room: ${doc.id}`);
      });
    }
    
    const davidMatchQuery = matchesRef.where('hostData.playerId', '==', 'david.lukeatkins');
    const davidMatchSnapshot = await davidMatchQuery.get();
    if (!davidMatchSnapshot.empty) {
      console.log('⚠️  Found hardcoded david.lukeatkins in matches:');
      davidMatchSnapshot.forEach((doc) => {
        console.log(`   - Match: ${doc.id}`);
      });
    }
    
    console.log('✅ PVP Matchmaking cleanup completed!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Test PVP with two different user accounts');
    console.log('2. Verify both players see each other correctly');
    console.log('3. Check that no test users appear in matches');
    
  } catch (error) {
    console.error('❌ Error during PVP fix:', error);
  }
  
  process.exit(0);
}

fixPvpMatchmaking();
