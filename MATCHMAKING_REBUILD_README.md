# DashDice Matchmaking System Rebuild - Context & Requirements

## Current Project State

### Technology Stack
- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore for database, Auth for authentication)
- **State Management**: React Context (AuthContext, InventoryContext, BackgroundContext)
- **Real-time**: Firebase listeners for live updates

### Project Structure
```
src/
├── components/
│   └── dashboard/
│       ├── DashboardSectionNew.tsx     # Game mode selection
│       ├── GameWaitingRoom.tsx         # Waiting room UI
│       └── MatchSectionNew.tsx         # Match interface
├── context/
│   ├── AuthContext.tsx                 # User authentication
│   ├── InventoryContext.tsx            # User inventory/items
│   ├── BackgroundContext.tsx           # Background management
│   └── NavigationContext.tsx           # App navigation
├── services/
│   └── matchmakingService.ts           # Current matchmaking logic
└── config/
    └── backgrounds.ts                  # Background configurations
```

## Critical Problems to Solve

### 1. **Duplicate Document Creation**
- **Current Issue**: When users search for games, 3 documents are created instead of 1
- **Root Cause**: Multiple competing systems (MatchmakingService vs GameWaitingRoom) both creating documents
- **Required Solution**: Single, unified matchmaking flow with ONE document creation point

### 2. **Player Data Integration**
- **Current Issue**: Background choices, stats, and player info not properly synchronized
- **Required Solution**: Comprehensive player data structure with real-time Firebase sync

### 3. **Match Flow Consistency**
- **Current Issue**: Inconsistent player connection and match creation
- **Required Solution**: Clear state progression: Search → Waiting Room → Match Creation → Game Interface

## Required Matchmaking System Architecture

### Firebase Collections Structure

#### 1. `waitingroom` Collection
```typescript
interface WaitingRoomDocument {
  id: string;                           // Auto-generated document ID
  gameMode: string;                     // 'quickfire', 'classic', etc.
  host: {
    playerId: string;                   // Firebase Auth UID
    displayName: string;                // Player display name
    equippedBackground: string;         // Background ID from config
    stats: {
      bestStreak: number;
      currentStreak: number;
      gamesPlayed: number;
      matchWins: number;
    };
  };
  guest?: {                            // Optional - filled when second player joins
    playerId: string;
    displayName: string;
    equippedBackground: string;
    stats: {
      bestStreak: number;
      currentStreak: number;
      gamesPlayed: number;
      matchWins: number;
    };
  };
  status: 'waiting' | 'full' | 'starting';
  createdAt: Timestamp;
  expiresAt: Timestamp;                // Auto-cleanup after 5 minutes
}
```

#### 2. `matches` Collection
```typescript
interface MatchDocument {
  id: string;                          // Auto-generated document ID
  gameMode: string;
  players: {
    player1: PlayerMatchData;
    player2: PlayerMatchData;
  };
  gameState: {
    currentTurn: 'player1' | 'player2';
    round: number;
    scores: {
      player1: number;
      player2: number;
    };
    status: 'starting' | 'in-progress' | 'completed';
  };
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
}

interface PlayerMatchData {
  playerId: string;
  displayName: string;
  equippedBackground: string;
  isReady: boolean;
  stats: PlayerStats;
}
```

### Matchmaking Flow Requirements

#### Phase 1: Game Mode Selection (DashboardSectionNew.tsx)
1. User clicks "LIVE PLAY" on a game mode
2. **SINGLE ACTION**: Create OR find existing waiting room document
3. Navigate to waiting room interface

#### Phase 2: Waiting Room (GameWaitingRoom.tsx)
1. Display player information with backgrounds
2. Real-time listener for second player joining
3. When room becomes full:
   - Show "Opponent Found!" message
   - 5-second countdown
   - Create match document with both players' data
   - Navigate both players to match interface

#### Phase 3: Match Interface (MatchSectionNew.tsx)
1. Real-time game state synchronization
2. Turn-based dice rolling mechanics
3. Live score updates
4. Match completion handling

## Technical Requirements

### 1. **Single Matchmaking Service**
- Eliminate competing systems
- One centralized service for all matchmaking operations
- Clear error handling and cleanup

### 2. **Real-time State Management**
- Firebase listeners for live updates
- Proper cleanup on component unmount
- Optimistic UI updates where appropriate

### 3. **Data Consistency**
- Player backgrounds from InventoryContext/BackgroundContext
- Stats integration from user profiles
- Proper type safety throughout

### 4. **Background System Integration**
- Use standardized Background interface from config/backgrounds.ts
- Real-time background loading in waiting room
- Persistence across refresh/relogin

## Game Modes Available
- **QUICK FIRE**: Available (primary focus)
- **CLASSIC MODE**: Coming soon
- **ZERO HOUR**: Coming soon  
- **LAST LINE**: Coming soon
- **TRUE GRIT**: Coming soon
- **TAG TEAM**: Coming soon

## User Experience Goals

### Primary Flow
1. **Dashboard** → Select game mode → Click "LIVE PLAY"
2. **Waiting Room** → See your character, wait for opponent
3. **Match Found** → 5-second countdown with opponent preview
4. **Game Interface** → 1v1 dice game with real-time updates
5. **Match Complete** → Stats update, return to dashboard

### Secondary Features (Future)
- Friend system integration
- Chat functionality during matches
- Profile editing
- Advanced statistics tracking
- Tournament modes

## Success Criteria

### Immediate Goals
1. **ONE document creation** when searching for games
2. **Proper player data sync** including backgrounds, stats, display names
3. **Smooth matchmaking flow** from search → waiting → match → game
4. **Real-time updates** throughout the entire process

### Quality Metrics
- No duplicate documents in Firebase
- Sub-3-second matchmaking when opponent available
- Proper cleanup of expired waiting rooms
- Background persistence across all interfaces
- Type-safe data flow throughout

## Development Approach

### Recommended Strategy
1. **Start Fresh**: Build new unified matchmaking service
2. **Single Source of Truth**: One service handles all document creation
3. **Progressive Implementation**: Focus on QUICK FIRE mode first
4. **Real-time First**: Design with Firebase listeners as primary pattern
5. **Type Safety**: Strict TypeScript interfaces for all data structures

### Testing Requirements
- Firebase cleanup scripts for development testing
- Multiple browser testing for real-time sync
- Edge case handling (network issues, user leaving, etc.)

## Notes for Implementation
- Current Firebase security rules need review for new structure
- Existing MatchmakingService.ts should be completely replaced
- GameWaitingRoom.tsx needs significant refactor for new data flow
- Background system conflicts between config and legacy formats must be resolved

This represents a complete rebuild of the matchmaking system with clear requirements and no legacy conflicts.
