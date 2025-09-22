# 🚀 Manual Bot Data Import Guide

## 📋 **Step-by-Step Firebase Console Import**

### 1. **Open Firebase Console**
```
URL: https://console.firebase.google.com/project/dashdice-d1b86/firestore/data
```

### 2. **Navigate to Firestore Database**
- Click "Firestore Database" in the left sidebar
- Click "Data" tab if not already selected

### 3. **Create Bot Profiles Collection**
- Click "Start collection" (if no collections exist) OR "Add collection"
- Collection ID: `bot_profiles`
- Click "Next"

### 4. **Import First Bot Document**
- Document ID: Use auto-ID OR copy a bot UID from `bot-profiles-data.json`
- Add fields manually from the JSON structure, OR:

### 5. **Bulk Import Method (Recommended)**

#### Option A: JSON Import (if available)
1. Look for "Import" button in Firebase Console
2. Select `bot-profiles-data.json` from your project directory
3. Choose collection: `bot_profiles`
4. Click Import

#### Option B: Manual Entry (sample bot)
```json
{
  "uid": "bot_1726493829_a9x4k2m8",
  "displayName": "Alex Johnson",
  "email": "alex.johnson@dashdice.bot",
  "isBot": true,
  "isActive": true,
  "stats": {
    "gamesPlayed": 45,
    "matchWins": 23,
    "elo": 1350
  },
  "personality": {
    "skillLevel": "intermediate",
    "aggressiveness": 0.6,
    "bankingTendency": 0.4
  }
}
```

## 🔍 **Verify Import Success**

### Check Bot Profiles Collection
```
1. Go to: https://console.firebase.google.com/project/dashdice-d1b86/firestore/data/~2Fbot_profiles
2. Should see bot documents with names like "Alex Johnson", "Morgan Smith", etc.
3. Each document should have stats, personality, and other fields
```

### Test in DashDice App
```
1. Start a Quick Match (not ranked)
2. Wait 10 seconds without finding human opponent
3. Should get matched with a bot automatically
4. After game, view opponent's profile - should look like real user
```

## 📊 **Bot Data Files Available**

All bot data files are in your project directory:
- `bot-profiles-data.json` - All 20 bots
- `bot-profiles-beginner.json` - 2 beginner bots
- `bot-profiles-intermediate.json` - 6 intermediate bots  
- `bot-profiles-advanced.json` - 2 advanced bots
- `bot-profiles-expert.json` - 10 expert bots

## 🎯 **Alternative: Quick Test with Single Bot**

If you want to test quickly, just create ONE bot manually:

```json
{
  "uid": "bot_test_001",
  "displayName": "Test Bot",
  "email": "test.bot@dashdice.bot", 
  "isBot": true,
  "isActive": true,
  "createdAt": "2025-09-16T13:20:00.000Z",
  "updatedAt": "2025-09-16T13:20:00.000Z",
  "stats": {
    "gamesPlayed": 25,
    "matchWins": 12,
    "currentStreak": 1,
    "bestStreak": 5,
    "totalScore": 12500,
    "averageScore": 500,
    "elo": 1200
  },
  "personality": {
    "aggressiveness": 0.5,
    "bankingTendency": 0.6,
    "riskTolerance": 0.4,
    "skillLevel": "intermediate",
    "archetypeCategory": "balanced",
    "region": "us-east"
  },
  "inventory": {
    "items": []
  },
  "achievements": {},
  "recentMatches": []
}
```

## ✅ **After Import Complete**

1. **Firebase Rules**: ✅ Already deployed
2. **Bot Data**: ✅ Imported via console
3. **Go Services**: ✅ Running (queue-service has bot matching)
4. **Frontend Code**: ✅ Ready (all bot services implemented)

**Your bot system will be LIVE and ready for testing!** 🤖🎮
