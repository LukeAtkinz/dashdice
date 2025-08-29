# 🏆 RANKED SYSTEM PROGRESSION ROADMAP

## Current Status: Foundation Complete ✅

The DashDice ranked system has successfully completed its foundational implementation with:
- ✅ **UI Integration**: Leaderboards styled and integrated into dashboard
- ✅ **Mock Data System**: Demo leaderboards with sample players
- ✅ **Navigation**: Ranked buttons in desktop and mobile nav
- ✅ **Matchmaking Framework**: Basic ranked match validation
- ✅ **Visual Design**: Friends card styling applied to leaderboards

---

## 🚀 NEXT PHASE: PRODUCTION RANKED SYSTEM

### **STAGE 1: Firebase Infrastructure Setup**

#### **1.1 Create Required Indexes**
**Priority: CRITICAL**
```bash
# Create these indexes in Firebase Console or via CLI
firebase deploy --only firestore:indexes
```

**Required Indexes:**
```json
{
  "indexes": [
    {
      "collectionGroup": "rankedStats",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "currentSeason.dashNumber", "order": "ASCENDING" },
        { "fieldPath": "currentSeason.level", "order": "DESCENDING" },
        { "fieldPath": "currentSeason.totalWins", "order": "DESCENDING" },
        { "fieldPath": "currentSeason.winsInLevel", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "rankedStats",
      "queryScope": "COLLECTION", 
      "fields": [
        { "fieldPath": "allTime.maxLevelReached", "order": "DESCENDING" },
        { "fieldPath": "allTime.totalRankedWins", "order": "DESCENDING" },
        { "fieldPath": "allTime.totalRankedGames", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "rankedMatches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "hostData.playerId", "order": "ASCENDING" },
        { "fieldPath": "completedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "rankedMatches", 
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "opponentData.playerId", "order": "ASCENDING" },
        { "fieldPath": "completedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

#### **1.2 Initialize First Season**
**File:** `scripts/initializeFirstSeason.js`
```javascript
// Admin SDK script to create the first official season
import admin from 'firebase-admin';

