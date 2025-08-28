# 🏆 Ranked Game Mode & Enhanced Leaderboards System

## Overview

This comprehensive implementation guide outlines the creation of a ranked competitive system for DashDice, featuring seasonal "Dash" competitions, dual leaderboard structures, and enhanced game mode selection that integrates seamlessly with the existing friend system styling and codebase architecture.

## 🎮 Core System Features

### Ranked vs Quick Game System
- **Quick Game**: Current "Best of 1" functionality with immediate matchmaking
- **Ranked**: Competitive mode with seasonal progression and leaderboard tracking
- **Game Mode Selector**: Enhanced UI with hover states showing game type descriptions
- **Rematch Inheritance**: Rematches preserve the original game type (Quick/Ranked)
- **Friends Restriction**: Ranked mode disabled when playing with friends (friends-only Quick games)

### Seasonal "Dash" System
- **Duration**: 2-week seasons called "Dashes"
- **Progression**: 10 levels, each requiring 5 wins to advance
- **Reset**: Complete leaderboard reset every Dash
- **Achievement**: Level 10 is the highest achievable rank per season

### Dual Leaderboard Structure
1. **Dash Leaderboard**: Current season rankings (resets every 2 weeks)
2. **Stats Leaderboard**: All-time accumulated performance rankings (never resets)

## 🎯 Game Mode Integration

### Enhanced Game Mode Selector

Based on the existing `GameModeSelector` and `MiniGameModeSelector` components, the system will feature:

```typescript
// Enhanced game mode selection with ranked/quick distinction
interface EnhancedGameMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  gameTypes: {
    quick: {
      name: "Quick Game";
      description: "Instant matchmaking, casual play";
      enabled: boolean;
    };
    ranked: {
      name: "Ranked";
      description: "Competitive season play";
      enabled: boolean;
      requiresLevel?: number;
    };
  };
}
```

### Button Behavior Updates

**Current "Best of 1" Button** → **"Quick Game" Button**
- Maintains all existing functionality
- Shows "Quick Game" on hover
- Immediate matchmaking
- No ranking impact

**Current "Best of 3" Button** → **"Ranked" Button**  
- Shows "Ranked" on hover
- Seasonal progression system
- Leaderboard tracking
- Level-based matchmaking

### Friend System Integration

Following the established `FriendCard` component styling patterns:

```typescript
// Disable ranked mode when inviting friends
const getGameModeRestrictions = (isFriendInvite: boolean) => {
  return {
    quick: { enabled: true },
    ranked: { 
      enabled: !isFriendInvite,
      disabledReason: isFriendInvite ? "Ranked mode not available with friends" : null
    }
  };
};
```

## 🏅 Leaderboard System Architecture

### Database Schema

```typescript
// Seasonal Dash Rankings
interface DashRanking {
  id: string;
  userId: string;
  playerDisplayName: string;
  dashId: string; // e.g., "dash_2025_01"
  currentLevel: number; // 1-10
  winsInCurrentLevel: number; // 0-4
  totalWins: number;
  totalLosses: number;
  winRate: number;
  highestLevel: number;
  rank: number; // Position in current dash
  lastMatchAt: Timestamp;
  createdAt: Timestamp;
  displayBackgroundEquipped?: any; // For styling
  matchBackgroundEquipped?: any; // For styling
}

// All-Time Stats Rankings  
interface StatsRanking {
  id: string;
  userId: string;
  playerDisplayName: string;
  allTimeStats: {
    totalDashesParticipated: number;
    averageLevel: number;
    peakLevel: number;
    totalRankedWins: number;
    totalRankedMatches: number;
    allTimeWinRate: number;
    dashesAtLevel10: number;
    accumulatedScore: number; // Calculated ranking metric
  };
  rank: number;
  lastUpdated: Timestamp;
  displayBackgroundEquipped?: any;
  matchBackgroundEquipped?: any;
}

// Dash Periods
interface DashPeriod {
  id: string; // "dash_2025_01"
  name: string; // "Dash 2025-01"
  startDate: Timestamp;
  endDate: Timestamp;
  isActive: boolean;
  totalParticipants: number;
  level10Achievers: string[]; // Array of user IDs
  topPerformers: {
    userId: string;
    playerDisplayName: string;
    finalLevel: number;
    finalRank: number;
  }[];
}
```

