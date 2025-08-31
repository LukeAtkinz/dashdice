# 🚀 UNIFIED MATCHMAKING SYSTEM - DEPLOYMENT GUIDE

## 🎯 Overview
This guide covers the complete deployment of the unified matchmaking system including ranked games, tournaments, and user migration.

## 📋 Pre-Deployment Checklist

### 1. Firebase Configuration ✅
- [x] **Firebase Project Setup**: Ensure Firebase project is configured
- [x] **Service Account**: Verify `serviceAccountKey.json` is in project root
- [x] **Firestore Rules**: Updated with new collections support
- [x] **Security Rules**: Tested and validated

### 2. Database Collections ✅
The following new collections have been configured:
- **gameSessions**: Unified session management for all game types
- **tournaments**: Tournament scheduling and bracket management  
- **seasons**: Ranked season tracking
- **rankedMatches**: Competitive match history
- **liveLeaderboards**: Real-time ranking updates

### 3. Code Implementation ✅
- [x] **UserService**: Enhanced with ranked status support
- [x] **GameSessionService**: Unified session management (580+ lines)
- [x] **TournamentService**: Complete tournament system (600+ lines)
- [x] **MatchmakingOrchestrator**: Central coordination service
- [x] **Firebase Rules**: Updated security rules for all collections

## 🔧 Deployment Steps

### Step 1: User Migration (CRITICAL FIRST STEP)
```typescript
// Option A: Use Admin Utilities (Recommended)
// 1. Navigate to: http://localhost:3001/admin
// 2. Click "Migrate All Users" button
// 3. Confirm the action in the popup
// 4. Wait for success confirmation

// Option B: Run Migration Script Directly
// In terminal:
node scripts/migrate-users-to-ranked.js
```

**Expected Result**: All existing users will have `rankedStatus: "Ranked - Active"`

### Step 2: Tournament Schedule Creation
```typescript
// Using Admin Utilities:
// 1. Go to /admin page
// 2. Click "Create Weekly Tournaments"
// 3. Confirm creation of 4 weeks of tournaments
// 4. Verify tournaments are created in Firestore

// Manual creation (if needed):
await TournamentService.createWeeklyTournaments(4);
```

**Expected Result**: 12 tournaments created (3 per week for 4 weeks)

### Step 3: System Validation
```typescript
// Test user ranked eligibility:
// 1. Go to /admin page
// 2. Use "Test User Eligibility" tool
// 3. Enter a user ID to verify ranked status

// Verify tournament creation:
// Check Firestore console for tournaments collection
```

### Step 4: Frontend Integration
Update your matchmaking components to use the new unified system:

```typescript
// Example: Updated matchmaking usage
import { MatchmakingOrchestrator } from '@/services/matchmakingOrchestrator';

// For quick games
const session = await MatchmakingOrchestrator.findMatch({
  gameType: 'quick',
  userId: 'user123',
  preferences: { gameMode: 'classic' }
});

// For ranked games  
const rankedSession = await MatchmakingOrchestrator.findMatch({
  gameType: 'ranked',
  userId: 'user123',
  preferences: { gameMode: 'quickfire' }
});

// For tournaments
const tournamentSession = await MatchmakingOrchestrator.findMatch({
  gameType: 'tournament', 
  userId: 'user123',
  tournamentId: 'tournament_id_here'
});
```

## 🎮 Game Type Configuration

### Quick Games
- **Purpose**: Casual matchmaking
- **Requirements**: None (all users eligible)
- **Features**: Fast matching, no rank impact
- **Session Type**: `quick`

### Ranked Games  
- **Purpose**: Competitive matchmaking with seasons
- **Requirements**: `rankedStatus: "Ranked - Active"`
- **Features**: Skill-based matching, leaderboard updates, seasonal rewards
- **Session Type**: `ranked`

### Friend Invites
- **Purpose**: Private games between friends
- **Requirements**: Friend relationship
- **Features**: Custom game settings, no rank impact
- **Session Type**: `friend`

### Tournaments
- **Purpose**: Weekly scheduled competitive events
- **Requirements**: `rankedStatus: "Ranked - Active"` + tournament registration
- **Features**: Bracket system, exclusive rewards, scheduled times
- **Session Type**: `tournament`

### Rematches
- **Purpose**: Instant replay of previous games
- **Requirements**: Previous game session
- **Features**: Same players, same settings, quick setup
- **Session Type**: `rematch`

## 🏆 Tournament Schedule

### Weekly Tournament Schedule
- **Friday 7:00 PM**: Classic Mode Tournament
- **Saturday 7:00 PM**: Quickfire Tournament  
- **Sunday 7:00 PM**: Zero Hour Tournament

