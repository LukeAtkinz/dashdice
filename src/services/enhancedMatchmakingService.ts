/**
 * Enhanced Matchmaking Service with Go Services Integration
 * Handles both Firebase-based and Go microservices matchmaking
 */

import DashDiceAPI, { JoinQueueRequest, QueueStatus } from './apiClientNew';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';

export interface MatchmakingOptions {
  gameMode: string;
  preferredMode: 'firebase' | 'goservices' | 'hybrid';
  skillLevel?: number;
  preferences?: any;
  maxWaitTime?: number; // in seconds
}

export interface MatchFoundResult {
  matchId: string;
  roomId?: string;
  players: string[];
  gameMode: string;
  provider: 'firebase' | 'goservices';
}

export interface QueueStatusUpdate {
  position: number;
  estimatedWait: string;
  totalWaiting: number;
  provider: 'firebase' | 'goservices';
}

export class EnhancedMatchmakingService {
  private static wsConnection: WebSocket | null = null;
  private static queueStatusListeners: Map<string, (status: QueueStatusUpdate) => void> = new Map();
  private static firebaseListeners: Map<string, Unsubscribe> = new Map();

  /**
   * Initialize matchmaking service with WebSocket connection for real-time updates
   */
  static async initialize(): Promise<void> {
    try {
      // Check if Go services are available
      const isGoServicesHealthy = await DashDiceAPI.healthCheck();
      
      if (isGoServicesHealthy) {
        console.log('🎯 Initializing enhanced matchmaking with Go services support');
        await this.initializeWebSocket();
      } else {
        console.log('⚠️ Go services unavailable, using Firebase-only matchmaking');
      }
    } catch (error) {
      console.error('Failed to initialize enhanced matchmaking:', error);
    }
  }

  /**
   * Initialize WebSocket connection for real-time matchmaking updates
   */
  private static async initializeWebSocket(): Promise<void> {
    try {
      this.wsConnection = await DashDiceAPI.createWebSocketConnection();
      
      if (this.wsConnection) {
        this.wsConnection.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.wsConnection.onclose = () => {
          console.log('🔌 Matchmaking WebSocket disconnected');
          this.wsConnection = null;
          // Attempt to reconnect after 5 seconds
          setTimeout(() => this.initializeWebSocket(), 5000);
        };
      }
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  /**
   * Handle incoming WebSocket messages for matchmaking updates
   */
  private static handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'queue_status':
        this.notifyQueueStatusUpdate(message.user_id, {
          position: message.position,
          estimatedWait: message.estimated_wait,
          totalWaiting: message.total_waiting,
          provider: 'goservices'
        });
        break;

      case 'match_found':
        this.handleMatchFound(message);
        break;

      case 'queue_error':
        console.error('Queue error:', message.error);
        break;

      default:
        console.log('Unknown matchmaking message:', message);
    }
  }

  /**
   * Join matchmaking queue with intelligent routing
   */
  static async joinQueue(
    options: MatchmakingOptions,
    onStatusUpdate?: (status: QueueStatusUpdate) => void,
    onMatchFound?: (match: MatchFoundResult) => void
  ): Promise<string> {
    try {
      const { gameMode, preferredMode, skillLevel, preferences } = options;

      // Store callbacks for this user
      if (onStatusUpdate) {
        this.queueStatusListeners.set(`status_${gameMode}`, onStatusUpdate);
      }

      // Determine which service to use
      let useGoServices = false;
      
      if (preferredMode === 'goservices') {
        useGoServices = true;
      } else if (preferredMode === 'hybrid') {
        // Check if Go services are healthy
        const isHealthy = await DashDiceAPI.healthCheck();
        useGoServices = isHealthy;
      }

      if (useGoServices) {
        return await this.joinGoServicesQueue({
          game_mode: gameMode,
          skill_level: skillLevel,
          preferences
        }, onStatusUpdate, onMatchFound);
      } else {
        return await this.joinFirebaseQueue(gameMode, onStatusUpdate, onMatchFound);
      }
    } catch (error) {
      console.error('Failed to join queue:', error);
      throw error;
    }
  }

  /**
   * Join Go services queue
   */
  private static async joinGoServicesQueue(
    queueData: JoinQueueRequest,
    onStatusUpdate?: (status: QueueStatusUpdate) => void,
    onMatchFound?: (match: MatchFoundResult) => void
  ): Promise<string> {
    try {
      console.log('🎯 Joining Go services queue:', queueData);
      
      const result = await DashDiceAPI.joinQueue(queueData);
      
      if (result.queue_entry) {
        const queueId = `goservices_${queueData.game_mode}_${Date.now()}`;
        
        // Initial status update
        if (onStatusUpdate) {
          onStatusUpdate({
            position: result.queue_entry.queue_position,
            estimatedWait: result.queue_entry.estimated_wait,
            totalWaiting: 0, // Will be updated via WebSocket
            provider: 'goservices'
          });
        }

        // Store match found callback
        if (onMatchFound) {
          this.queueStatusListeners.set(`match_${queueData.game_mode}`, onMatchFound as any);
        }

        return queueId;
      } else {
        throw new Error('Failed to join Go services queue');
      }
    } catch (error) {
      console.error('Go services queue join failed:', error);
      throw error;
    }
  }

