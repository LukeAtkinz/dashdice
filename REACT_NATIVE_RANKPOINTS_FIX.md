# React Native RankPoints Error Fix

## Issue Identified
The React Native app (DashDiceApp) is trying to access `userData.statistics.rankPoints` but the Firebase data structure uses `rankedStats` instead. This is causing the **11-frame render error** you're seeing on your phone.

**Error:** `TypeError: Cannot read property 'rankPoints' of undefined`

## Root Cause
The React Native app's interface definitions and data access patterns are outdated and don't match the current Firebase data structure:

- **React Native expects:** `userData.statistics.rankPoints`
- **Firebase actually has:** `userData.rankedStats.currentSeason.level`

## Files to Fix

### 1. Fix UserContext.tsx
**File:** `C:\Users\david\Documents\DashDiceApp\src\context\UserContext.tsx`

**Problem:** Lines 21 and 93 define and use `statistics.rankPoints` which doesn't exist in Firebase.

**Solution:** Replace the interface and default data structure:

```typescript
// Replace the entire statistics interface (around line 9-21):
interface UserData {
  uid: string;
  email: string;
  displayName: string;
  profilePicture?: string;
  // Update statistics to match Firebase structure
  stats: {
    gamesPlayed: number;
    matchWins: number;
    currentStreak: number;
    bestStreak: number;
  };
  rankedStats: {
    currentSeason: {
      level: number;
      dashNumber: number;
      totalWins: number;
      totalLosses: number;
      gamesPlayed: number;
      winStreak: number;
      longestWinStreak: number;
      winsInLevel: number;
    };
    allTime: {
      totalRankedGames: number;
      totalRankedWins: number;
      totalRankedLosses: number;
      maxLevelReached: number;
      averageLevel: number;
      longestWinStreak: number;
      totalDashes: number;
    };
  };
  inventory: {
    selectedBackground: string;
    backgrounds: string[];
    gold: number;
    items: string[];
  };
  achievements: {
    completed: string[];
    progress: { [key: string]: number };
  };
  friends: {
    friendsList: string[];
    friendRequests: string[];
    sentRequests: string[];
  };
  preferences: {
    notifications: boolean;
    sounds: boolean;
    vibration: boolean;
    theme: string;
  };
  lastActive: Date;
  createdAt: Date;
}
```

**And replace the defaultUserData (around line 73-93):**

```typescript
const defaultUserData: Partial<UserData> = {
  stats: {
    gamesPlayed: 0,
    matchWins: 0,
    currentStreak: 0,
    bestStreak: 0,
  },
  rankedStats: {
    currentSeason: {
      level: 1,
      dashNumber: 1,
      totalWins: 0,
      totalLosses: 0,
      gamesPlayed: 0,
      winStreak: 0,
      longestWinStreak: 0,
      winsInLevel: 0,
    },
    allTime: {
      totalRankedGames: 0,
      totalRankedWins: 0,
      totalRankedLosses: 0,
      maxLevelReached: 1,
      averageLevel: 1,
      longestWinStreak: 0,
      totalDashes: 0,
    },
  },
  inventory: {
    selectedBackground: 'Space Station',
    backgrounds: ['Space Station', 'City Skyline'],
    gold: 1000,
    items: [],
  },
  achievements: {
    completed: [],
    progress: {},
  },
  friends: {
    friendsList: [],
    friendRequests: [],
    sentRequests: [],
  },
  preferences: {
    notifications: true,
    sounds: true,
    vibration: true,
    theme: 'dark',
  },
  lastActive: new Date(),
  createdAt: new Date(),
};
```

### 2. Fix DashboardScreen.tsx
**File:** `C:\Users\david\Documents\DashDiceApp\src\screens\dashboard\DashboardScreen.tsx`

**Problem:** Lines 65-66 access `userData.statistics.rankPoints` which causes the render error.

**Solution:** Replace the skillRating calculation (around line 64-67):

```typescript
// Replace this:
const skillRating = userData ? {
  level: Math.floor(userData.statistics.rankPoints / 100) + 1,
  dashNumber: userData.statistics.rankPoints || 1
} : { level: 1, dashNumber: 1 };

// With this:
const skillRating = userData ? {
  level: userData.rankedStats?.currentSeason?.level || 1,
  dashNumber: userData.rankedStats?.currentSeason?.dashNumber || 1
} : { level: 1, dashNumber: 1 };
```

## Quick Fix Commands

Run these commands to fix the React Native app:

```bash
# Navigate to React Native app
cd "C:\Users\david\Documents\DashDiceApp"

# Backup original files
copy "src\context\UserContext.tsx" "src\context\UserContext.tsx.backup"
copy "src\screens\dashboard\DashboardScreen.tsx" "src\screens\dashboard\DashboardScreen.tsx.backup"
```

Then apply the interface and code changes above to both files.

## Verification Steps

1. **Stop the current Expo server** (Ctrl+C in the terminal)
2. **Apply the fixes** to both files
3. **Restart Expo:** `npm start`
4. **Test on your phone** - the 11-frame render error should be resolved

## Expected Result

After the fix:
- ✅ No more `TypeError: Cannot read property 'rankPoints' of undefined`
- ✅ App loads properly with user data from Firebase
- ✅ Dashboard displays correct level and dash number
- ✅ Real-time data sync works with correct data structure

## Additional Notes

The Firebase data structure is:
```json
{
  "rankedStats": {
    "currentSeason": {
      "level": 1,
      "dashNumber": 1,
      "totalWins": 0,
      "totalLosses": 0
    },
    "allTime": {
      "maxLevelReached": 1,
      "totalRankedGames": 0
    }
  },
  "stats": {
    "gamesPlayed": 77,
    "matchWins": 45,
    "currentStreak": 0,
    "bestStreak": 5
  }
}
```

This matches the web app structure and ensures consistency across all platforms.
