# Game Modes Implementation Guide

## Overview
This README outlines the implementation of five distinct game modes for DashDice, each offering unique gameplay mechanics and victory conditions to enhance player experience and strategic depth.

## Game Modes

### 1. Classic Mode
- **Victory Condition**: First to 50 points, best of 3 rounds
- **Format**: Best of 3 (first to 2 round wins)
- **Rules**: Standard DashDice rules with banking mechanics

### 2. Zero Hour
- **Starting Score**: 100 points
- **Victory Condition**: First to reach exactly 0 points
- **Mechanics**: Reverse scoring - rolls subtract from total
- **Challenge**: Strategic timing to hit exactly 0

### 3. Last Line
- **Format**: Single roll elimination
- **Special Rule**: Rolling doubles grants one additional roll
- **Victory Condition**: Highest single roll wins
- **Timing**: Quick-fire rounds for fast gameplay

### 4. True Grit
- **Banking**: No banking allowed - one continuous turn
- **Elimination**: Single 1 eliminates player (no double 1 rule)
- **Double 6s**: Score normally (no reset)
- **Strategy**: Pure risk vs. reward with no safety net

### 5. Tag Team (Desktop Only)
- **Format**: 2v2 team battles
- **Mechanics**: 4 pairs of dice on screen simultaneously
- **Victory**: Highest combined team dice wins round
- **Platform**: Desktop exclusive for optimal UX

## Database Schema

### Game Modes Collection
```typescript
// src/types/index.ts
interface GameMode {
  id: string;
  name: string;
  description: string;
  rules: GameModeRules;
  settings: GameModeSettings;
  isActive: boolean;
  platforms: ('desktop' | 'mobile')[];
  minPlayers: number;
  maxPlayers: number;
  estimatedDuration: number; // in minutes
}

interface GameModeRules {
  startingScore: number;
  targetScore: number;
  maxRounds?: number;
  bestOf?: number;
  allowBanking: boolean;
  allowDoubleRolls: boolean;
  scoreDirection: 'up' | 'down';
  eliminationRules: {
    singleOne: boolean;
    doubleOne: boolean;
    doubleSix: 'reset' | 'score' | 'ignore';
  };
  specialRules?: {
    rollLimit?: number;
    doubleGrantsExtraRoll?: boolean;
    exactScoreRequired?: boolean;
    teamBased?: boolean;
  };
}

interface GameModeSettings {
  timePerTurn: number;
  maxConsecutiveRolls?: number;
  showRunningTotal: boolean;
  showOpponentScore: boolean;
  enableChat: boolean;
  enableAbilities: boolean;
}
```

### Game State Updates
```typescript
interface GameState {
  // ... existing fields
  gameMode: string;
  modeSpecificData: {
    roundsWon?: { [playerId: string]: number }; // Classic Mode
    isEliminationRound?: boolean; // Last Line
    teamScores?: { [teamId: string]: number }; // Tag Team
    turnLimit?: number; // True Grit
  };
  roundHistory: GameRound[];
}

interface GameRound {
  roundNumber: number;
  winner?: string;
  scores: { [playerId: string]: number };
  duration: number;
  gameMode: string;
}
```

## Implementation Architecture

### 1. Game Mode Service

