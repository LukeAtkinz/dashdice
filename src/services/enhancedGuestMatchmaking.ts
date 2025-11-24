/**
 * Enhanced Guest Matchmaking Service
 * 
 * Firebase-integrated guest system that simulates real matchmaking:
 * - Creates temporary guest user IDs
 * - Uses Firebase guestMatches collection
 * - Follows identical flow to regular matchmaking
 * - Simulates searching for players before bot matching
 */

import { db } from '@/services/firebase';
import { collection, doc, setDoc, onSnapshot, serverTimestamp, deleteDoc, Timestamp } from 'firebase/firestore';
import { getBackgroundById, resolveBackgroundPath, type Background } from '@/config/backgrounds';

// Helper to convert new Background to legacy format
const toUserBackground = (background: Background) => {
  const resolved = resolveBackgroundPath(background.id, 'dashboard-display');
  return {
    name: background.name,
    file: resolved?.path || '',
    type: background.category === 'Videos' ? 'video' as const : 'image' as const
  };
};

export interface GuestUserData {
  id: string;
  displayName: string;
  isGuest: true;
  createdAt: number;
  sessionId: string;
  displayBackgroundEquipped?: {
    name: string;
    file: string;
    type: 'image' | 'video';
  };
  matchBackgroundEquipped?: {
    name: string;
    file: string;
    type: 'image' | 'video';
  };
  playerStats?: {
    bestStreak: number;
    currentStreak: number;
    gamesPlayed: number;
    matchWins: number;
  };
}

export interface BotOpponentData {
  id: string;
  displayName: string;
  isBot: true;
  difficulty: 'easy' | 'medium' | 'hard';
  personality: string;
  avatar?: string;
  playerStats: {
    bestStreak: number;
    currentStreak: number;
    gamesPlayed: number;
    matchWins: number;
  };
}

export interface GuestWaitingRoomEntry {
  id: string;
  gameMode: string;
  gameType: 'Guest Bot Match';
  playersRequired: number; // 1 = waiting for opponent, 0 = matched
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Guest player data (mirrors real user structure)
  hostData: {
    playerId: string;
    playerDisplayName: string;
    isGuest: true;
    playerStats: {
      bestStreak: number;
      currentStreak: number;
      gamesPlayed: number;
      matchWins: number;
    };
    displayBackgroundEquipped: null;
    matchBackgroundEquipped: null;
    ready: boolean;
  };
  
  // Bot opponent (filled after "search" simulation)
  opponentData?: {
    playerId: string;
    playerDisplayName: string;
    isBot: true;
    difficulty: string;
    personality: string;
    playerStats: {
      bestStreak: number;
      currentStreak: number;
      gamesPlayed: number;
      matchWins: number;
    };
    displayBackgroundEquipped: null;
    matchBackgroundEquipped: null;
    ready: boolean;
  };
  
  // Game configuration (mirrors real game data)
  gameData: {
    type: string;
    settings: Record<string, any>;
    roundObjective?: number;
    startingScore?: number;
    turnDecider?: number;
  };
  
  // Status tracking
  status: 'searching' | 'matched' | 'starting';
  searchStartedAt: Timestamp;
  matchedAt?: Timestamp;
}

class EnhancedGuestMatchmakingService {
  private static instance: EnhancedGuestMatchmakingService;
  private activeSearches = new Map<string, () => void>(); // Cleanup functions
  private botPersonalities = [
    'The Calculator', 'Lucky Luke', 'Risk Taker', 'The Strategist',
    'Dice Master', 'Fortune Hunter', 'The Gambler', 'Swift Roller',
    'Number Cruncher', 'Probability Pro'
  ];

  public static getInstance(): EnhancedGuestMatchmakingService {
    if (!this.instance) {
      this.instance = new EnhancedGuestMatchmakingService();
    }
    return this.instance;
  }

  /**
   * Generate a temporary guest user ID
   */
  generateGuestUser(): GuestUserData {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const guestNumber = Math.floor(Math.random() * 9999) + 1;
    
    // Get backgrounds using proper helper functions
    const newDayBackground = getBackgroundById('new-day');
    const longRoadBackground = getBackgroundById('long-road-ahead');
    
    return {
      id: `guest_${sessionId}`,
      displayName: `Guest${guestNumber}`,
      isGuest: true,
      createdAt: Date.now(),
      sessionId,
      displayBackgroundEquipped: newDayBackground ? toUserBackground(newDayBackground) : undefined,
      matchBackgroundEquipped: longRoadBackground ? toUserBackground(longRoadBackground) : undefined,
      playerStats: {
        bestStreak: 0,
        currentStreak: 0,
        gamesPlayed: 0,
        matchWins: 0
      }
    };
  }

