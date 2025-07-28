import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

export class MatchmakingService {
  
  /**
   * Search for existing open rooms
   */
  static async findOpenRoom(gameMode: string) {
    try {
      const q = query(
        collection(db, 'waitingroom'),
        where('gameMode', '==', gameMode),
        where('gameType', '==', 'Open Server'),
        where('playersRequired', '==', 1)
      );

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, data: doc.data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error finding open room:', error);
      throw error;
    }
  }

  /**
   * DEPRECATED: This method should not be used. Use findOrCreateRoom instead.
   * Keeping for compatibility but it will throw an error.
   */
  static async createWaitingRoom(gameMode: string, hostData: any) {
    throw new Error('createWaitingRoom is deprecated. Use findOrCreateRoom instead to prevent duplicate document creation.');
  }

  /**
   * Add opponent to existing room
   */
  static async addOpponentToRoom(roomId: string, opponentData: any) {
    try {
      const roomRef = doc(db, 'waitingroom', roomId);
      
      await updateDoc(roomRef, {
        opponentData: {
          playerDisplayName: opponentData.playerDisplayName,
          playerId: opponentData.playerId,
          playerDisplayBackgroundEquipped: opponentData.displayBackgroundEquipped,
          playerMatchBackgroundEquipped: opponentData.matchBackgroundEquipped,
          playerStats: {
            bestStreak: opponentData.playerStats.bestStreak,
            currentStreak: opponentData.playerStats.currentStreak,
            gamesPlayed: opponentData.playerStats.gamesPlayed,
            matchWins: opponentData.playerStats.matchWins
          }
        },
        'gameData.playersRequired': 0 // No more players needed
      });

      console.log('Added opponent to room:', roomId);
      return roomId;
    } catch (error) {
      console.error('Error adding opponent to room:', error);
      throw error;
    }
  }

  /**
   * Move room from waitingroom to matches and add game state variables
   */
  static async moveToMatches(roomId: string) {
    try {
      // Get room data from waitingroom
      const roomDoc = await getDocs(query(
        collection(db, 'waitingroom'),
        where('__name__', '==', roomId)
      ));

      if (!roomDoc.empty) {
        const roomData = roomDoc.docs[0].data();
        
        // Generate random turnDecider (1 or 2)
        const turnDecider = Math.floor(Math.random() * 2) + 1;
        
        // Create enhanced data for matches collection
        const matchData = {
          ...roomData,
          // Add game state variables to gameData
          gameData: {
            ...roomData.gameData,
            turnDecider: turnDecider,
            turnScore: 0,
            diceOne: 0,
            diceTwo: 0,
            roundObjective: 100, // Default objective
            startingScore: 0,
            status: 'active',
            startedAt: serverTimestamp()
          },
          // Add game state to hostData
          hostData: {
            ...roomData.hostData,
            turnActive: turnDecider === 1, // Host is active if turnDecider is 1
            playerScore: 0,
            roundScore: 0
          },
          // Add game state to opponentData
          opponentData: {
            ...roomData.opponentData,
            turnActive: turnDecider === 2, // Opponent is active if turnDecider is 2
            playerScore: 0,
            roundScore: 0
          }
        };
        
        // Add to matches collection
        const matchRef = await addDoc(collection(db, 'matches'), matchData);

        // Delete from waitingroom
        await deleteDoc(doc(db, 'waitingroom', roomId));
        
        console.log('Moved room to matches:', matchRef.id);
        console.log('Turn assigned to player:', turnDecider);
        return matchRef.id;
      }
    } catch (error) {
      console.error('Error moving to matches:', error);
      throw error;
    }
  }

  /**
   * Create computer opponent data for testing
   */
  static getComputerOpponent() {
    return {
      playerDisplayName: "GKent",
      playerId: "computer_gkent",
      displayBackgroundEquipped: "Underwater",
      matchBackgroundEquipped: "Underwater",
      playerStats: {
        bestStreak: 3,
        currentStreak: 1,
        gamesPlayed: 100,
        matchWins: 69
      }
    };
  }

