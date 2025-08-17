// Presence Service for real-time online status tracking
import { 
  collection, 
  doc, 
  onSnapshot, 
  serverTimestamp, 
  updateDoc, 
  setDoc,
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { User, PresenceState } from '@/types/friends';

export class PresenceService {
  private static heartbeatInterval: NodeJS.Timeout | null = null;
  private static currentUserId: string | null = null;
  private static isActive = false;

  // Start presence tracking for a user
  static async startPresenceTracking(userId: string): Promise<void> {
    try {
      this.currentUserId = userId;
      this.isActive = true;

      // Set initial online status
      await this.updatePresence(userId, {
        isOnline: true,
        status: 'online',
        lastSeen: serverTimestamp() as Timestamp,
      });

      // Start heartbeat (every 30 seconds)
      this.heartbeatInterval = setInterval(() => {
        if (this.isActive && this.currentUserId) {
          this.sendHeartbeat(this.currentUserId);
        }
      }, 30000);

      // Handle page visibility changes
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      
      // Handle beforeunload (user closing tab/browser)
      window.addEventListener('beforeunload', () => {
        this.setOffline(userId);
      });

      console.log('Presence tracking started for user:', userId);
    } catch (error) {
      console.error('Error starting presence tracking:', error);
    }
  }

  // Stop presence tracking
  static async stopPresenceTracking(): Promise<void> {
    try {
      this.isActive = false;
      
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (this.currentUserId) {
        await this.setOffline(this.currentUserId);
        this.currentUserId = null;
      }

      // Remove event listeners
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);

      console.log('Presence tracking stopped');
    } catch (error) {
      console.error('Error stopping presence tracking:', error);
    }
  }

  // Send heartbeat to maintain online status
  private static async sendHeartbeat(userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'presence', userId), {
        lastSeen: serverTimestamp(),
        isOnline: true,
      });
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  }

  // Update user presence
  static async updatePresence(userId: string, presenceData: Partial<PresenceState>): Promise<void> {
    try {
      const presenceRef = doc(db, 'presence', userId);
      await setDoc(presenceRef, {
        ...presenceData,
        lastSeen: serverTimestamp(),
      }, { merge: true });

      // Also update user document
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isOnline: presenceData.isOnline ?? true,
        lastSeen: serverTimestamp(),
        status: presenceData.status || 'online',
        currentGame: presenceData.currentGame || null,
      });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }

  // Set user offline
  static async setOffline(userId: string): Promise<void> {
    try {
      await this.updatePresence(userId, {
        isOnline: false,
        status: 'offline',
        currentGame: undefined,
      });
    } catch (error) {
      console.error('Error setting user offline:', error);
    }
  }

  // Update user status (online, away, busy)
  static async updateStatus(userId: string, status: 'online' | 'away' | 'busy'): Promise<void> {
    try {
      await this.updatePresence(userId, { status });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  // Update current game
  static async updateCurrentGame(userId: string, gameId?: string): Promise<void> {
    try {
      await this.updatePresence(userId, { currentGame: gameId });
    } catch (error) {
      console.error('Error updating current game:', error);
    }
  }

  // Get user presence
  static async getUserPresence(userId: string): Promise<PresenceState | null> {
    try {
      const presenceDoc = await getDoc(doc(db, 'presence', userId));
      if (presenceDoc.exists()) {
        return presenceDoc.data() as PresenceState;
      }
      return null;
    } catch (error) {
      console.error('Error getting user presence:', error);
      return null;
    }
  }

  // Subscribe to user presence changes
  static subscribeToPresence(userId: string, callback: (presence: PresenceState | null) => void): () => void {
    const unsubscribe = onSnapshot(
      doc(db, 'presence', userId),
      (doc) => {
        if (doc.exists()) {
          callback(doc.data() as PresenceState);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Error subscribing to presence:', error);
        callback(null);
      }
    );

    return unsubscribe;
  }

  // Subscribe to multiple users' presence
  static subscribeToMultiplePresence(userIds: string[], callback: (presences: Record<string, PresenceState>) => void): () => void {
    const unsubscribes: (() => void)[] = [];
    const presences: Record<string, PresenceState> = {};

    userIds.forEach(userId => {
      const unsubscribe = this.subscribeToPresence(userId, (presence) => {
        if (presence) {
          presences[userId] = presence;
        } else {
          delete presences[userId];
        }
        callback({ ...presences });
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }

  // Handle page visibility changes
  private static handleVisibilityChange = async (): Promise<void> => {
    if (!this.currentUserId) return;

    try {
      if (document.visibilityState === 'visible') {
        // Page became visible - set online
        await this.updateStatus(this.currentUserId, 'online');
      } else {
        // Page became hidden - set away
        await this.updateStatus(this.currentUserId, 'away');
      }
    } catch (error) {
      console.error('Error handling visibility change:', error);
    }
  };

  // Check if presence is stale (user hasn't been seen for > 2 minutes)
  static isPresenceStale(lastSeen: Timestamp): boolean {
    const now = new Date();
    const lastSeenDate = lastSeen.toDate();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    return diffMinutes > 2;
  }

  // Get formatted last seen time
  static getLastSeenText(lastSeen: Timestamp): string {
    const now = new Date();
    const lastSeenDate = lastSeen.toDate();
    const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}
