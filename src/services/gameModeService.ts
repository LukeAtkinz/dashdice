import { collection, doc, getDocs, getDoc, query, where } from 'firebase/firestore';
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
      console.log('🎮 GameModeService: Looking for mode:', modeId);
      
      // First try to get from Firestore using doc() for direct document access
      const modeDocRef = doc(db, 'gameModes', modeId);
      const modeDocSnapshot = await getDoc(modeDocRef);
      
      if (modeDocSnapshot.exists()) {
        console.log('✅ GameModeService: Found mode in Firestore:', modeId);
        return { id: modeDocSnapshot.id, ...modeDocSnapshot.data() } as GameMode;
      }
      
      // Fall back to default modes
      console.log(`⚠️ GameModeService: Mode ${modeId} not found in Firestore, checking defaults`);
      const defaultMode = this.getDefaultGameModes().find(mode => mode.id === modeId);
      console.log('🔍 GameModeService: Default mode found:', defaultMode ? defaultMode.id : 'NONE');
      return defaultMode || null;
    } catch (error) {
      console.error('❌ GameModeService: Error fetching game mode from Firestore:', error);
      console.log(`🔄 GameModeService: Falling back to default mode for ${modeId}`);
      return this.getDefaultGameModes().find(mode => mode.id === modeId) || null;
    }
  }

  // Default game modes configuration (excluding Tag Team)
  static getDefaultGameModes(platform: 'desktop' | 'mobile' = 'desktop'): GameMode[] {
    const baseModes: GameMode[] = [
      {
        id: 'quickfire',
        name: 'Quickfire',
        description: 'First to 50 points wins, players take turns and bank',
        rules: {
          startingScore: 0,
          targetScore: 50,
          allowBanking: true,
          allowDoubleRolls: true,
          scoreDirection: 'up',
          eliminationRules: {
            singleOne: false,
            doubleOne: false, // Quickfire: double 1s should be +20 and continue turn
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
        estimatedDuration: 10
      },
      {
        id: 'classic',
        name: 'Classic Mode',
        description: 'First to 100 points wins, players take turns and bank',
        rules: {
          startingScore: 0,
          targetScore: 100,
          allowBanking: true,
          allowDoubleRolls: true,
          scoreDirection: 'up',
          eliminationRules: {
            singleOne: false,
            doubleOne: false, // Classic: double 1s should be +20 and continue turn
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
        description: 'Start at 100, bank to subtract from score, first to reach exactly 0 wins',
        rules: {
          startingScore: 100,
          targetScore: 0,
          allowBanking: true,
          allowDoubleRolls: true,
          scoreDirection: 'down',
          eliminationRules: {
            singleOne: false,
            doubleOne: false,
            doubleSix: 'ignore' // Doubles don't reset in Zero Hour
          },
          specialRules: {
            exactScoreRequired: true,
            multiplierSystem: true
            // Zero Hour processing is handled in matchService.ts processGameRules method
            // Rules implemented:
            // - Both players start at 100 points
            // - First to reach exactly 0 wins
            // - Snake Eyes: +20 to turnScore, +20 to opponent, activate multiplier
            // - Any other double: +rollTotal to turnScore, +rollTotal to opponent, activate multiplier  
            // - Multiplier active: all future rolls in turn are doubled
            // - Banking below 0: no subtraction applied, turnScore resets
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
        estimatedDuration: 15
      },
      {
        id: 'last-line',
        name: 'Last Line',
        description: 'Tug-of-war mode: start at 50 each, roll totals transfer between players, first to reach 0 loses',
        rules: {
          startingScore: 50,
          targetScore: 0,     // Win when opponent reaches 0
          allowBanking: true,  // Re-enable banking for tug-of-war on bank
          allowDoubleRolls: true,
          scoreDirection: 'tug-of-war', // Special direction for tug-of-war mechanics
          eliminationRules: {
            singleOne: false,     // Single 1 ends turn but doesn't eliminate
            doubleOne: false,     // Double 1 has special x20 rule
            doubleSix: 'score'    // Double 6 scores with multiplier
          },
          specialRules: {
            tugOfWar: true,       // Enable tug-of-war mechanics
            combinedScoreCap: 100, // Combined score never exceeds 100
            doubleMultiplier: true // Doubles apply multiplier = die value
          }
        },
        settings: {
          timePerTurn: 30,
          showRunningTotal: true,
          showOpponentScore: true,
          enableChat: true,
          enableAbilities: false
        },
        isActive: true,
        platforms: ['desktop', 'mobile'],
        minPlayers: 2,
        maxPlayers: 2,
        estimatedDuration: 5
      },
      {
        id: 'true-grit',
        name: 'True Grit',
        description: 'Each player gets one turn only, roll until single 1 ends turn, highest score wins',
        rules: {
          startingScore: 0,
          targetScore: 999999, // No target score, highest wins
          allowBanking: false,
          allowDoubleRolls: true,
          scoreDirection: 'up',
          eliminationRules: {
            singleOne: true,      // Single 1 ends turn (not eliminates player)
            doubleOne: false,     // Double 1 gets special x7 multiplier
            doubleSix: 'score'    // Double 6 scores normally
          },
          specialRules: {
            multiplierSystem: true,
            exactScoreRequired: false,
            doublesEffects: {
              'double1': { scoreBonus: 0, multiplier: 7, opponentPenalty: 0, affectsOpponentOnBank: false },
              'double2': { scoreBonus: 0, multiplier: 2, opponentPenalty: 0, affectsOpponentOnBank: false },
              'double3': { scoreBonus: 0, multiplier: 3, opponentPenalty: 0, affectsOpponentOnBank: false },
              'double4': { scoreBonus: 0, multiplier: 4, opponentPenalty: 0, affectsOpponentOnBank: false },
              'double5': { scoreBonus: 0, multiplier: 5, opponentPenalty: 0, affectsOpponentOnBank: false },
              'double6': { scoreBonus: 0, multiplier: 6, opponentPenalty: 0, affectsOpponentOnBank: false }
            }
          }
        },
        settings: {
          timePerTurn: 60,
          showRunningTotal: true,
          showOpponentScore: true,
          enableChat: true,
          enableAbilities: false
        },
        isActive: true,
        platforms: ['desktop', 'mobile'],
        minPlayers: 2,
        maxPlayers: 4,
        estimatedDuration: 5
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
          const extraRollsGranted = gameState.currentTurn?.extraRollsGranted || 0;
          
          // For Last Line mode, allow extra rolls if doubles were rolled
          if (gameMode.id === 'last-line' && gameMode.rules.specialRules?.doubleGrantsExtraRoll) {
            const totalAllowedRolls = gameMode.rules.specialRules.rollLimit + extraRollsGranted;
            if (currentRolls >= totalAllowedRolls) {
              return { valid: false, reason: 'Roll limit reached (including extra rolls)' };
            }
          } else {
            // Standard roll limit check for other modes
            if (currentRolls >= gameMode.rules.specialRules.rollLimit) {
              return { valid: false, reason: 'Roll limit reached' };
            }
          }
        }
        break;
    }
    
    return { valid: true };
  }

  // Enhanced roll processing with multipliers and special effects
  static processRoll(
    gameMode: GameMode,
    dice1: number,
    dice2: number,
    currentScore: number,
    turnScore: number,
    gameState?: any
  ): GameActionResult {
    const total = dice1 + dice2;
    const isDouble = dice1 === dice2;
    let newScore = currentScore;
    let isEliminated = false;
    let grantExtraRoll = false;
    let appliedMultiplier = 1;

    // Check for elimination conditions first
    if (dice1 === 1 && dice2 !== 1 && gameMode.rules.eliminationRules.singleOne) {
      isEliminated = true;
      return { success: true, roll: { dice1, dice2, total, isDouble }, newScore, isEliminated };
    }

    if (dice2 === 1 && dice1 !== 1 && gameMode.rules.eliminationRules.singleOne) {
      isEliminated = true;
      return { success: true, roll: { dice1, dice2, total, isDouble }, newScore, isEliminated };
    }

    // Handle doubles effects for advanced game modes
    if (isDouble && gameMode.rules.specialRules?.doublesEffects) {
      const doubleKey = `double${dice1}`;
      const doubleEffect = gameMode.rules.specialRules.doublesEffects[doubleKey];
      
      if (doubleEffect) {
        // Apply score bonus
        let scoreToAdd = doubleEffect.scoreBonus;
        
        // Apply current multiplier if active
        if (gameState?.modeSpecificData?.activeMultipliers?.[gameState.currentPlayer]) {
          appliedMultiplier = gameState.modeSpecificData.activeMultipliers[gameState.currentPlayer];
          scoreToAdd *= appliedMultiplier;
        }
        
        // Update score
        if (gameMode.rules.scoreDirection === 'down') {
          newScore = Math.max(0, currentScore - scoreToAdd);
        } else {
          newScore = currentScore + scoreToAdd;
        }
        
        // Set new multiplier for future rolls this turn
        if (doubleEffect.multiplier && doubleEffect.multiplier > 1) {
          if (!gameState?.modeSpecificData) gameState.modeSpecificData = {};
          if (!gameState.modeSpecificData.activeMultipliers) gameState.modeSpecificData.activeMultipliers = {};
          gameState.modeSpecificData.activeMultipliers[gameState.currentPlayer] = doubleEffect.multiplier;
        }
      }
    } else {
      // Regular roll - apply multiplier if active
      let scoreToAdd = total;
      if (gameState?.modeSpecificData?.activeMultipliers?.[gameState.currentPlayer]) {
        appliedMultiplier = gameState.modeSpecificData.activeMultipliers[gameState.currentPlayer];
        scoreToAdd *= appliedMultiplier;
      }
      
      if (gameMode.rules.scoreDirection === 'down') {
        newScore = Math.max(0, currentScore - scoreToAdd);
      } else {
        newScore = currentScore + scoreToAdd;
      }
    }

    // Handle double 6 reset for classic modes
    if (isDouble && dice1 === 6 && gameMode.rules.eliminationRules.doubleSix === 'reset') {
      // Reset turn score but don't eliminate
      newScore = currentScore; // Reset to pre-turn score
    }

    // Handle overshoot in Zero Hour
    if (gameMode.id === 'zero-hour' && 
        gameMode.rules.scoreDirection === 'down' &&
        newScore < gameMode.rules.targetScore) {
      // Overshoot in Zero Hour - reset to starting score
      newScore = gameMode.rules.startingScore;
    }

    // Handle extra roll for doubles (Last Line)
    if (isDouble && gameMode.rules.specialRules?.doubleGrantsExtraRoll) {
      grantExtraRoll = true;
    }

    return { 
      success: true, 
      roll: { dice1, dice2, total, isDouble }, 
      newScore, 
      isEliminated, 
      grantExtraRoll 
    };
  }

  // Calculate score based on game mode (backward compatibility)
  static calculateScore(
    gameMode: GameMode,
    currentScore: number,
    rollValue: number,
    isDouble: boolean
  ): { newScore: number; isEliminated: boolean; grantExtraRoll: boolean } {
    // Convert rollValue back to dice for new system
    let dice1, dice2;
    if (isDouble) {
      dice1 = dice2 = rollValue / 2;
    } else {
      // For non-doubles, we can't perfectly reconstruct, so use approximation
      dice1 = Math.min(6, Math.max(1, Math.floor(rollValue / 2)));
      dice2 = rollValue - dice1;
    }

    const result = this.processRoll(gameMode, dice1, dice2, currentScore, 0);
    return {
      newScore: result.newScore || currentScore,
      isEliminated: result.isEliminated || false,
      grantExtraRoll: result.grantExtraRoll || false
    };
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
      ([_, score]) => (score as number) <= 0
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
        data.activeMultipliers = Object.fromEntries(players.map(id => [id, 1]));
        break;
        
      case 'zero-hour':
        data.activeMultipliers = Object.fromEntries(players.map(id => [id, 1]));
        break;
    }

    return data;
  }

  // Reset multipliers at turn end
  static resetTurnMultipliers(gameState: any, playerId: string) {
    if (gameState.modeSpecificData?.activeMultipliers) {
      gameState.modeSpecificData.activeMultipliers[playerId] = 1;
    }
  }
}
