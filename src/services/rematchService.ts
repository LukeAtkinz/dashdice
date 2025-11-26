import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp,
  addDoc,
  Timestamp,
  getDocs,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { GoBackendService } from './goBackendService';

export interface RematchRoom {
  id: string;
  requesterUserId: string;
  requesterDisplayName: string;
  opponentUserId: string;
  opponentDisplayName: string;
  originalMatchId: string;
  gameMode: string;
  gameType: string;
  createdAt: any;
  expiresAt: any;
  status: 'waiting' | 'accepted' | 'expired' | 'cancelled';
  newMatchId?: string; // Added to store the new match ID when accepted
}

export class RematchService {
  private static readonly REMATCH_COLLECTION = 'rematchRooms';
  private static readonly REMATCH_TIMEOUT = 10000; // 10 seconds in milliseconds

  /**
   * Create a rematch room that only the opponent can join
   */
  static async createRematchRoom(
    requesterUserId: string,
    requesterDisplayName: string,
    opponentUserId: string,
    opponentDisplayName: string,
    originalMatchId: string,
    gameMode: string,
    gameType: string
  ): Promise<string> {
    try {
      console.log('🔄 RematchService: Creating rematch room with data:', {
        requesterUserId,
        requesterDisplayName,
        opponentUserId,
        opponentDisplayName,
        gameMode,
        gameType
      });
      
      // Create rematch room document
      const rematchRoomData: Omit<RematchRoom, 'id'> = {
        requesterUserId,
        requesterDisplayName,
        opponentUserId,
        opponentDisplayName,
        originalMatchId,
        gameMode,
        gameType,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + this.REMATCH_TIMEOUT)),
        status: 'waiting'
      };
      
      // Use a predictable ID based on both users to prevent duplicates
      const rematchRoomId = `rematch_${requesterUserId}_${opponentUserId}_${Date.now()}`;
      const rematchRef = doc(db, this.REMATCH_COLLECTION, rematchRoomId);
      
      console.log('📝 RematchService: Writing to Firestore collection:', this.REMATCH_COLLECTION, 'ID:', rematchRoomId);
      await setDoc(rematchRef, rematchRoomData);
      
