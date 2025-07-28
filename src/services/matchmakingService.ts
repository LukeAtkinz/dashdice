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
   * Create new waiting room
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
          displayBackgroundEquipped: hostData.displayBackgroundEquipped,
          matchBackgroundEquipped: hostData.matchBackgroundEquipped,
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
          displayBackgroundEquipped: opponentData.displayBackgroundEquipped,
          matchBackgroundEquipped: opponentData.matchBackgroundEquipped,
          playerStats: {
            bestStreak: opponentData.playerStats.bestStreak,
            currentStreak: opponentData.playerStats.currentStreak,
            gamesPlayed: opponentData.playerStats.gamesPlayed,
            matchWins: opponentData.playerStats.matchWins
          }
        },
        'gameData.playersRequired': 0
      });

      console.log('Added opponent to room:', roomId);
      return roomId;
    } catch (error) {
      console.error('Error adding opponent to room:', error);
      throw error;
    }
  }

  /**
   * Move room from waitingroom to matches
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
        
        // Add to matches collection
        const matchRef = await addDoc(collection(db, 'matches'), {
          ...roomData,
          status: 'active',
          startedAt: serverTimestamp()
        });

        // Delete from waitingroom
        await deleteDoc(doc(db, 'waitingroom', roomId));
        
        console.log('Moved room to matches:', matchRef.id);
        return matchRef.id;
      }
    } catch (error) {
      console.error('Error moving to matches:', error);
      throw error;
    }
  }

  /**
   * Create computer opponent data
   */
  static getComputerOpponent() {
    return {
      playerDisplayName: "GKent",
      playerId: "computer_gkent",
      displayBackgroundEquipped: "underwater",
      matchBackgroundEquipped: "underwater",
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
        
        // Add computer opponent for testing
        const computerOpponent = this.getComputerOpponent();
        await this.addOpponentToRoom(existingRoom.id, computerOpponent);
        
        // Move to matches collection after 5 seconds
        setTimeout(async () => {
          await this.moveToMatches(existingRoom.id);
        }, 5000);
        
        return { roomId: existingRoom.id, isNewRoom: false, hasOpponent: true };
      } else {
        // Create new room
        const roomId = await this.createWaitingRoom(gameMode, hostData);
        return { roomId, isNewRoom: true, hasOpponent: false };
      }
    } catch (error) {
      console.error('Error in findOrCreateRoom:', error);
      throw error;
    }
  }
}