  /**
   * Helper method to convert background string to object structure
   */
  private static convertBackgroundToObject(backgroundId: string) {
    // Convert string background ID to object structure
    return {
      file: backgroundId,
      name: backgroundId,
      type: "background"
    };
  }

  /**
   * Main matchmaking function with transaction to prevent duplicate room creation
   */
  static async findOrCreateRoom(gameMode: string, hostData: any) {
    try {
      // Use transaction to atomically check and create room to prevent race conditions
      const result = await runTransaction(db, async (transaction) => {
        // Search for existing room within transaction
        const q = query(
          collection(db, 'waitingroom'),
          where('gameMode', '==', gameMode),
          where('gameType', '==', 'Open Server'),
          where('playersRequired', '==', 1)
        );

        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Found existing room - join it
          const existingDoc = querySnapshot.docs[0];
          const roomRef = doc(db, 'waitingroom', existingDoc.id);
          
          // Convert background strings to objects if needed
          const displayBg = typeof hostData.displayBackgroundEquipped === 'string' 
            ? this.convertBackgroundToObject(hostData.displayBackgroundEquipped)
            : hostData.displayBackgroundEquipped;
          
          const matchBg = typeof hostData.matchBackgroundEquipped === 'string'
            ? this.convertBackgroundToObject(hostData.matchBackgroundEquipped)
            : hostData.matchBackgroundEquipped;
          
          // Add opponent data and update playersRequired
          transaction.update(roomRef, {
            opponentData: {
              displayBackgroundEquipped: displayBg,
              matchBackgroundEquipped: matchBg,
              playerDisplayName: hostData.playerDisplayName,
              playerId: hostData.playerId,
              playerStats: {
                bestStreak: hostData.playerStats.bestStreak,
                currentStreak: hostData.playerStats.currentStreak,
                gamesPlayed: hostData.playerStats.gamesPlayed,
                matchWins: hostData.playerStats.matchWins
              }
            },
            playersRequired: 0 // Room is now full
          });
          
          return { roomId: existingDoc.id, isNewRoom: false, hasOpponent: true };
        } else {
          // No existing room - create new one
          // Convert background strings to objects if needed
          const displayBg = typeof hostData.displayBackgroundEquipped === 'string' 
            ? this.convertBackgroundToObject(hostData.displayBackgroundEquipped)
            : hostData.displayBackgroundEquipped;
          
          const matchBg = typeof hostData.matchBackgroundEquipped === 'string'
            ? this.convertBackgroundToObject(hostData.matchBackgroundEquipped)
            : hostData.matchBackgroundEquipped;
          
          const roomData = {
            createdAt: serverTimestamp(),
            gameMode: gameMode,
            gameType: "Open Server",
            hostData: {
              displayBackgroundEquipped: displayBg,
              matchBackgroundEquipped: matchBg,
              playerDisplayName: hostData.playerDisplayName,
              playerId: hostData.playerId,
              playerStats: {
                bestStreak: hostData.playerStats.bestStreak,
                currentStreak: hostData.playerStats.currentStreak,
                gamesPlayed: hostData.playerStats.gamesPlayed,
                matchWins: hostData.playerStats.matchWins
              }
            },
            playersRequired: 1
          };

          const newRoomRef = doc(collection(db, 'waitingroom'));
          transaction.set(newRoomRef, roomData);
          
          return { roomId: newRoomRef.id, isNewRoom: true, hasOpponent: false };
        }
      });

      // If room is full, start countdown to move to matches
      if (result.hasOpponent) {
        console.log('Match found! Starting countdown...');
        setTimeout(async () => {
          await this.moveToMatches(result.roomId);
        }, 5000);
      } else {
        console.log('Created new room, waiting for opponent...');
      }

      return result;
    } catch (error) {
      console.error('Error in findOrCreateRoom:', error);
      throw error;
    }
  }
}
