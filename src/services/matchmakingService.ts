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
    // Available backgrounds reference
    const availableBackgrounds = [
      { name: "All For Glory", file: "/backgrounds/All For Glory.jpg", type: "image" },
      { name: "New Day", file: "/backgrounds/New Day.mp4", type: "video" },
      { name: "On A Mission", file: "/backgrounds/On A Mission.mp4", type: "video" },
      { name: "Relax", file: "/backgrounds/Relax.png", type: "image" },
      { name: "Underwater", file: "/backgrounds/Underwater.mp4", type: "video" },
      { name: "Long Road Ahead", file: "/backgrounds/Long Road Ahead.jpg", type: "image" }
    ];
    
    console.log('🔧 MatchmakingService: Converting background string to object:', backgroundId);
    
    // If 'default' or no background, use Relax as default
    if (!backgroundId || backgroundId === 'default') {
      const defaultBg = availableBackgrounds.find(bg => bg.name === "Relax");
      console.log('🔧 MatchmakingService: Using default background (Relax):', defaultBg);
      return defaultBg;
    }
    
    // Try to find by name first
    let background = availableBackgrounds.find(bg => bg.name === backgroundId);
    
    // If not found by name, try to find by file path
    if (!background) {
      background = availableBackgrounds.find(bg => bg.file === backgroundId);
    }
    
    // If still not found, return default
    if (!background) {
      console.log('⚠️ MatchmakingService: Background not found, using default:', backgroundId);
      background = availableBackgrounds.find(bg => bg.name === "Relax");
    }
    
    console.log('✅ MatchmakingService: Converted background:', background);
    return background;
  }

  /**
   * Main matchmaking function with transaction to prevent duplicate room creation
   */
  static async findOrCreateRoom(gameMode: string, hostData: any) {
    try {
      console.log('🔍 Starting findOrCreateRoom for user:', hostData.playerId);
      console.log('📊 Host data received:', JSON.stringify(hostData, null, 2));
      
      // Use transaction to atomically check and create room to prevent race conditions
      const result = await runTransaction(db, async (transaction) => {
        console.log('🔄 Starting transaction...');
        
        // Search for existing room within transaction, excluding rooms where current user is host
        const q = query(
          collection(db, 'waitingroom'),
          where('gameMode', '==', gameMode),
          where('gameType', '==', 'Open Server'),
          where('playersRequired', '==', 1)
        );

        const querySnapshot = await getDocs(q);
        console.log(`📋 Found ${querySnapshot.docs.length} existing rooms`);
        
        // Filter out rooms where the current user is already the host
        const availableRooms = querySnapshot.docs.filter(doc => {
          const roomData = doc.data();
          const isOwnRoom = roomData.hostData?.playerId === hostData.playerId;
          console.log(`🏠 Room ${doc.id}: host=${roomData.hostData?.playerId}, current=${hostData.playerId}, isOwn=${isOwnRoom}`);
          return !isOwnRoom;
        });
        
        console.log(`✅ Available rooms for joining: ${availableRooms.length}`);
        
        if (availableRooms.length > 0) {
          // Found existing room where current user is NOT the host - join it
          const existingDoc = availableRooms[0];
          const roomRef = doc(db, 'waitingroom', existingDoc.id);
          
          console.log(`🤝 Joining room ${existingDoc.id} as opponent`);
          
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
          
          console.log(`✅ Joined existing room ${existingDoc.id} as opponent`);
          return { roomId: existingDoc.id, isNewRoom: false, hasOpponent: true };
        } else {
          // No available room (either none exist or all are hosted by current user) - create new one
          console.log('🆕 Creating new room as host');
          
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
            // NOTE: NO opponentData field - will only be added when someone joins
          };

          console.log('📝 Room data to create:', JSON.stringify(roomData, null, 2));

          const newRoomRef = doc(collection(db, 'waitingroom'));
          transaction.set(newRoomRef, roomData);
          
          console.log(`✅ Created new room ${newRoomRef.id} as host - NO OPPONENT DATA`);
          return { roomId: newRoomRef.id, isNewRoom: true, hasOpponent: false };
        }
      });

      // If room is full, start countdown to move to matches
      if (result.hasOpponent) {
        console.log('🎯 Match found! Starting countdown...');
        setTimeout(async () => {
          await this.moveToMatches(result.roomId);
        }, 5000);
      } else {
        console.log('⏳ Created new room, waiting for opponent...');
      }

      console.log('🔚 Transaction result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error in findOrCreateRoom:', error);
      throw error;
    }
  }
}
