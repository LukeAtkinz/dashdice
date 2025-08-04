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

export class GameService {
  private static readonly GAMES_COLLECTION = 'games';
  private static readonly MATCHES_COLLECTION = 'matches';

  /**
   * Handle odd/even choice during pregame
   */
  static async makeOddEvenChoice(matchId: string, choice: 'odd' | 'even', playerId: string): Promise<void> {
    try {
      console.log('🎯 GameService: Making odd/even choice:', { matchId, choice, playerId });
      
      const matchRef = doc(db, this.MATCHES_COLLECTION, matchId);
      const matchSnap = await getDoc(matchRef);
      
      if (!matchSnap.exists()) {
        throw new Error('Match not found');
      }
      
      const matchData = matchSnap.data();
      const isHost = matchData.hostData.playerId === playerId;
      const playerIndex = isHost ? 1 : 2;
      
      // Check if this player is the chooser
      if (matchData.gameData.chooserPlayerIndex !== playerIndex) {
        throw new Error('Not your turn to choose');
      }
      
      if (matchData.gameData.oddEvenChoice !== null) {
        throw new Error('Choice already made');
      }
      
      // Roll a die to determine the outcome
      const dieValue = Math.floor(Math.random() * 6) + 1;
      const isOdd = dieValue % 2 === 1;
      const playerChoseOdd = choice === 'odd';
      const playerWins = isOdd === playerChoseOdd;
      
      // Determine who goes first
      const firstPlayerIndex = playerWins ? playerIndex : (playerIndex === 1 ? 2 : 1);
      
      console.log('🎲 GameService: Odd/even result:', { 
        dieValue, 
        isOdd, 
        playerChoseOdd, 
        playerWins, 
        firstPlayerIndex 
      });
      
      // Update match with choice and start the game
      await updateDoc(matchRef, {
        'gameData.oddEvenChoice': choice,
        'gameData.oddEvenDieValue': dieValue,
        'gameData.turnDecider': firstPlayerIndex,
        'gameData.isPregame': false,
        'gameData.status': 'active',
        'hostData.gameState.turnActive': firstPlayerIndex === 1,
        'opponentData.gameState.turnActive': firstPlayerIndex === 2,
        'gameData.updatedAt': serverTimestamp()
      });
      
      console.log('✅ GameService: Odd/even choice processed successfully');
    } catch (error) {
      console.error('❌ GameService: Error making odd/even choice:', error);
      throw error;
    }
  }

  /**
   * Create a new game
   */
  static async createGame(creator: GamePlayer): Promise<string> {
    try {
      const gameData = {
        players: [creator],
        currentPlayer: creator.uid,
        status: 'waiting' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, this.GAMES_COLLECTION), gameData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  }

  /**
   * Join an existing game
   */
  static async joinGame(gameId: string, player: GamePlayer): Promise<void> {
    try {
      const gameRef = doc(db, this.GAMES_COLLECTION, gameId);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameSnap.data();
      const currentPlayers = gameData.players || [];

      // Check if player is already in the game
      if (currentPlayers.some((p: GamePlayer) => p.uid === player.uid)) {
        return; // Player already in game
      }

      // Check if game is full (assuming max 4 players)
      if (currentPlayers.length >= 4) {
        throw new Error('Game is full');
      }

      // Check if game is still waiting for players
      if (gameData.status !== 'waiting') {
        throw new Error('Game has already started');
      }

      await updateDoc(gameRef, {
        players: [...currentPlayers, player],
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error joining game:', error);
      throw error;
    }
  }

  /**
   * Leave a game
   */
  static async leaveGame(gameId: string, playerId: string): Promise<void> {
    try {
      const gameRef = doc(db, this.GAMES_COLLECTION, gameId);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        return; // Game doesn't exist, nothing to leave
      }

      const gameData = gameSnap.data();
      const currentPlayers = gameData.players || [];
      const remainingPlayers = currentPlayers.filter((p: GamePlayer) => p.uid !== playerId);

      if (remainingPlayers.length === 0) {
        // Delete the game if no players left
        await deleteDoc(gameRef);
      } else {
        const updateData: any = {
          players: remainingPlayers,
          updatedAt: serverTimestamp(),
        };

        // If the leaving player was the current player, assign to next player
        if (gameData.currentPlayer === playerId && remainingPlayers.length > 0) {
          updateData.currentPlayer = remainingPlayers[0].uid;
        }

        await updateDoc(gameRef, updateData);
      }
    } catch (error) {
      console.error('Error leaving game:', error);
      throw error;
    }
  }

  /**
   * Update player ready status
   */
  static async updatePlayerReady(
    gameId: string, 
    playerId: string, 
    ready: boolean
  ): Promise<void> {
    try {
      const gameRef = doc(db, this.GAMES_COLLECTION, gameId);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameSnap.data();
      const players = gameData.players || [];
      
      const updatedPlayers = players.map((player: GamePlayer) =>
        player.uid === playerId ? { ...player, ready } : player
      );

      // Check if all players are ready and start the game
      const allReady = updatedPlayers.every((player: GamePlayer) => player.ready);
      const updateData: any = {
        players: updatedPlayers,
        updatedAt: serverTimestamp(),
      };

      if (allReady && updatedPlayers.length >= 2) {
        updateData.status = 'active';
      }

      await updateDoc(gameRef, updateData);
    } catch (error) {
      console.error('Error updating player ready status:', error);
      throw error;
    }
  }

  /**
   * Get a game by ID
   */
  static async getGame(gameId: string): Promise<GameState | null> {
    try {
      const gameRef = doc(db, this.GAMES_COLLECTION, gameId);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        return null;
      }

      const data = gameSnap.data();
      return {
        gameId,
        players: data.players || [],
        currentPlayer: data.currentPlayer,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        winner: data.winner,
      };
    } catch (error) {
      console.error('Error fetching game:', error);
      throw error;
    }
  }

  /**
   * Listen to game changes
   */
  static listenToGame(
    gameId: string, 
    callback: (game: GameState | null) => void
  ): () => void {
    const gameRef = doc(db, this.GAMES_COLLECTION, gameId);
    
    return onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          gameId: doc.id,
          players: data.players || [],
          currentPlayer: data.currentPlayer,
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          winner: data.winner,
        });
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error listening to game:', error);
      callback(null);
    });
  }

  /**
   * Get games where a player is participating
   */
  static async getPlayerGames(playerId: string): Promise<GameState[]> {
    try {
      const q = query(
        collection(db, this.GAMES_COLLECTION),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            gameId: doc.id,
            players: data.players || [],
            currentPlayer: data.currentPlayer,
            status: data.status,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            winner: data.winner,
          };
        })
        .filter(game => 
          game.players.some((player: GamePlayer) => player.uid === playerId)
        );
    } catch (error) {
      console.error('Error fetching player games:', error);
      throw error;
    }
  }

  /**
   * End a game with a winner
   */
  static async endGame(gameId: string, winnerId?: string): Promise<void> {
    try {
      const updateData: any = {
        status: 'finished',
        updatedAt: serverTimestamp(),
      };

      if (winnerId) {
        updateData.winner = winnerId;
      }

      await updateDoc(doc(db, this.GAMES_COLLECTION, gameId), updateData);
    } catch (error) {
      console.error('Error ending game:', error);
      throw error;
    }
  }
}
