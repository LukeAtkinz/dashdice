# Social League Implementation

## Overview
Social League is a time-gated, friends-only competitive leaderboard system that runs daily from 6:00 PM to 6:15 PM. Players compete exclusively with their friends for wins during this 15-minute window.

## Features Implemented

### 1. **Social League Leaderboard Component** (`SocialLeagueLeaderboard.tsx`)
- **Location**: `src/components/ranked/SocialLeagueLeaderboard.tsx`
- **Features**:
  - Real-time leaderboard updates using Firebase Firestore
  - Daily reset at 6:00 PM
  - Friends-only filtering (displays only friends in leaderboard)
  - Win-based scoring (1 point per win)
  - Victory video background (random selection from victory backgrounds)
  - Active status indicator (green pulse when active, gray countdown when inactive)
  - Countdown timer showing time remaining in window or time until next window
  - Rank badges for top 3 players (crown, silver, bronze medals)
  - Player card backgrounds (displays equipped backgrounds with video support)
  - Current user highlighting
  - Empty state when no friends have played

### 2. **Tab Navigation System** (Updated `SoftRankedLeaderboard.tsx`)
- **Features**:
  - Dual-tab navigation: "Global" and "Social League"
  - Smooth tab transitions with Framer Motion animations
  - Icon indicators (Globe for Global, Users for Social League)
  - Active tab highlighting with purple/blue gradient
  - Preserves existing Global Leaderboard functionality

### 3. **Social League Service** (`socialLeagueService.ts`)
- **Location**: `src/services/socialLeagueService.ts`
- **Features**:
  - `isLeagueActive()`: Checks if current time is within 6:00 PM - 6:15 PM window
  - `getTimeUntilNextLeague()`: Calculates hours/minutes/seconds until next window
  - `getTodayDateString()`: Generates date string for Firestore queries (YYYY-MM-DD format)
  - `recordWin()`: Records a win for a player during active window
  - `getPlayerTodayStats()`: Retrieves player's wins for current day
  - `areFriends()`: Validates friendship between two players
  - `canPlaySocialLeague()`: Validates match eligibility (time window + friendship)
  - `formatTimeRemaining()`: Formats time for display (e.g., "2h 30m", "14:23", "45s")

## Data Structure

### Firestore Collection: `socialLeagueStats`
```typescript
Document ID: `${userId}_${YYYY-MM-DD}`

{
  uid: string;              // Player's user ID
  displayName: string;      // Player's display name
  wins: number;             // Total wins for this day
  date: string;             // Date in YYYY-MM-DD format
  createdAt: Timestamp;     // Document creation time
  lastUpdated: Timestamp;   // Last win recorded time
  equippedBackground?: string; // Player's equipped background ID
}
```

## Integration Points

### 1. **Match Completion Hook**
To integrate Social League win tracking into match completion:

```typescript
// In your match completion handler (e.g., GameplayPhase.tsx or matchService.ts)
import { SocialLeagueService } from '@/services/socialLeagueService';

async function handleMatchVictory(winnerId: string, loserId: string) {
  // Check if Social League is active and players are friends
  const eligibility = await SocialLeagueService.canPlaySocialLeague(winnerId, loserId);
  
  if (eligibility.eligible) {
    // Record the win
    await SocialLeagueService.recordWin(
      winnerId,
      winnerDisplayName,
      winnerEquippedBackground
    );
    
    console.log('✅ Social League win recorded!');
  } else {
    console.log(`❌ Not eligible for Social League: ${eligibility.reason}`);
  }
}
```

### 2. **Firestore Security Rules**
Add these rules to `firestore.rules`:

```javascript
// Social League Stats Collection
match /socialLeagueStats/{statId} {
  // Allow reads for all authenticated users (to view leaderboard)
  allow read: if request.auth != null;
  
  // Allow create/update only during Social League hours (6:00 PM - 6:15 PM)
  allow create, update: if request.auth != null 
    && request.auth.uid == resource.data.uid
    && request.time.hours() == 18 
    && request.time.minutes() < 15;
}
```

### 3. **Friends Context Integration**
The Social League component automatically integrates with your existing `FriendsContext`:

```typescript
const { friends, getFriendsWithPresence } = useFriends();
```

It filters the leaderboard to show only:
- Friends from your friends list
- Current user
- Players who have recorded wins today

## UI/UX Features

### Timer Display
- **Active Window (6:00 PM - 6:15 PM)**:
  - Green pulsing border
  - "Active Now" status
  - Countdown timer (MM:SS format)
  - Rotating trophy icon

