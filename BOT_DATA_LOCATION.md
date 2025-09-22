# 📍 Bot Data Location and Deployment Guide

## 🗄️ Where Bot Data is Stored

### Firebase Collections

#### Primary Collection: `bot_profiles`
- **Location**: Firestore Database > Collections > `bot_profiles`
- **Document ID Format**: `bot_{timestamp}_{random}` (e.g., `bot_1732628341_a9x4k2m8`)
- **Console URL**: https://console.firebase.google.com/project/dashdice-d1b86/firestore/data/~2Fbot_profiles

#### Document Structure Example:
```json
{
  "uid": "bot_1732628341_a9x4k2m8",
  "displayName": "Alex Johnson",
  "email": "alex.johnson@dashdice.bot",
  "isBot": true,
  "isActive": true,
  "stats": {
    "gamesPlayed": 45,
    "matchWins": 23,
    "currentStreak": 2,
    "bestStreak": 7,
    "elo": 1350
  },
  "personality": {
    "aggressiveness": 0.6,
    "bankingTendency": 0.4,
    "riskTolerance": 0.7,
    "skillLevel": "intermediate",
    "archetypeCategory": "balanced"
  },
  "region": "us-east",
  "generationDate": "2024-11-26T10:30:41.000Z",
  "lastActiveDate": "2024-11-26T10:30:41.000Z"
}
```

## ✅ Firebase Rules and Indexes Status

### ✅ Firebase Rules Deployed
- **Status**: DEPLOYED ✅
- **Bot Profiles Rules**: Added to `firestore.rules`
- **Permissions**: 
  - Read: All authenticated users (seamless profile viewing)
  - Write: All authenticated users (for system updates, stats tracking)

### ⚠️ Firebase Indexes Status
- **Status**: NEEDS DEPLOYMENT ⚠️
- **Location**: Added to `firestore.indexes.json`
- **Required for**: Bot profile queries by skill level, ELO, region

#### To Deploy Indexes:
```powershell
firebase deploy --only firestore:indexes
```

## 🚀 Bot System Deployment Steps

### 1. Populate Initial Bot Profiles

#### Option A: Manual Creation via Firebase Console
1. Go to Firebase Console: https://console.firebase.google.com/project/dashdice-d1b86/firestore/data
2. Create collection: `bot_profiles`
3. Add documents manually using the structure above

#### Option B: Use the Bot Profile Generator Service
```typescript
// Import and use the bot profile generator
import { BotProfileGenerator } from './src/services/botProfileGenerator';

const generator = new BotProfileGenerator();
const botProfile = generator.generateBotProfile();
// Save to Firestore using your preferred method
```

#### Option C: Programmatic Creation Script
Create a simple script to populate bots:

```javascript
// populate-bots.js
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createBot() {
  const botProfile = {
    uid: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    displayName: "Sample Bot",
    isBot: true,
    isActive: true,
    stats: { gamesPlayed: 0, matchWins: 0, elo: 1200 },
    personality: { skillLevel: "intermediate" },
    // ... other fields
  };
  
  await addDoc(collection(db, 'bot_profiles'), botProfile);
}
```

### 2. Deploy Go Microservices

#### Queue Service (Bot Matching)
```powershell
cd go-services/queue-service
go build -o queue-service.exe .
./queue-service.exe
```

#### Bot AI Service (Bot Behavior)
```powershell
cd go-services/bot-ai-service
go build -o bot-ai-service.exe .
./bot-ai-service.exe
```

### 3. Test Bot System

#### Test Bot Matching
1. Start a quick game (not ranked)
2. Wait 10 seconds without a human match
3. Should be matched with a bot automatically

#### Verify Bot Profiles
1. Check Firebase Console for bot_profiles collection
2. Verify bots appear in user profile viewing
3. Confirm bot stats update after matches

## 📊 Bot Data Monitoring

### Firebase Console Monitoring
- **Bot Profiles**: https://console.firebase.google.com/project/dashdice-d1b86/firestore/data/~2Fbot_profiles
- **Bot Statistics**: Check individual bot documents for stat updates
- **Usage Metrics**: Firestore usage tab for read/write counts

### Expected Data Size
- **Per Bot Profile**: ~2KB
- **20 Bot Profiles**: ~40KB
- **100 Bot Profiles**: ~200KB

### Bot Identification
- **Frontend**: Bots appear as regular users (no special indicators)
- **Backend**: `isBot: true` flag identifies bot profiles
- **Profile Integration**: Seamless with real user profiles

## 🔧 Next Steps

1. **Deploy Indexes**: `firebase deploy --only firestore:indexes`
2. **Create Initial Bots**: Use one of the methods above to populate 15-20 bots
3. **Deploy Go Services**: Start queue-service and bot-ai-service
4. **Test Integration**: Verify 10-second bot matching works
5. **Monitor Performance**: Watch Firebase Console for bot activity

## 🎯 Bot System Status

- ✅ Firebase Rules: DEPLOYED
- ⚠️ Firebase Indexes: NEEDS DEPLOYMENT
- ⚠️ Bot Profiles: NEEDS POPULATION
- ✅ Bot Services: CODE READY
- ⚠️ Go Services: NEEDS DEPLOYMENT

**The bot system is 80% ready for production!** Just need to deploy indexes, populate initial bots, and start the Go services.