### Ranking Calculation System

**Dash Leaderboard Ranking:**
1. Primary: Current Level (10 > 9 > 8...)
2. Secondary: Wins in current level (4 > 3 > 2...)
3. Tertiary: Total wins in dash
4. Quaternary: Win rate

**Stats Leaderboard Scoring:**
```typescript
const calculateAccumulatedScore = (player: StatsRanking) => {
  const levelMultiplier = player.allTimeStats.averageLevel * 1000;
  const peakBonus = player.allTimeStats.peakLevel * 500;
  const dashesAtMaxBonus = player.allTimeStats.dashesAtLevel10 * 2000;
  const consistencyBonus = player.allTimeStats.totalDashesParticipated * 100;
  const winRateBonus = player.allTimeStats.allTimeWinRate * 1000;
  
  return levelMultiplier + peakBonus + dashesAtMaxBonus + consistencyBonus + winRateBonus;
};
```

## 🎨 UI/UX Design System

### Friend Card Styling Integration

Following the established `FriendCard` component patterns for consistent visual design:

```typescript
// Leaderboard Entry Component (styled like FriendCard)
interface LeaderboardEntry {
  rank: number;
  player: {
    userId: string;
    displayName: string;
    displayBackgroundEquipped?: any;
    currentLevel?: number; // For Dash leaderboard
    accumulatedScore?: number; // For Stats leaderboard
  };
  stats: {
    primary: string; // Level/Score display
    secondary: string; // Wins/Rate display
  };
}

// Background rendering (matching FriendCard patterns)
const getLeaderboardBackgroundStyle = (player: any) => {
  // Reuse getFriendBackgroundStyle logic
  if (player?.displayBackgroundEquipped) {
    const background = player.displayBackgroundEquipped;
    
    if (background.type === 'video') {
      return null; // Handle with video element
    }
    
    if (background.type === 'image' && background.file) {
      let backgroundPath = background.file;
      
      // Path fixing logic (same as FriendCard)
      if (!backgroundPath.startsWith('/') && !backgroundPath.startsWith('http')) {
        backgroundPath = `/backgrounds/${backgroundPath}`;
      }
      
      return {
        backgroundImage: `url("${backgroundPath}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }
  }
  
  return {}; // Default styling
};
```

### Visual Components

**Leaderboard Cards (styled like FriendCard):**
```tsx
const LeaderboardEntryCard = ({ entry, type }: { entry: LeaderboardEntry, type: 'dash' | 'stats' }) => {
  const backgroundStyle = getLeaderboardBackgroundStyle(entry.player);
  const videoBackground = getLeaderboardVideoBackground(entry.player);
  
  return (
    <motion.div
      className="relative overflow-hidden"
      style={{
        ...backgroundStyle,
        borderRadius: '20px',
        height: '120px'
      }}
    >
      {/* Video background (if applicable) */}
      {videoBackground && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{ borderRadius: '20px' }}
        >
          <source src={videoBackground.file} type="video/mp4" />
        </video>
      )}
      
      {/* Dark overlay for readability */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to right, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, transparent 100%)',
          borderRadius: '20px',
          zIndex: 1
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 p-4 h-full flex items-center">
        {/* Rank Badge */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 
                       flex items-center justify-center text-white font-bold text-lg mr-4">
          #{entry.rank}
        </div>
        
        {/* Player Info */}
        <div className="flex-1">
          <h3 className="text-white font-semibold font-audiowide truncate">
            {entry.player.displayName}
          </h3>
          <p className="text-gray-300 text-sm">
            {type === 'dash' ? `Level ${entry.player.currentLevel}` : `Score: ${entry.player.accumulatedScore}`}
          </p>
          <p className="text-gray-400 text-xs">
            {entry.stats.secondary}
          </p>
        </div>
        
        {/* Level/Achievement Badge */}
        {type === 'dash' && entry.player.currentLevel === 10 && (
          <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
            MAX LEVEL
          </div>
        )}
      </div>
    </motion.div>
  );
};
```

**Leaderboard Navigation (styled like FriendsDashboard tabs):**
```tsx
const LeaderboardTabs = () => {
  const [activeTab, setActiveTab] = useState<'dash' | 'stats'>('dash');
  
  const tabs = [
    {
      id: 'dash' as const,
      label: 'Dash Leaderboard',
      description: 'Current season rankings',
      color: 'linear-gradient(135deg, #667eea, #764ba2)'
    },
    {
      id: 'stats' as const,
      label: 'Stats Leaderboard', 
      description: 'All-time performance',
      color: 'linear-gradient(135deg, #FF0080, #FF4DB8)'
    }
  ];
  
  return (
    <div className="flex gap-4 mb-6">
      {tabs.map((tab) => (
        <motion.button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className="flex-1 p-4 rounded-2xl border-2 transition-all"
          style={{
            background: activeTab === tab.id ? tab.color : 'rgba(255, 255, 255, 0.1)',
            borderColor: activeTab === tab.id ? '#ffffff' : 'transparent'
          }}
        >
          <div className="text-center">
            <h3 className="text-white font-audiowide font-bold">{tab.label}</h3>
            <p className="text-gray-300 text-sm mt-1">{tab.description}</p>
          </div>
        </motion.button>
      ))}
    </div>
  );
};
```

## ⚙️ Technical Implementation

### Service Layer

```typescript
// RankedService.ts
export class RankedService {
  private static readonly RANKED_COLLECTION = 'rankedMatches';
  private static readonly DASH_RANKINGS_COLLECTION = 'dashRankings';
  private static readonly STATS_RANKINGS_COLLECTION = 'statsRankings';
  
