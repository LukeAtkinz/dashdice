import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp 
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
        where('gameData.gameMode', '==', gameMode),
        where('gameData.gameType', '==', 'Open Server'),
        where('gameData.playersRequired', '==', 1)
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
   * Create new waiting room with exact structure you specified
   */
  static async createWaitingRoom(gameMode: string, hostData: any) {
    try {
      const roomData = {
        gameData: {
          createdAt: serverTimestamp(),
          gameMode: gameMode,
          gameType: "Open Server",
          playersRequired: 1
        },
        hostData: {
          playerDisplayName: hostData.playerDisplayName,
          playerId: hostData.playerId,
          playerDisplayBackgroundEquipped: hostData.displayBackgroundEquipped,
          playerMatchBackgroundEquipped: hostData.matchBackgroundEquipped,
          playerStats: {
            bestStreak: hostData.playerStats.bestStreak,
            currentStreak: hostData.playerStats.currentStreak,
            gamesPlayed: hostData.playerStats.gamesPlayed,
            matchWins: hostData.playerStats.matchWins
          }
        }
      };

      const docRef = await addDoc(collection(db, 'waitingroom'), roomData);
      console.log('Created waiting room:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating waiting room:', error);
      throw error;
    }
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
   * Main matchmaking function
   */
  static async findOrCreateRoom(gameMode: string, hostData: any) {
    try {
      // First, search for existing room
      const existingRoom = await this.findOpenRoom(gameMode);
      
      if (existingRoom) {
        console.log('Found existing room:', existingRoom.id);
        
        // Add current user as opponent
        await this.addOpponentToRoom(existingRoom.id, hostData);
        
        // Start 5-second countdown before moving to matches
        setTimeout(async () => {
          await this.moveToMatches(existingRoom.id);
        }, 5000);
        
        return { roomId: existingRoom.id, isNewRoom: false, hasOpponent: true };
      } else {
        // Create new room
        const roomId = await this.createWaitingRoom(gameMode, hostData);
        
        // For testing: Add computer opponent after 3 seconds if no real opponent joins
        setTimeout(async () => {
          try {
            // Check if room still exists and has no opponent
            const roomCheck = await this.findOpenRoom(gameMode);
            if (roomCheck && roomCheck.id === roomId) {
              console.log('No real opponent found, adding computer opponent for testing');
              const computerOpponent = this.getComputerOpponent();
              await this.addOpponentToRoom(roomId, computerOpponent);
              
              // Start 5-second countdown before moving to matches
              setTimeout(async () => {
                await this.moveToMatches(roomId);
              }, 5000);
            }
          } catch (error) {
            console.error('Error adding computer opponent:', error);
          }
        }, 3000);
        
        return { roomId, isNewRoom: true, hasOpponent: false };
      }
    } catch (error) {
      console.error('Error in findOrCreateRoom:', error);
      throw error;
    }
  }
}
