/**
 * Step 2: Background Room Creation Integration
 * 
 * This service provides immediate UI feedback when user clicks a game mode,
 * while creating real rooms in the background and seamlessly transitioning
 * the user from optimistic to real room data.
 */

import { NewMatchmakingService } from './newMatchmakingService';
import { UserService } from './userService';

export interface OptimisticRoomData {
  id: string;
  gameMode: string;
  gameType: 'quick' | 'ranked';
  isOptimistic: true;
  playerData: {
    playerDisplayName: string;
    playerId: string;
    displayBackgroundEquipped: any;
    matchBackgroundEquipped: any;
    playerStats: {
      bestStreak: number;
      currentStreak: number;
      gamesPlayed: number;
      matchWins: number;
    };
  };
  status: 'searching' | 'creating' | 'waiting' | 'transitioning';
  searchText: string;
  realRoomId?: string; // Added to track the real room when created
}

// Callback interface for room updates
export interface OptimisticRoomCallbacks {
  onRealRoomCreated?: (realRoomId: string) => void;
  onStatusUpdate?: (status: OptimisticRoomData['status'], searchText: string) => void;
  onError?: (error: string) => void;
}

export class OptimisticMatchmakingService {
  private static optimisticRooms: Map<string, OptimisticRoomData> = new Map();
  private static roomCallbacks: Map<string, OptimisticRoomCallbacks> = new Map();
  private static backgroundProcesses: Map<string, Promise<void>> = new Map();
  
  // Bridge entry system - Cache real room data for immediate access
  private static realRoomBridge: Map<string, any> = new Map();

  /**
   * Create optimistic room data with immediate UI feedback and background real room creation
   */
  static async createOptimisticRoom(
    gameMode: string, 
    gameType: 'quick' | 'ranked',
    userId: string,
    userProfile: any,
    callbacks?: OptimisticRoomCallbacks
  ): Promise<OptimisticRoomData> {
    
    // Generate unique optimistic room ID
    const optimisticId = `opt_${gameType}_${Date.now()}_${userId.slice(0, 8)}`;
    
    // Create optimistic room data with real user info
    const optimisticRoom: OptimisticRoomData = {
      id: optimisticId,
      gameMode,
      gameType,
      isOptimistic: true,
      playerData: {
        playerDisplayName: userProfile.displayName || userProfile.email?.split('@')[0] || 'Player',
        playerId: userId,
        displayBackgroundEquipped: userProfile.inventory?.displayBackgroundEquipped,
        matchBackgroundEquipped: userProfile.inventory?.matchBackgroundEquipped,
        playerStats: userProfile.stats || {
          bestStreak: 0,
          currentStreak: 0,
          gamesPlayed: 0,
          matchWins: 0
        }
      },
      status: 'searching',
      searchText: gameType === 'ranked' ? 'Searching for ranked opponent...' : 'Searching for opponents...'
    };

    // Store optimistic room data and callbacks
    this.optimisticRooms.set(optimisticId, optimisticRoom);
    if (callbacks) {
      this.roomCallbacks.set(optimisticId, callbacks);
    }
    
    console.log(`✨ Created optimistic room: ${optimisticId} for ${gameMode} (${gameType})`);
    
    // Step 2: Start background real room creation
    this.startBackgroundRoomCreation(optimisticId, gameMode, gameType, userId, userProfile);
    
    return optimisticRoom;
  }

  /**
   * Get optimistic room data by ID
   */
  static getOptimisticRoom(roomId: string): OptimisticRoomData | null {
    return this.optimisticRooms.get(roomId) || null;
  }

  /**
   * Check if a room ID is optimistic
   */
  static isOptimisticRoom(roomId: string): boolean {
    return roomId.startsWith('opt_');
  }

  /**
   * Update optimistic room status
   */
  static updateOptimisticRoom(roomId: string, updates: Partial<OptimisticRoomData>): void {
    const room = this.optimisticRooms.get(roomId);
    if (room) {
      const updatedRoom = { ...room, ...updates };
      this.optimisticRooms.set(roomId, updatedRoom);
      console.log(`🔄 Updated optimistic room ${roomId}:`, updates);
    }
  }