```typescript
// src/services/gameModeService.ts
import { collection, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export class GameModeService {
  // Get all available game modes
  static async getAvailableGameModes(platform: 'desktop' | 'mobile' = 'desktop'): Promise<GameMode[]> {
    try {
      const q = query(
        collection(db, 'gameModes'),
        where('isActive', '==', true),
        where('platforms', 'array-contains', platform)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GameMode[];
    } catch (error) {
      console.error('Error fetching game modes:', error);
      return this.getDefaultGameModes(platform);
    }
  }

  // Get specific game mode configuration
  static async getGameMode(modeId: string): Promise<GameMode | null> {
    try {
      const modeDoc = await getDocs(query(
        collection(db, 'gameModes'),
        where('__name__', '==', modeId)
      ));
      
      if (!modeDoc.empty) {
        return { id: modeDoc.docs[0].id, ...modeDoc.docs[0].data() } as GameMode;
      }
      
      return this.getDefaultGameModes().find(mode => mode.id === modeId) || null;
    } catch (error) {
      console.error('Error fetching game mode:', error);
      return null;
    }
  }

  // Default game modes configuration
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
            singleOne: false,
            doubleOne: false,
            doubleSix: 'score'
          },
          specialRules: {
            rollLimit: 1,
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

    // Add Tag Team for desktop only
    if (platform === 'desktop') {
      baseModes.push({
        id: 'tag-team',
        name: 'Tag Team',
        description: '2v2 team battles with 4 pairs of dice',
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
          },
          specialRules: {
            teamBased: true
          }
        },
        settings: {
          timePerTurn: 45,
          maxConsecutiveRolls: 8,
          showRunningTotal: true,
          showOpponentScore: true,
          enableChat: true,
          enableAbilities: true
        },
        isActive: true,
        platforms: ['desktop'],
        minPlayers: 4,
        maxPlayers: 4,
        estimatedDuration: 20
      });
    }

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
      case 'tag-team':
        return this.checkTagTeamWin(gameMode, gameState);
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
      gameState.completedPlayers?.includes(playerId)
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
      !gameState.eliminatedPlayers?.includes(playerId)
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
        !gameState.eliminatedPlayers?.includes(playerId)
    );

    return {
      hasWinner: !!winner,
      winner: winner?.[0],
      isRoundComplete: !!winner
    };
  }

  private static checkTagTeamWin(gameMode: GameMode, gameState: any) {
    // Similar to classic but with team scoring
    const teamScores = gameState.modeSpecificData?.teamScores || {};
    const winningTeam = Object.entries(teamScores).find(
      ([_, score]) => (score as number) >= gameMode.rules.targetScore
    );

    if (winningTeam) {
      const teamId = winningTeam[0];
      const roundsWon = gameState.modeSpecificData?.teamRoundsWon || {};
      roundsWon[teamId] = (roundsWon[teamId] || 0) + 1;

      const hasGameWinner = roundsWon[teamId] >= Math.ceil((gameMode.rules.bestOf || 1) / 2);
      
      return {
        hasWinner: hasGameWinner,
        winner: hasGameWinner ? teamId : undefined,
        isRoundComplete: true
      };
    }

    return { hasWinner: false, isRoundComplete: false };
  }
}
```

### 2. Enhanced Game Service