      console.log('✅ RematchService: Rematch room created successfully:', rematchRoomId);
      console.log('👀 RematchService: Opponent should now see notification for userId:', opponentUserId);
      return rematchRoomId;
    } catch (error) {
      console.error('❌ RematchService: Error creating rematch room:', error);
      throw error;
    }
  }

  /**
   * Accept a rematch and create a new match
   */
  static async acceptRematch(rematchRoomId: string, acceptingUserId: string): Promise<string> {
    try {
      console.log('✅ RematchService: Accepting rematch');
      
      const rematchRef = doc(db, this.REMATCH_COLLECTION, rematchRoomId);
      const rematchSnap = await getDoc(rematchRef);
      
      if (!rematchSnap.exists()) {
        throw new Error('Rematch room not found');
      }
      
      const rematchData = rematchSnap.data() as RematchRoom;
      
      // Verify the accepting user is the intended opponent
      if (acceptingUserId !== rematchData.opponentUserId) {
        throw new Error('Unauthorized to accept this rematch');
      }
      
      // Check if rematch has expired
      if (rematchData.status !== 'waiting' || new Date() > rematchData.expiresAt.toDate()) {
        throw new Error('Rematch has expired');
      }
      
      // Create a new waiting room for the rematch using Go services with Firebase fallback
      // We'll use the same game settings as the original match
      let newMatchId: string;
      
      try {
        newMatchId = await GoBackendService.createRematchWaitingRoom(
          rematchData.requesterUserId,
          rematchData.requesterDisplayName,
          rematchData.opponentUserId,
          rematchData.opponentDisplayName,
          rematchData.gameMode,
          rematchData.gameType,
          rematchData.originalMatchId
        );
        console.log('✅ RematchService: Created rematch via Go backend:', newMatchId);
      } catch (error) {
        console.warn('⚠️ RematchService: Go backend failed, falling back to Firebase');
        console.error('Go backend error:', error);
        
        // Fallback to Firebase-based rematch creation
        newMatchId = await this.createRematchWaitingRoomFirebase(
          rematchData.requesterUserId,
          rematchData.requesterDisplayName,
          rematchData.opponentUserId,
          rematchData.opponentDisplayName,
          rematchData.gameMode,
          rematchData.gameType,
          rematchData.originalMatchId
        );
        console.log('✅ RematchService: Created rematch via Firebase fallback:', newMatchId);
      }
      
      // Update rematch room status with new match ID
      await setDoc(rematchRef, { 
        ...rematchData, 
        status: 'accepted',
        newMatchId: newMatchId
      }, { merge: true });
      
      // Delete rematch room immediately after acceptance to keep database clean
      await deleteDoc(rematchRef);
      console.log('✅ RematchService: Deleted accepted rematch room:', rematchRoomId);
      
      console.log('🎮 RematchService: Rematch accepted, new match created:', newMatchId);
      return newMatchId;
    } catch (error) {
      console.error('❌ RematchService: Error accepting rematch:', error);
      throw error;
    }
  }

  /**
   * Cancel a rematch request (can be timeout, decline, or manual cancel)
   */
  static async cancelRematch(rematchRoomId: string, userId: string, reason: 'timeout' | 'declined' | 'cancelled' = 'cancelled'): Promise<void> {
    try {
      console.log(`❌ RematchService: ${reason} rematch`);
      
      const rematchRef = doc(db, this.REMATCH_COLLECTION, rematchRoomId);
      const rematchSnap = await getDoc(rematchRef);
      
      if (!rematchSnap.exists()) return;
      
      const rematchData = rematchSnap.data() as RematchRoom;
      
      // Send notification to requester if declined or timed out
      if ((reason === 'declined' || reason === 'timeout') && userId === rematchData.opponentUserId) {
        try {
          // Get declining user's data for notification
          const userRef = doc(db, 'users', userId);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.data();
          const userName = userData?.displayName || userData?.username || 'Someone';
          
          // Create notification for the requester
          await addDoc(collection(db, 'notifications'), {
            userId: rematchData.requesterUserId,
            type: 'rematch_declined',
            message: reason === 'timeout' 
              ? `${userName} didn't respond to your rematch request`
              : `${userName} declined your rematch request`,
            fromUserName: userName,
            gameMode: rematchData.gameMode,
            createdAt: serverTimestamp(),
            read: false
          });
          console.log(`✅ RematchService: Sent ${reason} notification to requester`);
        } catch (notificationError) {
          console.error(`❌ RematchService: Failed to send ${reason} notification:`, notificationError);
        }
      }
      
      // Only the requester or opponent can cancel/decline
      if (userId !== rematchData.requesterUserId && userId !== rematchData.opponentUserId) {
        throw new Error('Unauthorized to cancel this rematch');
      }
      
      await setDoc(rematchRef, { ...rematchData, status: 'cancelled' }, { merge: true });
      
      // Delete immediately after cancellation to keep database clean
      await deleteDoc(rematchRef);
      console.log('✅ RematchService: Deleted cancelled rematch room:', rematchRoomId);
      
      console.log(`✅ RematchService: Rematch ${reason}`);
    } catch (error) {
      console.error(`❌ RematchService: Error ${reason} rematch:`, error);
      throw error;
    }
  }

  /**
   * Listen for rematch room updates
   */
  static subscribeToRematchRoom(
    rematchRoomId: string, 
    callback: (rematchData: RematchRoom | null) => void
  ): Unsubscribe {
    const rematchRef = doc(db, this.REMATCH_COLLECTION, rematchRoomId);
    
    return onSnapshot(rematchRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as RematchRoom;
        callback({ ...data, id: doc.id });
      } else {
        callback(null);
      }
    });
  }

  /**
   * Listen for incoming rematch requests for a user
   */
  static subscribeToIncomingRematches(
    userId: string,
    callback: (rematches: RematchRoom[]) => void
  ): Unsubscribe {
    const rematchQuery = query(
      collection(db, this.REMATCH_COLLECTION),
      where('opponentUserId', '==', userId),
      where('status', '==', 'waiting')
    );
    
    return onSnapshot(rematchQuery, (snapshot) => {
      try {
        const rematches = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as RematchRoom[];
        
        callback(rematches);
      } catch (error) {
        console.error('❌ RematchService: Error processing rematch updates:', error);
        callback([]); // Return empty array on error
      }
    }, (error) => {
      console.error('❌ RematchService: Error in rematch subscription:', error);
      callback([]); // Return empty array on error
    });
  }

  /**
   * Clean up expired rematch rooms
   */
  /**
   * Create rematch waiting room using Firebase (fallback method)
   */
  private static async createRematchWaitingRoomFirebase(
    requesterUserId: string,
    requesterDisplayName: string,
    opponentUserId: string,
    opponentDisplayName: string,
    gameMode: string,
    gameType: string,
    originalMatchId?: string
  ): Promise<string> {
    console.log('🔄 RematchService: Creating rematch waiting room via Firebase');
    
    // Import MatchmakingService for Firebase fallback
    const { MatchmakingService } = await import('./matchmakingService');
    
    const newMatchId = await MatchmakingService.createRematchWaitingRoom(
      requesterUserId,
      requesterDisplayName,
      opponentUserId,
      opponentDisplayName,
      gameMode,
      gameType
    );
    
    console.log('✅ RematchService: Firebase rematch waiting room created:', newMatchId);
    return newMatchId;
  }

  /**
   * Cleanup expired rematches from the database
   */
  static async cleanupExpiredRematches(): Promise<void> {
    try {
      console.log('🧹 RematchService: Starting cleanup of expired rematches...');
      
      const now = new Date();
      const expiredQuery = query(
        collection(db, this.REMATCH_COLLECTION),
        where('expiresAt', '<', Timestamp.fromDate(now))
      );

      const snapshot = await getDocs(expiredQuery);
      
      if (snapshot.empty) {
        console.log('✅ RematchService: No expired rematches found');
        return;
      }

      // Delete all expired rematches
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log(`✅ RematchService: Deleted ${snapshot.docs.length} expired rematches`);
    } catch (error) {
      console.error('❌ RematchService: Error cleaning up expired rematches:', error);
    }
  }

  // Start automatic cleanup timer (call this when the app starts)
  static startRematchCleanupTimer(): void {
    // Only run on the client side
    if (typeof window === 'undefined') {
      console.warn('⚠️ RematchService: Cleanup timer skipped (SSR environment)');
      return;
    }

    // Clean up expired rematches every 5 minutes (they only last 10 seconds)
    setInterval(() => {
      this.cleanupExpiredRematches();
    }, 5 * 60 * 1000);
    
    console.log('✅ RematchService: Started automatic rematch cleanup timer (5min intervals)');
  }
}
