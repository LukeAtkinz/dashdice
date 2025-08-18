# Firebase Setup Guide

## Database Index Setup

The application requires several Firestore composite indexes. You can create them using one of these methods:

### Method 1: Using Firebase CLI (Recommended)

1. Install Firebase CLI if not already installed:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firestore in your project (if not done):
```bash
firebase init firestore
```

4. Deploy the indexes:
```bash
firebase deploy --only firestore:indexes
```

### Method 2: Manual Index Creation

Visit the Firebase Console and create these indexes manually:

#### Achievement Definitions Index
- Collection: `achievementDefinitions`
- Fields:
  - `isActive` (Ascending)
  - `category` (Ascending) 
  - `order` (Ascending)
  - `__name__` (Ascending)

#### Friend Requests Index
- Collection: `friendRequests`
- Fields:
  - `status` (Ascending)
  - `toUserId` (Ascending)
  - `createdAt` (Descending)
  - `__name__` (Descending)

#### Game Invitations Index
- Collection: `gameInvitations`  
- Fields:
  - `status` (Ascending)
  - `toUserId` (Ascending)
  - `createdAt` (Descending)
  - `__name__` (Descending)

#### Friends Index
- Collection: `friends`
- Fields:
  - `userId` (Ascending)
  - `status` (Ascending)
  - `createdAt` (Descending)

#### Game Modes Index
- Collection: `gameModes`
- Fields:
  - `isActive` (Ascending)
  - `platforms` (Array-contains)

#### Games Index
- Collection: `games`
- Fields:
  - `players` (Array-contains)
  - `status` (Ascending)
  - `updatedAt` (Descending)

#### Presence Index
- Collection: `presence`
- Fields:
  - `userId` (Ascending)
  - `isOnline` (Ascending)
  - `lastSeen` (Descending)

### Method 3: Quick Index Links

The application will show you direct links to create indexes when you encounter the errors. Click these links:

