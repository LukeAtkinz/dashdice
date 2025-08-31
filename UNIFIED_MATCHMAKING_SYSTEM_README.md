# 🎲 DashDice Unified Matchmaking System - Complete Rebuild

## 🎯 System Overview

This document outlines the complete rebuild of the DashDice matchmaking system, integrating **Quick Games**, **Ranked Games**, **Friend Invites**, **Rematches**, and the new **Tournament System**.

## 🏗️ Architecture Design

### Core Services Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   UNIFIED MATCHMAKING CORE                 │
├─────────────────────────────────────────────────────────────┤
│  🎮 GameSessionService     │  🏆 TournamentService          │
│  📊 MatchmakingOrchestrator │  🔄 RematchService            │
│  👥 FriendInviteService     │  📈 RankedMatchmakingService  │
│  ⚡ QuickMatchService       │  🎯 SkillBasedMatchmaking     │
└─────────────────────────────────────────────────────────────┘
```

## 🎮 Game Types & Features

### 1. Quick Games
- **Purpose**: Casual, instant matchmaking
- **Matchmaking**: Open rooms, first-come-first-served
- **Progression**: Basic stats tracking only
- **Eligibility**: All players
- **Features**: Fast queue times, no ranking impact

### 2. Ranked Games  
- **Purpose**: Competitive seasonal progression
- **Matchmaking**: Skill-based with level restrictions
- **Progression**: Dash seasons (2 weeks), 10 levels per season
- **Eligibility**: "Ranked - Active" players only (no friends)
- **Features**: Leaderboards, seasonal rewards, achievement tracking

### 3. Friend Invites
- **Purpose**: Private games with friends
- **Matchmaking**: Direct invitation system
- **Progression**: Basic stats only (no ranked progression)
- **Eligibility**: Friends only
- **Features**: Custom game modes, private lobbies

### 4. Tournaments 🆕
- **Purpose**: Weekly competitive events
- **Schedule**: Friday, Saturday, Sunday 7:00-8:00 PM
- **Format**: 8-player single elimination bracket
- **Rewards**: Exclusive tournament backgrounds
- **Registration**: Open throughout the week

### 5. Rematches
- **Purpose**: Instant replay with same opponent
- **Matchmaking**: Preserves original game type and settings
- **Progression**: Inherits original match type (quick/ranked/friend)
- **Eligibility**: Same as original match
- **Features**: Game mode selector, preserved customizations

## 🗄️ Firebase Collections Structure

### Core Collections

#### `users` Collection
```typescript
{
  uid: string,
  displayName: string,
  email: string,
  rankedStatus: 'Ranked - Active' | 'Ranked - Inactive' | 'Unranked',
  
  // Basic Stats
  stats: {
    gamesPlayed: number,
    matchWins: number,
    currentStreak: number,
    bestStreak: number
  },
  
  // Ranked Stats
  rankedStats?: {
    currentSeason: {
      dashNumber: number,
      level: number,
      winsInLevel: number,
      totalWins: number,
      totalLosses: number,
      winStreak: number,
      longestWinStreak: number,
      gamesPlayed: number
    },
    allTime: {
      totalDashes: number,
      maxLevelReached: number,
      totalRankedWins: number,
      totalRankedLosses: number,
      totalRankedGames: number,
      longestWinStreak: number,
      averageLevel: number
    }
  },
  
  // Tournament History
  tournamentHistory?: {
    participations: number,
    wins: number,
    finals: number,
    semifinals: number,
    backgroundsEarned: string[]
  },
  
  // Other existing fields...
  inventory: { ... },
  settings: { ... },
  friends: string[],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `gameSessions` Collection (Unified)
```typescript
{
  id: string,
  sessionType: 'quick' | 'ranked' | 'friend' | 'tournament' | 'rematch',
  gameMode: string,
  status: 'waiting' | 'matched' | 'active' | 'completed' | 'cancelled',
  
  // Player Data
  hostData: {
    playerId: string,
    playerDisplayName: string,
    playerStats: { ... },
    displayBackgroundEquipped: any,
    matchBackgroundEquipped: any,
    ready: boolean
  },
  
  opponentData?: {
    playerId: string,
    playerDisplayName: string,
    playerStats: { ... },
    displayBackgroundEquipped: any,
    matchBackgroundEquipped: any,
    ready: boolean
  },
  
  // Session Configuration
  gameConfiguration: {
    maxPlayers: number,
    allowedPlayerIds?: string[], // For friend/rematch games
    skillRange?: { min: number, max: number }, // For ranked matching
    requireActiveRanked?: boolean,
    preserveFromMatch?: string // For rematches
  },
  
  // Tournament Specific
  tournamentData?: {
    tournamentId: string,
    bracket: string,
    round: number,
    position: number
  },
  
  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp,
  expiresAt: Timestamp,
  matchedAt?: Timestamp,
  completedAt?: Timestamp
}
```

#### `tournaments` Collection 🆕
```typescript
{
  id: string,
  name: string,
  description: string,
  
  // Schedule
  scheduledDate: Timestamp, // Friday/Saturday/Sunday 7PM
  registrationOpens: Timestamp,
  registrationCloses: Timestamp,
  tournamentStarts: Timestamp,
  tournamentEnds: Timestamp,
  
  // Configuration
  maxParticipants: 8,
  gameMode: string,
  bracketType: 'single-elimination',
  
  // Status
  status: 'upcoming' | 'registration-open' | 'registration-closed' | 'active' | 'completed' | 'cancelled',
  
  // Participants
  participants: {
    playerId: string,
    playerDisplayName: string,
    registeredAt: Timestamp,
    skillLevel?: number
  }[],
  
  // Bracket
  bracket: {
    round1: { match1: string, match2: string, match3: string, match4: string },
    semifinals: { match1: string, match2: string },
    finals: { match1: string },
    winner?: string
  },
  
  // Rewards
  rewards: {
    winner: { backgroundId: string, title: string },
    finalist: { backgroundId: string },
    participant: { experience: number }
  },
  
  // Metadata
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `seasons` Collection
```typescript
{
  id: string,
  dashNumber: number,
  name: string, // "Dash 1", "Dash 2", etc.
  startDate: Timestamp,
  endDate: Timestamp,
  status: 'upcoming' | 'active' | 'completed',
  
  // Configuration
  maxLevel: 10,
  winsPerLevel: 5,
  
  // Leaderboard snapshot at season end
  finalLeaderboard?: LeaderboardEntry[],
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `rankedMatches` Collection
```typescript
{
  id: string,
  gameType: 'ranked',
  gameMode: string,
  dashNumber: number,
  
  hostData: {
    playerId: string,
    levelBefore: number,
    levelAfter: number,
    winsBefore: number,
    winsAfter: number
  },
  
  opponentData: {
    playerId: string,
    levelBefore: number,
    levelAfter: number,
    winsBefore: number,
    winsAfter: number
  },
  
  winnerId: string,
  originalRoomId: string,
  createdAt: Timestamp,
  completedAt: Timestamp
}
```

## 🔄 Matchmaking Flow Logic

### 1. Quick Game Flow
```typescript
User clicks "Quick Game" → 
  GameSessionService.createQuickGameSession() →
  QuickMatchService.findOrCreateRoom() →
  Match found → Game starts
```

### 2. Ranked Game Flow  
```typescript
User clicks "Ranked" →
  RankedMatchmakingService.validateEligibility() →
  Check: rankedStatus === 'Ranked - Active' →
  Check: not playing with friends →
  SkillBasedMatchmaking.findSuitableOpponent() →
  GameSessionService.createRankedSession() →
  Match found → Game starts
```

### 3. Friend Invite Flow
```typescript
User invites friend →
  FriendInviteService.sendInvitation() →
  Friend accepts →
  GameSessionService.createFriendSession() →
  Private game starts
```

### 4. Tournament Flow
```typescript
User registers for tournament →
  TournamentService.registerPlayer() →
  Tournament starts →
  TournamentService.generateBracket() →
  Sequential bracket matches →
  Winner receives background reward
```

### 5. Rematch Flow
```typescript
Game ends → 
  User requests rematch →
  RematchService.createRematchRoom() →
  Preserve original session type and settings →
  Opponent accepts →
  New session created with same configuration
```

## 🛡️ Security & Validation

### User Eligibility Checks
- **Ranked Games**: Must have `rankedStatus: 'Ranked - Active'`
- **Friend Games**: Must be in each other's friends list
- **Tournaments**: Must be registered and have active ranked status
- **Rematches**: Must preserve original eligibility requirements

### Anti-Abuse Measures
- **Rate Limiting**: Max 3 concurrent session searches per user
- **Session Timeouts**: 20-minute automatic cleanup
- **Duplicate Prevention**: Transaction-based room creation
- **Skill Gap Limits**: Max 3-level difference in ranked matching
- **Friend Validation**: Server-side friend status verification

### Data Integrity
- **Atomic Updates**: Use Firestore transactions for all critical operations
- **Validation Layers**: Schema validation at service layer
- **Error Recovery**: Graceful fallbacks and cleanup procedures
- **Audit Trails**: Comprehensive logging for all matchmaking events

## 🎮 Tournament System Details

### Weekly Tournament Schedule
```
┌─────────────┬──────────────────┬────────────────────┐
│    Day      │      Time        │   Tournament Type  │
├─────────────┼──────────────────┼────────────────────┤
│   Friday    │   7:00-8:00 PM   │   Classic Mode     │
│  Saturday   │   7:00-8:00 PM   │   Quickfire        │
│   Sunday    │   7:00-8:00 PM   │   Zero Hour        │
└─────────────┴──────────────────┴────────────────────┘
```

### Tournament Bracket Format
```
Round 1: 8 players → 4 matches → 4 winners
Semifinals: 4 players → 2 matches → 2 winners  
Finals: 2 players → 1 match → 1 tournament champion
```

### Reward Structure
- **Tournament Winner**: Exclusive tournament background + title
- **Finalist**: Special tournament participant background  
- **All Participants**: Tournament experience points

### Registration System
- **Registration Window**: Sunday 8:01 PM - Friday 6:59 PM
- **Auto-Registration**: Players can set automatic tournament entry
- **Skill Balancing**: Bracket seeding based on current ranked level
- **Backup System**: Waitlist for oversubscribed tournaments

## 🔧 Implementation Phases

### Phase 1: Foundation (Week 1)
1. **Update UserService** with `rankedStatus` field
2. **Create GameSessionService** for unified session management
3. **Update Firebase security rules** for new collections
4. **Migrate existing users** to `rankedStatus: 'Ranked - Active'`

### Phase 2: Core Matchmaking (Week 2)
1. **Rebuild MatchmakingService** with session-based architecture
2. **Implement QuickMatchService** for casual games
3. **Enhanced RankedMatchmakingService** with skill-based matching
4. **Update RematchService** to preserve session types

### Phase 3: Tournament System (Week 3)
1. **Create TournamentService** with scheduling logic
2. **Build tournament UI components**
3. **Implement bracket generation and management**
4. **Create tournament background reward system**

### Phase 4: Testing & Optimization (Week 4)
1. **Comprehensive testing** of all matchmaking flows
2. **Performance optimization** and caching strategies
3. **Error handling** and edge case resolution
4. **Security audit** and vulnerability assessment

## 📱 User Interface Updates

### Dashboard Integration
- **Game Mode Selector**: Enhanced with Quick/Ranked/Tournament options
- **Tournament Widget**: Show upcoming tournaments and registration status
- **Ranked Status Display**: Show current ranked status and season progress
- **Friend Invite Button**: Contextual friend game invitations

### Waiting Room Updates
- **Session Type Display**: Clear indication of game type
- **Player Status**: Show ranked levels for ranked games
- **Tournament Bracket**: Live bracket visualization during tournaments
- **Skill Matching**: Display compatible skill ranges

### Post-Game Experience
- **Progression Tracking**: Show ranked advancement and experience gained
- **Tournament Progress**: Bracket advancement and next match scheduling
- **Rematch Options**: Preserve original game type in rematch selector
- **Achievement Notifications**: Tournament wins and ranked milestones

## 🔍 Testing Strategy

### Unit Testing
- **Service Layer**: Comprehensive test coverage for all matchmaking services
- **Validation Logic**: Edge case testing for eligibility and skill matching
- **Tournament Logic**: Bracket generation and progression testing
- **Security**: Authorization and validation testing

### Integration Testing
- **End-to-End Flows**: Complete matchmaking cycles for each game type
- **Real-time Features**: Concurrent user scenarios and race condition testing
- **Firebase Integration**: Transaction handling and data consistency
- **Cross-Platform**: Mobile and desktop compatibility

### Load Testing
- **Concurrent Users**: High-load tournament registration scenarios
- **Database Performance**: Query optimization under load
- **Real-time Updates**: Stress testing live leaderboards and notifications
- **Error Recovery**: System behavior under failure conditions

## 📊 Analytics & Monitoring

### Key Metrics
- **Matchmaking Success Rate**: Percentage of successful matches by type
- **Average Queue Time**: Wait times across different game types and skill levels
- **Tournament Participation**: Registration and completion rates
- **Ranked Progression**: Distribution of players across ranked levels
- **User Engagement**: Session frequency and retention by game type

### Performance Monitoring
- **Firebase Query Performance**: Real-time database operation metrics
- **Client-Side Performance**: Matchmaking UI responsiveness
- **Error Rates**: Service failure rates and recovery times
- **Resource Usage**: Server costs and optimization opportunities

This unified system provides a robust, scalable foundation for all matchmaking needs while maintaining clear separation of concerns and comprehensive security measures.