async function initializeFirstSeason() {
  const startDate = new Date('2025-09-01'); // Season 1 start
  const endDate = new Date('2025-09-15');   // 2-week duration
  
  await admin.firestore().collection('seasons').add({
    name: 'Dash 1: Genesis',
    startDate: admin.firestore.Timestamp.fromDate(startDate),
    endDate: admin.firestore.Timestamp.fromDate(endDate),
    isActive: true,
    dashNumber: 1,
    description: 'The inaugural season of competitive DashDice',
    rewards: {
      topTier: 'Diamond Crown Badge',
      participation: 'Season 1 Commemorative Die'
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}
```

#### **1.3 User Onboarding for Ranked**
**Enhancement:** Modify user registration to include ranked stats initialization
```typescript
// In UserService.createUserProfile()
const newUserProfile = {
  // ... existing fields
  rankedStats: {
    currentSeason: {
      dashNumber: await getCurrentSeasonNumber(),
      level: 1,
      winsInLevel: 0,
      totalWins: 0,
      totalLosses: 0,
      winStreak: 0,
      longestWinStreak: 0,
      gamesPlayed: 0
    },
    allTime: {
      totalDashes: 1,
      maxLevelReached: 1,
      totalRankedWins: 0,
      totalRankedLosses: 0,
      totalRankedGames: 0,
      longestWinStreak: 0,
      averageLevel: 1.0
    }
  },
  rankedEligible: true,
  placementMatches: 0 // Track placement matches (first 10 games)
};
```

---

### **STAGE 2: Real-Time Leaderboard System**

#### **2.1 Live Data Integration**
**File:** `src/services/leaderboardService.ts`

**Replace Mock Data with Real Queries:**
```typescript
// Remove generateMockLeaderboard() fallback
// Implement proper error handling without mock data
async getCurrentSeasonLeaderboard(limitCount: number = 100): Promise<LeaderboardEntry[]> {
  try {
    const currentSeason = await SeasonService.getCurrentSeason();
    if (!currentSeason) {
      throw new Error('No active season found');
    }
    
    // Get ranked stats with user profile data
    const [rankedStatsSnapshot, usersSnapshot] = await Promise.all([
      getDocs(query(
        collection(db, 'rankedStats'),
        where('currentSeason.dashNumber', '==', currentSeason.dashNumber),
        orderBy('currentSeason.level', 'desc'),
        orderBy('currentSeason.totalWins', 'desc'),
        orderBy('currentSeason.winsInLevel', 'desc'),
        firestoreLimit(limitCount)
      )),
      getDocs(collection(db, 'users'))
    ]);
    
    // Create user lookup map
    const userMap = new Map();
    usersSnapshot.docs.forEach(doc => {
      userMap.set(doc.id, doc.data());
    });
    
    // Build leaderboard with real user names
    const leaderboard: LeaderboardEntry[] = [];
    rankedStatsSnapshot.docs.forEach((doc, index) => {
      const rankedData = doc.data() as RankedStats;
      const userData = userMap.get(doc.id);
      
      leaderboard.push({
        playerId: doc.id,
        displayName: userData?.displayName || userData?.email?.split('@')[0] || 'Anonymous',
        level: rankedData.currentSeason.level,
        winsInLevel: rankedData.currentSeason.winsInLevel,
        totalWins: rankedData.currentSeason.totalWins,
        winRate: calculateWinRate(rankedData.currentSeason),
        winStreak: rankedData.currentSeason.winStreak,
        gamesPlayed: rankedData.currentSeason.gamesPlayed,
        rank: index + 1
      });
    });
    
    return leaderboard;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return []; // Return empty array instead of mock data
  }
}
```

#### **2.2 Real-Time Updates**
**Implementation:** WebSocket-style updates using Firestore listeners
```typescript
// In Leaderboard component
useEffect(() => {
  const unsubscribe = onSnapshot(
    query(
      collection(db, 'rankedStats'),
      where('currentSeason.dashNumber', '==', currentSeason?.dashNumber),
      orderBy('currentSeason.level', 'desc'),
      firestoreLimit(50)
    ),
    (snapshot) => {
      // Update leaderboard in real-time as matches complete
      const updatedEntries = processLeaderboardSnapshot(snapshot);
      setEntries(updatedEntries);
    }
  );
  
  return () => unsubscribe();
}, [currentSeason]);
```

---

### **STAGE 3: Skill-Based Matchmaking**

#### **3.1 ELO Rating Implementation**
**File:** `src/services/eloService.ts`
```typescript
export class EloService {
  private static readonly K_FACTOR = 32; // Rating adjustment factor
  
  static calculateNewRatings(
    winnerRating: number, 
    loserRating: number
  ): { winnerNew: number; loserNew: number } {
    const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));
    
    return {
      winnerNew: Math.round(winnerRating + this.K_FACTOR * (1 - expectedWinner)),
      loserNew: Math.round(loserRating + this.K_FACTOR * (0 - expectedLoser))
    };
  }
  
  static getPlayerRating(rankedStats: RankedStats): number {
    const baseRating = 1000;
    const levelBonus = rankedStats.currentSeason.level * 100;
    const winRateBonus = (rankedStats.currentSeason.totalWins / 
                         Math.max(1, rankedStats.currentSeason.gamesPlayed)) * 200;
    const experienceBonus = Math.min(rankedStats.allTime.totalRankedGames * 2, 100);
    
    return Math.round(baseRating + levelBonus + winRateBonus + experienceBonus);
  }
}
```

#### **3.2 Enhanced Matchmaking Algorithm**
**File:** `src/services/rankedMatchmakingService.ts`
```typescript
export class EnhancedRankedMatchmaking {
  static async findRankedOpponent(
    userId: string, 
    gameMode: string
  ): Promise<{ roomId: string; opponentFound: boolean }> {
    
    // 1. Get user's ranked stats and rating
    const userStats = await RankedMatchmakingService.getUserRankedStats(userId);
    const userRating = EloService.getPlayerRating(userStats);
    
    // 2. Find opponents in rating range (±200 points initially)
    let ratingRange = 200;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      const opponents = await this.findOpponentsInRange(
        userRating, 
        ratingRange, 
        gameMode,
        userId
      );
      
      if (opponents.length > 0) {
        // Select best match based on compatibility score
        const bestMatch = this.selectBestOpponent(userStats, opponents);
        return await this.createRankedRoom(userId, bestMatch, gameMode);
      }
      
      // Expand search range and try again
      ratingRange += 100;
      attempts++;
      
      // Wait 10 seconds between attempts
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    // No opponent found - create waiting room
    return await this.createRankedWaitingRoom(userId, gameMode);
  }
  
  private static calculateCompatibility(
    user: RankedStats, 
    opponent: RankedStats
  ): number {
    const levelDiff = Math.abs(user.currentSeason.level - opponent.currentSeason.level);
    const winRateDiff = Math.abs(
      (user.currentSeason.totalWins / Math.max(1, user.currentSeason.gamesPlayed)) -
      (opponent.currentSeason.totalWins / Math.max(1, opponent.currentSeason.gamesPlayed))
    );
    const experienceDiff = Math.abs(
      user.currentSeason.gamesPlayed - opponent.currentSeason.gamesPlayed
    );
    
    // Higher score = better match (inverted penalties)
    const levelScore = Math.max(0, 10 - levelDiff);
    const winRateScore = Math.max(0, 10 - (winRateDiff * 20));
    const experienceScore = Math.max(0, 10 - (experienceDiff / 5));
    
    return (levelScore + winRateScore + experienceScore) / 3;
  }
}
```

---

### **STAGE 4: Season Management System**

#### **4.1 Automated Season Rotation**
**File:** `scripts/seasonRotation.js`
```javascript
// Cron job or scheduled function to handle season transitions
export async function checkSeasonRotation() {
  const currentSeason = await SeasonService.getCurrentSeason();
  
  if (currentSeason && new Date() > currentSeason.endDate) {
    console.log(`🔄 Season ${currentSeason.dashNumber} ended. Starting rotation...`);
    
    // 1. Archive current season leaderboard
    await archiveSeasonLeaderboard(currentSeason);
    
    // 2. Distribute season rewards
    await distributeSeasonRewards(currentSeason);
    
    // 3. Update all users for new season
    await updateAllUsersForNewSeason(currentSeason.dashNumber + 1);
    
    // 4. Create new season
    await SeasonService.createNewSeason(currentSeason.dashNumber + 1);
    
    console.log(`✅ Season ${currentSeason.dashNumber + 1} started!`);
  }
}

async function archiveSeasonLeaderboard(season: Season) {
  const leaderboard = await LeaderboardService.getInstance()
    .getCurrentSeasonLeaderboard(100);
    
  await admin.firestore().collection('seasonArchives').doc(`dash_${season.dashNumber}`).set({
    seasonInfo: season,
    finalLeaderboard: leaderboard,
    archivedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}
```

#### **4.2 Season Rewards System**
**File:** `src/services/rewardsService.ts`
```typescript
export class SeasonRewardsService {
  static async distributeSeasonRewards(season: Season) {
    const leaderboard = await LeaderboardService.getInstance()
      .getCurrentSeasonLeaderboard(100);
    
    const rewardTiers = [
      { rank: 1, reward: 'Champion Crown', type: 'exclusive_badge' },
      { ranks: [2, 3], reward: 'Podium Badge', type: 'rare_badge' },
      { ranks: [4, 10], reward: 'Top 10 Badge', type: 'uncommon_badge' },
      { ranks: [11, 25], reward: 'Elite Player Badge', type: 'common_badge' }
    ];
    
    for (const player of leaderboard) {
      const reward = this.determinePlayerReward(player.rank, rewardTiers);
      if (reward) {
        await this.grantReward(player.playerId, reward, season);
      }
      
      // Grant participation rewards for all ranked players
      await this.grantParticipationReward(player.playerId, season);
    }
  }
  
  private static async grantReward(
    playerId: string, 
    reward: SeasonReward, 
    season: Season
  ) {
    await admin.firestore().collection('users').doc(playerId).update({
      [`seasonRewards.dash_${season.dashNumber}`]: {
        ...reward,
        earnedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    });
    
    // Also add to achievements collection
    await admin.firestore().collection('rankedAchievements').add({
      userId: playerId,
      type: 'season_reward',
      seasonNumber: season.dashNumber,
      reward,
      unlockedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
}
```

---

### **STAGE 5: Advanced Features**

#### **5.1 Placement Matches System**
```typescript
// Special handling for new players' first 10 ranked games
export class PlacementMatchService {
  static async handlePlacementMatch(playerId: string, won: boolean) {
    const userDoc = await getDoc(doc(db, 'users', playerId));
    const userData = userDoc.data();
    
    if (userData?.placementMatches < 10) {
      const newPlacementCount = userData.placementMatches + 1;
      const placementWins = (userData.placementWins || 0) + (won ? 1 : 0);
      
      await updateDoc(doc(db, 'users', playerId), {
        placementMatches: newPlacementCount,
        placementWins: placementWins
      });
      
      // After 10 placement matches, determine initial ranking
      if (newPlacementCount === 10) {
        const initialLevel = this.calculateInitialLevel(placementWins);
        await this.setInitialRankedLevel(playerId, initialLevel);
      }
    }
  }
  
  private static calculateInitialLevel(wins: number): number {
    // Place players based on placement match performance
    if (wins >= 8) return 5; // Gold tier start
    if (wins >= 6) return 4; // Silver tier start  
    if (wins >= 4) return 3; // Bronze tier start
    return 2; // Copper tier start
  }
}
```

#### **5.2 Anti-Cheat and Fair Play**
```typescript
export class FairPlayService {
  static async validateMatchResult(
    matchId: string,
    winnerId: string,
    loserId: string,
    matchDuration: number
  ): Promise<boolean> {
    
    // 1. Check match duration (games shouldn't be too short/long)
    if (matchDuration < 30000 || matchDuration > 1800000) { // 30s - 30min
      console.warn(`⚠️ Suspicious match duration: ${matchDuration}ms`);
      return false;
    }
    
    // 2. Check for rapid successive games (boost prevention)
    const recentMatches = await this.getRecentMatches(winnerId, 300000); // 5 minutes
    if (recentMatches.length > 5) {
      console.warn(`⚠️ Too many rapid games from ${winnerId}`);
      return false;
    }
    
    // 3. Validate both players were active during match
    const matchActivity = await this.validateMatchActivity(matchId);
    if (!matchActivity.valid) {
      console.warn(`⚠️ Invalid match activity pattern`);
      return false;
    }
    
    return true;
  }
}
```

#### **5.3 Detailed Match History**
```typescript
// Enhanced match tracking for ranked games
export interface DetailedRankedMatch extends RankedMatch {
  gameAnalytics: {
    moveCount: number;
    averageMoveTime: number;
    criticalMoments: number;
    comebackFactor: number; // How close the match was
  };
  ratingChanges: {
    winnerBefore: number;
    winnerAfter: number;
    loserBefore: number; 
    loserAfter: number;
  };
  qualityScore: number; // How evenly matched the players were
}
```

---

## 🎯 IMPLEMENTATION TIMELINE

### **Week 1: Infrastructure** 
- [ ] Create Firebase indexes
- [ ] Initialize first season
- [ ] Remove mock data systems
- [ ] Set up user onboarding for ranked

### **Week 2: Live Leaderboards**
- [ ] Implement real-time leaderboard queries
- [ ] Add Firestore listeners for live updates
- [ ] Test with real user data
- [ ] Performance optimization

### **Week 3: Matchmaking**
- [ ] Implement ELO rating system
- [ ] Build skill-based opponent finding
- [ ] Create placement match system
- [ ] Test matchmaking algorithm

### **Week 4: Season Management**
- [ ] Build season rotation system
- [ ] Implement rewards distribution
- [ ] Create season archive system
- [ ] Test full season lifecycle

### **Week 5: Advanced Features**
- [ ] Add anti-cheat systems
- [ ] Implement detailed match tracking
- [ ] Build admin dashboard for season management
- [ ] Performance monitoring and optimization

---

## 📊 SUCCESS METRICS

**Technical Goals:**
- [ ] <500ms leaderboard load times
- [ ] 95%+ successful ranked match creation
- [ ] Real-time updates within 2 seconds
- [ ] Zero data inconsistencies

**User Experience Goals:**
- [ ] <30 second average matchmaking time
- [ ] 85%+ player satisfaction with match quality
- [ ] Active participation in seasonal competitions
- [ ] Competitive rank progression

**Business Goals:**
- [ ] Increased daily active users
- [ ] Higher session duration
- [ ] Enhanced user retention
- [ ] Community engagement around seasons

---

## 🔧 DEVELOPMENT COMMANDS

```bash
# Start development with ranked system
npm run dev

# Deploy Firebase indexes
firebase deploy --only firestore:indexes

# Run season rotation check
node scripts/seasonRotation.js

# Initialize first season (admin)
node scripts/initializeFirstSeason.js

# Monitor leaderboard performance
npm run monitor:leaderboard

# Test matchmaking algorithm
npm run test:matchmaking
```

---

## 📝 NOTES FOR DEVELOPERS

1. **Database Design**: The current schema supports up to 10 skill levels and unlimited seasons
2. **Scalability**: Leaderboard queries are optimized for up to 10,000 active ranked players per season
3. **Real-time**: Uses Firestore's built-in real-time capabilities for live leaderboard updates
4. **Security**: All ranked operations require authentication and are protected by security rules
5. **Testing**: Comprehensive test suite needed for matchmaking and season rotation logic

The foundation is solid - now it's time to build the competitive heart of DashDice! 🚀
