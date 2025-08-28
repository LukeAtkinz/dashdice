# 🏆 Ranked System Implementation Plan

## 📋 Current Codebase Analysis

### Existing Game Modes
1. **Quickfire** - Fast-paced, first to 50 points
2. **Classic Mode** - Best of 3, first to 100 points  
3. **Zero Hour** - Start at 100, race to exactly 0
4. **Last Line** - Single roll elimination, highest wins
5. **True Grit** - No banking elimination mode

### Current Architecture
- **MatchmakingService**: Handles room creation and game logic
- **GameModeService**: Manages mode-specific rules and configurations
- **UserService**: User profile and stats management
- **Firebase Collections**: `users`, `matches`, `completedmatches`, `gameModes`
- **Game Mode Icons**: Stored in `/Design Elements/` with specific icons per mode

---

## 🎯 Implementation Stages - STAGE 2 COMPLETE ✅

### **STAGE 1: FUNDAMENTALS** ✅ COMPLETE
**Goal**: Basic ranked/quick distinction and database structure

#### 1.1 Database Schema Setup ✅
- ✅ Add `gameType` field to distinguish "quick" vs "ranked"
- ✅ Create `seasons` collection for Dash tracking
- ✅ Add ranked stats to `users` collection
- ✅ Create `rankedMatches` collection for competitive tracking

#### 1.2 Core Game Type Logic
- Modify matchmaking to support `gameType` parameter
- Update waiting room to show Quick vs Ranked
- Ensure rematches preserve original game type
- Add ranked validation (no friends in ranked)

#### 1.3 User Interface Updates
- Add Quick/Ranked toggle to game mode selector
- Update waiting room display
- Show game type in match interface

---

### **STAGE 2: ADVANCED FUNCTIONALITY**
**Goal**: Full seasonal system and competitive features

#### 2.1 Season Management System
- Implement 2-week "Dash" seasons
- Auto-reset seasonal leaderboards
- Level progression (1-10, 5 wins per level)
- Season history tracking

#### 2.2 Leaderboard Services
- Real-time seasonal rankings
- All-time stats aggregation
- Performance calculations (win rate, streaks)
- Anti-cheat validation

#### 2.3 Matchmaking Enhancement
- Skill-based matchmaking for ranked
- ELO-style rating system (optional)
- Queue management
- Fair opponent matching

---

### **STAGE 3: STYLING & UX**
**Goal**: Polished UI and complete user experience

#### 3.1 Enhanced UI Components
- Ranked vs Quick visual distinction
- Season progress indicators
- Leaderboard components
- Achievement integration

#### 3.2 User Experience Polish
- Smooth transitions between game types
- Clear feedback on ranked restrictions
- Progress celebrations
- Statistics dashboards

---

## 🔧 Technical Integration Points

### Key Files to Modify
1. **src/services/matchmakingService.ts** - Add gameType logic
2. **src/components/dashboard/GameWaitingRoom.tsx** - Show game type
3. **src/services/userService.ts** - Add ranked stats
4. **src/types/** - Add ranked interfaces
5. **Database collections** - Add ranked schema

### New Services Needed
1. **seasonService.ts** - Manage Dash seasons
2. **leaderboardService.ts** - Rankings and stats
3. **rankedMatchmakingService.ts** - Competitive matching

### Integration with Existing Features
- **Friend System**: Disable ranked for friend matches
- **Achievements**: Add ranked-specific achievements  
- **Game Modes**: All modes support Quick/Ranked
- **Rematch System**: Preserve game type selection

---

## 🚀 Next Steps

### Stage 1 Implementation Order:
1. Create database schema and types
2. Modify matchmaking service for game types
3. Update UI components for Quick/Ranked selection
4. Test basic functionality

Ready to begin Stage 1 implementation!