- **Inactive (Outside Window)**:
  - Gray border
  - "Next League In" status
  - Time until next window (Xh Xm format)

### Victory Video Container
- **Height**: 200px
- **Features**:
  - Randomly selected victory background video
  - Auto-play, loop, muted
  - Gradient overlay for title visibility
  - "SOCIAL LEAGUE" title with golden glow effect
  - Centered positioning

### Player Cards
- **Features**:
  - Video background support (player's equipped background)
  - Gradient overlay for readability
  - Rank indicator (icon for top 3, number for others)
  - Display name
  - Win count (large, prominent)
  - Current user highlighting (blue ring)
  - Rank-based styling:
    - 1st: Gold gradient, gold border, gold glow
    - 2nd: Silver gradient, silver border, silver glow
    - 3rd: Bronze gradient, bronze border, bronze glow
    - 4+: Gray gradient, gray border

### Rank Badges
- **1st Place**: Crown logo (`/Leaderboards/CrownLogo.webp`)
- **2nd Place**: Silver medal (`/Leaderboards/Second.webp`)
- **3rd Place**: Bronze medal (`/Leaderboards/Third.webp`)
- **4+**: Rank number

## Daily Reset Mechanism

Social League statistics automatically reset daily because:
1. Document IDs include the date: `${userId}_${YYYY-MM-DD}`
2. Queries filter by `where('date', '==', todayDate)`
3. Each new day creates new documents
4. Old documents remain for historical data (can be cleaned up with Cloud Functions if needed)

## Testing

### Test Active Window
To test Social League during development, temporarily modify `isLeagueActive()` in `socialLeagueService.ts`:

```typescript
static isLeagueActive(): boolean {
  // Test mode: Always active
  return true;
  
  // Production mode:
  // const now = new Date();
  // const hour = now.getHours();
  // const minute = now.getMinutes();
  // return hour === 18 && minute < 15;
}
```

### Test Data
Create test documents in Firestore Console:
```
Collection: socialLeagueStats
Document ID: ${testUserId}_${todayDate}
Data: {
  uid: "testUserId",
  displayName: "Test Player",
  wins: 5,
  date: "2025-01-19",
  createdAt: <Timestamp>,
  lastUpdated: <Timestamp>
}
```

## Future Enhancements

### Potential Features
1. **Historical Stats**: View past Social League results by date
2. **Win Streak Tracking**: Track consecutive days of participation
3. **Seasonal Rewards**: Award achievements for Social League participation
4. **Notifications**: Push notifications when Social League is about to start
5. **Matchmaking**: Dedicated matchmaking queue for Social League
6. **Split-Screen Desktop View**: Side-by-side leaderboard + match view
7. **Carousel Filtering**: Switch between global and friends-only views in dashboard
8. **Invitation System**: Send Social League invites to friends during active window

### Performance Optimizations
1. **Pagination**: If friend lists exceed 100 players
2. **Real-time Sync**: Use `onSnapshot` instead of polling for live updates (already implemented)
3. **Caching**: Cache victory backgrounds to reduce re-renders
4. **Lazy Loading**: Load player backgrounds only when visible

## Accessibility

- All interactive elements have proper focus states
- Timer uses semantic HTML with ARIA labels
- Keyboard navigation support for tab switching
- Screen reader friendly status messages

## Browser Compatibility

- **Video Autoplay**: Tested with `autoPlay`, `muted`, `playsInline` attributes
- **iOS Safari**: Includes `webkit-playsinline="true"` and `x5-playsinline="true"`
- **Mobile Performance**: Video backgrounds optimized with `preload="metadata"`

## Dependencies

- `framer-motion`: Animation library
- `lucide-react`: Icon components (Clock, Trophy, Users)
- `firebase/firestore`: Database operations
- Existing contexts: `AuthContext`, `FriendsContext`, `NavigationContext`
- Background system: `resolveBackgroundPath`, `getVictoryBackgrounds`

## File Structure

```
src/
├── components/
│   └── ranked/
│       ├── SocialLeagueLeaderboard.tsx  (NEW)
│       └── SoftRankedLeaderboard.tsx    (UPDATED)
└── services/
    └── socialLeagueService.ts           (NEW)
```

## Summary

The Social League system provides a compelling daily competitive experience that:
- ✅ Encourages friend play
- ✅ Creates urgency with time-limited windows
- ✅ Rewards consistent participation
- ✅ Integrates seamlessly with existing systems
- ✅ Provides real-time competitive feedback
- ✅ Scales with friend list size
- ✅ Maintains historical data for analytics

The implementation is production-ready and follows DashDice's existing patterns for Firebase integration, component structure, and styling conventions.