```typescript
// src/services/gameService.ts - Enhanced with game modes
import { GameModeService } from './gameModeService';

export class GameService {
  // ... existing methods

  // Create game with specific mode
  static async createGame(
    players: string[],
    gameMode: string = 'classic',
    settings?: Partial<GameSettings>
  ): Promise<string> {
    try {
      const mode = await GameModeService.getGameMode(gameMode);
      if (!mode) {
        throw new Error('Invalid game mode');
      }

      // Validate player count
      if (players.length < mode.minPlayers || players.length > mode.maxPlayers) {
        throw new Error(`This mode requires ${mode.minPlayers}-${mode.maxPlayers} players`);
      }

      const gameData: Partial<Game> = {
        players,
        gameMode,
        scores: Object.fromEntries(players.map(id => [id, mode.rules.startingScore])),
        currentPlayerIndex: 0,
        currentTurn: null,
        gameStatus: 'waiting',
        settings: {
          ...mode.settings,
          ...settings
        },
        modeSpecificData: this.initializeModeData(mode, players),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const gameRef = await addDoc(collection(db, 'games'), gameData);
      return gameRef.id;
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  }

  // Initialize mode-specific data
  private static initializeModeData(mode: GameMode, players: string[]): any {
    const data: any = {};

    switch (mode.id) {
      case 'classic':
        data.roundsWon = Object.fromEntries(players.map(id => [id, 0]));
        data.currentRound = 1;
        break;
        
      case 'tag-team':
        // Create teams (assuming players are paired in order)
        const teams = {
          team1: [players[0], players[1]],
          team2: [players[2], players[3]]
        };
        data.teams = teams;
        data.teamScores = { team1: 0, team2: 0 };
        data.teamRoundsWon = { team1: 0, team2: 0 };
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

  // Enhanced roll dice with game mode logic
  static async rollDice(gameId: string): Promise<GameActionResult> {
    try {
      const game = await this.getGame(gameId);
      if (!game) throw new Error('Game not found');

      const mode = await GameModeService.getGameMode(game.gameMode);
      if (!mode) throw new Error('Invalid game mode');

      // Validate action
      const validation = GameModeService.validateGameAction(mode, 'roll', game);
      if (!validation.valid) {
        return { success: false, error: validation.reason };
      }

      // Roll dice
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const total = dice1 + dice2;
      const isDouble = dice1 === dice2;

      const currentPlayerId = game.players[game.currentPlayerIndex];
      const currentScore = game.scores[currentPlayerId];

      // Calculate new score based on mode
      const { newScore, isEliminated, grantExtraRoll } = GameModeService.calculateScore(
        mode,
        currentScore,
        total,
        isDouble
      );

      // Update game state
      const updates: Partial<Game> = {
        scores: { ...game.scores, [currentPlayerId]: newScore },
        currentTurn: {
          playerId: currentPlayerId,
          rolls: [...(game.currentTurn?.rolls || []), { dice1, dice2, total }],
          turnScore: game.currentTurn?.turnScore || 0,
          startTime: game.currentTurn?.startTime || Date.now()
        },
        updatedAt: serverTimestamp()
      };

      // Handle elimination
      if (isEliminated && mode.id === 'true-grit') {
        updates.modeSpecificData = {
          ...game.modeSpecificData,
          eliminatedPlayers: [...(game.modeSpecificData?.eliminatedPlayers || []), currentPlayerId]
        };
      }

      // Handle Last Line completion
      if (mode.id === 'last-line' && !grantExtraRoll) {
        updates.modeSpecificData = {
          ...game.modeSpecificData,
          completedPlayers: [...(game.modeSpecificData?.completedPlayers || []), currentPlayerId],
          finalScores: { 
            ...game.modeSpecificData?.finalScores, 
            [currentPlayerId]: total 
          }
        };
      }

      await updateDoc(doc(db, 'games', gameId), updates);

      // Check win condition
      const winCheck = GameModeService.checkWinCondition(mode, { ...game, ...updates });
      
      if (winCheck.hasWinner) {
        await this.endGame(gameId, winCheck.winner!);
      } else if (winCheck.isRoundComplete && mode.rules.bestOf) {
        await this.endRound(gameId);
      } else if (!grantExtraRoll && !isEliminated) {
        await this.nextTurn(gameId);
      }

      return {
        success: true,
        roll: { dice1, dice2, total, isDouble },
        newScore,
        grantExtraRoll,
        isEliminated
      };
    } catch (error) {
      console.error('Error rolling dice:', error);
      return { success: false, error: 'Failed to roll dice' };
    }
  }

  // Enhanced banking with mode validation
  static async bankScore(gameId: string): Promise<GameActionResult> {
    try {
      const game = await this.getGame(gameId);
      if (!game) throw new Error('Game not found');

      const mode = await GameModeService.getGameMode(game.gameMode);
      if (!mode) throw new Error('Invalid game mode');

      // Validate banking is allowed
      const validation = GameModeService.validateGameAction(mode, 'bank', game);
      if (!validation.valid) {
        return { success: false, error: validation.reason };
      }

      const currentPlayerId = game.players[game.currentPlayerIndex];
      const turnScore = game.currentTurn?.turnScore || 0;
      const newScore = game.scores[currentPlayerId] + turnScore;

      await updateDoc(doc(db, 'games', gameId), {
        [`scores.${currentPlayerId}`]: newScore,
        currentTurn: null,
        updatedAt: serverTimestamp()
      });

      // Check win condition
      const winCheck = GameModeService.checkWinCondition(mode, {
        ...game,
        scores: { ...game.scores, [currentPlayerId]: newScore }
      });

      if (winCheck.hasWinner) {
        await this.endGame(gameId, winCheck.winner!);
      } else {
        await this.nextTurn(gameId);
      }

      return { success: true, newScore };
    } catch (error) {
      console.error('Error banking score:', error);
      return { success: false, error: 'Failed to bank score' };
    }
  }

  // End round (for best-of games)
  private static async endRound(gameId: string): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game) return;

    const mode = await GameModeService.getGameMode(game.gameMode);
    if (!mode || !mode.rules.bestOf) return;

    // Reset scores for new round
    const resetScores = Object.fromEntries(
      game.players.map(id => [id, mode.rules.startingScore])
    );

    await updateDoc(doc(db, 'games', gameId), {
      scores: resetScores,
      currentPlayerIndex: 0,
      currentTurn: null,
      [`modeSpecificData.currentRound`]: (game.modeSpecificData?.currentRound || 1) + 1,
      updatedAt: serverTimestamp()
    });
  }
}
```