  // Create ranked match
  static async createRankedMatch(
    hostUserId: string,
    opponentUserId: string,
    gameMode: string
  ): Promise<string> {
    // Validate both players are not friends
    const areFriends = await this.checkIfFriends(hostUserId, opponentUserId);
    if (areFriends) {
      throw new Error('Ranked matches not allowed between friends');
    }
    
    // Create match with ranked flag
    return MatchmakingService.createMatch({
      hostUserId,
      opponentUserId,
      gameMode,
      gameType: 'ranked',
      seasonTracking: true
    });
  }
  
  // Update player ranking after match
  static async updatePlayerRanking(
    userId: string,
    didWin: boolean,
    gameMode: string
  ): Promise<void> {
    const currentDash = await this.getCurrentDash();
    let playerRanking = await this.getPlayerDashRanking(userId, currentDash.id);
    
    if (!playerRanking) {
      playerRanking = await this.createPlayerDashRanking(userId, currentDash.id);
    }
    
    if (didWin) {
      playerRanking.winsInCurrentLevel++;
      playerRanking.totalWins++;
      
      // Level up if reached 5 wins
      if (playerRanking.winsInCurrentLevel >= 5 && playerRanking.currentLevel < 10) {
        playerRanking.currentLevel++;
        playerRanking.winsInCurrentLevel = 0;
      }
    } else {
      playerRanking.totalLosses++;
    }
    
    // Update stats
    playerRanking.winRate = playerRanking.totalWins / (playerRanking.totalWins + playerRanking.totalLosses);
    playerRanking.highestLevel = Math.max(playerRanking.highestLevel, playerRanking.currentLevel);
    
    await this.savePlayerRanking(playerRanking);
    await this.updateLeaderboardRanks(currentDash.id);
    await this.updateStatsLeaderboard(userId);
  }
  