  /**
   * Generate bot opponent data
   */
  private generateBotOpponent(gameMode: string): BotOpponentData {
    const personality = this.botPersonalities[Math.floor(Math.random() * this.botPersonalities.length)];
    const difficulty = Math.random() > 0.7 ? 'hard' : Math.random() > 0.4 ? 'medium' : 'easy';
    
    // Generate realistic bot stats based on difficulty
    const difficultyMultiplier = difficulty === 'hard' ? 1.5 : difficulty === 'medium' ? 1.0 : 0.6;
    const baseStats = {
      bestStreak: Math.floor(Math.random() * 15 * difficultyMultiplier) + 1,
      currentStreak: Math.floor(Math.random() * 8 * difficultyMultiplier),
      gamesPlayed: Math.floor(Math.random() * 200 * difficultyMultiplier) + 10,
      matchWins: 0
    };
    baseStats.matchWins = Math.floor(baseStats.gamesPlayed * (0.3 + (difficultyMultiplier * 0.2)));

    return {
      id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      displayName: personality,
      isBot: true,
      difficulty,
      personality,
      playerStats: baseStats
    };
  }

  /**
   * Get game mode configuration (mirrors real game mode configs)
   */
  private getGameModeConfig(gameMode: string) {
    const configs = {
      quickfire: {
        type: 'quickfire',
        settings: { fastPaced: true, timeLimit: 300 },
        roundObjective: 100,
        startingScore: 0,
        turnDecider: Math.random() > 0.5 ? 1 : 2
      },
      classic: {
        type: 'classic',
        settings: { timeLimit: 600 },
        roundObjective: 100,
        startingScore: 0,
        turnDecider: Math.random() > 0.5 ? 1 : 2
      },
      zerohour: {
        type: 'zerohour',
        settings: { countdown: true, pressure: true },
        roundObjective: 100,
        startingScore: 0,
        turnDecider: Math.random() > 0.5 ? 1 : 2
      }
    };
    
    return configs[gameMode as keyof typeof configs] || configs.classic;
  }

  /**
   * Start guest matchmaking with realistic simulation
   */
  async startGuestMatchmaking(
    guestUser: GuestUserData,
    gameMode: string,
    onWaitingRoomUpdate: (entry: GuestWaitingRoomEntry) => void,
    onMatchFound: (roomId: string, gameMode: string) => void
  ): Promise<string> {
    console.log(`🎮 Enhanced Guest Matchmaking: Starting for ${guestUser.displayName} in ${gameMode}`);

    try {
      const gameConfig = this.getGameModeConfig(gameMode);
      
      // Create guest waiting room entry (mirrors real waiting room structure)
      const waitingRoomEntry: GuestWaitingRoomEntry = {
        id: '', // Will be set by Firestore
        gameMode,
        gameType: 'Guest Bot Match',
        playersRequired: 1, // Start searching for opponent
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        
        hostData: {
          playerId: guestUser.id,
          playerDisplayName: guestUser.displayName,
          isGuest: true,
          playerStats: {
            bestStreak: 0,
            currentStreak: 0,
            gamesPlayed: 0,
            matchWins: 0
          },
          displayBackgroundEquipped: null,
          matchBackgroundEquipped: null,
          ready: true
        },
        
        gameData: gameConfig,
        status: 'searching',
        searchStartedAt: serverTimestamp() as Timestamp
      };

      // Create document in guestMatches collection
      const roomRef = doc(collection(db, 'guestMatches'));
      const roomId = roomRef.id;
      waitingRoomEntry.id = roomId;

      await setDoc(roomRef, waitingRoomEntry);
      console.log(`✅ Guest waiting room created: ${roomId}`);

      // Set up real-time listener (mirrors real matchmaking)
      const unsubscribe = onSnapshot(roomRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as GuestWaitingRoomEntry;
          onWaitingRoomUpdate(data);
          
          // Check if match is ready
          if (data.status === 'matched' && data.playersRequired === 0) {
            console.log(`🎯 Guest match ready: ${roomId}`);
            onMatchFound(roomId, gameMode);
            this.cleanup(guestUser.id);
          }
        }
      }, (error) => {
        console.error('❌ Error in guest waiting room listener:', error);
        // Fallback: trigger immediate bot match on listener error
        this.handleFallbackMatch(guestUser, gameMode, onMatchFound);
      });

