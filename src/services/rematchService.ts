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
      
      // Update rematch room status
      await setDoc(rematchRef, { ...rematchData, status: 'accepted' }, { merge: true });
      
      // Clean up rematch room after a short delay
      setTimeout(async () => {
        try {
          await deleteDoc(rematchRef);
        } catch (error) {
          console.error('❌ RematchService: Error cleaning up rematch room:', error);
        }
      }, 5000);
      
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
      
      // Clean up after short delay
      setTimeout(async () => {
        try {
          await deleteDoc(rematchRef);
        } catch (error) {
          console.error('❌ RematchService: Error cleaning up cancelled rematch:', error);
        }
      }, 1000);
      
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
      const rematches = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as RematchRoom[];
      
      callback(rematches);
    });
  }

  /**
   * Clean up expired rematch rooms
   */
  static async cleanupExpiredRematches(): Promise<void> {
    try {
      console.log('🧹 RematchService: Cleaning up expired rematches');
      // This would typically be handled by a cloud function
      // For now, we'll rely on client-side cleanup
    } catch (error) {
      console.error('❌ RematchService: Error cleaning up expired rematches:', error);
    }
  }
}
