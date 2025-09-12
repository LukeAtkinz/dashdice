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
  private static heartbeatFrequency = 15000; // 15 seconds (enhanced from 30)
  private static inactivityThreshold = 90000; // 90 seconds (6 missed heartbeats - less aggressive)
  private static cleanupFrequency = 300000; // 5 minutes cleanup cycles (much less frequent)
  private static listeners: Map<string, () => void> = new Map();
  
  // Enhanced status tracking
  private static activeUsers: Set<string> = new Set();
  private static lastHeartbeatTimes: Map<string, number> = new Map();

  /**
   * Start heartbeat for a user
   */
  static async startHeartbeat(userId: string, currentRoom?: string, currentGame?: string): Promise<void> {
    try {
      console.log(`💓 Starting enhanced heartbeat for user ${userId} (15s intervals)`);
      
      // Clear any existing heartbeat for this user
      this.stopHeartbeat(userId);
      
      // Add to active users tracking
      this.activeUsers.add(userId);
      this.lastHeartbeatTimes.set(userId, Date.now());
      
      // Send initial heartbeat
      await this.sendHeartbeat(userId, currentRoom, currentGame);
      
      // Start periodic heartbeat with enhanced error handling
      const interval = setInterval(async () => {
        try {
          await this.sendHeartbeat(userId, currentRoom, currentGame);
          this.lastHeartbeatTimes.set(userId, Date.now());
          
          // Log successful heartbeat (only in debug mode)
          if (process.env.NODE_ENV === 'development') {
            console.log(`💓 Heartbeat sent for user ${userId}`);
          }
        } catch (error) {
          console.error(`❌ Heartbeat failed for user ${userId}:`, error);
          
          // Try one more time before stopping
          try {
            await this.sendHeartbeat(userId, currentRoom, currentGame);
            console.log(`✅ Heartbeat recovery successful for user ${userId}`);
          } catch (retryError) {
            console.error(`❌ Heartbeat recovery failed for user ${userId}, stopping heartbeat:`, retryError);
            this.stopHeartbeat(userId);
          }
        }
      }, this.heartbeatFrequency);
      
      this.listeners.set(userId, () => clearInterval(interval));
      
    } catch (error) {
      console.error('Error starting enhanced heartbeat:', error);
      this.activeUsers.delete(userId);
      this.lastHeartbeatTimes.delete(userId);
      throw error;
    }
  }

  /**
   * Send a single heartbeat with enhanced status tracking
   */
  static async sendHeartbeat(userId: string, currentRoom?: string, currentGame?: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const currentTime = Date.now();
      
      // Enhanced heartbeat data with better status tracking
      const heartbeatData: any = {
        lastSeen: serverTimestamp(),
        isOnline: true,
        heartbeatTimestamp: serverTimestamp(),
        lastActivity: serverTimestamp(), // Track last activity
        isActive: true // Explicitly track active state
      };

      // Determine accurate status based on context
      if (currentGame) {
        heartbeatData.currentGame = currentGame;
        heartbeatData.status = 'in-game';
        heartbeatData.gameActivity = serverTimestamp(); // Track game activity
      } else if (currentRoom) {
        heartbeatData.currentRoom = currentRoom;
        heartbeatData.status = 'in-room';
        heartbeatData.roomActivity = serverTimestamp(); // Track room activity
      } else {
        heartbeatData.status = 'online';
        heartbeatData.currentRoom = null;
        heartbeatData.currentGame = null;
      }

      await updateDoc(userRef, heartbeatData);
      
      // Update local tracking
      this.activeUsers.add(userId);
      this.lastHeartbeatTimes.set(userId, currentTime);
      
    } catch (error) {
      console.error('Error sending enhanced heartbeat:', error);
      throw error;
    }
  }

  /**
   * Stop heartbeat for a user with enhanced cleanup
   */
  static stopHeartbeat(userId: string): void {
    const cleanup = this.listeners.get(userId);
    if (cleanup) {
      cleanup();
      this.listeners.delete(userId);
      console.log(`💓 Stopped enhanced heartbeat for user ${userId}`);
    }
    
    // Enhanced cleanup of local tracking
    this.activeUsers.delete(userId);
    this.lastHeartbeatTimes.delete(userId);
    
    // Mark user as offline in database
    this.markOffline(userId).catch(error => {
      console.error(`Error marking user ${userId} offline during heartbeat stop:`, error);
    });
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
   * Mark user as offline with enhanced status tracking
   */
  static async markOffline(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isOnline: false,
        isActive: false,
        status: 'offline',
        currentRoom: null,
        currentGame: null,
        lastSeen: serverTimestamp(),
        offlineTimestamp: serverTimestamp() // Track when user went offline
      });
      
      // Clean up local tracking
      this.activeUsers.delete(userId);
      this.lastHeartbeatTimes.delete(userId);
      this.stopHeartbeat(userId);
      
      console.log(`📴 User ${userId} marked offline`);
      
    } catch (error) {
      console.error('Error marking user offline:', error);
      throw error;
    }
  }

  /**
   * Get online status for a specific user
   */
  static isUserOnline(userId: string): boolean {
    const lastHeartbeat = this.lastHeartbeatTimes.get(userId);
    if (!lastHeartbeat) return false;
    
    const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;
    return timeSinceLastHeartbeat < this.inactivityThreshold;
  }

  /**
   * Get all currently active users
   */
  static getActiveUsers(): string[] {
    const currentTime = Date.now();
    const activeUsers: string[] = [];
    
    for (const [userId, lastHeartbeat] of this.lastHeartbeatTimes.entries()) {
      if (currentTime - lastHeartbeat < this.inactivityThreshold) {
        activeUsers.push(userId);
      }
    }
    
    return activeUsers;
  }

  /**
   * Get heartbeat statistics
   */
  static getHeartbeatStats(): {
    totalTrackedUsers: number;
    activeUsers: number;
    heartbeatFrequency: number;
    inactivityThreshold: number;
  } {
    return {
      totalTrackedUsers: this.lastHeartbeatTimes.size,
      activeUsers: this.getActiveUsers().length,
      heartbeatFrequency: this.heartbeatFrequency,
      inactivityThreshold: this.inactivityThreshold
    };
  }

  /**
   * Enhanced cleanup for inactive players with better detection
   */
  static async cleanupInactivePlayers(): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - this.inactivityThreshold);
      
      // Clean up local tracking first - but only for truly inactive users
      const currentTime = Date.now();
      const inactiveLocalUsers: string[] = [];
      
      for (const [userId, lastHeartbeat] of this.lastHeartbeatTimes.entries()) {
        // More generous threshold for local cleanup
        if (currentTime - lastHeartbeat > (this.inactivityThreshold * 2)) {
          inactiveLocalUsers.push(userId);
          this.activeUsers.delete(userId);
          this.lastHeartbeatTimes.delete(userId);
        }
      }
      
      if (inactiveLocalUsers.length > 0) {
        console.log(`🧹 Locally cleaned up ${inactiveLocalUsers.length} truly inactive users: ${inactiveLocalUsers.join(', ')}`);
      }

      // Query database for inactive players - use more generous threshold
      const dbCutoffTime = new Date(Date.now() - (this.inactivityThreshold * 2));
      const q = query(
        collection(db, 'users'),
        where('isOnline', '==', true),
        where('heartbeatTimestamp', '<', Timestamp.fromDate(dbCutoffTime))
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // console.log('🧹 No inactive players found in database');
        return;
      }

      const batch = writeBatch(db);
      const cleanedUserIds: string[] = [];

      querySnapshot.forEach((docSnapshot) => {
        const userId = docSnapshot.id;
        const userRef = doc(db, 'users', userId);
        
        batch.update(userRef, {
          isOnline: false,
          isActive: false,
          status: 'offline',
          currentRoom: null,
          currentGame: null,
          offlineTimestamp: serverTimestamp()
        });
        
        cleanedUserIds.push(userId);
        
        // Clean up local tracking as well
        this.activeUsers.delete(userId);
        this.lastHeartbeatTimes.delete(userId);
        this.stopHeartbeat(userId);
      });

      await batch.commit();
      console.log(`🧹 Database cleanup: marked ${cleanedUserIds.length} users offline: ${cleanedUserIds.join(', ')}`);
      
    } catch (error) {
      console.error('Error in enhanced cleanup of inactive players:', error);
    }
  }

  /**
   * Get active players count with enhanced accuracy
   */
  static async getActivePlayersCount(): Promise<number> {
    try {
      // First get local count (most accurate for recent activity)
      const localActiveCount = this.getActiveUsers().length;
      
      // Also query database for verification
      const q = query(
        collection(db, 'users'),
        where('isOnline', '==', true)
      );

      const querySnapshot = await getDocs(q);
      const databaseActiveCount = querySnapshot.size;
      
      // Log discrepancy if significant
      if (Math.abs(localActiveCount - databaseActiveCount) > 5) {
        console.warn(`📊 Active player count discrepancy: Local=${localActiveCount}, Database=${databaseActiveCount}`);
      }
      
      // Return the higher count (more conservative)
      return Math.max(localActiveCount, databaseActiveCount);
      
    } catch (error) {
      console.error('Error getting enhanced active players count:', error);
      return this.getActiveUsers().length; // Fallback to local count
    }
  }

  /**
   * Initialize enhanced cleanup service with more frequent monitoring
   */
  static initializeCleanupService(): void {
    // Run cleanup every minute for more responsive cleanup
    setInterval(() => {
      this.cleanupInactivePlayers();
    }, this.cleanupFrequency);
    
    // Log heartbeat statistics every 5 minutes in development
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        const stats = this.getHeartbeatStats();
        console.log('💓 Enhanced Heartbeat Stats:', stats);
      }, 300000); // 5 minutes
    }
    
    console.log(`🧹 Enhanced player heartbeat cleanup service initialized (${this.cleanupFrequency/1000}s intervals)`);
    console.log(`💓 Heartbeat frequency: ${this.heartbeatFrequency/1000}s, Inactivity threshold: ${this.inactivityThreshold/1000}s`);
  }

  /**
   * Force refresh all heartbeats (useful for testing)
   */
  static async forceRefreshAllHeartbeats(): Promise<void> {
    console.log('🔄 Force refreshing all active heartbeats...');
    
    const activeUserIds = Array.from(this.activeUsers);
    const refreshPromises = activeUserIds.map(userId => 
      this.sendHeartbeat(userId).catch(error => 
        console.error(`Error refreshing heartbeat for ${userId}:`, error)
      )
    );
    
    await Promise.all(refreshPromises);
    console.log(`✅ Force refreshed ${activeUserIds.length} heartbeats`);
  }
}