  /**
   * Join Firebase-based queue (fallback)
   */
  private static async joinFirebaseQueue(
    gameMode: string,
    onStatusUpdate?: (status: QueueStatusUpdate) => void,
    onMatchFound?: (match: MatchFoundResult) => void
  ): Promise<string> {
    try {
      console.log('🔥 Joining Firebase queue for:', gameMode);

      // Search for existing waiting rooms
      const q = query(
        collection(db, 'waitingroom'),
        where('gameMode', '==', gameMode),
        where('playersRequired', '==', 1)
      );

      const querySnapshot = await getDocs(q);
      
      // Check for available room
      if (!querySnapshot.empty) {
        const existingRoom = querySnapshot.docs[0];
        const roomId = existingRoom.id;
        
        if (onMatchFound) {
          onMatchFound({
            matchId: roomId,
            roomId: roomId,
            players: [existingRoom.data().hostData?.uid || 'unknown'],
            gameMode: gameMode,
            provider: 'firebase'
          });
        }

        return roomId;
      }

      // Create new waiting room
      const roomData = {
        gameMode,
        gameType: 'Open Server',
        playersRequired: 1,
        createdAt: serverTimestamp(),
        hostData: {
          // Will be filled by the calling component
        }
      };

      const roomRef = await addDoc(collection(db, 'waitingroom'), roomData);
      const roomId = roomRef.id;

      // Listen for room updates
      const unsubscribe = onSnapshot(doc(db, 'waitingroom', roomId), (doc) => {
        const data = doc.data();
        if (data && data.playersRequired === 0 && onMatchFound) {
          // Match found
          onMatchFound({
            matchId: roomId,
            roomId: roomId,
            players: [data.hostData?.uid || 'unknown'],
            gameMode: gameMode,
            provider: 'firebase'
          });
        }
      });

      this.firebaseListeners.set(roomId, unsubscribe);

      // Provide status updates
      if (onStatusUpdate) {
        onStatusUpdate({
          position: 1,
          estimatedWait: 'Waiting for players...',
          totalWaiting: 1,
          provider: 'firebase'
        });
      }

      return roomId;
    } catch (error) {
      console.error('Firebase queue join failed:', error);
      throw error;
    }
  }

  /**
   * Leave matchmaking queue
   */
  static async leaveQueue(queueId: string): Promise<void> {
    try {
      // Determine if this is a Go services or Firebase queue
      if (queueId.startsWith('goservices_')) {
        await DashDiceAPI.leaveQueue();
        console.log('🚪 Left Go services queue');
      } else {
        // Firebase queue cleanup
        const unsubscribe = this.firebaseListeners.get(queueId);
        if (unsubscribe) {
          unsubscribe();
          this.firebaseListeners.delete(queueId);
        }
        console.log('🚪 Left Firebase queue');
      }

      // Clean up listeners
      this.queueStatusListeners.forEach((_, key) => {
        if (key.includes(queueId)) {
          this.queueStatusListeners.delete(key);
        }
      });
    } catch (error) {
      console.error('Failed to leave queue:', error);
      throw error;
    }
  }

  /**
   * Get current queue status
   */
  static async getQueueStatus(gameMode: string): Promise<QueueStatusUpdate> {
    try {
      // Try Go services first
      const isGoServicesHealthy = await DashDiceAPI.healthCheck();
      
      if (isGoServicesHealthy) {
        const status = await DashDiceAPI.getQueueStatus();
        return {
          position: status.position || 0,
          estimatedWait: status.estimated_wait || 'Unknown',
          totalWaiting: status.total_waiting || 0,
          provider: 'goservices'
        };
      } else {
        // Fallback to Firebase status
        const q = query(
          collection(db, 'waitingroom'),
          where('gameMode', '==', gameMode)
        );
        
        const querySnapshot = await getDocs(q);
        
        return {
          position: 1,
          estimatedWait: querySnapshot.empty ? 'No queue' : 'Waiting...',
          totalWaiting: querySnapshot.size,
          provider: 'firebase'
        };
      }
    } catch (error) {
      console.error('Failed to get queue status:', error);
      throw error;
    }
  }

  /**
   * Notify status update to listeners
   */
  private static notifyQueueStatusUpdate(userId: string, status: QueueStatusUpdate): void {
    this.queueStatusListeners.forEach((listener, key) => {
      if (key.startsWith('status_')) {
        listener(status);
      }
    });
  }

  /**
   * Handle match found from WebSocket
   */
  private static handleMatchFound(message: any): void {
    this.queueStatusListeners.forEach((listener, key) => {
      if (key.startsWith('match_')) {
        const matchResult: MatchFoundResult = {
          matchId: message.match_id,
          players: message.players || [],
          gameMode: message.game_mode,
          provider: 'goservices'
        };
        (listener as any)(matchResult);
      }
    });
  }

  /**
   * Check if Go services are available
   */
  static async isGoServicesAvailable(): Promise<boolean> {
    try {
      return await DashDiceAPI.healthCheck();
    } catch {
      return false;
    }
  }

  /**
   * Get integration status for debugging
   */
  static getIntegrationStatus(): any {
    return {
      wsConnected: this.wsConnection?.readyState === WebSocket.OPEN,
      activeListeners: this.queueStatusListeners.size,
      firebaseListeners: this.firebaseListeners.size,
      goServicesUrl: process.env.NEXT_PUBLIC_API_GATEWAY_URL,
    };
  }

  /**
   * Cleanup all connections and listeners
   */
  static cleanup(): void {
    // Close WebSocket
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.close();
    }

    // Clear all listeners
    this.queueStatusListeners.clear();
    
    // Unsubscribe Firebase listeners
    this.firebaseListeners.forEach(unsubscribe => unsubscribe());
    this.firebaseListeners.clear();

    console.log('🧹 Matchmaking service cleanup completed');
  }
}

export default EnhancedMatchmakingService;
