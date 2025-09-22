# 🔥 Firebase Configuration for Ranked System

## Overview
The ranked system requires specific Firebase indexes and security rules to function properly. This document outlines what has been implemented and what still needs to be done.

## ✅ Security Rules (DEPLOYED)

The following security rules have been **successfully deployed** to Firebase:

### Ranked Stats Collection
```javascript
match /rankedStats/{userId} {
  allow read: if request.auth != null;
  allow write: if false; // Only server-side operations
}
```

### Seasons Collection  
```javascript
match /seasons/{seasonId} {
  allow read: if request.auth != null;
  allow write: if false; // Only server-side operations
}
```

### Ranked Matches Collection
```javascript
match /rankedMatches/{matchId} {
  allow read: if request.auth != null && 
    (request.auth.uid == resource.data.hostData.playerId || 
     request.auth.uid == resource.data.opponentData.playerId);
  allow create: if request.auth != null && 
    (request.auth.uid == request.resource.data.hostData.playerId || 
     request.auth.uid == request.resource.data.opponentData.playerId);
  allow update: if request.auth != null && 
    (request.auth.uid == resource.data.hostData.playerId || 
     request.auth.uid == resource.data.opponentData.playerId);
}
```

### Ranked Achievements Collection
```javascript
match /rankedAchievements/{achievementId} {
  allow read: if request.auth != null && 
    request.auth.uid == resource.data.userId;
  allow write: if false; // Only server-side operations
}
```

## ⚠️ Required Indexes (NEED TO BE CREATED)

The following Firebase indexes are **REQUIRED** for optimal performance:

### 1. Current Season Leaderboard
**Collection:** `rankedStats`
**Fields:**
- `currentSeason.dashNumber` (ASCENDING)
- `currentSeason.level` (DESCENDING)  
- `currentSeason.totalWins` (DESCENDING)
- `currentSeason.winsInLevel` (DESCENDING)

### 2. All-Time Leaderboard
**Collection:** `rankedStats`
**Fields:**
- `allTime.maxLevelReached` (DESCENDING)
- `allTime.totalRankedWins` (DESCENDING)
- `allTime.totalRankedGames` (DESCENDING)

### 3. Top Players by Level
**Collection:** `rankedStats`
**Fields:**
- `currentSeason.dashNumber` (ASCENDING)
- `currentSeason.level` (ASCENDING)
- `currentSeason.totalWins` (DESCENDING)
- `currentSeason.winsInLevel` (DESCENDING)

### 4. Season Management
**Collection:** `seasons`
**Fields:**
- `isActive` (ASCENDING)
- `dashNumber` (DESCENDING)

### 5. Match History (Host)
**Collection:** `rankedMatches`
**Fields:**
- `hostData.playerId` (ASCENDING)
- `completedAt` (DESCENDING)

### 6. Match History (Opponent)
**Collection:** `rankedMatches`
**Fields:**
- `opponentData.playerId` (ASCENDING)
- `completedAt` (DESCENDING)

### 7. User Achievements
**Collection:** `rankedAchievements`
**Fields:**
- `userId` (ASCENDING)
- `unlockedAt` (DESCENDING)

## 🛠️ How to Create Indexes

### Option 1: Firebase Console (Recommended)
1. Go to [Firebase Console > Firestore > Indexes](https://console.firebase.google.com/project/dashdice-d1b86/firestore/indexes)
2. Click **"Create Index"** 
3. For each index above:
   - Enter the collection name
   - Add fields in the **exact order** shown
   - Set the sort order (ASCENDING/DESCENDING) as specified
   - Click **"Create"**

### Option 2: Firebase CLI
1. Ensure `firestore.indexes.json` contains all required indexes
2. Run: `firebase deploy --only firestore:indexes`

## 🔍 Why These Indexes Are Required

### Performance Impact
- **Without indexes:** Queries will be extremely slow or fail entirely
- **With indexes:** Sub-second response times for leaderboards
- **Scalability:** Supports thousands of ranked players efficiently

### Query Support
Each index supports specific ranked system features:
- **Leaderboard displays:** Fast ranking calculations
- **User rank lookups:** Quick position finding
- **Match history:** Efficient user game retrieval
- **Achievement tracking:** Rapid progress updates
- **Season management:** Instant current season lookup

## 🚨 Critical Requirements

### For Production Use
1. **ALL indexes must be created** before ranked system goes live
2. **Security rules are already deployed** and properly restrict access
3. **Test queries** should be run after index creation to verify performance

### Testing Commands
After creating indexes, run these to verify:
```bash
# Test the ranked system queries
node scripts/addRankedIndexes.js

# Check Firebase console for index build status
# Indexes may take several minutes to build initially
```

## 📊 Index Build Time
- **Empty collections:** Instant creation
- **Small datasets (<1000 docs):** 1-2 minutes  
- **Large datasets (>10000 docs):** 5-15 minutes
- **Check status:** Firebase Console > Firestore > Indexes

## 🎯 Next Steps

1. **Create all required indexes** using Firebase Console
2. **Verify index creation** in Firebase Console
3. **Test ranked system** functionality after indexes are built
4. **Monitor performance** during initial ranked system usage

---

**Status:** 
- ✅ Security Rules: **DEPLOYED**
- ⚠️ Indexes: **NEED TO BE CREATED**
- 🔧 System: **READY FOR INDEXES**