  /**
   * Remove optimistic room (when replaced by real room)
   */
  static removeOptimisticRoom(roomId: string): void {
    if (this.optimisticRooms.delete(roomId)) {
      console.log(`🗑️ Removed optimistic room: ${roomId}`);
    }
    
    // Cancel any pending background processes
    this.cancelBackgroundProcess(roomId);
  }

  /**
   * Cancel background room creation process
   */
  static cancelBackgroundProcess(optimisticId: string): void {
    // Cancel timeout if it exists
    const timeoutCallbacks = this.roomCallbacks.get(optimisticId + '_timeout');
    if (timeoutCallbacks?.onError) {
      timeoutCallbacks.onError('Cancelled by main matchmaking'); // This calls clearTimeout
      this.roomCallbacks.delete(optimisticId + '_timeout');
      console.log(`⏰ Cancelled background timeout for ${optimisticId}`);
    }
    
    // Remove background process reference
    this.backgroundProcesses.delete(optimisticId);
  }

  /**
   * Transition optimistic room to real session (called when main matchmaking succeeds)
   */
  static transitionToRealSession(optimisticId: string, realSessionId: string): void {
    const room = this.optimisticRooms.get(optimisticId);
    if (room) {
      console.log(`🎯 OPTIMISTIC: Transitioning ${optimisticId} to real session ${realSessionId}`);
      
      // Cancel any background processes to prevent duplicate rooms
      this.cancelBackgroundProcess(optimisticId);
      
      // Update the optimistic room to point to the real session
      this.updateOptimisticRoom(optimisticId, {
        status: 'waiting', // Use valid status
        realRoomId: realSessionId,
        searchText: 'Match found!'
      });
      
      // Notify callbacks of successful transition
      const callbacks = this.roomCallbacks.get(optimisticId);
      if (callbacks?.onRealRoomCreated) {
        callbacks.onRealRoomCreated(realSessionId);
      }
    }
  }

  /**
   * Get all optimistic rooms (for debugging)
   */
  static getAllOptimisticRooms(): OptimisticRoomData[] {
    return Array.from(this.optimisticRooms.values());
  }

  /**
   * Start background real room creation while user sees optimistic UI
   */
  private static async startBackgroundRoomCreation(
    optimisticId: string,
    gameMode: string,
    gameType: 'quick' | 'ranked',
    userId: string,
    userProfile: any
  ): Promise<void> {
    console.log(`🔧 OPTIMISTIC: Deferring real room creation for ${optimisticId} to avoid duplicate matchmaking`);
    
    // Update status to searching instead of immediately creating a real room
    // This prevents duplicate matchmaking requests from conflicting
    this.updateOptimisticRoom(optimisticId, {
      status: 'searching',
      searchText: gameType === 'ranked' ? 'Finding worthy challengers...' : 'Scanning the arena...'
    });
    
    const callbacks = this.roomCallbacks.get(optimisticId);
    if (callbacks?.onStatusUpdate) {
      callbacks.onStatusUpdate('searching', gameType === 'ranked' ? 'Finding worthy challengers...' : 'Scanning the arena...');
    }

    // Instead of creating a real room immediately, set up a timeout that allows
    // the main matchmaking flow to complete first. If no real session is found
    // within a reasonable time, then we'll fall back to creating one.
    const fallbackTimeout = setTimeout(async () => {
      console.log(`⏰ OPTIMISTIC: Fallback timeout reached for ${optimisticId}, proceeding with room creation`);
      await this.createRealRoomInBackground(optimisticId, gameMode, gameType, userId, userProfile);
    }, 2000); // Wait 2 seconds for main matchmaking to complete
    
    // Store the timeout so we can cancel it if main matchmaking succeeds
    this.backgroundProcesses.set(optimisticId, Promise.resolve());
    this.roomCallbacks.set(optimisticId + '_timeout', { onError: () => clearTimeout(fallbackTimeout) });
  }

