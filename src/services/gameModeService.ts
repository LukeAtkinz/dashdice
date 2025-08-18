import { collection, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { GameMode, GameModeSpecificData, GameActionResult } from '@/types/gameModes';

export class GameModeService {
  // Get all available game modes
  static async getAvailableGameModes(platform: 'desktop' | 'mobile' = 'desktop'): Promise<GameMode[]> {
    try {
      // First try to get from Firestore
      const q = query(
        collection(db, 'gameModes'),
        where('isActive', '==', true),
        where('platforms', 'array-contains', platform)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.docs.length > 0) {
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as GameMode[];
      }
      
      // If no data in Firestore, return default modes
      console.log('No game modes found in Firestore, using default modes');
      return this.getDefaultGameModes(platform);
    } catch (error) {
      console.error('Error fetching game modes from Firestore:', error);
      console.log('Falling back to default game modes');
      return this.getDefaultGameModes(platform);
    }
  }

  // Get specific game mode configuration
  static async getGameMode(modeId: string): Promise<GameMode | null> {
    try {
      // First try to get from Firestore
      const modeDoc = await getDocs(query(
        collection(db, 'gameModes'),
        where('__name__', '==', modeId)
      ));
      
      if (!modeDoc.empty) {
        return { id: modeDoc.docs[0].id, ...modeDoc.docs[0].data() } as GameMode;
      }
      
      // Fall back to default modes
      console.log(`Game mode ${modeId} not found in Firestore, using default`);
      return this.getDefaultGameModes().find(mode => mode.id === modeId) || null;
    } catch (error) {
      console.error('Error fetching game mode from Firestore:', error);
      console.log(`Falling back to default mode for ${modeId}`);
      return this.getDefaultGameModes().find(mode => mode.id === modeId) || null;
    }
  }

  // Default game modes configuration (excluding Tag Team)
  static getDefaultGameModes(platform: 'desktop' | 'mobile' = 'desktop'): GameMode[] {
    const baseModes: GameMode[] = [
      {
        id: 'classic',
        name: 'Classic Mode',
        description: 'First to 50 points, best of 3 rounds',
        rules: {
          startingScore: 0,
          targetScore: 50,
          bestOf: 3,
          allowBanking: true,
          allowDoubleRolls: true,
          scoreDirection: 'up',
          eliminationRules: {
            singleOne: false,
            doubleOne: true,
            doubleSix: 'reset'
          }
        },
        settings: {
          timePerTurn: 30,
          maxConsecutiveRolls: 10,
          showRunningTotal: true,
          showOpponentScore: true,
          enableChat: true,
          enableAbilities: true
        },
        isActive: true,
        platforms: ['desktop', 'mobile'],
        minPlayers: 2,
        maxPlayers: 4,
        estimatedDuration: 15
      },
      {
        id: 'zero-hour',
        name: 'Zero Hour',
        description: 'Start at 100, first to reach exactly 0 wins',
        rules: {
          startingScore: 100,
          targetScore: 0,
          allowBanking: true,
          allowDoubleRolls: true,
          scoreDirection: 'down',
          eliminationRules: {
            singleOne: false,
            doubleOne: true,
            doubleSix: 'reset'
          },
          specialRules: {
            exactScoreRequired: true
          }
        },
        settings: {
          timePerTurn: 45,
          maxConsecutiveRolls: 15,
          showRunningTotal: true,
          showOpponentScore: true,
          enableChat: true,
          enableAbilities: true
        },
        isActive: true,
        platforms: ['desktop', 'mobile'],
        minPlayers: 2,
        maxPlayers: 4,
        estimatedDuration: 12
      },
      {
        id: 'last-line',
        name: 'Last Line',
        description: 'Single roll elimination, doubles grant extra roll',
        rules: {
          startingScore: 0,
          targetScore: 100,
          allowBanking: false,
          allowDoubleRolls: false,
          scoreDirection: 'up',
          eliminationRules: {
            singleOne: true,    // Single 1 eliminates player
            doubleOne: false,
            doubleSix: 'score'  // Double 6 gets x2 multiplier
          },
          specialRules: {
            rollLimit: 1,       // Single turn only
            doubleGrantsExtraRoll: true
          }
        },
        settings: {
          timePerTurn: 15,
          showRunningTotal: false,
          showOpponentScore: false,
          enableChat: true,
          enableAbilities: false
        },
        isActive: true,
        platforms: ['desktop', 'mobile'],
        minPlayers: 2,
        maxPlayers: 6,
        estimatedDuration: 5
      },
      {
        id: 'true-grit',
        name: 'True Grit',
        description: 'No banking, single 1 eliminates, double 6s score',
        rules: {
          startingScore: 0,
          targetScore: 100,
          allowBanking: false,
          allowDoubleRolls: true,
          scoreDirection: 'up',
          eliminationRules: {
            singleOne: true,
            doubleOne: false,
            doubleSix: 'score'
          }
        },
        settings: {
          timePerTurn: 60,
          showRunningTotal: true,
          showOpponentScore: true,
          enableChat: true,
          enableAbilities: true
        },
        isActive: true,
        platforms: ['desktop', 'mobile'],
        minPlayers: 2,
        maxPlayers: 4,
        estimatedDuration: 10
      }
    ];

    return baseModes;
  }

  // Validate game mode rules for current game state
  static validateGameAction(
    gameMode: GameMode,
    action: 'roll' | 'bank' | 'continue',
    gameState: any
  ): { valid: boolean; reason?: string } {
    switch (action) {
      case 'bank':
        if (!gameMode.rules.allowBanking) {
          return { valid: false, reason: 'Banking not allowed in this mode' };
        }
        break;
      
      case 'roll':
        if (gameMode.rules.specialRules?.rollLimit) {
          const currentRolls = gameState.currentTurn?.rolls?.length || 0;
          if (currentRolls >= gameMode.rules.specialRules.rollLimit) {
            return { valid: false, reason: 'Roll limit reached' };
          }
        }
        break;
    }
    
    return { valid: true };
  }

  // Calculate score based on game mode
  static calculateScore(
    gameMode: GameMode,
    currentScore: number,
    rollValue: number,
    isDouble: boolean
  ): { newScore: number; isEliminated: boolean; grantExtraRoll: boolean } {
    let newScore = currentScore;
    let isEliminated = false;
    let grantExtraRoll = false;

    // Handle special elimination rules
    if (rollValue === 1 && gameMode.rules.eliminationRules.singleOne) {
      isEliminated = true;
      return { newScore: 0, isEliminated, grantExtraRoll: false };
    }

    // Handle double 6s
    if (rollValue === 12 && isDouble) {
      switch (gameMode.rules.eliminationRules.doubleSix) {
        case 'reset':
          newScore = gameMode.rules.startingScore;
          break;
        case 'score':
          newScore = gameMode.rules.scoreDirection === 'up' 
            ? currentScore + rollValue 
            : currentScore - rollValue;
          break;
      }
    } else {
      // Normal scoring
      newScore = gameMode.rules.scoreDirection === 'up' 
        ? currentScore + rollValue 
        : currentScore - rollValue;
    }

    // Handle exact score requirement (Zero Hour)
    if (gameMode.rules.specialRules?.exactScoreRequired && 
        gameMode.rules.scoreDirection === 'down' &&
        newScore < gameMode.rules.targetScore) {
      // Overshoot in Zero Hour - reset to starting score
      newScore = gameMode.rules.startingScore;
    }

    // Handle extra roll for doubles (Last Line)
    if (isDouble && gameMode.rules.specialRules?.doubleGrantsExtraRoll) {
      grantExtraRoll = true;
    }

    return { newScore, isEliminated, grantExtraRoll };
  }

  // Check win condition
  static checkWinCondition(
    gameMode: GameMode,
    gameState: any
  ): { hasWinner: boolean; winner?: string; isRoundComplete: boolean } {
    switch (gameMode.id) {
      case 'classic':
        return this.checkClassicWin(gameMode, gameState);
      case 'zero-hour':
        return this.checkZeroHourWin(gameMode, gameState);
      case 'last-line':
        return this.checkLastLineWin(gameMode, gameState);
      case 'true-grit':
        return this.checkTrueGritWin(gameMode, gameState);
      default:
        return { hasWinner: false, isRoundComplete: false };
    }
  }

  private static checkClassicWin(gameMode: GameMode, gameState: any) {
    // Check if any player reached target score
    const winner = Object.entries(gameState.scores).find(
      ([_, score]) => (score as number) >= gameMode.rules.targetScore
    );

    if (winner) {
      // Check best of 3
      const playerId = winner[0];
      const roundsWon = gameState.modeSpecificData?.roundsWon || {};
      roundsWon[playerId] = (roundsWon[playerId] || 0) + 1;

      const hasGameWinner = roundsWon[playerId] >= Math.ceil((gameMode.rules.bestOf || 1) / 2);
      
      return {
        hasWinner: hasGameWinner,
        winner: hasGameWinner ? playerId : undefined,
        isRoundComplete: true
      };
    }

    return { hasWinner: false, isRoundComplete: false };
  }

  private static checkZeroHourWin(gameMode: GameMode, gameState: any) {
    const winner = Object.entries(gameState.scores).find(
      ([_, score]) => (score as number) === 0
    );

    return {
      hasWinner: !!winner,
      winner: winner?.[0],
      isRoundComplete: !!winner
    };
  }

  private static checkLastLineWin(gameMode: GameMode, gameState: any) {
    // Check if all players have completed their rolls
    const allPlayersFinished = gameState.players.every((playerId: string) => 
      gameState.modeSpecificData?.completedPlayers?.includes(playerId)
    );

    if (allPlayersFinished) {
      const winner = Object.entries(gameState.scores).reduce((highest, current) => 
        (current[1] as number) > (highest[1] as number) ? current : highest
      );

      return {
        hasWinner: true,
        winner: winner[0],
        isRoundComplete: true
      };
    }

    return { hasWinner: false, isRoundComplete: false };
  }

  private static checkTrueGritWin(gameMode: GameMode, gameState: any) {
    // Check if any player reached target or all others eliminated
    const activePlayers = gameState.players.filter((playerId: string) => 
      !gameState.modeSpecificData?.eliminatedPlayers?.includes(playerId)
    );

    if (activePlayers.length === 1) {
      return {
        hasWinner: true,
        winner: activePlayers[0],
        isRoundComplete: true
      };
    }

    const winner = Object.entries(gameState.scores).find(
      ([playerId, score]) => 
        (score as number) >= gameMode.rules.targetScore && 
        !gameState.modeSpecificData?.eliminatedPlayers?.includes(playerId)
    );

    return {
      hasWinner: !!winner,
      winner: winner?.[0],
      isRoundComplete: !!winner
    };
  }

  // Initialize mode-specific data
  static initializeModeData(mode: GameMode, players: string[]): GameModeSpecificData {
    const data: GameModeSpecificData = {};

    switch (mode.id) {
      case 'classic':
        data.roundsWon = Object.fromEntries(players.map(id => [id, 0]));
        data.currentRound = 1;
        break;
        
      case 'last-line':
        data.completedPlayers = [];
        data.finalScores = {};
        break;
        
      case 'true-grit':
        data.eliminatedPlayers = [];
        break;
    }

    return data;
  }
}