  // Get current dash period
  static async getCurrentDash(): Promise<DashPeriod> {
    const now = new Date();
    
    // Check for active dash
    const activeQuery = query(
      collection(db, 'dashPeriods'),
      where('isActive', '==', true),
      where('endDate', '>', Timestamp.fromDate(now))
    );
    
    const activeSnapshot = await getDocs(activeQuery);
    
    if (!activeSnapshot.empty) {
      return activeSnapshot.docs[0].data() as DashPeriod;
    }
    
    // Create new dash if none active
    return this.createNewDash();
  }
  
  // Create new 2-week dash period
  static async createNewDash(): Promise<DashPeriod> {
    const now = new Date();
    const endDate = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 2 weeks
    
    const dashId = `dash_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}_${String(Math.ceil(now.getDate() / 14)).padStart(2, '0')}`;
    
    const newDash: DashPeriod = {
      id: dashId,
      name: `Dash ${now.getFullYear()}-${String(Math.ceil((now.getMonth() + 1) * 2 + now.getDate() / 14)).padStart(2, '0')}`,
      startDate: Timestamp.fromDate(now),
      endDate: Timestamp.fromDate(endDate),
      isActive: true,
      totalParticipants: 0,
      level10Achievers: [],
      topPerformers: []
    };
    
    await setDoc(doc(db, 'dashPeriods', dashId), newDash);
    return newDash;
  }
}