  /**
   * Create real room in background and seamlessly transition
   */
  private static async createRealRoomInBackground(
    optimisticId: string,
    gameMode: string,
    gameType: 'quick' | 'ranked',
    userId: string,
    userProfile: any
  ): Promise<void> {
    console.log(`🔧 Starting background room creation for ${optimisticId}`);
    
    // Update status to creating with animated search text
    this.updateOptimisticRoom(optimisticId, {
      status: 'creating',
      searchText: gameType === 'ranked' ? 'Finding worthy challengers...' : 'Scanning the arena...'
    });
    
    const callbacks = this.roomCallbacks.get(optimisticId);
    if (callbacks?.onStatusUpdate) {
      callbacks.onStatusUpdate('creating', gameType === 'ranked' ? 'Finding worthy challengers...' : 'Scanning the arena...');
    }

    try {
      // Use NewMatchmakingService to create real room
      const sessionType = gameType === 'ranked' ? 'ranked' : 'quick';
      const result = await NewMatchmakingService.findOrCreateMatch(
        userId,
        gameMode,
        sessionType as any
      );

      if (result.success && result.sessionId) {
        console.log(`✅ Real room created: ${result.sessionId} for optimistic room ${optimisticId}`);
        
        // Fetch the actual room data immediately and store in bridge
        try {
          console.log(`🌉 Bridge: Fetching fresh room data for ${result.sessionId}`);
          
          // Import Firebase dependencies inside the function to avoid issues
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('./firebase');
          
          // Try to fetch the room data from waitingroom collection
          const roomDoc = await getDoc(doc(db, 'waitingroom', result.sessionId));
          
          if (roomDoc.exists()) {
            const roomData = { ...roomDoc.data(), id: roomDoc.id };
            
            // Store room data in bridge for immediate access
            this.setBridgeRoomData(result.sessionId, roomData);
            
            console.log(`🌉 Bridge: Successfully cached room data for ${result.sessionId}`);
          } else {
            // Room might be in gameSessions collection instead of waitingroom
            console.log(`🔍 Bridge: Room not in waitingroom, checking gameSessions collection`);
            
            const sessionDoc = await getDoc(doc(db, 'gameSessions', result.sessionId));
            
            if (sessionDoc.exists()) {
              const sessionData = sessionDoc.data() as any; // Use any for flexible data access
              
              // Convert gameSession data to waitingroom format for compatibility
              const bridgeRoomData = {
                id: sessionDoc.id,
                gameMode: sessionData.gameMode || gameMode,
                gameType: sessionData.sessionType || 'quick',
                hostData: sessionData.hostData || {
                  playerDisplayName: userProfile.displayName || 'Player',
                  playerId: userId,
                  displayBackgroundEquipped: userProfile.inventory?.displayBackgroundEquipped,
                  matchBackgroundEquipped: userProfile.inventory?.matchBackgroundEquipped,
                  playerStats: userProfile.stats || {
                    bestStreak: 0,
                    currentStreak: 0,
                    gamesPlayed: 0,
                    matchWins: 0
                  }
                },
                opponentData: sessionData.opponentData || null,
                playersRequired: sessionData.opponentData ? 0 : 1,
                createdAt: sessionData.createdAt || new Date(),
                status: sessionData.status || 'waiting'
              };
              
              // Store converted data in bridge
              this.setBridgeRoomData(result.sessionId, bridgeRoomData);
              
              console.log(`🌉 Bridge: Successfully cached gameSession data as waitingroom format for ${result.sessionId}`);
            } else {
              console.warn(`⚠️ Bridge: Room ${result.sessionId} not found in waitingroom or gameSessions collections yet`);
            }
          }
        } catch (bridgeError) {
          console.warn('⚠️ Bridge: Failed to cache room data, but room creation succeeded:', bridgeError);
        }
        
        // Update optimistic room with real room data
        this.updateOptimisticRoom(optimisticId, {
          status: 'transitioning',
          searchText: 'Looking for worthy challengers...',
          realRoomId: result.sessionId
        });

        // Notify callback about real room creation
        if (callbacks?.onRealRoomCreated) {
          callbacks.onRealRoomCreated(result.sessionId);
        }

        // Wait a moment for smooth transition, then update to waiting status
        setTimeout(() => {
          this.updateOptimisticRoom(optimisticId, {
            status: 'waiting',
            searchText: result.hasOpponent ? 'Opponent found! Starting match...' : 'Waiting for opponent...'
          });
          
          if (callbacks?.onStatusUpdate) {
            callbacks.onStatusUpdate('waiting', result.hasOpponent ? 'Opponent found! Starting match...' : 'Waiting for opponent...');
          }
        }, 500);

      } else {
        throw new Error(result.error || 'Failed to create room');
      }

    } catch (error) {
      console.error(`❌ Background room creation failed for ${optimisticId}:`, error);
      
      // Update status to show error
      this.updateOptimisticRoom(optimisticId, {
        status: 'searching',
        searchText: 'Retrying connection...'
      });

      // Notify error callback
      if (callbacks?.onError) {
        callbacks.onError(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  /**
   * Get real room ID for an optimistic room (if available)
   */
  static getRealRoomId(optimisticId: string): string | null {
    const room = this.optimisticRooms.get(optimisticId);
    return room?.realRoomId || null;
  }

  /**
   * Bridge Entry System: Store real room data for immediate access
   */
  static setBridgeRoomData(roomId: string, roomData: any): void {
    this.realRoomBridge.set(roomId, roomData);
    console.log(`🌉 Bridge: Cached room data for immediate access: ${roomId}`);
  }

  /**
   * Bridge Entry System: Get cached real room data immediately
   */
  static getBridgeRoomData(roomId: string): any | null {
    const data = this.realRoomBridge.get(roomId);
    if (data) {
      console.log(`🌉 Bridge: Retrieved cached room data for: ${roomId}`);
    }
    return data || null;
  }

  /**
   * Bridge Entry System: Check if real room data is available in bridge
   */
  static hasBridgeRoomData(roomId: string): boolean {
    return this.realRoomBridge.has(roomId);
  }

  /**
   * Bridge Entry System: Clear cached room data when no longer needed
   */
  static clearBridgeRoomData(roomId: string): void {
    if (this.realRoomBridge.delete(roomId)) {
      console.log(`🌉 Bridge: Cleared cached room data for: ${roomId}`);
    }
  }

  /**
   * Bridge Entry System: Debug method to get all bridge data
   */
  static getAllBridgeData(): Array<{ roomId: string; data: any }> {
    return Array.from(this.realRoomBridge.entries()).map(([roomId, data]) => ({
      roomId,
      data
    }));
  }

  /**
   * Bridge Entry System: Validate bridge system is working correctly
   */
  static validateBridgeSystem(): { 
    isWorking: boolean; 
    bridgeEntries: number; 
    optimisticRooms: number;
    message: string;
  } {
    const bridgeEntries = this.realRoomBridge.size;
    const optimisticRooms = this.optimisticRooms.size;
    
    const status = {
      isWorking: true,
      bridgeEntries,
      optimisticRooms,
      message: `Bridge system operational: ${bridgeEntries} cached rooms, ${optimisticRooms} optimistic rooms`
    };
    
    console.log(`🌉 Bridge System Status:`, status);
    return status;
  }

  /**
   * Transition user from optimistic room to real room
   */
  static transitionToRealRoom(optimisticId: string): string | null {
    const room = this.optimisticRooms.get(optimisticId);
    if (room?.realRoomId) {
      console.log(`🔄 Transitioning from optimistic room ${optimisticId} to real room ${room.realRoomId}`);
      
      // Clean up optimistic room data
      this.cleanup(optimisticId);
      
      return room.realRoomId;
    }
    return null;
  }

  /**
   * Clean up specific optimistic room
   */
  static cleanup(optimisticId: string): void {
    const room = this.optimisticRooms.get(optimisticId);
    
    // Remove room data
    this.optimisticRooms.delete(optimisticId);
    this.roomCallbacks.delete(optimisticId);
    
    // Cancel background process if still running
    const process = this.backgroundProcesses.get(optimisticId);
    if (process) {
      this.backgroundProcesses.delete(optimisticId);
    }
    
    // Clear bridge data for the real room if it exists
    if (room?.realRoomId) {
      this.clearBridgeRoomData(room.realRoomId);
    }
    
    console.log(`🧹 Cleaned up optimistic room: ${optimisticId}`);
  }

  /**
   * Clear all optimistic rooms
   */
  static clearAll(): void {
    this.optimisticRooms.clear();
    this.roomCallbacks.clear();
    this.backgroundProcesses.clear();
    this.realRoomBridge.clear(); // Clear bridge data too
    console.log('🧹 Cleared all optimistic rooms, background processes, and bridge data');
  }
}