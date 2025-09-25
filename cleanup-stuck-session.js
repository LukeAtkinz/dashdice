// Emergency Firebase session cleanup script
// Run this to clear the stuck session PYBN5GJvNfafUyqP3dSy

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://dashdice-dice-roller-default-rtdb.firebaseio.com/'
  });
}

const db = admin.firestore();

async function cleanupStuckSession() {
  const userId = '4ZQeDsJKMRaDFoxqzDNuPy0YoNF3';
  const sessionId = 'PYBN5GJvNfafUyqP3dSy';
  
  console.log('🧹 Emergency cleanup of stuck session...');
  
  try {
    // 1. Clear user's currentGame field
    console.log('1. Clearing user currentGame field...');
    await db.collection('users').doc(userId).update({
      currentGame: null
    });
    console.log('✅ User currentGame cleared');
    
    // 2. Delete the stuck session
    console.log('2. Deleting stuck session...');
    await db.collection('waitingRooms').doc(sessionId).delete();
    console.log('✅ Stuck session deleted');
    
    // 3. Clean up any related game sessions
    console.log('3. Cleaning up related game sessions...');
    const gameSessions = await db.collection('gameSessions')
      .where('players.' + userId, '!=', null)
      .get();
    
    for (const doc of gameSessions.docs) {
      console.log(`Deleting game session: ${doc.id}`);
      await doc.ref.delete();
    }
    console.log(`✅ Cleaned up ${gameSessions.size} game sessions`);
    
    // 4. Clean up matchmaking queue entries
    console.log('4. Cleaning up matchmaking queue...');
    const queueEntries = await db.collection('matchmakingQueue')
      .where('playerId', '==', userId)
      .get();
      
    for (const doc of queueEntries.docs) {
      console.log(`Deleting queue entry: ${doc.id}`);
      await doc.ref.delete();
    }
    console.log(`✅ Cleaned up ${queueEntries.size} queue entries`);
    
    console.log('🎉 Emergency cleanup complete! User should be able to join matches now.');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    
    // Try alternative cleanup method
    console.log('🔄 Trying alternative cleanup...');
    try {
      // Force delete user document and recreate
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        userData.currentGame = null;
        await db.collection('users').doc(userId).set(userData);
        console.log('✅ Force updated user document');
      }
    } catch (altError) {
      console.error('❌ Alternative cleanup also failed:', altError);
    }
  }
  
  process.exit(0);
}

cleanupStuckSession();