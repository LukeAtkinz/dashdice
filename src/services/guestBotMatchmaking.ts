/**
 * Guest Bot Matchmaking Service
 * 
 * Standalone system for guest users to play against bots
 * - No data persistence
 * - No interference with real matchmaking
 * - Auto-match with bots after 3 seconds
 * - Memory-only game state
 */

export interface GuestMatchData {
  matchId: string;
  gameMode: string;
  status: 'searching' | 'matched' | 'in-game' | 'completed';
  guestPlayer: {
    id: string;
    displayName: string;
    isGuest: true;
  };
  botOpponent: {
    id: string;
    displayName: string;
    isBot: true;
    difficulty: 'easy' | 'medium' | 'hard';
    personality: string;
  };
  gameState?: {
    currentTurn: string;
    scores: Record<string, number>;
    roundData: any;
  };
  createdAt: number;
  matchedAt?: number;
}

class GuestBotMatchmakingService {
  private activeMatches = new Map<string, GuestMatchData>();
  private searchingGuests = new Map<string, NodeJS.Timeout>();
  
  /**
   * Start matchmaking for a guest user
   */
  async startGuestMatchmaking(
    guestId: string, 
    gameMode: string,
    onMatch: (matchData: GuestMatchData) => void
  ): Promise<string> {
    const matchId = `guest_match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🤖 Starting guest matchmaking for ${guestId} in ${gameMode}`);
    
    // Create initial match data
    const matchData: GuestMatchData = {
      matchId,
      gameMode,
      status: 'searching',
      guestPlayer: {
        id: guestId,
        displayName: 'Guest Player',
        isGuest: true
      },
      botOpponent: this.selectBot(gameMode),
      createdAt: Date.now()
    };
    
    this.activeMatches.set(matchId, matchData);
    
    // Auto-match with bot after 3 seconds
    const searchTimeout = setTimeout(() => {
      this.matchWithBot(matchId, onMatch);
    }, 3000);
    
    this.searchingGuests.set(guestId, searchTimeout);
    
    return matchId;
  }
  
  /**
   * Cancel guest matchmaking
   */
  cancelGuestMatchmaking(guestId: string): void {
    const timeout = this.searchingGuests.get(guestId);
    if (timeout) {
      clearTimeout(timeout);
      this.searchingGuests.delete(guestId);
    }
    
    // Find and remove the match
    for (const [matchId, match] of this.activeMatches) {
      if (match.guestPlayer.id === guestId && match.status === 'searching') {
        this.activeMatches.delete(matchId);
        break;
      }
    }
    
    console.log(`❌ Cancelled guest matchmaking for ${guestId}`);
  }
  
  /**
   * Match guest with a bot
   */
  private matchWithBot(matchId: string, onMatch: (matchData: GuestMatchData) => void): void {
    const matchData = this.activeMatches.get(matchId);
    if (!matchData || matchData.status !== 'searching') return;
    
    matchData.status = 'matched';
    matchData.matchedAt = Date.now();
    
    console.log(`🤖 Guest matched with bot: ${matchData.botOpponent.displayName}`);
    
    // Remove from searching list
    this.searchingGuests.delete(matchData.guestPlayer.id);
    
    // Initialize game state
    matchData.gameState = this.initializeGameState(matchData);
    
    // Notify that match is ready
    onMatch(matchData);
  }
  
  /**
   * Select an appropriate bot opponent
   */
  private selectBot(gameMode: string): GuestMatchData['botOpponent'] {
    const botProfiles = [
      { name: 'RollingThunder', personality: 'Aggressive', difficulty: 'medium' as const },
      { name: 'DiceWhisperer', personality: 'Strategic', difficulty: 'hard' as const },
      { name: 'LuckyStrike', personality: 'Risky', difficulty: 'easy' as const },
      { name: 'SteadyHand', personality: 'Conservative', difficulty: 'medium' as const },
      { name: 'BlitzBot', personality: 'Fast', difficulty: 'hard' as const },
      { name: 'ChillDice', personality: 'Casual', difficulty: 'easy' as const }
    ];
    
    const selectedBot = botProfiles[Math.floor(Math.random() * botProfiles.length)];
    
    return {
      id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      displayName: selectedBot.name,
      isBot: true,
      difficulty: selectedBot.difficulty,
      personality: selectedBot.personality
    };
  }
  
  /**
   * Initialize game state for guest vs bot
   */
  private initializeGameState(matchData: GuestMatchData): GuestMatchData['gameState'] {
    const players = [matchData.guestPlayer.id, matchData.botOpponent.id];
    const firstPlayer = Math.random() < 0.5 ? players[0] : players[1];
    
    return {
      currentTurn: firstPlayer,
      scores: {
        [matchData.guestPlayer.id]: 0,
        [matchData.botOpponent.id]: 0
      },
      roundData: {
        turnScore: 0,
        diceRolls: [],
        turnActive: true
      }
    };
  }
  
  /**
   * Get match data
   */
  getGuestMatch(matchId: string): GuestMatchData | undefined {
    return this.activeMatches.get(matchId);
  }
  
  /**
   * Update game state (for in-memory game logic)
   */
  updateGameState(matchId: string, updates: Partial<GuestMatchData['gameState']>): void {
    const matchData = this.activeMatches.get(matchId);
    if (matchData && matchData.gameState) {
      Object.assign(matchData.gameState, updates);
    }
  }
  
  /**
   * End guest match (cleanup)
   */
  endGuestMatch(matchId: string): void {
    const matchData = this.activeMatches.get(matchId);
    if (matchData) {
      matchData.status = 'completed';
      
      // Clean up after 5 minutes to free memory
      setTimeout(() => {
        this.activeMatches.delete(matchId);
        console.log(`🧹 Cleaned up guest match: ${matchId}`);
      }, 5 * 60 * 1000);
    }
  }
  
  /**
   * Get bot move (simple AI logic)
   */
  getBotMove(matchId: string): 'roll' | 'bank' {
    const matchData = this.activeMatches.get(matchId);
    if (!matchData?.gameState) return 'roll';
    
    const { difficulty } = matchData.botOpponent;
    const currentScore = matchData.gameState.scores[matchData.botOpponent.id];
    const turnScore = matchData.gameState.roundData.turnScore || 0;
    
    // Simple AI logic based on difficulty
    switch (difficulty) {
      case 'easy':
        // Banks early, takes fewer risks
        return turnScore >= 15 ? 'bank' : 'roll';
        
      case 'medium':
        // Balanced strategy
        if (turnScore >= 25) return 'bank';
        if (currentScore + turnScore >= 100) return 'bank';
        return 'roll';
        
      case 'hard':
        // Aggressive, takes more risks
        if (turnScore >= 35) return 'bank';
        if (currentScore + turnScore >= 95) return 'bank';
        return 'roll';
        
      default:
        return 'roll';
    }
  }
  
  /**
   * Clean up all guest matches (for memory management)
   */
  cleanup(): void {
    // Clear all timeouts
    for (const timeout of this.searchingGuests.values()) {
      clearTimeout(timeout);
    }
    this.searchingGuests.clear();
    
    // Clear completed matches older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [matchId, match] of this.activeMatches) {
      if (match.status === 'completed' && match.createdAt < oneHourAgo) {
        this.activeMatches.delete(matchId);
      }
    }
  }
}

// Singleton instance
export const guestBotMatchmaking = new GuestBotMatchmakingService();

// Auto-cleanup every 30 minutes
setInterval(() => {
  guestBotMatchmaking.cleanup();
}, 30 * 60 * 1000);