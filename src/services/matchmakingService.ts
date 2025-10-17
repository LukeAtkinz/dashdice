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
import { GameModeService } from './gameModeService';
import { NewMatchmakingService } from './newMatchmakingService';
import { PlayerHeartbeatService } from './playerHeartbeatService';
import { SessionCompatibilityService } from './sessionCompatibilityService';
import { AbandonedMatchService } from './abandonedMatchService';

// Initialize the new unified system
let systemInitialized = false;

const initializeUnifiedSystem = () => {
  if (!systemInitialized) {
    console.log('🎯 Initializing Unified Matchmaking System...');
    PlayerHeartbeatService.initializeCleanupService();
    AbandonedMatchService.initializeCleanupService();
    systemInitialized = true;
    console.log('✅ Unified Matchmaking System initialized');
  }
};

export class MatchmakingService {

  /**
   * Initialize the unified matchmaking system
   */
  static initialize() {
    initializeUnifiedSystem();
  }
  
  /**
   * Search for existing open rooms with aggressive cleanup
   */
  static async findOpenRoom(gameMode: string) {
    try {
      console.log('🔍 MatchmakingService: Searching for open rooms in', gameMode);
      
      const q = query(
        collection(db, 'waitingroom'),
        where('gameMode', '==', gameMode),
        where('gameType', '==', 'Open Server'),
        where('playersRequired', '==', 1)
      );

      const querySnapshot = await getDocs(q);
      const now = new Date();
      const staleThreshold = 2 * 60 * 1000; // 2 minutes for more aggressive cleanup
      
      // First pass: clean up stale rooms
      const validRooms = [];
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        const createdAt = data.createdAt?.toDate() || new Date(0);
        const isStale = (now.getTime() - createdAt.getTime()) > staleThreshold;

        if (isStale) {
          console.log(`🧹 MatchmakingService: Cleaning up stale room ${docSnapshot.id} (age: ${Math.round((now.getTime() - createdAt.getTime()) / 1000)}s)`);
          try {
            await deleteDoc(docSnapshot.ref);
          } catch (error) {
            console.error('Error deleting stale room:', error);
          }
        } else {
          validRooms.push({ id: docSnapshot.id, data: data, createdAt: createdAt });
        }
      }
      
      if (validRooms.length > 0) {
        // Return the oldest valid room to ensure fair matching
        validRooms.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const selectedRoom = validRooms[0];
        console.log(`✅ MatchmakingService: Found valid room ${selectedRoom.id} (age: ${Math.round((now.getTime() - selectedRoom.createdAt.getTime()) / 1000)}s)`);
        return { id: selectedRoom.id, data: selectedRoom.data };
      }
      
      console.log('📭 MatchmakingService: No valid rooms found, will create new room');
      return null;
    } catch (error) {
      console.error('Error finding open room:', error);
      throw error;
    }
  }

  /**
   * Enhanced findOrCreateRoom with unified system integration
   */
  static async findOrCreateRoom(gameMode: string, hostData: any, gameType: 'quick' | 'ranked' = 'quick') {
    try {
      // Initialize the unified system
      initializeUnifiedSystem();

      console.log('🎯 Using unified matchmaking system for:', gameMode, 'type:', gameType);
      
      // Use the new unified matchmaking service
      const sessionType = gameType === 'ranked' ? 'ranked' : 'quick';
      const result = await NewMatchmakingService.findOrCreateMatch(
        hostData.playerId,
        gameMode,
        sessionType,
        { skillBasedMatching: gameType === 'ranked' }
      );

      if (result.success && result.sessionId) {
        // Start heartbeat for the player
        await PlayerHeartbeatService.startHeartbeat(hostData.playerId, result.sessionId);
        
        // Create a waiting room proxy for compatibility with GameWaitingRoom component
        const proxyRoomId = await SessionCompatibilityService.createWaitingRoomProxy(result.sessionId);
        
        return {
          id: proxyRoomId, // Return the proxy room ID for GameWaitingRoom compatibility
          sessionId: result.sessionId, // Keep the actual session ID for reference
          isNewRoom: result.isNewRoom,
          hasOpponent: result.hasOpponent
        };
      } else {
        throw new Error(result.error || 'Failed to create room');
      }

    } catch (error) {
      console.error('❌ Error in findOrCreateRoom:', error);
      // Fallback to original implementation if needed
      return this.findOrCreateRoomLegacy(gameMode, hostData, gameType);
    }
  }

  /**
   * Legacy implementation with aggressive matching and cleanup
   */
  private static async findOrCreateRoomLegacy(gameMode: string, hostData: any, gameType: 'quick' | 'ranked' = 'quick') {
    try {
      console.log('🎯 MatchmakingService (Legacy): Starting aggressive matchmaking for', gameMode);
      
      // Validate hostData to prevent undefined values
      if (!hostData || !hostData.playerId) {
        throw new Error('Invalid hostData: playerId is required');
      }

      // Ensure all required fields have fallback values
      const validatedHostData = {
        playerId: hostData.playerId,
        displayName: hostData.displayName || hostData.playerDisplayName || 'Unknown Player',
        ...hostData
      };

      // AGGRESSIVE: Try to find an existing room first (with cleanup built in)
      const existingRoom = await this.findOpenRoom(gameMode);
      
      if (existingRoom) {
        console.log('✅ MatchmakingService: Found existing room, attempting to join', existingRoom.id);
        
        // Immediately try to join the existing room
        try {
          await this.addOpponentToRoom(existingRoom.id, {
            playerDisplayName: validatedHostData.displayName,
            playerId: validatedHostData.playerId,
            displayBackgroundEquipped: hostData.displayBackgroundEquipped || 'Relax',
            matchBackgroundEquipped: hostData.matchBackgroundEquipped || 'Relax',
            playerStats: hostData.playerStats || {
              bestStreak: 0,
              currentStreak: 0,
              gamesPlayed: 0,
              matchWins: 0
            }
          });
          
          console.log('🎉 MatchmakingService: Successfully joined existing room!');
          return {
            id: existingRoom.id,
            isNewRoom: false,
            hasOpponent: true
          };
        } catch (joinError) {
          console.error('❌ Failed to join existing room:', joinError);
          // Continue to create new room if joining fails
        }
      }

      console.log('🆕 MatchmakingService: Creating new room (no suitable rooms found)');
      
      // Create new room if none found or joining failed
      const roomData = {
        gameMode: gameMode,
        gameType: 'Open Server',
        rankedGame: gameType === 'ranked', // Add ranked game flag
        competitiveType: gameType, // Track if this is 'quick' or 'ranked'
        hostData: {
          playerDisplayName: validatedHostData.displayName,
          playerId: validatedHostData.playerId,
          displayBackgroundEquipped: hostData.displayBackgroundEquipped || 'Relax',
          matchBackgroundEquipped: hostData.matchBackgroundEquipped || 'Relax',
          playerStats: hostData.playerStats || {
            bestStreak: 0,
            currentStreak: 0,
            gamesPlayed: 0,
            matchWins: 0
          }
        },
        playersRequired: 1, // Looking for 1 more player
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + (3 * 60 * 1000)), // Expire in 3 minutes
        status: 'waiting'
      };

      // Validate that no fields are undefined
      Object.entries(roomData).forEach(([key, value]) => {
        if (value === undefined) {
          console.error(`❌ Field ${key} is undefined in roomData`);
          throw new Error(`Invalid room data: ${key} cannot be undefined`);
        }
      });

      const roomRef = await addDoc(collection(db, 'waitingroom'), roomData);
      console.log('✅ MatchmakingService: Created new room', roomRef.id);
      
      return {
        id: roomRef.id,
        isNewRoom: true,
        hasOpponent: false
      };

    } catch (error) {
      console.error('❌ Error in legacy findOrCreateRoom:', error);
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
      // Remove performance-impacting logs
      // console.log('🔄 MatchmakingService: Creating rematch waiting room');
      
      // Fetch user background data for both players
      const hostUserRef = doc(db, 'users', hostUserId);
      const opponentUserRef = doc(db, 'users', opponentUserId);
      
      const [hostUserDoc, opponentUserDoc] = await Promise.all([
        getDoc(hostUserRef),
        getDoc(opponentUserRef)
      ]);
      
      // Get host background data
      let hostDisplayBg = { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' };
      let hostMatchBg = { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' };
      if (hostUserDoc.exists()) {
        const hostData = hostUserDoc.data();
        hostDisplayBg = hostData.inventory?.displayBackgroundEquipped || hostDisplayBg;
        hostMatchBg = hostData.inventory?.matchBackgroundEquipped || hostMatchBg;
      }
      
      // Get opponent background data
      let opponentDisplayBg = { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' };
      let opponentMatchBg = { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' };
      if (opponentUserDoc.exists()) {
        const opponentData = opponentUserDoc.data();
        opponentDisplayBg = opponentData.inventory?.displayBackgroundEquipped || opponentDisplayBg;
        opponentMatchBg = opponentData.inventory?.matchBackgroundEquipped || opponentMatchBg;
      }
      
      // Create waiting room data - keep as waiting room initially
      const waitingRoomData = {
        gameMode,
        gameType: 'Private Rematch',
        playersRequired: 0, // Both players already confirmed
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + (20 * 60 * 1000)), // 20 minute expiry
        hostData: {
          playerDisplayName: hostDisplayName,
          playerId: hostUserId,
          displayBackgroundEquipped: hostDisplayBg,
          matchBackgroundEquipped: hostMatchBg,
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
          displayBackgroundEquipped: opponentDisplayBg,
          matchBackgroundEquipped: opponentMatchBg,
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
      
      // Create waiting room
      const waitingRoomRef = await addDoc(collection(db, 'waitingroom'), waitingRoomData);
      console.log('✅ MatchmakingService: Rematch waiting room created:', waitingRoomRef.id);
      
      // ✅ FIXED: Remove automatic timeout for rematch rooms
      // The GameWaitingRoom component will handle the transition to matches
      // This prevents race conditions between automatic timeout and manual triggers
      
      return waitingRoomRef.id; // Return the waiting room ID
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
      case 'zero-hour':
      case 'zerohour': return 0;  // Zero Hour starts at 100, targets 0
      case 'last-line':
      case 'lastline': return 0; // Last Line targets 0 (opponent elimination)
      case 'true-grit':
      case 'truegrit': return 100; // Highest single turn
      default: return 100;
    }
  }

  /**
   * Get starting score based on game mode
   */
  static getStartingScore(gameMode: string): number {
    switch (gameMode.toLowerCase()) {
      case 'quickfire': return 0;
      case 'classic': return 0;
      case 'zero-hour':
      case 'zerohour': return 100;  // Zero Hour starts at 100
      case 'last-line':
      case 'lastline': return 50;  // Last Line starts at 50 (tug-of-war)
      case 'true-grit':
      case 'truegrit': return 0;   // True Grit starts at 0
      default: return 0;
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
        console.log('🎮 MatchmakingService: Room gameMode:', roomData.gameMode);
        
        // Get game mode configuration to determine starting score
        const gameMode = await GameModeService.getGameMode(roomData.gameMode || 'classic');
        console.log('📋 MatchmakingService: Retrieved gameMode config:', gameMode);
        const startingScore = gameMode?.rules.startingScore || 0;
        
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
            startingScore: startingScore,
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
            playerScore: startingScore,
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
            playerScore: startingScore,
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
      { name: "Long Road Ahead", file: "/backgrounds/Long Road Ahead.jpg", type: "image" },
      { name: "As They Fall", file: "/backgrounds/as they fall.mp4", type: "video" },
      { name: "End Of The Dragon", file: "/backgrounds/end of the dragon.mp4", type: "video" }
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

}