### Tournament Features
- **Format**: 8-player single elimination brackets
- **Duration**: ~2 hours per tournament
- **Rewards**: Exclusive tournament backgrounds
- **Registration**: Opens 1 hour before start time

## 🔒 Security Considerations

### Firestore Security Rules
```javascript
// New rules added for unified system:
match /gameSessions/{sessionId} {
  allow read, write: if request.auth != null 
    && (resource.data.hostId == request.auth.uid 
        || request.auth.uid in resource.data.playerIds);
}

match /tournaments/{tournamentId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null 
    && request.auth.uid in resource.data.participants;
}

match /seasons/{seasonId} {
  allow read: if request.auth != null;
  allow write: if false; // Admin only
}
```

### Admin Security
⚠️ **IMPORTANT**: The `/admin` page should be protected in production:

```typescript
// Add admin authentication middleware
export default function AdminPage() {
  const { user } = useAuth();
  
  // Check if user is admin
  if (!user?.isAdmin) {
    return <AccessDenied />;
  }
  
  return <AdminUtilities />;
}
```

## 📊 Monitoring & Analytics

### Key Metrics to Track
- **Session Creation Rate**: Monitor `gameSessions` collection growth
- **Tournament Participation**: Track registration and completion rates
- **Ranked Activity**: Monitor ranked match frequency and progression
- **User Migration Status**: Verify all users have valid `rankedStatus`

### Performance Monitoring
```typescript
// Monitor service performance
const sessionCreationTime = performance.now();
await GameSessionService.createSession(sessionData);
const duration = performance.now() - sessionCreationTime;

// Log metrics to analytics
analytics.track('session_creation_time', { duration });
```

## 🛠️ Troubleshooting

### Common Issues

#### User Migration Failed
```bash
# Check Firebase connection
node -e "
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
console.log('Firebase connected successfully');
"
```

#### Tournament Creation Failed
- Verify Firestore write permissions
- Check tournament data structure matches schema
- Ensure sufficient Firebase quota

#### Session Matching Issues  
- Verify user `rankedStatus` is set correctly
- Check session creation logs for errors
- Validate matchmaking preferences format

### Debug Commands
```bash
# Check user migration status
node -e "
const { UserService } = require('./src/services/userService');
UserService.getUserProfile('USER_ID').then(profile => 
  console.log('User ranked status:', profile.rankedStatus)
);
"

# Verify tournament creation
node -e "
const { TournamentService } = require('./src/services/tournamentService');
TournamentService.getUpcomingTournaments().then(tournaments => 
  console.log('Tournaments:', tournaments.length)
);
"
```

## 🚀 Production Deployment

### Environment Variables
Ensure these are set in production:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

### Deployment Checklist
- [ ] Run user migration successfully
- [ ] Create initial tournament schedule
- [ ] Test all matchmaking flows
- [ ] Verify Firestore security rules
- [ ] Set up monitoring and alerts
- [ ] Protect admin endpoints
- [ ] Test performance under load

## 📈 Post-Deployment Tasks

### Week 1: Monitoring Phase
- Monitor user migration success rate
- Track tournament registration numbers
- Analyze ranked game participation
- Collect user feedback

### Week 2: Optimization Phase  
- Tune matchmaking algorithms based on data
- Adjust tournament schedules if needed
- Optimize database queries for performance
- Scale Firebase resources if necessary

### Ongoing: Maintenance
- Weekly tournament schedule management
- Seasonal leaderboard resets
- System performance monitoring
- User support for ranking issues

## 🎉 Success Metrics

### Launch Success Indicators
- ✅ 100% user migration completion
- ✅ Zero critical errors during deployment
- ✅ First tournaments successfully created and scheduled
- ✅ Ranked matchmaking functioning correctly
- ✅ All game types accessible through unified system

### 30-Day Success Targets
- 📈 75% of active users participate in ranked games
- 🏆 80% tournament completion rate
- ⚡ <2 second average matchmaking time
- 🔒 Zero security incidents
- 📊 Comprehensive analytics dashboard operational

---

## 🆘 Emergency Contacts & Rollback

### Rollback Strategy
If critical issues arise:
1. Disable new matchmaking system
2. Revert to previous game creation methods
3. Preserve user data and rankings
4. Document issues for future resolution

### Support Resources
- **Documentation**: `/ReadMes/UNIFIED_MATCHMAKING_SYSTEM_README.md`
- **Tournament Guide**: `/TOURNAMENT_MANAGEMENT_README.md`
- **Firebase Console**: Monitor collections and security rules
- **Admin Tools**: `/admin` page for system management

---

**🎯 Deployment Complete**: Your unified matchmaking system is ready for production with ranked games, tournaments, and comprehensive user management!