      // Store cleanup function
      this.activeSearches.set(guestUser.id, unsubscribe);

      // Simulate realistic search time (3-8 seconds) then "find" bot opponent
      const searchTime = 3000 + Math.random() * 5000; // 3-8 seconds
      
      setTimeout(async () => {
        try {
          const botOpponent = this.generateBotOpponent(gameMode);
          
          // Update waiting room with "found" opponent
          const updatedEntry: Partial<GuestWaitingRoomEntry> = {
            playersRequired: 0,
            status: 'matched',
            matchedAt: serverTimestamp() as Timestamp,
            opponentData: {
              playerId: botOpponent.id,
              playerDisplayName: botOpponent.displayName,
              isBot: true,
              difficulty: botOpponent.difficulty,
              personality: botOpponent.personality,
              playerStats: botOpponent.playerStats,
              displayBackgroundEquipped: null,
              matchBackgroundEquipped: null,
              ready: true
            }
          };

          await setDoc(roomRef, updatedEntry, { merge: true });
          console.log(`🤖 Bot opponent "${botOpponent.displayName}" added to guest match`);
          
        } catch (error) {
          console.error('❌ Failed to add bot opponent:', error);
          // Fallback: trigger immediate bot match on update error
          this.handleFallbackMatch(guestUser, gameMode, onMatchFound);
        }
      }, searchTime);

      return roomId;
      
    } catch (error) {
      console.error('❌ Failed to start guest matchmaking:', error);
      // Fallback: create local match without Firebase
      return this.handleFallbackMatch(guestUser, gameMode, onMatchFound);
    }
  }

  /**
   * Fallback method for when Firebase operations fail
   */
  private async handleFallbackMatch(
    guestUser: GuestUserData,
    gameMode: string,
    onMatchFound: (roomId: string, gameMode: string) => void
  ): Promise<string> {
    console.log('🔄 Using fallback guest match creation');
    
    // Generate a local room ID
    const fallbackRoomId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Simulate a quick search and immediately trigger match found
    setTimeout(() => {
      console.log(`🎯 Fallback guest match ready: ${fallbackRoomId}`);
      onMatchFound(fallbackRoomId, gameMode);
    }, 1000);
    
    return fallbackRoomId;
  }

  /**
   * Cancel guest matchmaking
   */
  async cancelGuestMatchmaking(guestUserId: string): Promise<void> {
    console.log(`❌ Cancelling guest matchmaking for ${guestUserId}`);
    
    this.cleanup(guestUserId);
    
    // Find and delete the guest waiting room
    // Note: In production, you might want to just mark as cancelled instead of deleting
    try {
      // For now, we'll rely on Firebase's built-in cleanup or manual cleanup
      // since we'd need to query to find the specific document
      console.log('🧹 Guest matchmaking cancelled');
    } catch (error) {
      console.error('Failed to cleanup guest match:', error);
    }
  }

  /**
   * Get guest match data for ongoing matches
   */
  async getGuestMatch(roomId: string): Promise<GuestWaitingRoomEntry | null> {
    try {
      const { getDoc, doc } = await import('firebase/firestore');
      const docRef = doc(db, 'guestMatches', roomId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as GuestWaitingRoomEntry;
      }
      return null;
    } catch (error) {
      console.error('Failed to get guest match:', error);
      return null;
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(guestUserId: string): void {
    const unsubscribe = this.activeSearches.get(guestUserId);
    if (unsubscribe) {
      unsubscribe();
      this.activeSearches.delete(guestUserId);
    }
  }

  /**
   * Cleanup all active searches (for app unmount)
   */
  public cleanupAll(): void {
    for (const unsubscribe of this.activeSearches.values()) {
      unsubscribe();
    }
    this.activeSearches.clear();
  }
}

// Export singleton instance
export const enhancedGuestMatchmaking = EnhancedGuestMatchmakingService.getInstance();