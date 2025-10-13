import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { WaitingRoom, WaitingRoomPlayer } from '../types';
import { UserService } from './userService';

export class WaitingRoomService {
  private static readonly COLLECTION_NAME = 'waitingroom';

  /**
   * Search for existing waiting rooms for a specific game mode
   * Now includes aggressive cleanup of stale rooms
   */
  static async findAvailableRooms(gameMode: string): Promise<WaitingRoom[]> {
    try {
      console.log('🔍 WaitingRoomService: Searching for available rooms for', gameMode);
      
      const roomsRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        roomsRef,
        where('gameMode', '==', gameMode),
        where('status', '==', 'waiting'),
        where('currentPlayers', '<', 2) // Assuming max 2 players for now
      );

      const querySnapshot = await getDocs(q);
      const rooms: WaitingRoom[] = [];
      const now = new Date();
      const staleThreshold = 2 * 60 * 1000; // 2 minutes (reduced from 3 to be more aggressive)

      // Process rooms and clean up stale ones
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        const createdAt = data.createdAt?.toDate() || new Date(0);
        const isStale = (now.getTime() - createdAt.getTime()) > staleThreshold;

        if (isStale) {
          console.log(`🧹 WaitingRoomService: Cleaning up stale room ${docSnapshot.id} (age: ${Math.round((now.getTime() - createdAt.getTime()) / 1000)}s)`);
          try {
            await deleteDoc(docSnapshot.ref);
          } catch (error) {
            console.error('Error deleting stale room:', error);
          }
        } else {
          // Room is fresh, add it to available rooms
          rooms.push({
            id: docSnapshot.id,
            gameMode: data.gameMode,
            status: data.status,
            createdAt: createdAt,
            updatedAt: data.updatedAt?.toDate() || new Date(),
            maxPlayers: data.maxPlayers || 2,
            currentPlayers: data.currentPlayers || 0,
            gameData: data.gameData || { type: gameMode, settings: {} },
            hostData: data.hostData,
            players: data.players || []
          });
        }
      }