// LeaderboardService.ts (Enhanced)
export class LeaderboardService {
  // Get dash leaderboard
  static async getDashLeaderboard(
    dashId: string,
    limit: number = 50
  ): Promise<DashRanking[]> {
    const q = query(
      collection(db, 'dashRankings'),
      where('dashId', '==', dashId),
      orderBy('currentLevel', 'desc'),
      orderBy('winsInCurrentLevel', 'desc'),
      orderBy('totalWins', 'desc'),
      orderBy('winRate', 'desc'),
      limitToFirst(limit)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc, index) => ({
      ...doc.data(),
      rank: index + 1
    })) as DashRanking[];
  }
  
  // Get stats leaderboard  
  static async getStatsLeaderboard(limit: number = 50): Promise<StatsRanking[]> {
    const q = query(
      collection(db, 'statsRankings'),
      orderBy('allTimeStats.accumulatedScore', 'desc'),
      limitToFirst(limit)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc, index) => ({
      ...doc.data(),
      rank: index + 1
    })) as StatsRanking[];
  }
}
```

### Component Integration

```typescript
// Enhanced GameModeSelector integration
const EnhancedGameModeSelector = ({ 
  onModeSelect, 
  isFriendInvite = false 
}: {
  onModeSelect: (mode: string, type: 'quick' | 'ranked') => void;
  isFriendInvite?: boolean;
}) => {
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'quick' | 'ranked'>('quick');
  
  return (
    <div className="space-y-4">
      {/* Game Type Selector */}
      <div className="flex gap-4 mb-6">
        <motion.button
          onClick={() => setSelectedType('quick')}
          className={`flex-1 p-4 rounded-2xl border-2 transition-all ${
            selectedType === 'quick' 
              ? 'bg-blue-600/30 border-blue-400' 
              : 'bg-gray-800/30 border-gray-600'
          }`}
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-white font-audiowide font-bold">Quick Game</h3>
          <p className="text-gray-300 text-sm">Instant matchmaking, casual play</p>
        </motion.button>
        
        <motion.button
          onClick={() => !isFriendInvite && setSelectedType('ranked')}
          disabled={isFriendInvite}
          className={`flex-1 p-4 rounded-2xl border-2 transition-all ${
            selectedType === 'ranked' && !isFriendInvite
              ? 'bg-purple-600/30 border-purple-400' 
              : isFriendInvite
              ? 'bg-gray-600/20 border-gray-500 opacity-50 cursor-not-allowed'
              : 'bg-gray-800/30 border-gray-600'
          }`}
          whileHover={!isFriendInvite ? { scale: 1.02 } : {}}
        >
          <h3 className="text-white font-audiowide font-bold">Ranked</h3>
          <p className="text-gray-300 text-sm">
            {isFriendInvite ? 'Not available with friends' : 'Competitive season play'}
          </p>
        </motion.button>
      </div>
      
      {/* Game Mode Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GAME_MODES.map((mode) => (
          <motion.button
            key={mode.id}
            onMouseEnter={() => setHoveredMode(mode.id)}
            onMouseLeave={() => setHoveredMode(null)}
            onClick={() => onModeSelect(mode.id, selectedType)}
            className="p-4 rounded-2xl bg-gray-800/50 border border-gray-600 hover:border-gray-400"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-4">
              <img src={mode.icon} alt={mode.name} className="w-12 h-12" />
              <div className="text-left">
                <h4 className="text-white font-bold">{mode.name}</h4>
                <p className="text-gray-300 text-sm">
                  {hoveredMode === mode.id 
                    ? (selectedType === 'quick' ? 'Quick Game' : 'Ranked')
                    : mode.description
                  }
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
```

### Rematch System Integration

```typescript
// Enhanced RematchService integration
export class EnhancedRematchService extends RematchService {
  // Override createRematchRoom to preserve game type
  static async createRematchRoom(
    requesterUserId: string,
    requesterDisplayName: string,
    opponentUserId: string,
    opponentDisplayName: string,
    originalMatchId: string,
    gameMode: string,
    gameType: string // 'quick' | 'ranked'
  ): Promise<string> {
    // Validate ranked rematch conditions
    if (gameType === 'ranked') {
      const areFriends = await RankedService.checkIfFriends(requesterUserId, opponentUserId);
      if (areFriends) {
        throw new Error('Cannot create ranked rematch between friends');
      }
    }
    
    return super.createRematchRoom(
      requesterUserId,
      requesterDisplayName,
      opponentUserId,
      opponentDisplayName,
      originalMatchId,
      gameMode,
      gameType
    );
  }
}
```

## 📊 Dashboard Integration

### Leaderboard Section

Following the navigation pattern established in `SinglePageDashboard.tsx`:

```typescript
// Add leaderboards to navigation
const dashboardSections = {
  // ... existing sections
  'leaderboards': {
    label: 'Leaderboards',
    icon: '/Design Elements/leaderboard.webp',
    component: LeaderboardsDashboard
  }
};

// LeaderboardsDashboard component
const LeaderboardsDashboard = () => {
  const [activeLeaderboard, setActiveLeaderboard] = useState<'dash' | 'stats'>('dash');
  const [dashRankings, setDashRankings] = useState<DashRanking[]>([]);
  const [statsRankings, setStatsRankings] = useState<StatsRanking[]>([]);
  const [currentDash, setCurrentDash] = useState<DashPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Real-time leaderboard updates
  useEffect(() => {
    const loadLeaderboards = async () => {
      try {
        const dash = await RankedService.getCurrentDash();
        setCurrentDash(dash);
        
        const [dashData, statsData] = await Promise.all([
          LeaderboardService.getDashLeaderboard(dash.id),
          LeaderboardService.getStatsLeaderboard()
        ]);
        
        setDashRankings(dashData);
        setStatsRankings(statsData);
      } catch (error) {
        console.error('Error loading leaderboards:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadLeaderboards();
    
    // Set up real-time listeners
    const unsubscribeDash = onSnapshot(
      query(collection(db, 'dashRankings'), where('dashId', '==', currentDash?.id)),
      (snapshot) => {
        // Update dash rankings in real-time
      }
    );
    
    const unsubscribeStats = onSnapshot(
      collection(db, 'statsRankings'),
      (snapshot) => {
        // Update stats rankings in real-time  
      }
    );
    
    return () => {
      unsubscribeDash();
      unsubscribeStats();
    };
  }, []);
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Audiowide' }}>
          LEADERBOARDS
        </h1>
        <p className="text-gray-300">
          {activeLeaderboard === 'dash' 
            ? `Current Dash: ${currentDash?.name || 'Loading...'}`
            : 'All-Time Performance Rankings'
          }
        </p>
      </div>
      
      {/* Tab Navigation */}
      <LeaderboardTabs activeTab={activeLeaderboard} onTabChange={setActiveLeaderboard} />
      
      {/* Leaderboard Content */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4" />
            <p className="text-gray-300">Loading leaderboards...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {(activeLeaderboard === 'dash' ? dashRankings : statsRankings).map((entry, index) => (
              <LeaderboardEntryCard 
                key={entry.userId} 
                entry={entry} 
                type={activeLeaderboard}
                rank={index + 1}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Player's Current Rank Display */}
      <CurrentPlayerRankCard type={activeLeaderboard} />
    </div>
  );
};
```

## 🔄 Migration Strategy

### Phase 1: Foundation (Week 1)
1. **Database Schema**: Create new collections for ranked system
2. **Service Layer**: Implement `RankedService` and enhanced `LeaderboardService`
3. **Game Type Detection**: Add logic to distinguish quick vs ranked matches

### Phase 2: UI Integration (Week 2)  
1. **Game Mode Selector**: Update with quick/ranked toggle
2. **Button Text Updates**: Change "Best of 1" → "Quick Game", "Best of 3" → "Ranked"
3. **Friend System**: Disable ranked for friend matches

### Phase 3: Leaderboards (Week 3)
1. **Leaderboard Components**: Create styled components matching friend system
2. **Real-time Updates**: Implement live ranking updates
3. **Dashboard Integration**: Add leaderboards section

### Phase 4: Seasonal System (Week 4)
1. **Dash Management**: Automated season creation and resets
2. **Rank Calculations**: Implement progression and scoring systems  
3. **Historical Data**: Archive completed dashes

### Phase 5: Polish & Testing (Week 5)
1. **Performance Optimization**: Optimize queries and updates
2. **Edge Cases**: Handle season transitions, player inactivity
3. **Analytics**: Add ranking analytics and insights

## 🎯 Success Metrics

- **Player Engagement**: Increase in daily active ranked players
- **Session Length**: Longer play sessions due to progression incentives
- **Competitive Balance**: Even distribution across ranking levels
- **Friend System Health**: Maintained casual friend play while adding competitive options
- **Performance**: Sub-500ms leaderboard load times
- **Retention**: Improved player retention through seasonal resets

## 🔧 Technical Considerations

### Performance Optimizations
- **Batch Updates**: Group ranking calculations for efficiency
- **Cached Leaderboards**: Store frequently accessed rankings in memory
- **Background Jobs**: Process rank calculations asynchronously
- **Query Optimization**: Use composite indexes for complex ranking queries

### Security & Fair Play
- **Match Validation**: Verify match results before updating rankings
- **Anti-Cheat**: Detect unusual win patterns or impossible scores
- **Rate Limiting**: Prevent rapid-fire matches for rank manipulation
- **Friend Detection**: Robust friend relationship validation

### Scalability
- **Horizontal Scaling**: Design for multiple concurrent dashes
- **Regional Support**: Framework for region-specific leaderboards
- **Archive Management**: Efficient storage of historical dash data
- **Load Balancing**: Distribute ranking calculations across servers

This implementation provides a comprehensive ranked system that enhances competitive play while maintaining the casual friend-based gaming experience that makes DashDice unique. The styling consistency with the existing friend system ensures a seamless user experience, while the dual leaderboard structure provides both short-term seasonal excitement and long-term progression goals.
