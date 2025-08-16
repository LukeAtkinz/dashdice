import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
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
   * Create a private waiting room for rematch between specific players
   */
  static async createRematchWaitingRoom(
    hostUserId: string,
    hostDisplayName: string,
    opponentUserId: string,
    opponentDisplayName: string,
    gameMode: string,
    gameType: string
  ): Promise<string> {
    try {
      console.log('🔄 MatchmakingService: Creating rematch waiting room');
      
      // Create waiting room data - immediately move to match
      const waitingRoomData = {
        gameMode,
        gameType: 'Private Rematch',
        playersRequired: 0, // Both players already confirmed
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + (20 * 60 * 1000)), // 20 minute expiry
        hostData: {
          playerDisplayName: hostDisplayName,
          playerId: hostUserId,
          // Add default background data
          displayBackgroundEquipped: 'Relax',
          matchBackgroundEquipped: 'Relax',
          playerStats: {
            bestStreak: 0,
            currentStreak: 0,
            gamesPlayed: 0,
            matchWins: 0
          }
        },
        opponentData: {
          playerDisplayName: opponentDisplayName,
          playerId: opponentUserId,
          // Add default background data
          displayBackgroundEquipped: 'Relax',
          matchBackgroundEquipped: 'Relax',
          playerStats: {
            bestStreak: 0,
            currentStreak: 0,
            gamesPlayed: 0,
            matchWins: 0
          }
        },
        gameData: {
          type: 'dice',
          settings: {}
        }
      };
      
      // Create waiting room temporarily
      const waitingRoomRef = await addDoc(collection(db, 'waitingroom'), waitingRoomData);
      console.log('✅ MatchmakingService: Rematch waiting room created:', waitingRoomRef.id);
      
      // Add a small delay to ensure proper database state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Move to matches (skip waiting room phase)
      const newMatchId = await this.moveToMatches(waitingRoomRef.id);
      
      console.log('✅ MatchmakingService: Rematch moved to matches:', newMatchId);
      return newMatchId; // Return the actual match ID
    } catch (error) {
      console.error('❌ MatchmakingService: Error creating rematch waiting room:', error);
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
   * Get round objective based on game mode
   */
  static getRoundObjective(gameMode: string): number {
    switch (gameMode.toLowerCase()) {
      case 'quickfire': return 50;
      case 'classic': return 100;
      case 'zerohour': return 150;
      case 'lastline': return 200;
      default: return 100;
    }
  }

  /**
   * Move room from waitingroom to matches and add game state variables
   */
  static async moveToMatches(roomId: string) {
    try {
      console.log('🔄 MatchmakingService: Moving room to matches:', roomId);
      
      // Get room data from waitingroom using direct document reference
      const roomRef = doc(db, 'waitingroom', roomId);
      const roomSnap = await getDoc(roomRef);

      if (roomSnap.exists()) {
        const roomData = roomSnap.data();
        console.log('✅ MatchmakingService: Found room data:', roomData);
        
        // Create enhanced data for matches collection
        const matchData = {
          ...roomData,
          originalRoomId: roomId, // Track the original waiting room ID
          createdAt: serverTimestamp(),
          // Add game state variables to gameData
          gameData: {
            ...roomData.gameData,
            turnDecider: null, // Will be assigned after odd/even choice
            turnScore: 0,
            diceOne: 0,
            diceTwo: 0,
            roundObjective: this.getRoundObjective(roomData.gameMode || 'classic'),
            startingScore: 0,
            status: 'pregame',
            isPregame: true,
            gamePhase: 'turnDecider',
            isRolling: false,
            chooserPlayerIndex: Math.floor(Math.random() * 2) + 1, // 1 = host, 2 = opponent
            turnDeciderChoice: null,
            turnDeciderDice: null,
            startedAt: serverTimestamp()
          },
          // Add game state to hostData
          hostData: {
            ...roomData.hostData,
            turnActive: false, // No one active during pregame
            playerScore: 0,
            roundScore: 0,
            // Initialize match statistics
            matchStats: {
              banks: 0,
              doubles: 0,
              biggestTurnScore: 0,
              lastDiceSum: 0
            }
          },
          // Add game state to opponentData
          opponentData: {
            ...roomData.opponentData,
            turnActive: false, // No one active during pregame
            playerScore: 0,
            roundScore: 0,
            // Initialize match statistics
            matchStats: {
              banks: 0,
              doubles: 0,
              biggestTurnScore: 0,
              lastDiceSum: 0
            }
          }
        };
        
        console.log('🎯 MatchmakingService: Creating match with data:', matchData);
        
        // Add to matches collection
        const matchRef = await addDoc(collection(db, 'matches'), matchData);
        console.log('✅ MatchmakingService: Match created successfully:', matchRef.id);

        // Delete from waitingroom
        await deleteDoc(roomRef);
        console.log('🗑️ MatchmakingService: Deleted room from waiting room');
        
        console.log('Moved room to matches:', matchRef.id);
        return matchRef.id;
      } else {
        console.log('❌ MatchmakingService: Room document does not exist in waitingroom');
        throw new Error('Room not found in waitingroom');
      }
    } catch (error) {
      console.error('❌ MatchmakingService: Error moving to matches:', error);
      throw error;
    }
  }

  /**
   * Validate that a player is allowed to access a specific match
   * Ensures only the 2 original players can access the match
   */
  static async validatePlayerAccess(matchId: string, playerId: string): Promise<boolean> {
    try {
      console.log('🔐 Validating player access:', { matchId, playerId });

      // Check in active matches first
      const matchRef = doc(db, 'matches', matchId);
      const matchSnapshot = await getDoc(matchRef);

      if (matchSnapshot.exists()) {
        const matchData = matchSnapshot.data();
        const hostId = matchData.hostData?.playerId;
        const opponentId = matchData.opponentData?.playerId;
        const allowedIds = matchData.allowedPlayerIds || [hostId, opponentId];

        const isAllowed = allowedIds.includes(playerId);
        console.log(`🔐 Match access validation - Player: ${playerId}, Allowed: ${isAllowed}`);
        return isAllowed;
      }

      // If not in active matches, check waiting room
      const waitingRoomRef = doc(db, 'waitingroom', matchId);
      const waitingSnapshot = await getDoc(waitingRoomRef);

      if (waitingSnapshot.exists()) {
        const roomData = waitingSnapshot.data();
        const hostId = roomData.hostData?.playerId;
        const opponentId = roomData.opponentData?.playerId;
        const allowedIds = roomData.allowedPlayerIds || [hostId, opponentId].filter(Boolean);

        const isAllowed = allowedIds.includes(playerId);
        console.log(`🔐 Waiting room access validation - Player: ${playerId}, Allowed: ${isAllowed}`);
        return isAllowed;
      }

      console.log(`❌ Match/Room ${matchId} not found`);
      return false;

    } catch (error) {
      console.error('❌ Error validating player access:', error);
      return false;
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
   * Includes 20-minute timeout check and player ID validation
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
        
        // Filter out rooms where the current user is already the host AND check for expired rooms
        const now = new Date();
        const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000); // 20 minutes ago
        
        const availableRooms = querySnapshot.docs.filter(doc => {
          const roomData = doc.data();
          const isOwnRoom = roomData.hostData?.playerId === hostData.playerId;
          
          // Check if room is expired (older than 20 minutes)
          const createdAt = roomData.createdAt?.toDate();
          const isExpired = createdAt && createdAt < twentyMinutesAgo;
          
          if (isExpired) {
            console.log(`⏰ Room ${doc.id} expired (created: ${createdAt}), will be removed`);
            // Delete expired room within transaction
            transaction.delete(doc.ref);
            return false;
          }
          
          console.log(`🏠 Room ${doc.id}: host=${roomData.hostData?.playerId}, current=${hostData.playerId}, isOwn=${isOwnRoom}`);
          return !isOwnRoom;
        });
        
        console.log(`✅ Available rooms for joining (after timeout check): ${availableRooms.length}`);
        
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
          
          // Add opponent data and update playersRequired to 0 (LOCKED to 2 players only)
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
            playersRequired: 0, // Room is now full and LOCKED
            allowedPlayerIds: [existingDoc.data().hostData.playerId, hostData.playerId], // Security: Only these 2 players allowed
            lockedAt: serverTimestamp() // Track when room was locked
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
