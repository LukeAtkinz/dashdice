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
  Timestamp,
  getDocs,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { MatchmakingService } from './matchmakingService';

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
      console.log('🔄 RematchService: Creating rematch room');
      
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
        expiresAt: new Date(Date.now() + this.REMATCH_TIMEOUT),
        status: 'waiting'
      };
      
      // Use a predictable ID based on both users to prevent duplicates
      const rematchRoomId = `rematch_${requesterUserId}_${opponentUserId}_${Date.now()}`;
      const rematchRef = doc(db, this.REMATCH_COLLECTION, rematchRoomId);
      
      await setDoc(rematchRef, rematchRoomData);
      
      console.log('✅ RematchService: Rematch room created:', rematchRoomId);
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
      
      // Create a new waiting room for the rematch
      // We'll use the same game settings as the original match
      const newMatchId = await MatchmakingService.createRematchWaitingRoom(
        rematchData.requesterUserId,
        rematchData.requesterDisplayName,
        rematchData.opponentUserId,
        rematchData.opponentDisplayName,
        rematchData.gameMode,
        rematchData.gameType
      );
      
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
   * Cancel a rematch request
   */
  static async cancelRematch(rematchRoomId: string, userId: string): Promise<void> {
    try {
      console.log('❌ RematchService: Cancelling rematch');
      
      const rematchRef = doc(db, this.REMATCH_COLLECTION, rematchRoomId);
      const rematchSnap = await getDoc(rematchRef);
      
      if (!rematchSnap.exists()) return;
      
      const rematchData = rematchSnap.data() as RematchRoom;
      
      // Only the requester can cancel
      if (userId !== rematchData.requesterUserId) {
        throw new Error('Unauthorized to cancel this rematch');
      }
      
      await setDoc(rematchRef, { ...rematchData, status: 'cancelled' }, { merge: true });
      
      // Delete immediately after cancellation to keep database clean
      await deleteDoc(rematchRef);
      console.log('✅ RematchService: Deleted cancelled rematch room:', rematchRoomId);
      
      console.log('✅ RematchService: Rematch cancelled');
    } catch (error) {
      console.error('❌ RematchService: Error cancelling rematch:', error);
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
    // Clean up expired rematches every minute (they only last 10 seconds)
    setInterval(() => {
      this.cleanupExpiredRematches();
    }, 60 * 1000);
    
    console.log('✅ RematchService: Started automatic rematch cleanup timer');
  }
}
