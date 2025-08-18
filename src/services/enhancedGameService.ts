import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { GameState, GamePlayer, Match } from '@/types';
import { GameMode, GameModeSpecificData, GameActionResult } from '@/types/gameModes';
import { GameModeService } from './gameModeService';

export class EnhancedGameService {
  private static readonly GAMES_COLLECTION = 'games';
  private static readonly MATCHES_COLLECTION = 'matches';

  // Create game with specific mode
  static async createGame(
    players: string[],
    gameMode: string = 'classic',
    settings?: any
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

      const gameData: Partial<GameState> = {
        players: players.map(id => ({
          uid: id,
          displayName: `Player ${id}`, // This should be populated from user data
          score: mode.rules.startingScore,
          ready: false
        })),
        gameMode,
        scores: Object.fromEntries(players.map(id => [id, mode.rules.startingScore])),
        currentPlayerIndex: 0,
        currentTurn: undefined,
        status: 'waiting',
        modeSpecificData: GameModeService.initializeModeData(mode, players),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const gameRef = await addDoc(collection(db, this.GAMES_COLLECTION), {
        ...gameData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return gameRef.id;
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  }

  // Get game with mode information
  static async getGame(gameId: string): Promise<GameState | null> {
    try {
      const gameDoc = await getDoc(doc(db, this.GAMES_COLLECTION, gameId));
      if (!gameDoc.exists()) {
        return null;
      }

      return {
        gameId: gameDoc.id,
        ...gameDoc.data()
      } as GameState;
    } catch (error) {
      console.error('Error fetching game:', error);
      return null;
    }
  }

  // Enhanced roll dice with game mode logic
  static async rollDice(gameId: string): Promise<GameActionResult> {
    try {
      const game = await this.getGame(gameId);
      if (!game) throw new Error('Game not found');

      const mode = await GameModeService.getGameMode(game.gameMode || 'classic');
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

      const currentPlayerId = game.players[game.currentPlayerIndex || 0].uid;
      const currentScore = game.scores?.[currentPlayerId] || 0;

      // Calculate new score based on mode
      const { newScore, isEliminated, grantExtraRoll } = GameModeService.calculateScore(
        mode,
        currentScore,
        total,
        isDouble
      );

      // Update game state
      const updates: Partial<GameState> = {
        scores: { ...game.scores, [currentPlayerId]: newScore },
        currentTurn: {
          playerId: currentPlayerId,
          rolls: [...(game.currentTurn?.rolls || []), { dice1, dice2, total }],
          turnScore: game.currentTurn?.turnScore || 0,
          startTime: game.currentTurn?.startTime || Date.now()
        },
        updatedAt: new Date()
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

      await updateDoc(doc(db, this.GAMES_COLLECTION, gameId), {
        ...updates,
        updatedAt: serverTimestamp()
      });

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

      const mode = await GameModeService.getGameMode(game.gameMode || 'classic');
      if (!mode) throw new Error('Invalid game mode');

      // Validate banking is allowed
      const validation = GameModeService.validateGameAction(mode, 'bank', game);
      if (!validation.valid) {
        return { success: false, error: validation.reason };
      }

      const currentPlayerId = game.players[game.currentPlayerIndex || 0].uid;
      const turnScore = game.currentTurn?.turnScore || 0;
      const newScore = (game.scores?.[currentPlayerId] || 0) + turnScore;

    await updateDoc(doc(db, this.GAMES_COLLECTION, gameId), {
      [`scores.${currentPlayerId}`]: newScore,
      currentTurn: undefined,
      updatedAt: serverTimestamp()
    });      // Check win condition
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

  // Move to next turn
  private static async nextTurn(gameId: string): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game) return;

    const nextPlayerIndex = (game.currentPlayerIndex || 0 + 1) % game.players.length;
    
    await updateDoc(doc(db, this.GAMES_COLLECTION, gameId), {
      currentPlayerIndex: nextPlayerIndex,
      currentTurn: undefined,
      updatedAt: serverTimestamp()
    });
  }

  // End game
  private static async endGame(gameId: string, winnerId: string): Promise<void> {
    await updateDoc(doc(db, this.GAMES_COLLECTION, gameId), {
      status: 'finished',
      winner: winnerId,
      updatedAt: serverTimestamp()
    });
  }

  // End round (for best-of games)
  private static async endRound(gameId: string): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game) return;

    const mode = await GameModeService.getGameMode(game.gameMode || 'classic');
    if (!mode || !mode.rules.bestOf) return;

    // Reset scores for new round
    const resetScores = Object.fromEntries(
      game.players.map(player => [player.uid, mode.rules.startingScore])
    );

    await updateDoc(doc(db, this.GAMES_COLLECTION, gameId), {
      scores: resetScores,
      currentPlayerIndex: 0,
      currentTurn: undefined,
      [`modeSpecificData.currentRound`]: (game.modeSpecificData?.currentRound || 1) + 1,
      updatedAt: serverTimestamp()
    });
  }

  // Listen to game updates
  static subscribeToGame(gameId: string, callback: (game: GameState | null) => void): () => void {
    const gameRef = doc(db, this.GAMES_COLLECTION, gameId);
    
    return onSnapshot(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({
          gameId: snapshot.id,
          ...snapshot.data()
        } as GameState);
      } else {
        callback(null);
      }
    });
  }

  // Delete game
  static async deleteGame(gameId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.GAMES_COLLECTION, gameId));
    } catch (error) {
      console.error('Error deleting game:', error);
      throw error;
    }
  }

  // Get player's active games
  static async getPlayerGames(playerId: string): Promise<GameState[]> {
    try {
      const q = query(
        collection(db, this.GAMES_COLLECTION),
        where('players', 'array-contains', playerId),
        where('status', 'in', ['waiting', 'active']),
        orderBy('updatedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        gameId: doc.id,
        ...doc.data()
      })) as GameState[];
    } catch (error) {
      console.error('Error fetching player games:', error);
      return [];
    }
  }
}
