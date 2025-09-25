// Firebase session reset via admin SDK
const admin = require('firebase-admin');

// Initialize Firebase Admin (this will use the service account)
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'dashdice-d1b86'
  });
}

const db = admin.firestore();

async function clearUserSession() {
  const userId = "4ZQeDsJKMRaDFoxqzDNuPy0YoNF3";
  
  try {
    console.log("🧹 Admin cleanup for user:", userId);
    
    // Clear user's currentGame using admin SDK
    await db.collection('users').doc(userId).update({
      currentGame: null,
      lastActivity: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log("✅ Cleared user's currentGame");
    
    // Clear waiting rooms
    const waitingRooms = await db.collection('WaitingRooms')
      .where('playerId', '==', userId)
      .get();
    
    for (const doc of waitingRooms.docs) {
      await doc.ref.delete();
      console.log("✅ Deleted waiting room:", doc.id);
    }
    
    // Clear game sessions
    const gameSessions = await db.collection('GameSessions')
      .where('players', 'array-contains', userId)
      .get();
    
    for (const doc of gameSessions.docs) {
      await doc.ref.delete();
      console.log("✅ Deleted game session:", doc.id);
    }
    
    // Clear queue
    const queueItems = await db.collection('MatchmakingQueue')
      .where('playerId', '==', userId)
      .get();
    
    for (const doc of queueItems.docs) {
      await doc.ref.delete();
      console.log("✅ Deleted queue item:", doc.id);
    }
    
    console.log("🎉 Session cleared! Ready for fresh matchmaking.");
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

clearUserSession();