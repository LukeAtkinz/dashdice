/**
 * Manual database cleanup script
 * Run this script to manually clean up old waiting rooms and matches
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function cleanupWaitingRooms() {
  try {
    console.log('🧹 Starting waiting room cleanup...');
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const waitingRoomRef = db.collection('waitingroom');
    
    // Query for rooms older than 5 minutes
    const snapshot = await waitingRoomRef.where('createdAt', '<', fiveMinutesAgo).get();
    
    const batch = db.batch();
    let deleteCount = 0;
    
    snapshot.forEach((doc) => {
      console.log(`🗑️ Deleting old waiting room: ${doc.id}`);
      batch.delete(doc.ref);
      deleteCount++;
    });
    
    if (deleteCount > 0) {
      await batch.commit();
    }
    
    console.log(`✅ Cleaned up ${deleteCount} old waiting rooms`);
    return deleteCount;
  } catch (error) {
    console.error('❌ Error cleaning up waiting rooms:', error);
    return 0;
  }
}

async function cleanupMatches() {
  try {
    console.log('🧹 Starting matches cleanup...');
    
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const matchesRef = db.collection('matches');
    
    // Query for matches older than 30 minutes
    const snapshot = await matchesRef.where('createdAt', '<', thirtyMinutesAgo).get();
    
    const batch = db.batch();
    let deleteCount = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Only delete if it's not completed (should have been moved to completedmatches)
      if (data.status !== 'completed') {
        console.log(`🗑️ Deleting old match: ${doc.id}, status: ${data.status}`);
        batch.delete(doc.ref);
        deleteCount++;
      }
    });
    
    if (deleteCount > 0) {
      await batch.commit();
    }
    
    console.log(`✅ Cleaned up ${deleteCount} old matches`);
    return deleteCount;
  } catch (error) {
    console.error('❌ Error cleaning up matches:', error);
    return 0;
  }
}

async function runCleanup() {
  console.log('🔄 Starting manual database cleanup...');
  
  const [waitingRoomsDeleted, matchesDeleted] = await Promise.all([
    cleanupWaitingRooms(),
    cleanupMatches()
  ]);
  
  console.log(`✅ Manual cleanup completed:`);
  console.log(`   - Waiting rooms deleted: ${waitingRoomsDeleted}`);
  console.log(`   - Matches deleted: ${matchesDeleted}`);
  
  process.exit(0);
}

// Run the cleanup
runCleanup().catch((error) => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});
