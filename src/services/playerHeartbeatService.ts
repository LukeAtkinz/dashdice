import { 
  doc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

export interface PlayerHeartbeat {
  userId: string;
  lastSeen: Date;
  isActive: boolean;
  currentRoom?: string;
  currentGame?: string;
  status: 'online' | 'in-game' | 'idle' | 'offline';
}

export class PlayerHeartbeatService {
  private static heartbeatInterval: NodeJS.Timeout | null = null;
  private static heartbeatFrequency = 30000; // 30 seconds
  private static inactivityThreshold = 90000; // 90 seconds (3 missed heartbeats)
  private static listeners: Map<string, () => void> = new Map();

  /**
   * Start heartbeat for a user
   */
  static async startHeartbeat(userId: string, currentRoom?: string, currentGame?: string): Promise<void> {
    try {
      console.log(`💓 Starting heartbeat for user ${userId}`);
      
      // Clear any existing heartbeat for this user
      this.stopHeartbeat(userId);
      
      // Send initial heartbeat
      await this.sendHeartbeat(userId, currentRoom, currentGame);
      
      // Start periodic heartbeat
      const interval = setInterval(async () => {
        try {
          await this.sendHeartbeat(userId, currentRoom, currentGame);
        } catch (error) {
          console.error(`❌ Heartbeat failed for user ${userId}:`, error);
          this.stopHeartbeat(userId);
        }
      }, this.heartbeatFrequency);
      
      this.listeners.set(userId, () => clearInterval(interval));
      
    } catch (error) {
      console.error('Error starting heartbeat:', error);
      throw error;
    }
  }

  /**
   * Send a single heartbeat
   */
  static async sendHeartbeat(userId: string, currentRoom?: string, currentGame?: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const heartbeatData: any = {
        lastSeen: serverTimestamp(),
        isOnline: true,
        heartbeatTimestamp: serverTimestamp()
      };

      if (currentRoom) {
        heartbeatData.currentRoom = currentRoom;
      }
      
      if (currentGame) {
        heartbeatData.currentGame = currentGame;
        heartbeatData.status = 'in-game';
      } else {
        heartbeatData.status = 'online';
      }

      await updateDoc(userRef, heartbeatData);
      
    } catch (error) {
      console.error('Error sending heartbeat:', error);
      throw error;
    }
  }

  /**
   * Stop heartbeat for a user
   */
  static stopHeartbeat(userId: string): void {
    const cleanup = this.listeners.get(userId);
    if (cleanup) {
      cleanup();
      this.listeners.delete(userId);
      console.log(`💓 Stopped heartbeat for user ${userId}`);
    }
  }

  /**
   * Update user's current room
   */
  static async updateCurrentRoom(userId: string, roomId: string | null): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const updateData: any = {
        lastSeen: serverTimestamp()
      };

      if (roomId) {
        updateData.currentRoom = roomId;
        updateData.status = 'in-game';
      } else {
        updateData.currentRoom = null;
        updateData.status = 'online';
      }

      await updateDoc(userRef, updateData);
      
    } catch (error) {
      console.error('Error updating current room:', error);
      throw error;
    }
  }

  /**
   * Update user's current game
   */
  static async updateCurrentGame(userId: string, gameId: string | null): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const updateData: any = {
        lastSeen: serverTimestamp()
      };

      if (gameId) {
        updateData.currentGame = gameId;
        updateData.status = 'in-game';
      } else {
        updateData.currentGame = null;
        updateData.status = 'online';
      }

      await updateDoc(userRef, updateData);
      
    } catch (error) {
      console.error('Error updating current game:', error);
      throw error;
    }
  }

  /**
   * Mark user as offline
   */
  static async markOffline(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isOnline: false,
        status: 'offline',
        currentRoom: null,
        currentGame: null,
        lastSeen: serverTimestamp()
      });
      
      this.stopHeartbeat(userId);
      
    } catch (error) {
      console.error('Error marking user offline:', error);
      throw error;
    }
  }

  /**
   * Check for inactive players and clean up
   */
  static async cleanupInactivePlayers(): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - this.inactivityThreshold);
      
      const q = query(
        collection(db, 'users'),
        where('isOnline', '==', true),
        where('heartbeatTimestamp', '<', Timestamp.fromDate(cutoffTime))
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);

      querySnapshot.forEach((docSnapshot) => {
        const userRef = doc(db, 'users', docSnapshot.id);
        batch.update(userRef, {
          isOnline: false,
          status: 'offline',
          currentRoom: null,
          currentGame: null
        });
      });

      if (!querySnapshot.empty) {
        await batch.commit();
        console.log(`🧹 Cleaned up ${querySnapshot.size} inactive players`);
      }
      
    } catch (error) {
      console.error('Error cleaning up inactive players:', error);
    }
  }

  /**
   * Get active players count
   */
  static async getActivePlayersCount(): Promise<number> {
    try {
      const q = query(
        collection(db, 'users'),
        where('isOnline', '==', true)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
      
    } catch (error) {
      console.error('Error getting active players count:', error);
      return 0;
    }
  }

  /**
   * Initialize global cleanup service
   */
  static initializeCleanupService(): void {
    // Run cleanup every 2 minutes
    setInterval(() => {
      this.cleanupInactivePlayers();
    }, 120000);
    
    console.log('🧹 Player heartbeat cleanup service initialized');
  }
}