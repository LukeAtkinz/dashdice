import { doc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { GameSessionService } from './gameSessionService';

/**
 * Session Compatibility Service
 * Creates waiting room entries for gameSessions to maintain compatibility
 */
export class SessionCompatibilityService {
  
  /**
   * Create a waiting room entry that references a game session
   * This allows the old GameWaitingRoom component to work with new sessions
   */
  static async createWaitingRoomProxy(sessionId: string): Promise<string> {
    try {
      // Get the session data
      const session = await GameSessionService.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Create a waiting room entry that proxies to the session
      const waitingRoomEntry = {
        gameMode: session.gameMode,
        gameType: session.sessionType === 'ranked' ? 'Ranked' : 'Open Server',
        rankedGame: session.sessionType === 'ranked',
        playersRequired: session.participants.length < 2 ? 1 : 0,
        createdAt: serverTimestamp(),
        expiresAt: session.expiresAt,
        sessionProxy: sessionId, // Reference to the actual session
        hostData: session.hostData,
        readyPlayers: session.participants.filter(p => p.ready).map(p => p.playerId),
        // Only include opponentData if it exists and is not undefined
        ...(session.opponentData && session.opponentData !== undefined ? { opponentData: session.opponentData } : {})
      };

      const waitingRoomRef = await addDoc(collection(db, 'waitingroom'), waitingRoomEntry);
      console.log(`✅ Created waiting room proxy ${waitingRoomRef.id} for session ${sessionId}`);
      
      return waitingRoomRef.id;
    } catch (error) {
      console.error('❌ Error creating waiting room proxy:', error);
      throw error;
    }
  }

  /**
   * Update waiting room proxy to reflect session changes
   */
  static async updateWaitingRoomProxy(sessionId: string): Promise<void> {
    try {
      console.log(`🔄 Updating waiting room proxy for session ${sessionId}`);
      
      // Get the current session data
      const session = await GameSessionService.getSession(sessionId);
      if (!session) {
        console.log(`⚠️ Session ${sessionId} not found, cannot update proxy`);
        return;
      }

      // Find the waiting room proxy document
      const { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      
      const waitingRoomQuery = query(
        collection(db, 'waitingroom'),
        where('sessionProxy', '==', sessionId)
      );
      
      const querySnapshot = await getDocs(waitingRoomQuery);
      
      if (querySnapshot.empty) {
        console.log(`⚠️ No waiting room proxy found for session ${sessionId}`);
        return;
      }

      const proxyDoc = querySnapshot.docs[0];
      const updateData: any = {
        playersRequired: session.participants.length < 2 ? 1 : 0,
        readyPlayers: session.participants.filter(p => p.ready).map(p => p.playerId),
        updatedAt: serverTimestamp(), // Add timestamp to trigger listeners
      };

      // Add opponent data if available
      if (session.opponentData) {
        updateData.opponentData = session.opponentData;
        console.log(`✅ Adding opponent data to proxy: ${session.opponentData.playerDisplayName}`);
      }

      // Update the proxy document with timestamp to ensure listener triggers
      await updateDoc(proxyDoc.ref, updateData);
      console.log(`✅ Updated waiting room proxy ${proxyDoc.id} for session ${sessionId}`, updateData);
      
    } catch (error) {
      console.error('❌ Error updating waiting room proxy:', error);
    }
  }

  /**
   * Clean up waiting room proxy when session is completed
   */
  static async cleanupWaitingRoomProxy(sessionId: string): Promise<void> {
    try {
      const { collection, query, where, getDocs, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      
      const waitingRoomQuery = query(
        collection(db, 'waitingroom'),
        where('sessionProxy', '==', sessionId)
      );
      
      const querySnapshot = await getDocs(waitingRoomQuery);
      
      for (const doc of querySnapshot.docs) {
        await deleteDoc(doc.ref);
        console.log(`🗑️ Cleaned up waiting room proxy ${doc.id} for session ${sessionId}`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up waiting room proxy:', error);
    }
  }
}
