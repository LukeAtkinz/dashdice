# Waiting Room System

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Firebase Collections](#firebase-collections)
4. [Data Flow](#data-flow)
5. [Matchmaking Process](#matchmaking-process)
6. [Real-time Communication](#real-time-communication)
7. [Component Structure](#component-structure)
8. [Service Layer](#service-layer)
9. [Security & Validation](#security--validation)
10. [Error Handling](#error-handling)
11. [Performance Optimization](#performance-optimization)
12. [Integration with Matches](#integration-with-matches)

---

## Overview

The Waiting Room system in DashDice is the core matchmaking infrastructure that connects players for real-time gaming sessions. It manages player queuing, opponent discovery, room management, and the transition from waiting state to active matches.

### Key Features
- **Automatic Matchmaking**: Find and join available opponents
- **Real-time Updates**: Live synchronization using Firebase listeners
- **Room Management**: Create, join, and leave waiting rooms
- **Player Profiles**: Full player data including stats and backgrounds
- **Security**: Transaction-based operations to prevent race conditions
- **Cleanup**: Automatic room expiration and cleanup
- **Visual Feedback**: Rich UI with countdown timers and status updates

---

## Architecture

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Dashboard     │    │ Waiting Room    │    │     Match       │
│   Component     │───▶│   Component     │───▶│   Component     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Matchmaking    │    │ WaitingRoom     │    │    Match        │
│    Service      │    │   Service       │    │   Service       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                ▼
                    ┌─────────────────┐
                    │    Firebase     │
                    │   Firestore     │
                    └─────────────────┘
```

### Data Flow Lifecycle
1. **Initiation**: Player clicks "Live Play" from dashboard
2. **Room Discovery**: System searches for available rooms
3. **Room Creation/Joining**: Create new room or join existing one
4. **Real-time Sync**: Firebase listeners for live updates
5. **Opponent Matching**: Wait for second player to join
6. **Countdown Phase**: 5-second countdown when both players ready
7. **Match Transition**: Move from `waitingroom` to `matches` collection
8. **Game Start**: Navigate to active match component

---

## Firebase Collections

### `waitingroom` Collection Structure

```typescript
interface WaitingRoomEntry {
  // Metadata
  createdAt: Timestamp;
  gameMode: string;              // 'quickfire', 'classic', 'zerohour', etc.
  gameType: string;              // 'Open Server', 'Private Rematch'
  playersRequired: number;       // 1 = waiting for opponent, 0 = full
  
  // Host player data
  hostData: {
    playerDisplayName: string;
    playerId: string;
    displayBackgroundEquipped: Background | null;
    matchBackgroundEquipped: Background | null;
    playerStats: {
      bestStreak: number;
      currentStreak: number;
      gamesPlayed: number;
      matchWins: number;
    };
  };
  
  // Opponent data (optional - added when second player joins)
  opponentData?: {
    playerDisplayName: string;
    playerId: string;
    displayBackgroundEquipped: Background | null;
    matchBackgroundEquipped: Background | null;
    playerStats: {
      bestStreak: number;
      currentStreak: number;
      gamesPlayed: number;
      matchWins: number;
    };
  };
  
  // Game configuration
  gameData?: {
    type: string;
    settings: Record<string, any>;
    roundObjective?: number;
    startingScore?: number;
    turnDecider?: number;
  };
  
  // Security features
  allowedPlayerIds?: string[];   // Only these players can join
  lockedAt?: Timestamp;         // When room was locked to 2 players
  expiresAt?: Timestamp;        // Auto-cleanup timestamp
}
```

### Background Data Format
```typescript
interface Background {
  name: string;
  file: string;        // Path to image/video file
  type: 'image' | 'video' | 'gradient';
}
```

---

## Data Flow

### 1. Room Creation Process
```typescript
// User clicks "Live Play"
const userData = await getUserData(); // Fetch player profile

// Search for existing rooms
const existingRooms = await findExistingRooms(gameMode);

if (existingRooms.length > 0) {
  // Join existing room as opponent
  await addOpponentToRoom(roomId, userData);
} else {
  // Create new room as host
  const roomId = await createNewRoom(gameMode, userData);
}

// Set up real-time listener
const unsubscribe = onSnapshot(roomDoc, handleRoomUpdates);
```

### 2. Real-time Updates Flow
```typescript
// Firebase listener callback
const handleRoomUpdates = (doc) => {
  if (doc.exists()) {
    const roomData = doc.data();
    
    // Update local state
    setWaitingRoomEntry(roomData);
    
    // Check if opponent joined
    if (roomData.opponentData && !opponentJoined) {
      setOpponentJoined(true);
      startVsCountdown(); // Begin 5-second countdown
    }
  }
};
```

### 3. Match Transition Process
```typescript
// After countdown completes
const moveToMatchesAndNavigate = async () => {
  // Create match document
  const matchData = {
    ...roomData,
    gameData: {
      ...roomData.gameData,
      gamePhase: 'turnDecider',
      turnDecider: Math.floor(Math.random() * 2) + 1,
      // Initialize game state variables
    }
  };
  
  // Add to matches collection
  const matchDocRef = await addDoc(collection(db, 'matches'), matchData);
  
  // Remove from waiting room
  await deleteDoc(doc(db, 'waitingroom', roomId));
  
  // Navigate to match
  setCurrentSection('match', { matchId: matchDocRef.id });
};
```

---

## Matchmaking Process

### Transaction-Based Room Management
The system uses Firestore transactions to prevent race conditions:

```typescript
const findOrCreateRoom = async (gameMode, hostData) => {
  return await runTransaction(db, async (transaction) => {
    // 1. Search for available rooms
    const availableRooms = await findAvailableRooms(gameMode);
    
    // 2. Filter out expired rooms and own rooms
    const validRooms = filterValidRooms(availableRooms, hostData.playerId);
    
    if (validRooms.length > 0) {
      // 3. Join existing room as opponent
      const roomRef = doc(db, 'waitingroom', validRooms[0].id);
      transaction.update(roomRef, {
        opponentData: hostData,
        playersRequired: 0,
        lockedAt: serverTimestamp()
      });
      return { roomId: validRooms[0].id, hasOpponent: true };
    } else {
      // 4. Create new room as host
      const newRoomRef = doc(collection(db, 'waitingroom'));
      transaction.set(newRoomRef, {
        hostData,
        playersRequired: 1,
        createdAt: serverTimestamp()
      });
      return { roomId: newRoomRef.id, hasOpponent: false };
    }
  });
};
```

### Room Expiration System
- **Timeout**: Rooms automatically expire after 20 minutes
- **Cleanup**: Expired rooms are deleted during matchmaking queries
- **Security**: Only valid, non-expired rooms are available for joining

### Player Validation
- **Unique Players**: Prevents same player from joining own room
- **Player Limits**: Enforces maximum 2 players per room
- **Authentication**: Requires valid Firebase Auth session

---

## Real-time Communication

### Firebase Listeners
The system uses `onSnapshot` for real-time updates:

```typescript
// Set up room listener
const unsubscribe = onSnapshot(
  doc(db, 'waitingroom', roomId),
  (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      setWaitingRoomEntry(data);
      
      // Check for opponent joining
      if (data.opponentData && !opponentJoined) {
        setOpponentJoined(true);
        startVsCountdown();
      }
    } else {
      // Room was deleted (moved to matches)
      handleRoomMoved();
    }
  },
  (error) => {
    console.error('Room listener error:', error);
    setError('Connection error');
  }
);
```

### Error Recovery
- **Connection Loss**: Graceful handling of network issues
- **Stale Data**: Automatic refresh on reconnection
- **Room Conflicts**: Detection and resolution of duplicate joins

---

## Component Structure

### GameWaitingRoom Component
```tsx
interface GameWaitingRoomProps {
  gameMode: string;
  gameType: string;
  actionType: 'live' | 'custom';
  roomId?: string;           // For rejoining specific rooms
  onBack: () => void;
  setCurrentSection: (section: string, params?: any) => void;
}
```

### Key State Variables
```typescript
const [waitingRoomEntry, setWaitingRoomEntry] = useState<WaitingRoomEntry | null>(null);
const [opponentJoined, setOpponentJoined] = useState(false);
const [vsCountdown, setVsCountdown] = useState<number | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState('');
const [searchingText, setSearchingText] = useState('Searching for opponents...');
```

### Visual States
1. **Loading State**: Searching animation with rotating text
2. **Waiting State**: Player profile display, waiting for opponent
3. **VS State**: Both players shown with countdown timer
4. **Error State**: User-friendly error messages with retry options

---

## Service Layer

### MatchmakingService
Primary service for room management:

```typescript
class MatchmakingService {
  // Main matchmaking function
  static async findOrCreateRoom(gameMode: string, hostData: any);
  
  // Room management
  static async addOpponentToRoom(roomId: string, opponentData: any);
  static async moveToMatches(roomId: string);
  
  // Utility functions
  static async findOpenRoom(gameMode: string);
  static getRoundObjective(gameMode: string): number;
  static convertBackgroundToObject(background: string | object);
}
```

### WaitingRoomService
Alternative service implementation:

```typescript
class WaitingRoomService {
  // Room discovery
  static async findAvailableRooms(gameMode: string): Promise<WaitingRoom[]>;
  
  // Room lifecycle
  static async createRoom(gameMode: string, hostData: any): Promise<string>;
  static async joinRoom(roomId: string, playerData: any): Promise<void>;
  static async leaveRoom(roomId: string, playerUid: string): Promise<void>;
  
  // Real-time updates
  static subscribeToRoom(roomId: string, callback: Function): () => void;
  static async updatePlayerReady(roomId: string, playerUid: string, ready: boolean);
}
```

---

## Security & Validation

### Access Control
```typescript
// Security checks during room joining
const securityValidation = {
  // Prevent self-joining
  hostValidation: hostData.playerId !== currentUserId,
  
  // Room capacity limits
  playerLimit: currentPlayers < maxPlayers,
  
  // Expiration checks
  timeValidation: roomCreatedAt > twentyMinutesAgo,
  
  // Authentication
  authRequired: user?.uid && user.email
};
```

### Data Validation
```typescript
// Ensure required player data
const validatePlayerData = (playerData) => {
  return {
    playerDisplayName: playerData.displayName || 'Anonymous',
    playerId: playerData.uid,
    playerStats: {
      bestStreak: playerData.stats?.bestStreak || 0,
      currentStreak: playerData.stats?.currentStreak || 0,
      gamesPlayed: playerData.stats?.gamesPlayed || 0,
      matchWins: playerData.stats?.matchWins || 0
    }
  };
};
```

### Anti-Duplicate Measures
- **Transaction Usage**: Atomic operations prevent duplicate room creation
- **Room Locking**: `playersRequired: 0` locks room when full
- **Player ID Tracking**: `allowedPlayerIds` array restricts access
- **Timestamp Validation**: `lockedAt` field prevents late joins

---

## Error Handling

### Connection Errors
```typescript
const handleConnectionError = (error) => {
  console.error('Firebase connection error:', error);
  setError('Connection lost. Reconnecting...');
  
  // Retry logic
  setTimeout(() => {
    attemptReconnection();
  }, 3000);
};
```

### Room Not Found
```typescript
const handleRoomNotFound = () => {
  // Check if room moved to matches
  const existingMatch = await findMatchByPlayerId(user.uid);
  
  if (existingMatch) {
    // Navigate to existing match
    setCurrentSection('match', { matchId: existingMatch.id });
  } else {
    // Return to dashboard
    setError('Room no longer available');
    setTimeout(onBack, 2000);
  }
};
```

### Opponent Disconnect
```typescript
const handleOpponentLeave = () => {
  setOpponentJoined(false);
  setVsCountdown(null);
  
  // Reset room to waiting state
  updateDoc(roomRef, {
    opponentData: deleteField(),
    playersRequired: 1
  });
};
```

---

## Performance Optimization

### Efficient Queries
```typescript
// Optimized room search with compound indexes
const findAvailableRooms = async (gameMode) => {
  const q = query(
    collection(db, 'waitingroom'),
    where('gameMode', '==', gameMode),
    where('gameType', '==', 'Open Server'),
    where('playersRequired', '==', 1),
    orderBy('createdAt', 'asc'),
    limit(5) // Limit results for performance
  );
  
  return await getDocs(q);
};
```

### Memory Management
```typescript
// Cleanup listeners on component unmount
useEffect(() => {
  return () => {
    if (roomListener) {
      roomListener(); // Unsubscribe from Firebase
    }
    if (waitingRoomEntry?.id) {
      deleteDoc(doc(db, 'waitingroom', waitingRoomEntry.id))
        .catch(console.error);
    }
  };
}, []);
```

### Debounced Updates
```typescript
// Prevent excessive state updates
const debouncedUpdateRoom = useMemo(
  () => debounce((roomData) => {
    setWaitingRoomEntry(roomData);
  }, 100),
  []
);
```

---

## Integration with Matches

### Data Migration Process
When transitioning from waiting room to active match:

```typescript
const transitionToMatch = async (roomData) => {
  // 1. Enhance room data with game state
  const matchData = {
    ...roomData,
    
    // Add game-specific fields
    gameData: {
      ...roomData.gameData,
      gamePhase: 'turnDecider',
      turnDecider: Math.floor(Math.random() * 2) + 1,
      currentTurn: 1,
      turnScore: 0,
      diceOne: 0,
      diceTwo: 0,
      isRolling: false
    },
    
    // Initialize player game states
    hostData: {
      ...roomData.hostData,
      turnActive: false,
      playerScore: 0,
      roundScore: 0,
      matchStats: {
        banks: 0,
        doubles: 0,
        biggestTurnScore: 0,
        lastDiceSum: 0
      }
    },
    
    opponentData: {
      ...roomData.opponentData,
      turnActive: false,
      playerScore: 0,
      roundScore: 0,
      matchStats: {
        banks: 0,
        doubles: 0,
        biggestTurnScore: 0,
        lastDiceSum: 0
      }
    }
  };
  
  // 2. Create match document
  const matchRef = await addDoc(collection(db, 'matches'), matchData);
  
  // 3. Delete waiting room document
  await deleteDoc(doc(db, 'waitingroom', roomData.id));
  
  return matchRef.id;
};
```

### Navigation Continuity
```typescript
// Seamless transition to match component
const handleMatchTransition = (matchId) => {
  setCurrentSection('match', {
    gameMode: waitingRoomEntry.gameMode,
    matchId: matchId
  });
};
```

### Background Preservation
Player-selected backgrounds are preserved through the transition:
- **Display Background**: Maintained for UI consistency
- **Match Background**: Applied to game environment
- **Format Conversion**: Handles both string and object formats

---

## User Experience Features

### Visual Feedback
- **Loading Animations**: Rotating search text keeps users engaged
- **Progress Indicators**: Clear waiting vs. matched states
- **Countdown Timers**: 5-second countdown before match start
- **Background Previews**: Player backgrounds shown in waiting room

### Accessibility
- **Keyboard Navigation**: Tab-accessible controls
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **High Contrast**: Readable text on background videos/images
- **Error Messages**: Clear, actionable error descriptions

### Responsive Design
- **Mobile Optimization**: Touch-friendly interface
- **Flexible Layouts**: Adapts to different screen sizes
- **Performance**: Optimized for various device capabilities

---

## Development Tools

### Debugging Scripts
- **clearWaitingRoom.js**: Cleans all waiting room documents
- **clearMatches.js**: Removes all match documents
- **Firebase Console**: Real-time database monitoring

### Testing Utilities
```typescript
// Add test opponent for development
const addTestOpponent = async (roomId) => {
  const testOpponent = {
    playerDisplayName: "Test Player",
    playerId: "test_player_id",
    playerStats: { /* test stats */ }
  };
  
  await updateDoc(doc(db, 'waitingroom', roomId), {
    opponentData: testOpponent
  });
};
```

### Monitoring & Logging
```typescript
// Comprehensive logging for debugging
console.log('🎮 Room Update:', {
  roomId: doc.id,
  hasOpponent: !!data.opponentData,
  playersRequired: data.playersRequired,
  gameMode: data.gameMode
});
```

---

## Best Practices

### Code Organization
1. **Separation of Concerns**: Keep UI, business logic, and data separate
2. **Error Boundaries**: Implement comprehensive error handling
3. **Type Safety**: Use TypeScript interfaces for all data structures
4. **Performance**: Optimize Firebase queries and component renders
5. **Testing**: Unit tests for service functions and integration tests

### Firebase Usage
1. **Security Rules**: Implement proper Firestore security rules
2. **Indexing**: Create compound indexes for complex queries
3. **Limits**: Respect Firebase usage limits and quotas
4. **Offline Support**: Handle network connectivity issues
5. **Data Modeling**: Design efficient document structures

### User Experience
1. **Loading States**: Always provide feedback during operations
2. **Error Recovery**: Graceful degradation and retry mechanisms
3. **Accessibility**: Support assistive technologies
4. **Performance**: Optimize for low-end devices and slow networks
5. **Consistency**: Maintain visual and behavioral consistency

---

## Future Enhancements

### Planned Features
- **Skill-Based Matching**: Match players by skill level
- **Tournament Modes**: Multi-player tournament brackets
- **Spectator Mode**: Allow watching ongoing matches
- **Chat System**: In-room messaging between players
- **Custom Game Modes**: User-defined game configurations

### Technical Improvements
- **Caching Layer**: Redis for frequently accessed data
- **Load Balancing**: Distribute Firebase load across regions
- **Analytics**: Track matchmaking success rates and times
- **A/B Testing**: Experiment with different matching algorithms
- **Mobile App**: Native mobile application support

---

This comprehensive waiting room system provides a robust foundation for real-time multiplayer gaming in DashDice, ensuring reliable player matching, seamless transitions to active games, and an engaging user experience throughout the matchmaking process.