## Frontend Components

### 1. Game Mode Selector

```typescript
// src/components/game/GameModeSelector.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { GameModeService } from '@/services/gameModeService';

interface GameModeSelectorProps {
  selectedMode: string;
  onModeSelect: (modeId: string) => void;
  playerCount: number;
  platform?: 'desktop' | 'mobile';
}

export default function GameModeSelector({
  selectedMode,
  onModeSelect,
  playerCount,
  platform = 'desktop'
}: GameModeSelectorProps) {
  const [gameModes, setGameModes] = useState<GameMode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGameModes = async () => {
      try {
        const modes = await GameModeService.getAvailableGameModes(platform);
        setGameModes(modes);
      } catch (error) {
        console.error('Error loading game modes:', error);
        setGameModes(GameModeService.getDefaultGameModes(platform));
      } finally {
        setLoading(false);
      }
    };

    loadGameModes();
  }, [platform]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-white mb-4">Select Game Mode</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gameModes.map((mode) => {
          const isDisabled = playerCount < mode.minPlayers || playerCount > mode.maxPlayers;
          
          return (
            <div
              key={mode.id}
              className={`
                relative p-4 rounded-lg border-2 cursor-pointer transition-all
                ${selectedMode === mode.id 
                  ? 'border-blue-500 bg-blue-500/20' 
                  : 'border-gray-600 bg-gray-800/50'
                }
                ${isDisabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:border-blue-400'
                }
              `}
              onClick={() => !isDisabled && onModeSelect(mode.id)}
            >
              {/* Mode Icon/Badge */}
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-lg font-medium text-white">{mode.name}</h4>
                {mode.id === 'tag-team' && (
                  <span className="bg-purple-600 text-xs px-2 py-1 rounded-full">
                    Desktop Only
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-gray-300 text-sm mb-3">{mode.description}</p>

              {/* Game Info */}
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div>
                  <span className="font-medium">Players:</span> {mode.minPlayers}
                  {mode.minPlayers !== mode.maxPlayers && `-${mode.maxPlayers}`}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> ~{mode.estimatedDuration}m
                </div>
                <div>
                  <span className="font-medium">Banking:</span> {mode.rules.allowBanking ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className="font-medium">Abilities:</span> {mode.settings.enableAbilities ? 'Yes' : 'No'}
                </div>
              </div>

              {/* Special Rules Indicators */}
              <div className="mt-3 flex flex-wrap gap-1">
                {mode.rules.bestOf && (
                  <span className="bg-blue-600 text-xs px-2 py-1 rounded">
                    Best of {mode.rules.bestOf}
                  </span>
                )}
                {mode.rules.scoreDirection === 'down' && (
                  <span className="bg-red-600 text-xs px-2 py-1 rounded">
                    Reverse Scoring
                  </span>
                )}
                {mode.rules.specialRules?.rollLimit && (
                  <span className="bg-yellow-600 text-xs px-2 py-1 rounded">
                    {mode.rules.specialRules.rollLimit} Roll Max
                  </span>
                )}
                {!mode.rules.allowBanking && (
                  <span className="bg-orange-600 text-xs px-2 py-1 rounded">
                    No Banking
                  </span>
                )}
              </div>

              {/* Player Count Warning */}
              {isDisabled && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    Requires {mode.minPlayers}-{mode.maxPlayers} players
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 2. Mode-Specific Game UI

```typescript
// src/components/game/GameModeDisplay.tsx
'use client';

