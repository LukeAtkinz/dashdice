export interface GuestPlayerData {
  id: string;
  displayName: string;
  isBot: boolean;
  stats: {
    matchWins: number;
    gamesPlayed: number;
    bestStreak: number;
    currentStreak: number;
  };
  background?: {
    type: 'image' | 'video';
    file: string;
  };
}

export interface GuestMatchState {
  id: string;
  hostPlayer: GuestPlayerData;
  opponentPlayer: GuestPlayerData | null;
  status: 'waiting' | 'opponent_found' | 'countdown' | 'starting' | 'in_progress' | 'completed';
  countdown: number | null;
  gameMode: string;
  createdAt: Date;
}

export interface GuestStateEvents {
  onMatchUpdate: (match: GuestMatchState) => void;
  onOpponentJoined: (opponent: GuestPlayerData) => void;
  onCountdownStart: (countdown: number) => void;
  onCountdownTick: (countdown: number) => void;
  onGameStart: () => void;
  onMatchEnd: () => void;
}

class GuestMatchStateManager {
  private currentMatch: GuestMatchState | null = null;
  private events: Partial<GuestStateEvents> = {};
  private countdownTimer: NodeJS.Timeout | null = null;
  private searchTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.reset();
  }

  // Event subscription methods
  on<K extends keyof GuestStateEvents>(event: K, callback: GuestStateEvents[K]) {
    this.events[event] = callback;
  }

  off<K extends keyof GuestStateEvents>(event: K) {
    delete this.events[event];
  }

  // Create a new guest match
  createMatch(hostPlayerName: string, gameMode: string, guestUserData?: any): GuestMatchState {
    // Prevent creating multiple matches
    if (this.currentMatch) {
      console.log('🎮 GuestMatchManager: Match already exists, returning existing match');
      return this.currentMatch;
    }

    console.log('🎮 GuestMatchManager: Creating match for', hostPlayerName, 'in', gameMode);
    
    const hostPlayer: GuestPlayerData = {
      id: 'guest-host',
      displayName: hostPlayerName,
      isBot: false,
      stats: guestUserData?.playerStats || {
        matchWins: 0,
        gamesPlayed: 0,
        bestStreak: 0,
        currentStreak: 0
      },
      background: guestUserData?.matchBackgroundEquipped || {
        type: 'image',
        file: '/backgrounds/Long Road Ahead.png'
      }
    };

    this.currentMatch = {
      id: `guest-match-${Date.now()}`,
      hostPlayer,
      opponentPlayer: null,
      status: 'waiting',
      countdown: null,
      gameMode,
      createdAt: new Date()
    };

    console.log('🎮 GuestMatchManager: Match created', this.currentMatch);
    this.events.onMatchUpdate?.(this.currentMatch);
    
    // Start searching for opponent
    this.startOpponentSearch();
    
    return this.currentMatch;
  }

  // Start searching for an opponent (simulate finding a bot)
  private startOpponentSearch() {
    if (!this.currentMatch || this.currentMatch.status !== 'waiting') return;

    console.log('🔍 GuestMatchManager: Starting opponent search...');
    
    // Simulate opponent search time (3-8 seconds)
    const searchTime = Math.random() * 5000 + 3000;
    console.log(`🔍 GuestMatchManager: Bot will join in ${searchTime/1000}s`);
    
    this.searchTimer = setTimeout(() => {
      this.addBotOpponent();
    }, searchTime);
  }

  // Add a bot opponent
  private addBotOpponent() {
    if (!this.currentMatch || this.currentMatch.status !== 'waiting') return;

    console.log('🤖 GuestMatchManager: Adding bot opponent...');

    const botNames = [
      'DiceBot Alpha', 'RollerPro', 'LuckyBot', 'DiceWizard', 
      'CubeRunner', 'ChanceBot', 'DiceMaster', 'RollBot Elite'
    ];

    const botBackgrounds = [
      { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
      { name: 'On A Mission', file: '/backgrounds/On A Mission.mp4', type: 'video' },
      { name: 'Underwater', file: '/backgrounds/Underwater.mp4', type: 'video' },
      { name: 'Long Road Ahead', file: '/backgrounds/Long Road Ahead.jpg', type: 'image' }
    ] as const;

    const randomName = botNames[Math.floor(Math.random() * botNames.length)];
    const randomBackground = botBackgrounds[Math.floor(Math.random() * botBackgrounds.length)];
    
    const botOpponent: GuestPlayerData = {
      id: 'guest-bot',
      displayName: randomName,
      isBot: true,
      stats: {
        matchWins: Math.floor(Math.random() * 80) + 10,
        gamesPlayed: Math.floor(Math.random() * 150) + 50,
        bestStreak: Math.floor(Math.random() * 20) + 5,
        currentStreak: Math.floor(Math.random() * 12)
      },
      background: randomBackground
    };

    this.currentMatch.opponentPlayer = botOpponent;
    this.currentMatch.status = 'opponent_found';
    
    console.log('🤖 GuestMatchManager: Bot opponent added:', botOpponent.displayName);
    this.events.onMatchUpdate?.(this.currentMatch);
    this.events.onOpponentJoined?.(botOpponent);

    // Start countdown after a brief delay
    setTimeout(() => {
      console.log('🕒 GuestMatchManager: Starting countdown...');
      this.startCountdown();
    }, 1500);
  }

  // Start the VS countdown
  private startCountdown() {
    if (!this.currentMatch || this.currentMatch.status !== 'opponent_found') {
      console.log('🕒 GuestMatchManager: Cannot start countdown - invalid state:', this.currentMatch?.status);
      return;
    }

    console.log('🕒 GuestMatchManager: Starting VS countdown...');
    this.currentMatch.status = 'countdown';
    this.currentMatch.countdown = 3;
    
    this.events.onMatchUpdate?.(this.currentMatch);
    this.events.onCountdownStart?.(3);

    this.countdownTimer = setInterval(() => {
      if (!this.currentMatch) return;

      if (this.currentMatch.countdown! > 0) {
        this.currentMatch.countdown!--;
        console.log('🕒 GuestMatchManager: Countdown tick:', this.currentMatch.countdown);
        this.events.onMatchUpdate?.(this.currentMatch);
        this.events.onCountdownTick?.(this.currentMatch.countdown!);
      } else {
        // Countdown finished - start game
        this.startGame();
      }
    }, 1000);
  }

  // Start the actual game
  private startGame() {
    if (!this.currentMatch) return;

    console.log('🚀 GuestMatchManager: Starting game!');
    this.clearTimers();
    
    this.currentMatch.status = 'starting';
    this.events.onMatchUpdate?.(this.currentMatch);
    if (this.events.onGameStart) {
      console.log('🚀 GuestMatchManager: Calling onGameStart event');
      this.events.onGameStart();
    } else {
      console.log('🚀 GuestMatchManager: No onGameStart event registered');
    }

    // Transition to in_progress after a brief delay
    setTimeout(() => {
      if (this.currentMatch) {
        this.currentMatch.status = 'in_progress';
        this.events.onMatchUpdate?.(this.currentMatch);
      }
    }, 1000);
  }

  // Leave the current match
  leaveMatch() {
    if (!this.currentMatch) return;

    this.clearTimers();
    this.currentMatch = null;
    if (this.events.onMatchEnd) {
      this.events.onMatchEnd();
    }
  }

  // Get current match state
  getCurrentMatch(): GuestMatchState | null {
    return this.currentMatch ? { ...this.currentMatch } : null;
  }

  // Check if currently in a match
  isInMatch(): boolean {
    return this.currentMatch !== null;
  }

  // Force opponent join (for testing)
  forceOpponentJoin() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.addBotOpponent();
    }
  }

  // Reset state manager
  reset() {
    this.clearTimers();
    this.currentMatch = null;
    this.events = {};
  }

  // Clean up timers
  private clearTimers() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
  }

  // Cleanup method for component unmounting
  destroy() {
    this.clearTimers();
    this.events = {};
    this.currentMatch = null;
  }
}

