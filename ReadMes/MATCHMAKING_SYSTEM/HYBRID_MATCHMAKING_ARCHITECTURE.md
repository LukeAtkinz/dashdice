# Next-Generation DashDice Matchmaking System - Hybrid Architecture

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Data Storage Strategy](#data-storage-strategy)
3. [Real-time Components](#real-time-components)
4. [Optimistic Matchmaking Enhanced](#optimistic-matchmaking-enhanced)
5. [Redis Integration](#redis-integration)
6. [Firebase Cloud Messaging](#firebase-cloud-messaging)
7. [Implementation Details](#implementation-details)
8. [Service Architecture](#service-architecture)
9. [Performance & Scaling](#performance--scaling)
10. [Migration Strategy](#migration-strategy)

---

## Architecture Overview

### Hybrid Database Strategy
The new matchmaking system combines multiple database technologies for optimal performance:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Firestore     │    │      Redis       │    │  Realtime DB    │
│   (Persistent)  │    │   (Fast Queue)   │    │  (Presence)     │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • User Accounts │    │ • Waiting Rooms  │    │ • User Presence │
│ • Chat System   │    │ • Active Matches │    │ • Connection    │
│ • Friends       │    │ • Game Sessions  │    │   Status        │
│ • Notifications │    │ • Live State     │    │ • Auto Cleanup  │
│ • Match History │    │ • Matchmaking    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Technology Stack
- **Frontend**: Next.js 14, React, TypeScript
- **Persistent Storage**: Firebase Firestore
- **Fast Cache/Queue**: Redis Cloud
- **Presence System**: Firebase Realtime Database
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Real-time Sync**: Firestore Listeners + Redis Pub/Sub

---

## Data Storage Strategy

### 🔵 Firestore Collections (Persistent Data)

#### **User & Account Management**
```typescript
// users/{userId}
interface UserDocument {
  uid: string;
  displayName: string;
  email: string;
  stats: PlayerStats;
  inventory: UserInventory;
  settings: UserSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### **Chat System**
```typescript
// chatRooms/{roomId}
interface ChatRoomDocument {
  id: string;
  type: 'match' | 'global' | 'private';
  name: string;
  description?: string;
  matchId?: string;        // Link to match if match chat
  isActive: boolean;
  maxParticipants: number;
  settings: {
    allowGifs: boolean;
    moderationLevel: 'low' | 'medium' | 'high';
    messageRetentionDays: number;
  };
  createdAt: Timestamp;
  createdBy: string;
}

// chatMessages/{messageId}
interface ChatMessageDocument {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  message: string;
  messageType: 'text' | 'emoji' | 'system';
  timestamp: Timestamp;
  editedAt?: Timestamp;
  isDeleted: boolean;
  moderationFlags?: string[];
}

// chatParticipants/{participantId}
interface ChatParticipantDocument {
  id: string;
  roomId: string;
  userId: string;
  role: 'member' | 'moderator' | 'admin';
  joinedAt: Timestamp;
  lastSeen: Timestamp;
  isMuted: boolean;
  muteExpiresAt?: Timestamp;
}

// userChatSettings/{userId}
interface UserChatSettings {
  userId: string;
  globalMute: boolean;
  allowDirectMessages: boolean;
  blockedUsers: string[];
  mutedRooms: string[];
  notificationSettings: {
    mentions: boolean;
    directMessages: boolean;
    matchChat: boolean;
  };
}
```

#### **Friends System**
```typescript
// friendRequests/{requestId}
interface FriendRequestDocument {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  toDisplayName: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message?: string;
  createdAt: Timestamp;
  respondedAt?: Timestamp;
  expiresAt: Timestamp;
}

// friends/{friendshipId}
interface FriendshipDocument {
  id: string;
  userId1: string;       // Lower UID (for consistent ordering)
  userId2: string;       // Higher UID
  status: 'active' | 'blocked';
  createdAt: Timestamp;
  lastInteraction: Timestamp;
}

// friendStats/{statsId}
interface FriendStatsDocument {
  id: string;
  userId1: string;
  userId2: string;
  stats: {
    gamesPlayed: number;
    user1Wins: number;
    user2Wins: number;
    lastGameAt: Timestamp;
    favoriteGameMode: string;
    longestStreak: {
      player: string;
      count: number;
    };
  };
}

// friendGameInvites/{inviteId}
interface FriendGameInviteDocument {
  id: string;
  fromUserId: string;
  toUserId: string;
  gameMode: string;
  gameType: 'quick' | 'ranked';
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Timestamp;
  expiresAt: Timestamp;
  gameSessionId?: string; // If accepted
}
```

#### **Notification System**
```typescript
// notifications/{notificationId}
interface NotificationDocument {
  id: string;
  userId: string;
  type: 'friend_request' | 'game_invite' | 'match_result' | 'achievement' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
  fcmMessageId?: string;
}

// gameNotifications/{notificationId}
interface GameNotificationDocument {
  id: string;
  userId: string;
  type: 'match_abandoned' | 'rejoin_available' | 'match_completed' | 'opponent_left';
  matchId: string;
  title: string;
  message: string;
  actionRequired: boolean;
  actionType?: 'rejoin' | 'claim_victory' | 'view_result';
  actionData?: Record<string, any>;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

// achievementNotifications/{notificationId}
interface AchievementNotificationDocument {
  id: string;
  userId: string;
  achievementId: string;
  achievementName: string;
  achievementDescription: string;
  rewardType: 'xp' | 'currency' | 'item' | 'title';
  rewardAmount: number;
  isRead: boolean;
  createdAt: Timestamp;
}
```

#### **Match History & Storage**
```typescript
// matches/{matchId} - Active matches (also in Redis)
interface MatchDocument {
  id: string;
  gameMode: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  players: MatchPlayer[];
  gameState: GameState;
  chatRoomId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

// abandonedMatches/{matchId}
interface AbandonedMatchDocument {
  id: string;
  originalMatchId: string;
  gameMode: string;
  players: MatchPlayer[];
  abandonedBy: string;
  abandonedAt: Timestamp;
  gameState: GameState;
  reason: 'player_left' | 'connection_lost' | 'inactivity' | 'forfeit';
  canRejoin: boolean;
  rejoinExpiresAt?: Timestamp;
  claimVictoryAvailable: boolean;
}

// completedMatches/{matchId}
interface CompletedMatchDocument {
  id: string;
  gameMode: string;
  gameType: 'quick' | 'ranked';
  players: MatchPlayer[];
  winner: string;
  finalScores: Record<string, number>;
  duration: number;
  totalTurns: number;
  matchStats: MatchStatistics;
  completedAt: Timestamp;
  eloChanges?: Record<string, number>;
}

// gameSessions/{sessionId} - Metadata only (active state in Redis)
interface GameSessionDocument {
  id: string;
  sessionType: 'quick' | 'ranked' | 'friend';
  gameMode: string;
  status: 'waiting' | 'active' | 'completed';
  players: SessionPlayer[];
  createdAt: Timestamp;
  redisKey: string; // Points to Redis state
}
```

---

## Real-time Components

### 🔴 Redis Integration (Fast Operations)

#### **Waiting Room Queue System**
```typescript
// Redis Keys Structure
interface RedisWaitingRoom {
  // Key: waitingroom:{gameMode}:{region}
  // Value: Sorted Set (score = timestamp)
  [userId: string]: {
    displayName: string;
    gameMode: string;
    gameType: 'quick' | 'ranked';
    elo?: number;
    region: string;
    preferences: MatchmakingPreferences;
    joinedAt: number;
    optimisticRoomId?: string;
  };
}

// Redis Operations
class RedisMatchmakingService {
  // Add player to waiting room queue
  static async joinQueue(userId: string, gameMode: string, preferences: MatchmakingPreferences): Promise<void> {
    const key = `waitingroom:${gameMode}:${preferences.region}`;
    const playerData = {
      userId,
      displayName: preferences.displayName,
      gameMode,
      gameType: preferences.gameType,
      elo: preferences.elo,
      region: preferences.region,
      joinedAt: Date.now()
    };
    
    await redis.zadd(key, Date.now(), JSON.stringify(playerData));
    await redis.expire(key, 300); // 5 minute expiry
  }
  
  // Find match in queue
  static async findMatch(userId: string, gameMode: string, region: string): Promise<MatchCandidate | null> {
    const key = `waitingroom:${gameMode}:${region}`;
    const candidates = await redis.zrange(key, 0, 10); // Get oldest 10 players
    
    return this.selectBestMatch(userId, candidates);
  }
}
```

#### **Active Match State**
```typescript
// Redis Keys: match:{matchId}
interface RedisMatchState {
  matchId: string;
  gameMode: string;
  status: 'active' | 'paused';
  currentTurn: string;
  turnStartedAt: number;
  players: {
    [userId: string]: {
      score: number;
      roundScore: number;
      turnActive: boolean;
      connected: boolean;
      lastAction: number;
    };
  };
  gameState: {
    diceOne: number;
    diceTwo: number;
    phase: 'turnDecider' | 'playing' | 'finished';
    turnNumber: number;
  };
  updatedAt: number;
}

class RedisMatchService {
  // Update match state
  static async updateMatchState(matchId: string, update: Partial<RedisMatchState>): Promise<void> {
    const key = `match:${matchId}`;
    const current = await redis.hgetall(key);
    const updated = { ...current, ...update, updatedAt: Date.now() };
    
    await redis.hmset(key, updated);
    await redis.expire(key, 3600); // 1 hour expiry
    
    // Publish update to subscribers
    await redis.publish(`match:${matchId}:updates`, JSON.stringify(update));
  }
  
  // Subscribe to match updates
  static subscribeToMatch(matchId: string, callback: (update: any) => void): void {
    const subscriber = redis.duplicate();
    subscriber.subscribe(`match:${matchId}:updates`);
    subscriber.on('message', (channel, message) => {
      callback(JSON.parse(message));
    });
  }
}
```

### 🟡 Firebase Realtime Database (Presence)

#### **User Presence System**
```typescript
// Realtime DB Structure
interface UserPresence {
  // Path: /presence/{userId}
  status: 'online' | 'away' | 'offline';
  lastSeen: number;
  currentActivity: 'menu' | 'matchmaking' | 'in_match' | 'chat';
  currentMatchId?: string;
  currentRoomId?: string;
  deviceInfo: {
    platform: 'web' | 'mobile';
    userAgent: string;
  };
}

class PresenceService {
  private static presenceRef = ref(realtimeDB, 'presence');
  
  static async setUserOnline(userId: string, activity: string): Promise<void> {
    const userPresenceRef = ref(realtimeDB, `presence/${userId}`);
    
    // Set online status
    await set(userPresenceRef, {
      status: 'online',
      lastSeen: serverTimestamp(),
      currentActivity: activity,
      deviceInfo: {
        platform: this.detectPlatform(),
        userAgent: navigator.userAgent
      }
    });
    
    // Set up offline detection
    const offlineData = {
      status: 'offline',
      lastSeen: serverTimestamp(),
      currentActivity: 'offline'
    };
    
    await onDisconnect(userPresenceRef).set(offlineData);
  }
  
  // Listen to presence changes
  static subscribeToPresence(userId: string, callback: (presence: UserPresence) => void): () => void {
    const userPresenceRef = ref(realtimeDB, `presence/${userId}`);
    return onValue(userPresenceRef, (snapshot) => {
      callback(snapshot.val());
    });
  }
}
```

---

## Optimistic Matchmaking Enhanced

### Enhanced Optimistic Flow
Building on the current OptimisticMatchmakingService with hybrid architecture:

```typescript
export class EnhancedOptimisticMatchmakingService {
  // Step 1: Instant UI Response
  static async createOptimisticMatch(userId: string, gameMode: string, preferences: MatchmakingPreferences): Promise<string> {
    const optimisticId = `opt_${Date.now()}_${userId}`;
    
    // 1. Show immediate waiting room UI
    this.showOptimisticWaitingRoom(optimisticId, gameMode);
    
    // 2. Add to Redis queue (fast)
    await RedisMatchmakingService.joinQueue(userId, gameMode, {
      ...preferences,
      optimisticRoomId: optimisticId
    });
    
    // 3. Start background matching process
    this.startBackgroundMatching(userId, gameMode, optimisticId);
    
    return optimisticId;
  }
  
  // Step 2: Background Matching
  private static async startBackgroundMatching(userId: string, gameMode: string, optimisticId: string): Promise<void> {
    // Try to find match in Redis queue
    const match = await RedisMatchmakingService.findMatch(userId, gameMode, 'auto');
    
    if (match) {
      // Match found - create real match
      const realMatchId = await this.createRealMatch(userId, match.opponentId, gameMode);
      
      // Update optimistic UI to real match
      this.transitionToRealMatch(optimisticId, realMatchId);
      
      // Remove both players from queue
      await RedisMatchmakingService.removeFromQueue(userId, gameMode);
      await RedisMatchmakingService.removeFromQueue(match.opponentId, gameMode);
      
    } else {
      // No immediate match - keep in queue and poll
      this.pollForMatch(userId, gameMode, optimisticId);
    }
  }
  
  // Step 3: Real Match Creation
  private static async createRealMatch(hostId: string, opponentId: string, gameMode: string): Promise<string> {
    const matchId = `match_${Date.now()}_${hostId}`;
    
    // 1. Create Firestore match document
    const matchData: MatchDocument = {
      id: matchId,
      gameMode,
      status: 'active',
      players: await this.buildPlayerData([hostId, opponentId]),
      gameState: this.initializeGameState(gameMode),
      chatRoomId: await this.createMatchChatRoom(matchId),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'matches', matchId), matchData);
    
    // 2. Create Redis active state
    const redisState: RedisMatchState = {
      matchId,
      gameMode,
      status: 'active',
      currentTurn: hostId, // Host starts
      turnStartedAt: Date.now(),
      players: {
        [hostId]: { score: 0, roundScore: 0, turnActive: true, connected: true, lastAction: Date.now() },
        [opponentId]: { score: 0, roundScore: 0, turnActive: false, connected: true, lastAction: Date.now() }
      },
      gameState: {
        diceOne: 0,
        diceTwo: 0,
        phase: 'turnDecider',
        turnNumber: 1
      },
      updatedAt: Date.now()
    };
    
    await RedisMatchService.createMatch(matchId, redisState);
    
    // 3. Update user presence
    await PresenceService.updateActivity([hostId, opponentId], 'in_match', matchId);
    
    // 4. Send notifications
    await this.sendMatchFoundNotifications(hostId, opponentId, matchId);
    
    return matchId;
  }
  
  // Seamless transition from optimistic to real
  private static async transitionToRealMatch(optimisticId: string, realMatchId: string): Promise<void> {
    // Update UI state without jarring transition
    const transition = {
      from: optimisticId,
      to: realMatchId,
      type: 'match_found',
      preserveState: true
    };
    
    // Bridge system - map optimistic to real
    this.setBridgeData(optimisticId, { realMatchId, transition });
    
    // Notify UI components
    this.notifyTransition(transition);
  }
}
```

---

## Firebase Cloud Messaging Integration

### Push Notification System
```typescript
export class NotificationService {
  // Initialize FCM
  static async initializeFCM(): Promise<void> {
    const messaging = getMessaging();
    
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return;
    }
    
    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY
    });
    
    // Store token in user document
    await this.updateUserFCMToken(getCurrentUser()?.uid, token);
    
    // Listen for foreground messages
    onMessage(messaging, (payload) => {
      this.handleForegroundMessage(payload);
    });
  }
  
  // Send game notifications
  static async sendGameNotification(userId: string, notification: GameNotificationData): Promise<void> {
    // 1. Store in Firestore for persistence
    const notificationDoc: GameNotificationDocument = {
      id: `${Date.now()}_${userId}`,
      userId,
      type: notification.type,
      matchId: notification.matchId,
      title: notification.title,
      message: notification.message,
      actionRequired: notification.actionRequired,
      actionType: notification.actionType,
      actionData: notification.actionData,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + (24 * 60 * 60 * 1000))) // 24h expiry
    };
    
    await addDoc(collection(db, 'gameNotifications'), notificationDoc);
    
    // 2. Send FCM push notification
    const fcmMessage = {
      to: await this.getUserFCMToken(userId),
      notification: {
        title: notification.title,
        body: notification.message,
        icon: '/icons/notification-icon.png',
        badge: '/icons/badge-icon.png'
      },
      data: {
        type: notification.type,
        matchId: notification.matchId,
        actionType: notification.actionType || '',
        actionData: JSON.stringify(notification.actionData || {})
      },
      webpush: {
        notification: {
          requireInteraction: notification.actionRequired,
          actions: notification.actionType ? [
            {
              action: notification.actionType,
              title: this.getActionTitle(notification.actionType),
              icon: this.getActionIcon(notification.actionType)
            }
          ] : undefined
        }
      }
    };
    
    await this.sendFCMMessage(fcmMessage);
  }
  
  // Handle specific notification types
  static async notifyMatchAbandoned(matchId: string, abandonedBy: string, remainingPlayers: string[]): Promise<void> {
    const abandonedMatch = await getDoc(doc(db, 'matches', matchId));
    
    for (const playerId of remainingPlayers) {
      await this.sendGameNotification(playerId, {
        type: 'match_abandoned',
        matchId,
        title: 'Match Abandoned',
        message: `Your opponent has left the match. You can claim victory or wait for them to rejoin.`,
        actionRequired: true,
        actionType: 'claim_victory',
        actionData: { matchId, abandonedBy }
      });
    }
  }
  
  static async notifyRejoinAvailable(matchId: string, playerId: string): Promise<void> {
    await this.sendGameNotification(playerId, {
      type: 'rejoin_available',
      matchId,
      title: 'Rejoin Match',
      message: 'Your previous match is still available. Rejoin to continue playing!',
      actionRequired: true,
      actionType: 'rejoin',
      actionData: { matchId }
    });
  }
  
  // Achievement notifications
  static async notifyAchievementUnlocked(userId: string, achievement: Achievement): Promise<void> {
    const notificationDoc: AchievementNotificationDocument = {
      id: `${Date.now()}_${userId}_${achievement.id}`,
      userId,
      achievementId: achievement.id,
      achievementName: achievement.name,
      achievementDescription: achievement.description,
      rewardType: achievement.reward.type,
      rewardAmount: achievement.reward.amount,
      isRead: false,
      createdAt: serverTimestamp()
    };
    
    await addDoc(collection(db, 'achievementNotifications'), notificationDoc);
    
    // Send FCM notification
    await this.sendFCMMessage({
      to: await this.getUserFCMToken(userId),
      notification: {
        title: '🏆 Achievement Unlocked!',
        body: `${achievement.name} - ${achievement.reward.amount} ${achievement.reward.type}`,
        icon: '/icons/achievement-icon.png'
      },
      data: {
        type: 'achievement',
        achievementId: achievement.id,
        rewardType: achievement.reward.type,
        rewardAmount: achievement.reward.amount.toString()
      }
    });
  }
}
```

---

## Service Architecture

### Unified Service Layer
```typescript
// Core service orchestrating all systems
export class HybridMatchmakingService {
  private static redisClient: Redis;
  private static presenceService: PresenceService;
  private static notificationService: NotificationService;
  
  // Initialize all systems
  static async initialize(): Promise<void> {
    // Initialize Redis connection
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    // Initialize presence tracking
    await this.presenceService.initialize();
    
    // Initialize notifications
    await this.notificationService.initializeFCM();
    
    // Start background services
    this.startMatchmakingPoller();
    this.startPresenceMonitor();
    this.startAbandonedMatchCleanup();
  }
  
  // Main matchmaking entry point
  static async findMatch(userId: string, gameMode: string, preferences: MatchmakingPreferences): Promise<string> {
    try {
      // 1. Set user presence
      await PresenceService.setUserActivity(userId, 'matchmaking');
      
      // 2. Create optimistic match
      const optimisticId = await EnhancedOptimisticMatchmakingService.createOptimisticMatch(userId, gameMode, preferences);
      
      // 3. Background processing will handle the rest
      return optimisticId;
      
    } catch (error) {
      console.error('Matchmaking error:', error);
      throw new Error('Failed to start matchmaking');
    }
  }
  
  // Background polling for matches
  private static startMatchmakingPoller(): void {
    setInterval(async () => {
      try {
        const activeQueues = await this.redisClient.keys('waitingroom:*');
        
        for (const queueKey of activeQueues) {
          await this.processQueue(queueKey);
        }
      } catch (error) {
        console.error('Matchmaking poller error:', error);
      }
    }, 1000); // Poll every second
  }
  
  // Process waiting room queue
  private static async processQueue(queueKey: string): Promise<void> {
    const players = await this.redisClient.zrange(queueKey, 0, -1);
    
    if (players.length < 2) return;
    
    // Group compatible players
    const matches = this.findCompatibleMatches(players);
    
    for (const match of matches) {
      try {
        const realMatchId = await EnhancedOptimisticMatchmakingService.createRealMatch(
          match.player1.userId,
          match.player2.userId,
          match.gameMode
        );
        
        // Remove matched players from queue
        await this.redisClient.zrem(queueKey, match.player1.data, match.player2.data);
        
      } catch (error) {
        console.error('Error creating match:', error);
      }
    }
  }
  
  // Monitor abandoned matches
  private static startAbandonedMatchCleanup(): void {
    setInterval(async () => {
      try {
        // Find matches with inactive players
        const activeMatches = await this.redisClient.keys('match:*');
        
        for (const matchKey of activeMatches) {
          const matchState = await this.redisClient.hgetall(matchKey);
          
          if (this.isMatchAbandoned(matchState)) {
            await this.handleAbandonedMatch(matchState.matchId);
          }
        }
      } catch (error) {
        console.error('Abandoned match cleanup error:', error);
      }
    }, 30000); // Check every 30 seconds
  }
  
  // Handle abandoned match
  private static async handleAbandonedMatch(matchId: string): Promise<void> {
    const matchDoc = await getDoc(doc(db, 'matches', matchId));
    if (!matchDoc.exists()) return;
    
    const matchData = matchDoc.data() as MatchDocument;
    const redisState = await RedisMatchService.getMatchState(matchId);
    
    // Find who abandoned
    const abandonedBy = this.findAbandonedPlayer(redisState);
    const remainingPlayers = matchData.players.filter(p => p.userId !== abandonedBy).map(p => p.userId);
    
    // Move to abandoned matches collection
    const abandonedMatchData: AbandonedMatchDocument = {
      id: matchId,
      originalMatchId: matchId,
      gameMode: matchData.gameMode,
      players: matchData.players,
      abandonedBy,
      abandonedAt: serverTimestamp(),
      gameState: matchData.gameState,
      reason: 'player_left',
      canRejoin: true,
      rejoinExpiresAt: Timestamp.fromDate(new Date(Date.now() + (15 * 60 * 1000))), // 15 min
      claimVictoryAvailable: true
    };
    
    await setDoc(doc(db, 'abandonedMatches', matchId), abandonedMatchData);
    
    // Update original match status
    await updateDoc(doc(db, 'matches', matchId), {
      status: 'abandoned',
      updatedAt: serverTimestamp()
    });
    
    // Clean up Redis state
    await RedisMatchService.deleteMatch(matchId);
    
    // Notify remaining players
    await NotificationService.notifyMatchAbandoned(matchId, abandonedBy, remainingPlayers);
  }
}
```

---

## Performance & Scaling

### Redis Configuration
```typescript
// Redis setup for optimal performance
const redisConfig = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  
  // Connection pooling
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  connectTimeout: 10000,
  commandTimeout: 5000,
  
  // Memory optimization
  maxmemoryPolicy: 'allkeys-lru',
  keyPrefix: 'dashdice:',
  
  // Clustering for scale
  enableAutoPipelining: true,
  cluster: {
    enableReadyCheck: false,
    redisOptions: {
      password: process.env.REDIS_PASSWORD
    }
  }
};

// Performance monitoring
class RedisMonitor {
  static async getPerformanceMetrics(): Promise<RedisMetrics> {
    const info = await redis.info();
    return {
      connectedClients: this.parseInfo(info, 'connected_clients'),
      usedMemory: this.parseInfo(info, 'used_memory'),
      commandsProcessed: this.parseInfo(info, 'total_commands_processed'),
      avgLatency: await this.measureLatency(),
      queueSizes: await this.getQueueSizes()
    };
  }
}
```

### Scaling Strategy
```typescript
// Geographic distribution
const getRedisInstance = (region: string): Redis => {
  const regionConfigs = {
    'us-east': { host: 'redis-us-east.example.com' },
    'us-west': { host: 'redis-us-west.example.com' },
    'eu-west': { host: 'redis-eu-west.example.com' },
    'asia': { host: 'redis-asia.example.com' }
  };
  
  return new Redis({
    ...redisConfig,
    ...regionConfigs[region]
  });
};

// Load balancing
class LoadBalancer {
  static selectOptimalRegion(userRegion: string, gameMode: string): string {
    // Consider user location, queue sizes, latency
    const regions = ['us-east', 'us-west', 'eu-west', 'asia'];
    const scores = regions.map(region => ({
      region,
      score: this.calculateRegionScore(region, userRegion, gameMode)
    }));
    
    return scores.sort((a, b) => b.score - a.score)[0].region;
  }
}
```

---

## Migration Strategy

### Phase 1: Infrastructure Setup
```bash
# 1. Redis Cloud Setup
# Sign up for Redis Cloud or set up Redis cluster
# Configure connection strings and credentials

# 2. Firebase Configuration  
# Enable Realtime Database for presence
# Configure FCM for push notifications
# Update security rules for new collections

# 3. Environment Setup
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
VAPID_KEY=your-vapid-key
```

### Phase 2: Service Implementation
```typescript
// 1. Implement new services gradually
// 2. Run hybrid system (old + new)
// 3. Migrate users progressively

class MigrationService {
  static async migrateUser(userId: string): Promise<void> {
    // Migrate user to new presence system
    await PresenceService.migrateUser(userId);
    
    // Set up FCM token
    await NotificationService.setupUserNotifications(userId);
    
    // Mark user as migrated
    await updateDoc(doc(db, 'users', userId), {
      migrationStatus: 'hybrid_system_v2',
      migratedAt: serverTimestamp()
    });
  }
}
```

### Phase 3: Full Deployment
```typescript
// Feature flags for gradual rollout
class FeatureFlags {
  static async shouldUseHybridMatching(userId: string): Promise<boolean> {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.data()?.features?.hybridMatching === true;
  }
}

// Gradual migration of matchmaking
export class GradualMigrationService {
  static async findMatch(userId: string, gameMode: string, preferences: MatchmakingPreferences): Promise<string> {
    if (await FeatureFlags.shouldUseHybridMatching(userId)) {
      return HybridMatchmakingService.findMatch(userId, gameMode, preferences);
    } else {
      return OptimisticMatchmakingService.findMatch(userId, gameMode, preferences);
    }
  }
}
```

---

**Implementation Status**: Ready for Development  
**Architecture**: Hybrid (Firestore + Redis + Realtime DB)  
**Expected Performance**: <1s matchmaking, >10x scalability  
**Migration Strategy**: Gradual rollout with feature flags

This architecture provides the foundation for a world-class matchmaking system that can scale to hundreds of thousands of concurrent players while maintaining the optimistic UX that users love. 🚀