import React from 'react';

interface GameModeDisplayProps {
  gameMode: GameMode;
  gameState: Game;
  currentScore: number;
  isCurrentPlayer: boolean;
}

export default function GameModeDisplay({
  gameMode,
  gameState,
  currentScore,
  isCurrentPlayer
}: GameModeDisplayProps) {
  const renderModeSpecificInfo = () => {
    switch (gameMode.id) {
      case 'classic':
        const roundsWon = gameState.modeSpecificData?.roundsWon || {};
        const currentRound = gameState.modeSpecificData?.currentRound || 1;
        
        return (
          <div className="bg-blue-600/20 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-blue-400">Classic Mode</h3>
              <span className="text-sm text-gray-300">Round {currentRound}</span>
            </div>
            <div className="text-sm text-gray-300 mt-1">
              First to 50 points wins the round • Best of 3 rounds
            </div>
            {gameState.players.length > 0 && (
              <div className="mt-2 flex gap-4">
                {gameState.players.map(playerId => (
                  <div key={playerId} className="text-xs">
                    <span className="text-gray-400">Player:</span>
                    <span className="text-white ml-1">{roundsWon[playerId] || 0} wins</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'zero-hour':
        const remaining = currentScore;
        const isCloseToWin = remaining <= 10;
        
        return (
          <div className="bg-red-600/20 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-red-400">Zero Hour</h3>
              <span className={`text-2xl font-bold ${isCloseToWin ? 'text-red-400' : 'text-white'}`}>
                {remaining}
              </span>
            </div>
            <div className="text-sm text-gray-300 mt-1">
              Race to exactly 0 • Rolls subtract from your score
            </div>
            {isCloseToWin && (
              <div className="text-xs text-red-400 mt-2 animate-pulse">
                ⚠️ Careful! Don't overshoot or you'll reset to 100!
              </div>
            )}
          </div>
        );

      case 'last-line':
        const completedPlayers = gameState.modeSpecificData?.completedPlayers || [];
        const totalPlayers = gameState.players.length;
        
        return (
          <div className="bg-yellow-600/20 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-yellow-400">Last Line</h3>
              <span className="text-sm text-gray-300">
                {completedPlayers.length}/{totalPlayers} finished
              </span>
            </div>
            <div className="text-sm text-gray-300 mt-1">
              One roll to rule them all • Doubles grant extra roll
            </div>
            {isCurrentPlayer && (
              <div className="text-xs text-yellow-400 mt-2">
                🎲 Make it count! Highest roll wins!
              </div>
            )}
          </div>
        );

      case 'true-grit':
        const eliminatedPlayers = gameState.modeSpecificData?.eliminatedPlayers || [];
        const activePlayers = gameState.players.length - eliminatedPlayers.length;
        
        return (
          <div className="bg-orange-600/20 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-orange-400">True Grit</h3>
              <span className="text-sm text-gray-300">
                {activePlayers} players remaining
              </span>
            </div>
            <div className="text-sm text-gray-300 mt-1">
              No banking • Single 1 eliminates • Double 6s score normally
            </div>
            {isCurrentPlayer && (
              <div className="text-xs text-orange-400 mt-2">
                ⚡ No safety net! Keep rolling or bank it all!
              </div>
            )}
          </div>
        );

      case 'tag-team':
        const teams = gameState.modeSpecificData?.teams || {};
        const teamScores = gameState.modeSpecificData?.teamScores || {};
        
        return (
          <div className="bg-purple-600/20 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-purple-400">Tag Team</h3>
              <span className="text-sm text-gray-300">2v2 Battle</span>
            </div>
            <div className="text-sm text-gray-300 mt-1">
              Team up and dominate • 4 dice pairs on screen
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-blue-600/20 rounded p-2">
                <div className="text-blue-400 font-medium">Team 1</div>
                <div className="text-white">Score: {teamScores.team1 || 0}</div>
              </div>
              <div className="bg-red-600/20 rounded p-2">
                <div className="text-red-400 font-medium">Team 2</div>
                <div className="text-white">Score: {teamScores.team2 || 0}</div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mb-6">
      {renderModeSpecificInfo()}
    </div>
  );
}
```

### 3. Enhanced Dice Component for Tag Team

```typescript
// src/components/game/TagTeamDice.tsx
'use client';

import React, { useState } from 'react';

interface TagTeamDiceProps {
  teams: { team1: string[]; team2: string[] };
  onRollComplete: (results: { [playerId: string]: { dice1: number; dice2: number; total: number } }) => void;
  isRolling: boolean;
}

export default function TagTeamDice({ teams, onRollComplete, isRolling }: TagTeamDiceProps) {
  const [diceResults, setDiceResults] = useState<{ [playerId: string]: { dice1: number; dice2: number; total: number } }>({});

  const rollAllDice = () => {
    const results: { [playerId: string]: { dice1: number; dice2: number; total: number } } = {};
    
    [...teams.team1, ...teams.team2].forEach(playerId => {
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const total = dice1 + dice2;
      results[playerId] = { dice1, dice2, total };
    });

    setDiceResults(results);
    onRollComplete(results);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-white mb-4 text-center">Tag Team Battle</h3>
      
      {/* Team 1 */}
      <div className="mb-6">
        <h4 className="text-lg font-medium text-blue-400 mb-3">Team 1</h4>
        <div className="grid grid-cols-2 gap-4">
          {teams.team1.map((playerId, index) => (
            <div key={playerId} className="bg-blue-600/20 rounded-lg p-4">
              <div className="text-sm text-gray-300 mb-2">Player {index + 1}</div>
              <div className="flex gap-2 justify-center">
                <div className={`w-12 h-12 rounded-lg border-2 border-blue-400 flex items-center justify-center text-white font-bold text-lg ${isRolling ? 'animate-bounce' : ''}`}>
                  {diceResults[playerId]?.dice1 || '?'}
                </div>
                <div className={`w-12 h-12 rounded-lg border-2 border-blue-400 flex items-center justify-center text-white font-bold text-lg ${isRolling ? 'animate-bounce animation-delay-100' : ''}`}>
                  {diceResults[playerId]?.dice2 || '?'}
                </div>
              </div>
              {diceResults[playerId] && (
                <div className="text-center mt-2 text-blue-400 font-semibold">
                  Total: {diceResults[playerId].total}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Roll Button */}
      <div className="text-center mb-6">
        <button
          onClick={rollAllDice}
          disabled={isRolling}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105"
        >
          {isRolling ? 'Rolling...' : 'Roll All Dice!'}
        </button>
      </div>

      {/* Team 2 */}
      <div>
        <h4 className="text-lg font-medium text-red-400 mb-3">Team 2</h4>
        <div className="grid grid-cols-2 gap-4">
          {teams.team2.map((playerId, index) => (
            <div key={playerId} className="bg-red-600/20 rounded-lg p-4">
              <div className="text-sm text-gray-300 mb-2">Player {index + 1}</div>
              <div className="flex gap-2 justify-center">
                <div className={`w-12 h-12 rounded-lg border-2 border-red-400 flex items-center justify-center text-white font-bold text-lg ${isRolling ? 'animate-bounce animation-delay-200' : ''}`}>
                  {diceResults[playerId]?.dice1 || '?'}
                </div>
                <div className={`w-12 h-12 rounded-lg border-2 border-red-400 flex items-center justify-center text-white font-bold text-lg ${isRolling ? 'animate-bounce animation-delay-300' : ''}`}>
                  {diceResults[playerId]?.dice2 || '?'}
                </div>
              </div>
              {diceResults[playerId] && (
                <div className="text-center mt-2 text-red-400 font-semibold">
                  Total: {diceResults[playerId].total}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Results Summary */}
      {Object.keys(diceResults).length > 0 && (
        <div className="mt-6 bg-gray-700/50 rounded-lg p-4">
          <h5 className="text-white font-medium mb-2">Round Results:</h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-400">Team 1 Total:</span>
              <span className="text-white ml-2 font-bold">
                {teams.team1.reduce((sum, id) => sum + (diceResults[id]?.total || 0), 0)}
              </span>
            </div>
            <div>
              <span className="text-red-400">Team 2 Total:</span>
              <span className="text-white ml-2 font-bold">
                {teams.team2.reduce((sum, id) => sum + (diceResults[id]?.total || 0), 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

## API Routes

### Game Mode Management API

```typescript
// src/app/api/game-modes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GameModeService } from '@/services/gameModeService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') as 'desktop' | 'mobile' || 'desktop';
    
    const gameModes = await GameModeService.getAvailableGameModes(platform);
    
    return NextResponse.json({
      success: true,
      gameModes
    });
  } catch (error) {
    console.error('Error fetching game modes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch game modes' },
      { status: 500 }
    );
  }
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
1. **Database Setup**
   - Create game modes collection and interfaces
   - Implement GameModeService with default configurations
   - Set up mode validation logic

2. **Game Service Enhancement**
   - Integrate game modes into existing game creation
   - Implement mode-specific scoring logic
   - Add win condition checking for each mode

### Phase 2: Basic Mode Implementation (Week 2)
1. **Classic & Zero Hour**
   - Implement classic best-of-3 mechanics
   - Add reverse scoring for Zero Hour
   - Create exact-score validation

2. **Last Line & True Grit**
   - Single-roll elimination logic
   - No-banking enforcement for True Grit
   - Enhanced elimination rules

### Phase 3: Advanced Features (Week 3)
1. **Tag Team Mode**
   - Desktop-only team formation
   - 4-dice simultaneous rolling
   - Team scoring and win conditions

2. **UI Components**
   - Game mode selector with validation
   - Mode-specific displays and indicators
   - Enhanced dice components for Tag Team

### Phase 4: Polish & Testing (Week 4)
1. **Integration & Testing**
   - End-to-end testing for all modes
   - Balance adjustments and rule refinements
   - Performance optimization

2. **Mobile Optimization**
   - Responsive design for mobile modes
   - Touch-optimized controls
   - Platform-specific feature detection

## Game Mode Statistics

### Tracking and Analytics
```typescript
// Enhanced game tracking for mode-specific statistics
interface GameModeStats {
  modeId: string;
  totalGames: number;
  averageDuration: number;
  winRates: { [playerId: string]: number };
  popularityRank: number;
  completionRate: number; // Percentage of games finished vs abandoned
}
```

This implementation provides a comprehensive game mode system that significantly enhances DashDice's gameplay variety while maintaining the core dice mechanics players love. Each mode offers unique strategic challenges and keeps the gaming experience fresh and engaging.
