'use client';

import { doc, onSnapshot, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { GoBackendAdapter } from './goBackendAdapter';

export interface ActiveMatchNotification {
  matchId: string;
  gameMode: string;
  opponentName: string;
  lastActivity: Date;
  canRejoin: boolean;
}

export interface AbandonmentNotification {
  matchId: string;
  abandonedBy: string;
  timeLeft: number;
  canClaim: boolean;
}

export class PersistentNotificationService {
  private static currentUserId: string | null = null;
  private static matchSubscription: (() => void) | null = null;
  private static userSubscription: (() => void) | null = null;
  private static onActiveMatchCallback: ((notification: ActiveMatchNotification | null) => void) | null = null;
  private static onAbandonmentCallback: ((notification: AbandonmentNotification | null) => void) | null = null;
  private static abandonmentTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize persistent notifications for a user
   */
  static async initialize(userId: string): Promise<void> {
    console.log('📢 PersistentNotificationService: Initializing for user:', userId);
    
    this.currentUserId = userId;
    
    // Wait a moment for authentication to fully initialize
    // This prevents making Go backend calls before auth token is ready
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check for active matches after auth has settled
    await this.checkActiveMatches(userId);
    
    // Set up real-time monitoring
    this.setupUserMonitoring(userId);
  }

  /**
   * Set callback for active match notifications
   */
  static onActiveMatch(callback: (notification: ActiveMatchNotification | null) => void): void {
    this.onActiveMatchCallback = callback;
  }

  /**
   * Set callback for abandonment notifications
   */
  static onAbandonment(callback: (notification: AbandonmentNotification | null) => void): void {
    this.onAbandonmentCallback = callback;
  }

  /**
   * Check for active matches that user should rejoin
   */
  private static async checkActiveMatches(userId: string): Promise<void> {
    try {
      console.log('🔍 Checking for active matches for user:', userId);
      
      // Check Go backend first
      const matchStatus = await GoBackendAdapter.checkUserInMatch(userId);
      
      if (matchStatus.inMatch && matchStatus.currentGame) {
        console.log('✅ Found active match in Go backend:', matchStatus);
        
        // Get match details from Firebase
        const matchDoc = await getDoc(doc(db, 'matches', matchStatus.currentGame));
        
        if (matchDoc.exists()) {
          const matchData = matchDoc.data();
          const isHost = matchData.hostData?.playerId === userId;
          const opponentData = isHost ? matchData.opponentData : matchData.hostData;
          
          const notification: ActiveMatchNotification = {
            matchId: matchStatus.currentGame,
            gameMode: matchStatus.gameMode || matchData.gameMode || 'classic',
            opponentName: opponentData?.playerDisplayName || 'Unknown Player',
            lastActivity: matchData.updatedAt?.toDate() || new Date(),
            canRejoin: true
          };
          
          console.log('📢 Notifying about active match:', notification);
          this.onActiveMatchCallback?.(notification);
          
          // Start monitoring this match for abandonment
          this.monitorMatchAbandonment(matchStatus.currentGame, userId);
        }
      } else {
        // Clear any existing notifications
        this.onActiveMatchCallback?.(null);
      }
      
    } catch (error) {
      console.error('❌ Error checking active matches:', error);
    }
  }

  /**
   * Monitor user document for currentGame changes
   */
  private static setupUserMonitoring(userId: string): void {
    // Clean up existing subscription
    if (this.userSubscription) {
      this.userSubscription();
    }

    const userRef = doc(db, 'users', userId);
    
    this.userSubscription = onSnapshot(userRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      
      const userData = snapshot.data();
      const currentGame = userData.currentGame;
      
      console.log('👤 User document updated, currentGame:', currentGame);
      
      if (currentGame) {
        // User has an active game, start monitoring
        this.monitorMatchAbandonment(currentGame, userId);
      } else {
        // User's currentGame is null - but they might still be in a match
        // Check if we're already monitoring a match before clearing notifications
        if (!this.matchSubscription) {
          console.log('🧹 No currentGame and no active match monitoring, clearing notifications');
          this.onActiveMatchCallback?.(null);
          this.onAbandonmentCallback?.(null);
          this.clearMatchMonitoring();
        } else {
          console.log('🎮 currentGame cleared but still monitoring an active match for abandonment');
        }
      }
    }, (error) => {
      console.error('❌ Error monitoring user document:', error);
    });
  }

  /**
   * Monitor a specific match for abandonment
   */
  private static monitorMatchAbandonment(matchId: string, userId: string): void {
    console.log('🎮 Starting match abandonment monitoring for:', matchId);
    
    // Clean up existing match subscription
    this.clearMatchMonitoring();

    const matchRef = doc(db, 'matches', matchId);
    
    this.matchSubscription = onSnapshot(matchRef, (snapshot) => {
      if (!snapshot.exists()) {
        console.log('❌ Match document no longer exists:', matchId);
        this.onAbandonmentCallback?.(null);
        return;
      }
      
      const matchData = snapshot.data();
      
      // Check if match is completed
      if (matchData.gameData?.gamePhase === 'gameOver') {
        console.log('🏁 Match completed, clearing abandonment monitoring');
        this.onAbandonmentCallback?.(null);
        return;
      }
      
      // Find opponent and check their last heartbeat
      const isHost = matchData.hostData?.playerId === userId;
      const opponentData = isHost ? matchData.opponentData : matchData.hostData;
      
      console.log('🕵️ Abandonment check:', {
        matchId,
        isHost,
        opponentId: opponentData?.playerId,
        hasOpponentHeartbeat: !!opponentData?.lastHeartbeat,
        gamePhase: matchData.gameData?.gamePhase
      });
      
      if (opponentData && opponentData.lastHeartbeat) {
        const lastHeartbeat = opponentData.lastHeartbeat.toDate();
        const timeSinceLastSeen = Date.now() - lastHeartbeat.getTime();
        
        console.log('⏱️ Opponent heartbeat check:', {
          opponentId: opponentData.playerId,
          lastHeartbeat: lastHeartbeat.toISOString(),
          timeSinceLastSeen: Math.round(timeSinceLastSeen / 1000) + 's'
        });
        
        // If opponent hasn't been seen for more than 15 seconds, start countdown
        if (timeSinceLastSeen >= 15000) {
          console.log('⚠️ Opponent inactive for more than 15 seconds, showing abandonment notification');
          
          const notification: AbandonmentNotification = {
            matchId,
            abandonedBy: opponentData.playerId,
            timeLeft: Math.max(0, Math.floor((300000 - timeSinceLastSeen) / 1000)), // 5 minutes total
            canClaim: timeSinceLastSeen >= 300000 // Auto-claim after 5 minutes
          };
          
          console.log('🚨 Sending abandonment notification:', notification);
          this.onAbandonmentCallback?.(notification);
          
          // Set up auto-claim timer if not already set
          if (!this.abandonmentTimer && !notification.canClaim) {
            this.abandonmentTimer = setTimeout(() => {
              console.log('⏰ Auto-claiming victory due to opponent abandonment');
              this.handleAutoClaimVictory(matchId, userId);
            }, 300000 - timeSinceLastSeen);
          }
        } else {
          // Opponent is active, clear abandonment notification
          console.log('✅ Opponent is active, clearing abandonment notification');
          this.onAbandonmentCallback?.(null);
          this.clearAbandonmentTimer();
        }
      } else {
        console.log('❌ No opponent data or heartbeat found in match');
      }
    }, (error) => {
      console.error('❌ Error monitoring match for abandonment:', error);
    });
  }

  /**
   * Handle auto-claim victory when opponent abandons
   */
  private static async handleAutoClaimVictory(matchId: string, userId: string): Promise<void> {
    try {
      console.log('🏆 Auto-claiming victory for abandoned match:', matchId);
      
      // Update match to mark user as winner
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        'gameData.gamePhase': 'gameOver',
        'gameData.winner': userId,
        'gameData.endReason': 'opponent_abandoned',
        updatedAt: serverTimestamp()
      });
      
      // Clear notifications
      this.onAbandonmentCallback?.(null);
      this.onActiveMatchCallback?.(null);
      
    } catch (error) {
      console.error('❌ Error auto-claiming victory:', error);
    }
  }

  /**
   * Claim victory manually
   */
  static async claimVictory(matchId: string, userId: string): Promise<void> {
    await this.handleAutoClaimVictory(matchId, userId);
  }

  /**
   * Rejoin active match
   */
  static async rejoinMatch(matchId: string): Promise<void> {
    console.log('🎮 Rejoining match:', matchId);
    // The navigation will be handled by the component using this service
    this.onActiveMatchCallback?.(null); // Clear the notification
  }

  /**
   * Clear match monitoring
   */
  private static clearMatchMonitoring(): void {
    if (this.matchSubscription) {
      this.matchSubscription();
      this.matchSubscription = null;
    }
    this.clearAbandonmentTimer();
  }

  /**
   * Clear abandonment timer
   */
  private static clearAbandonmentTimer(): void {
    if (this.abandonmentTimer) {
      clearTimeout(this.abandonmentTimer);
      this.abandonmentTimer = null;
    }
  }

  /**
   * Cleanup all subscriptions
   */
  static cleanup(): void {
    console.log('🧹 PersistentNotificationService: Cleaning up');
    
    if (this.userSubscription) {
      this.userSubscription();
      this.userSubscription = null;
    }
    
    this.clearMatchMonitoring();
    
    this.onActiveMatchCallback = null;
    this.onAbandonmentCallback = null;
    this.currentUserId = null;
  }
}