1. Achievement Definitions Index: [Create Index](https://console.firebase.google.com/v1/r/project/dashdice-d1b86/firestore/indexes?create_composite=Cl1wcm9qZWN0cy9kYXNoZGljZS1kMWI4Ni9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvYWNoaWV2ZW1lbnREZWZpbml0aW9ucy9pbmRleGVzL18QARoMCghpc0FjdGl2ZRABGgwKCGNhdGVnb3J5EAEaCQoFb3JkZXIQARoMCghfX25hbWVfXxAB)

2. Friend Requests Index: [Create Index](https://console.firebase.google.com/v1/r/project/dashdice-d1b86/firestore/indexes?create_composite=ClVwcm9qZWN0cy9kYXNoZGljZS1kMWI4Ni9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvZnJpZW5kUmVxdWVzdHMvaW5kZXhlcy9fEAEaCgoGc3RhdHVzEAEaDAoIdG9Vc2VySWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC)

3. Game Invitations Index: [Create Index](https://console.firebase.google.com/v1/r/project/dashdice-d1b86/firestore/indexes?create_composite=ClZwcm9qZWN0cy9kYXNoZGljZS1kMWI4Ni9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvZ2FtZUludml0YXRpb25zL2luZGV4ZXMvXxABGgoKBnN0YXR1cxABGgwKCHRvVXNlcklkEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg)

## Manual Data Setup

Until the service account is properly configured, you can manually add some test data:

### Game Modes Collection

Create documents in the `gameModes` collection:

#### Document ID: `classic`
```json
{
  "id": "classic",
  "name": "Classic Mode", 
  "description": "First to 50 points, best of 3 rounds",
  "rules": {
    "startingScore": 0,
    "targetScore": 50,
    "bestOf": 3,
    "allowBanking": true,
    "allowDoubleRolls": true,
    "scoreDirection": "up",
    "eliminationRules": {
      "singleOne": false,
      "doubleOne": true,
      "doubleSix": "reset"
    }
  },
  "settings": {
    "timePerTurn": 30,
    "maxConsecutiveRolls": 10,
    "showRunningTotal": true,
    "showOpponentScore": true,
    "enableChat": true,
    "enableAbilities": true
  },
  "isActive": true,
  "platforms": ["desktop", "mobile"],
  "minPlayers": 2,
  "maxPlayers": 4,
  "estimatedDuration": 15
}
```

#### Document ID: `zero-hour`
```json
{
  "id": "zero-hour",
  "name": "Zero Hour",
  "description": "Start at 100, first to reach exactly 0 wins",
  "rules": {
    "startingScore": 100,
    "targetScore": 0,
    "allowBanking": true,
    "allowDoubleRolls": true,
    "scoreDirection": "down",
    "eliminationRules": {
      "singleOne": false,
      "doubleOne": true,
      "doubleSix": "reset"
    },
    "specialRules": {
      "exactScoreRequired": true
    }
  },
  "settings": {
    "timePerTurn": 45,
    "maxConsecutiveRolls": 15,
    "showRunningTotal": true,
    "showOpponentScore": true,
    "enableChat": true,
    "enableAbilities": true
  },
  "isActive": true,
  "platforms": ["desktop", "mobile"],
  "minPlayers": 2,
  "maxPlayers": 4,
  "estimatedDuration": 12
}
```

#### Document ID: `last-line`
```json
{
  "id": "last-line",
  "name": "Last Line",
  "description": "Single roll elimination, doubles grant extra roll",
  "rules": {
    "startingScore": 0,
    "targetScore": 100,
    "allowBanking": false,
    "allowDoubleRolls": false,
    "scoreDirection": "up",
    "eliminationRules": {
      "singleOne": false,
      "doubleOne": false,
      "doubleSix": "score"
    },
    "specialRules": {
      "rollLimit": 1,
      "doubleGrantsExtraRoll": true
    }
  },
  "settings": {
    "timePerTurn": 15,
    "showRunningTotal": false,
    "showOpponentScore": false,
    "enableChat": true,
    "enableAbilities": false
  },
  "isActive": true,
  "platforms": ["desktop", "mobile"],
  "minPlayers": 2,
  "maxPlayers": 6,
  "estimatedDuration": 5
}
```

#### Document ID: `true-grit`
```json
{
  "id": "true-grit",
  "name": "True Grit",
  "description": "No banking, single 1 eliminates, double 6s score",
  "rules": {
    "startingScore": 0,
    "targetScore": 100,
    "allowBanking": false,
    "allowDoubleRolls": true,
    "scoreDirection": "up",
    "eliminationRules": {
      "singleOne": true,
      "doubleOne": false,
      "doubleSix": "score"
    }
  },
  "settings": {
    "timePerTurn": 60,
    "showRunningTotal": true,
    "showOpponentScore": true,
    "enableChat": true,
    "enableAbilities": true
  },
  "isActive": true,
  "platforms": ["desktop", "mobile"],
  "minPlayers": 2,
  "maxPlayers": 4,
  "estimatedDuration": 10
}
```

### Achievement Definitions Collection

Create some basic achievements in the `achievementDefinitions` collection:

#### Document ID: `first_win`
```json
{
  "id": "first_win",
  "name": "First Victory",
  "description": "Win your first game",
  "category": "gameplay",
  "type": "milestone",
  "condition": {
    "type": "win_count",
    "target": 1
  },
  "reward": {
    "xp": 100,
    "items": []
  },
  "rarity": "common",
  "order": 1,
  "isActive": true,
  "icon": "🏆"
}
```

## Firestore Rules

The `firestore.rules` file has been updated to include permissions for all new collections. Deploy with:

```bash
firebase deploy --only firestore:rules
```

## Next Steps

1. Create the indexes (Method 1, 2, or 3 above)
2. Optionally add the game mode and achievement data manually
3. The application should work without Firebase errors

The app will gracefully fall back to default data if the Firebase collections are empty.
