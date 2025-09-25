// Quick Firebase cleanup script
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB-vkL7PSqCOrKS7nTOtBEfUvX-CdhNZ6I",
  authDomain: "dashdice-d1b86.firebaseapp.com",
  projectId: "dashdice-d1b86",
  storageBucket: "dashdice-d1b86.firebasestorage.app",
  messagingSenderId: "816081934821",
  appId: "1:816081934821:web:a81f03c18b89fc3038770c",
  measurementId: "G-LM67QC0E5T"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanupUserSession() {
  const userId = "4ZQeDsJKMRaDFoxqzDNuPy0YoNF3";
  
  try {
    console.log("🧹 Cleaning up Firebase session for user:", userId);
    
    // Clear user's currentGame
    const userDoc = doc(db, 'users', userId);
    await updateDoc(userDoc, {
      currentGame: null,
      lastActivity: new Date().toISOString()
    });
    console.log("✅ Cleared user's currentGame");
    
    // Clear any waiting rooms
    const waitingRoomsQuery = query(
      collection(db, 'WaitingRooms'),
      where('playerId', '==', userId)
    );
    const waitingRooms = await getDocs(waitingRoomsQuery);
    for (const waitingRoom of waitingRooms.docs) {
      await deleteDoc(waitingRoom.ref);
      console.log("✅ Deleted waiting room:", waitingRoom.id);
    }
    
    // Clear any game sessions
    const gameSessionsQuery = query(
      collection(db, 'GameSessions'),
      where('players', 'array-contains', userId)
    );
    const gameSessions = await getDocs(gameSessionsQuery);
    for (const session of gameSessions.docs) {
      await deleteDoc(session.ref);
      console.log("✅ Deleted game session:", session.id);
    }
    
    // Clear matchmaking queue
    const queueQuery = query(
      collection(db, 'MatchmakingQueue'),
      where('playerId', '==', userId)
    );
    const queueItems = await getDocs(queueQuery);
    for (const queueItem of queueItems.docs) {
      await deleteDoc(queueItem.ref);
      console.log("✅ Deleted queue item:", queueItem.id);
    }
    
    console.log("🎉 Firebase cleanup complete! User can now start fresh matchmaking.");
    
  } catch (error) {
    console.error("❌ Cleanup error:", error);
  }
}

cleanupUserSession();