      return rooms;
    } catch (error) {
      console.error('Error finding available rooms:', error);
      throw error;
    }
  }

  /**
   * Create a new waiting room
   */
  static async createRoom(
    gameMode: string, 
    hostData: {
      uid: string;
      displayName: string;
      avatar?: string;
      backgroundEquipped?: string;
    }
  ): Promise<string> {
    try {
      // Load the user's power loadouts for the specific game mode
      // Map gameMode to the correct key format for UserPowerLoadouts
      let gameModeKey: keyof import('./userService').UserPowerLoadouts;
      if (gameMode === 'quickfire') {
        gameModeKey = 'quick-fire';
      } else {
        gameModeKey = gameMode as keyof import('./userService').UserPowerLoadouts;
      }
      
      const gameModePowerLoadout = await UserService.getPowerLoadoutForGameMode(
        hostData.uid, 
        gameModeKey
      );
      
      console.log(`🔮 WaitingRoomService: Loaded power loadout for ${gameMode}:`, gameModePowerLoadout);

      const roomData = {
        gameMode,
        status: 'waiting',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        maxPlayers: 2, // Default to 2 players for now
        currentPlayers: 1,
        gameData: {
          type: gameMode,
          settings: this.getGameModeSettings(gameMode)
        },
        hostData: {
          ...hostData,
          powerLoadout: gameModePowerLoadout // Add power loadout to host data
        },
        players: [{
          uid: hostData.uid,
          displayName: hostData.displayName,
          avatar: hostData.avatar,
          backgroundEquipped: hostData.backgroundEquipped,
          joinedAt: serverTimestamp(),
          ready: false
        }]
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), roomData);
      console.log('Created waiting room with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  /**
   * Join an existing waiting room
   */
  static async joinRoom(
    roomId: string,
    playerData: {
      uid: string;
      displayName: string;
      avatar?: string;
      backgroundEquipped?: string;
    }
  ): Promise<void> {
    try {
      const roomRef = doc(db, this.COLLECTION_NAME, roomId);
      
      // First get current room data to update players array
      const roomDoc = await getDocs(query(collection(db, this.COLLECTION_NAME), where('__name__', '==', roomId)));
      
      if (roomDoc.empty) {
        throw new Error('Room not found');
      }

      const roomData = roomDoc.docs[0].data();
      const currentPlayers = roomData.players || [];
      
      // Check if player is already in the room
      const playerExists = currentPlayers.some((p: WaitingRoomPlayer) => p.uid === playerData.uid);
      if (playerExists) {
        console.log('Player already in room');
        return;
      }

      // Check if room is full
      if (currentPlayers.length >= (roomData.maxPlayers || 2)) {
        throw new Error('Room is full');
      }

      // Load the user's power loadouts for the game mode
      // Map gameMode to the correct key format for UserPowerLoadouts
      let gameModeKey: keyof import('./userService').UserPowerLoadouts;
      if (roomData.gameMode === 'quickfire') {
        gameModeKey = 'quick-fire';
      } else {
        gameModeKey = roomData.gameMode as keyof import('./userService').UserPowerLoadouts;
      }
      
      const gameModePowerLoadout = await UserService.getPowerLoadoutForGameMode(
        playerData.uid, 
        gameModeKey
      );
      
      console.log(`🔮 WaitingRoomService: Loaded opponent power loadout for ${roomData.gameMode}:`, gameModePowerLoadout);

      const newPlayer: WaitingRoomPlayer = {
        uid: playerData.uid,
        displayName: playerData.displayName,
        avatar: playerData.avatar,
        backgroundEquipped: playerData.backgroundEquipped,
        joinedAt: new Date(),
        ready: false
      };

      // Add opponent data with power loadout to the room
      const opponentData = {
        ...playerData,
        powerLoadout: gameModePowerLoadout
      };

      await updateDoc(roomRef, {
        players: [...currentPlayers, newPlayer],
        currentPlayers: currentPlayers.length + 1,
        opponentData, // Add opponent data with power loadout
        updatedAt: serverTimestamp()
      });

      console.log('Successfully joined room:', roomId);
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  /**
   * Leave a waiting room
   */
  static async leaveRoom(roomId: string, playerUid: string): Promise<void> {
    try {
      const roomRef = doc(db, this.COLLECTION_NAME, roomId);
      
      // Get current room data
      const roomDoc = await getDocs(query(collection(db, this.COLLECTION_NAME), where('__name__', '==', roomId)));
      
      if (roomDoc.empty) {
        // Room not found - likely already moved to matches collection or deleted
        // This is normal during game transitions, so we log and return gracefully
        console.log('Room not found during leave operation (likely moved to matches):', roomId);
        return;
      }

      const roomData = roomDoc.docs[0].data();
      const currentPlayers = roomData.players || [];
      
      // Remove player from the room
      const updatedPlayers = currentPlayers.filter((p: WaitingRoomPlayer) => p.uid !== playerUid);
      
      // If no players left, delete the room
      if (updatedPlayers.length === 0) {
        await deleteDoc(roomRef);
        console.log('Deleted empty room:', roomId);
        return;
      }

      // Update the room with remaining players
      await updateDoc(roomRef, {
        players: updatedPlayers,
        currentPlayers: updatedPlayers.length,
        updatedAt: serverTimestamp()
      });

      console.log('Successfully left room:', roomId);
    } catch (error) {
      console.error('Error leaving room:', error);
      // Don't throw the error if it's just a room not found issue
      if (error instanceof Error && error.message.includes('Room not found')) {
        console.log('Gracefully handling room not found during cleanup');
        return;
      }
      throw error;
    }
  }

  /**
   * Subscribe to room updates
   */
  static subscribeToRoom(roomId: string, callback: (room: WaitingRoom | null) => void): () => void {
    const roomRef = doc(db, this.COLLECTION_NAME, roomId);
    
    return onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const room: WaitingRoom = {
          id: doc.id,
          gameMode: data.gameMode,
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          maxPlayers: data.maxPlayers || 2,
          currentPlayers: data.currentPlayers || 0,
          gameData: data.gameData || { type: data.gameMode, settings: {} },
          hostData: data.hostData,
          players: data.players || []
        };
        callback(room);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error listening to room updates:', error);
      callback(null);
    });
  }

  /**
   * Update player ready status
   */
  static async updatePlayerReady(roomId: string, playerUid: string, ready: boolean): Promise<void> {
    try {
      const roomRef = doc(db, this.COLLECTION_NAME, roomId);
      
      // Get current room data
      const roomDoc = await getDocs(query(collection(db, this.COLLECTION_NAME), where('__name__', '==', roomId)));
      
      if (roomDoc.empty) {
        throw new Error('Room not found');
      }

      const roomData = roomDoc.docs[0].data();
      const currentPlayers = roomData.players || [];
      
      // Update the specific player's ready status
      const updatedPlayers = currentPlayers.map((p: WaitingRoomPlayer) => {
        if (p.uid === playerUid) {
          return { ...p, ready };
        }
        return p;
      });

      await updateDoc(roomRef, {
        players: updatedPlayers,
        updatedAt: serverTimestamp()
      });

      console.log('Updated player ready status:', playerUid, ready);
    } catch (error) {
      console.error('Error updating player ready status:', error);
      throw error;
    }
  }

  /**
   * Get default settings for different game modes
   */
  private static getGameModeSettings(gameMode: string): Record<string, any> {
    const settings: Record<string, Record<string, any>> = {
      quickfire: {
        timeLimit: 30,
        maxRounds: 5,
        fastPaced: true
      },
      classic: {
        timeLimit: 60,
        maxRounds: 10,
        fastPaced: false
      },
      zerohour: {
        timeLimit: 45,
        maxRounds: 7,
        reverseTime: true
      },
      lastline: {
        timeLimit: 90,
        maxRounds: 1,
        oneLife: true
      },
      truegrit: {
        timeLimit: 120,
        maxRounds: 15,
        noBanking: true
      },
      tagteam: {
        timeLimit: 60,
        maxRounds: 10,
        teamPlay: true,
        maxPlayers: 4
      }
    };

    return settings[gameMode] || settings.classic;
  }

  /**
   * 🧹 Clean up existing rooms for a user to prevent duplicates
   */
  private static async cleanupExistingUserRooms(userId: string): Promise<void> {
    try {
      console.log(`🧹 WaitingRoomService: Cleaning up existing rooms for ${userId}`);

      // Remove user from all waiting rooms they might be in
      const roomsRef = collection(db, this.COLLECTION_NAME);
      const hostQuery = query(roomsRef, where('hostData.uid', '==', userId));
      const participantQuery = query(roomsRef, where('players', 'array-contains-any', [{ uid: userId }]));

      const [hostSnapshot, participantSnapshot] = await Promise.all([
        getDocs(hostQuery),
        getDocs(participantQuery)
      ]);

      const docsToDelete = new Set<string>();

      // Collect host rooms
      hostSnapshot.docs.forEach(doc => docsToDelete.add(doc.id));

      // Collect participant rooms  
      participantSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const players = data.players || [];
        const hasUser = players.some((p: any) => p.uid === userId);
        if (hasUser) {
          docsToDelete.add(doc.id);
        }
      });

      // Delete all found rooms
      const deletePromises = Array.from(docsToDelete).map(async (docId) => {
        try {
          await deleteDoc(doc(db, this.COLLECTION_NAME, docId));
          console.log(`🗑️ Deleted waiting room: ${docId}`);
        } catch (error) {
          console.error(`⚠️ Failed to delete room ${docId}:`, error);
        }
      });

      await Promise.allSettled(deletePromises);
      
      if (docsToDelete.size > 0) {
        console.log(`✅ Cleaned up ${docsToDelete.size} existing rooms for ${userId}`);
      }

    } catch (error) {
      console.error(`❌ Error cleaning up existing user rooms:`, error);
      // Don't throw - this is cleanup, not critical for room creation
    }
  }

  /**
   * Find or create a room for matchmaking
   */
  static async findOrCreateRoom(
    gameMode: string,
    hostData: {
      uid: string;
      displayName: string;
      avatar?: string;
      backgroundEquipped?: string;
    }
  ): Promise<{ roomId: string; isNewRoom: boolean }> {
    try {
      // 🧹 CRITICAL: Clean up any existing rooms/matches for this user first
      await this.cleanupExistingUserRooms(hostData.uid);

      // First, try to find an available room
      const availableRooms = await this.findAvailableRooms(gameMode);
      
      if (availableRooms.length > 0) {
        // Join the first available room
        const room = availableRooms[0];
        if (!room.id) {
          throw new Error('Room ID is missing');
        }
        await this.joinRoom(room.id, hostData);
        return { roomId: room.id, isNewRoom: false };
      } else {
        // Create a new room
        const roomId = await this.createRoom(gameMode, hostData);
        return { roomId, isNewRoom: true };
      }
    } catch (error) {
      console.error('Error in findOrCreateRoom:', error);
      throw error;
    }
  }
}
