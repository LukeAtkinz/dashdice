/**
 * Matchmaking Connection Fix Service
 * Addresses the core issues preventing players from finding each other
 */

import { auth, db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';

interface QueueEntry {
  id?: string;
  userId: string;
  gameMode: string;
  skillLevel: number;
  createdAt: Timestamp;
  isActive: boolean;
  preferences?: any;
}

interface MatchResult {
  matchId: string;
  players: string[];
  gameMode: string;
  createdAt: Timestamp;
}

export class MatchmakingConnectionFixer {
  private static queueListeners: Map<string, () => void> = new Map();
  private static isInitialized = false;

  /**
   * Initialize the fixed matchmaking system
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔧 Initializing fixed matchmaking system...');
      
      // Clean up any old/stale queue entries first
      await this.cleanupStaleEntries();
      
      // Set up real-time queue monitoring
      await this.setupQueueMonitoring();
      
      this.isInitialized = true;
      console.log('✅ Fixed matchmaking system initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize fixed matchmaking:', error);
      throw error;
    }
  }

  /**
   * Clean up stale queue entries (older than 5 minutes)
   */
  private static async cleanupStaleEntries(): Promise<void> {
    try {
      const fiveMinutesAgo = Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000));
      const staleQuery = query(
        collection(db, 'matchmakingQueue'),
        where('createdAt', '<', fiveMinutesAgo)
      );
      
      const staleEntries = await getDocs(staleQuery);
      const deletePromises = staleEntries.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      if (staleEntries.size > 0) {
        console.log(`🧹 Cleaned up ${staleEntries.size} stale queue entries`);
      }
    } catch (error) {
      console.warn('Failed to cleanup stale entries:', error);
    }
  }

  /**
   * Set up real-time queue monitoring for automatic matching
   */
  private static async setupQueueMonitoring(): Promise<void> {
    try {
      // Monitor the queue collection for changes
      const queueRef = collection(db, 'matchmakingQueue');
      const queueQuery = query(
        queueRef,
        where('isActive', '==', true),
        orderBy('createdAt', 'asc')
      );

      // Set up real-time listener
      onSnapshot(queueQuery, async (snapshot) => {
        console.log(`📊 Queue update: ${snapshot.size} players waiting`);
        
        // Group players by game mode
        const playersByMode: Map<string, QueueEntry[]> = new Map();
        
        snapshot.docs.forEach(doc => {
          const entry = { id: doc.id, ...doc.data() } as QueueEntry;
          const mode = entry.gameMode;
          
          if (!playersByMode.has(mode)) {
            playersByMode.set(mode, []);
          }
          playersByMode.get(mode)!.push(entry);
        });

        // Try to create matches for each game mode
        for (const [gameMode, players] of playersByMode) {
          if (players.length >= 2) {
            await this.attemptMatching(gameMode, players);
          }
        }
      });

      console.log('👂 Queue monitoring active');
    } catch (error) {
      console.error('Failed to setup queue monitoring:', error);
    }
  }

  /**
   * Attempt to create matches from waiting players
   */
  private static async attemptMatching(gameMode: string, players: QueueEntry[]): Promise<void> {
    try {
      // Sort players by wait time (first come, first served for now)
      players.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);

      // Create matches in pairs
      for (let i = 0; i < players.length - 1; i += 2) {
        const player1 = players[i];
        const player2 = players[i + 1];

        // Skip if players are too far apart in skill (simple skill matching)
        const skillDiff = Math.abs(player1.skillLevel - player2.skillLevel);
        if (skillDiff > 3) {
          console.log(`⚖️ Skill gap too large (${skillDiff}) between players, skipping match`);
          continue;
        }

        // Create the match
        await this.createMatch(gameMode, [player1, player2]);
      }
    } catch (error) {
      console.error('Failed to attempt matching:', error);
    }
  }

  /**
   * Create a match between players
   */
  private static async createMatch(gameMode: string, players: QueueEntry[]): Promise<void> {
    try {
      const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create match document
      const matchData = {
        matchId,
        gameMode,
        players: players.map(p => p.userId),
        status: 'created',
        createdAt: serverTimestamp(),
        type: 'matchFound'
      };

      await addDoc(collection(db, 'matches'), matchData);
      
      // Remove players from queue
      const removePromises = players.map(player => {
        if (player.id) {
          return deleteDoc(doc(db, 'matchmakingQueue', player.id));
        }
        return Promise.resolve();
      });
      await Promise.all(removePromises);

      // Notify players via user-specific collections
      const notificationPromises = players.map(player => {
        return addDoc(collection(db, 'userNotifications', player.userId, 'notifications'), {
          type: 'matchFound',
          matchId,
          gameMode,
          players: players.map(p => p.userId),
          createdAt: serverTimestamp(),
          read: false
        });
      });
      await Promise.all(notificationPromises);

      console.log(`🎮 Match created: ${matchId} for ${players.length} players in ${gameMode}`);
      
    } catch (error) {
      console.error('Failed to create match:', error);
    }
  }

  /**
   * Join matchmaking queue (fixed version)
   */
  static async joinQueue(gameMode: string, skillLevel: number = 5): Promise<{ success: boolean; queueId?: string; error?: string }> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Ensure system is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check if user is already in queue
      const existingQuery = query(
        collection(db, 'matchmakingQueue'),
        where('userId', '==', user.uid),
        where('isActive', '==', true)
      );
      
      const existingEntries = await getDocs(existingQuery);
      if (!existingEntries.empty) {
        return { success: false, error: 'Already in queue' };
      }

      // Add user to queue
      const queueEntry = {
        userId: user.uid,
        gameMode,
        skillLevel,
        createdAt: serverTimestamp(),
        isActive: true,
        joinedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'matchmakingQueue'), queueEntry);
      
      // Set up user-specific match listener
      this.setupUserMatchListener(user.uid);

      console.log(`🎯 User ${user.uid} joined ${gameMode} queue`);
      return { success: true, queueId: docRef.id };

    } catch (error) {
      console.error('Failed to join queue:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Set up listener for user-specific match notifications
   */
  private static setupUserMatchListener(userId: string): void {
    if (this.queueListeners.has(userId)) {
      return; // Already listening
    }

    const notificationsRef = collection(db, 'userNotifications', userId, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('type', '==', 'matchFound'),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          console.log('🎉 Match found notification:', notification);
          
          // Mark as read
          updateDoc(change.doc.ref, { read: true });
          
          // Trigger match found event
          this.handleMatchFound(notification);
        }
      });
    });

    this.queueListeners.set(userId, unsubscribe);
  }

  /**
   * Handle match found event
   */
  private static handleMatchFound(matchData: any): void {
    console.log('🎮 MATCH FOUND!', matchData);
    
    // Dispatch custom event for the UI to handle
    window.dispatchEvent(new CustomEvent('matchFound', { 
      detail: matchData 
    }));

    // You can also trigger a toast notification or redirect here
    // Example: router.push(`/game/${matchData.matchId}`);
  }

  /**
   * Leave matchmaking queue
   */
  static async leaveQueue(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Remove from queue
      const queueQuery = query(
        collection(db, 'matchmakingQueue'),
        where('userId', '==', user.uid),
        where('isActive', '==', true)
      );
      
      const queueEntries = await getDocs(queueQuery);
      const deletePromises = queueEntries.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Remove listener
      const unsubscribe = this.queueListeners.get(user.uid);
      if (unsubscribe) {
        unsubscribe();
        this.queueListeners.delete(user.uid);
      }

      console.log(`🚪 User ${user.uid} left queue`);

    } catch (error) {
      console.error('Failed to leave queue:', error);
    }
  }

  /**
   * Get current queue status
   */
  static async getQueueStatus(gameMode: string): Promise<{ waiting: number; estimatedWait: string }> {
    try {
      const queueQuery = query(
        collection(db, 'matchmakingQueue'),
        where('gameMode', '==', gameMode),
        where('isActive', '==', true)
      );
      
      const queueSnapshot = await getDocs(queueQuery);
      const waiting = queueSnapshot.size;
      
      // Simple wait time estimation
      const estimatedWait = waiting < 2 ? 'Looking for players...' : 
                           waiting < 5 ? 'Less than 1 minute' : 
                           'About 2-3 minutes';

      return { waiting, estimatedWait };
      
    } catch (error) {
      console.error('Failed to get queue status:', error);
      return { waiting: 0, estimatedWait: 'Unknown' };
    }
  }

  /**
   * Debug current queue state
   */
  static async debugQueue(): Promise<void> {
    try {
      console.log('🔍 DEBUG: Current queue state');
      
      const queueSnapshot = await getDocs(collection(db, 'matchmakingQueue'));
      console.log(`Total queue entries: ${queueSnapshot.size}`);
      
      const activeQuery = query(
        collection(db, 'matchmakingQueue'),
        where('isActive', '==', true)
      );
      const activeSnapshot = await getDocs(activeQuery);
      console.log(`Active queue entries: ${activeSnapshot.size}`);
      
      // Group by game mode
      const modeGroups: Record<string, number> = {};
      activeSnapshot.docs.forEach(doc => {
        const data = doc.data();
        modeGroups[data.gameMode] = (modeGroups[data.gameMode] || 0) + 1;
      });
      
      console.log('Players by game mode:', modeGroups);
      
      // Check for recent matches
      const recentMatches = query(
        collection(db, 'matches'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const matchesSnapshot = await getDocs(recentMatches);
      console.log(`Recent matches: ${matchesSnapshot.size}`);
      
    } catch (error) {
      console.error('Debug failed:', error);
    }
  }
}

// Make available globally for testing
(window as any).MatchmakingConnectionFixer = MatchmakingConnectionFixer;