// Create singleton instance
export const guestMatchManager = new GuestMatchStateManager();

// React hook for using guest match state
import { useState, useEffect, useCallback } from 'react';

export const useGuestMatch = () => {
  const [matchState, setMatchState] = useState<GuestMatchState | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const handleMatchUpdate = (match: GuestMatchState) => {
      setMatchState(match);
      setIsSearching(match.status === 'waiting');
    };

    const handleMatchEnd = () => {
      setMatchState(null);
      setIsSearching(false);
    };

    guestMatchManager.on('onMatchUpdate', handleMatchUpdate);
    guestMatchManager.on('onMatchEnd', handleMatchEnd);

    // Get current state if already in a match
    const currentMatch = guestMatchManager.getCurrentMatch();
    if (currentMatch) {
      setMatchState(currentMatch);
      setIsSearching(currentMatch.status === 'waiting');
    }

    return () => {
      guestMatchManager.off('onMatchUpdate');
      guestMatchManager.off('onMatchEnd');
    };
  }, []);

  const createMatch = useCallback((playerName: string, gameMode: string, guestUserData?: any) => {
    return guestMatchManager.createMatch(playerName, gameMode, guestUserData);
  }, []);

  const leaveMatch = useCallback(() => {
    guestMatchManager.leaveMatch();
  }, []);

  const forceOpponentJoin = useCallback(() => {
    guestMatchManager.forceOpponentJoin();
  }, []);

  const setOnGameStart = useCallback((callback: () => void) => {
    console.log('🎮 useGuestMatch: Setting onGameStart callback');
    guestMatchManager.on('onGameStart', callback);
    return () => guestMatchManager.off('onGameStart');
  }, []);

  return {
    matchState,
    isSearching,
    createMatch,
    leaveMatch,
    forceOpponentJoin,
    setOnGameStart,
    isInMatch: guestMatchManager.isInMatch()
  };
};