# Match Lifecycle Management System

## 🎯 **Problem Solved**

The previous match system had critical issues:
- ❌ Matches stayed in Firebase indefinitely, creating stagnant data
- ❌ Users could have multiple active matches causing conflicts
- ❌ No automatic cleanup for abandoned/timeout matches
- ❌ Inconsistent timeout periods (30 minutes vs 10 minutes)
- ❌ Match creation didn't check for existing user matches

## ✅ **New Solution: MatchLifecycleService**

### **Core Features**

1. **10-Minute Match Timeout**
   - All matches automatically moved to `abandonedMatches` after 10 minutes
   - Prevents database bloat and stagnant matches
   - Configurable timeout period

2. **Conflict Resolution**
   - Before creating new matches, existing user matches are cleaned up
   - Prevents multiple active matches per user
   - Clean slate approach for better UX

3. **Comprehensive Cleanup**
   - Monitors `matches`, `waitingroom`, and `gameSessions` collections
   - Automatic cleanup every 2 minutes
   - Manual cleanup via admin API

4. **Advanced Analytics**
   - Track abandonment reasons (timeout, inactivity, conflicts, etc.)
   - Game mode statistics
   - Duration analytics
   - 24-hour rolling statistics

## 🏗️ **Architecture**

### **Service Structure**

```typescript
MatchLifecycleService
├── initialize()                    // Start automatic cleanup
├── cleanupUserMatches()           // Clean specific user matches
├── abandonMatch()                 // Move match to abandoned collection
├── cleanupStagnantMatches()       // Bulk cleanup operation
├── getAbandonedMatchStats()       // Analytics and monitoring
└── forceCleanup()                 // Manual admin cleanup
```

### **Database Collections**

```
Firebase Collections:
├── matches/                       // Active matches (10-min max lifetime)
├── waitingroom/                  // Active waiting rooms (10-min max)
├── gameSessions/                 // Active sessions (10-min max)
└── abandonedMatches/             // Permanent record of all abandoned matches
    ├── originalMatchId           // Reference to original match
    ├── reason                    // Why it was abandoned
    ├── duration                  // How long it lasted
    ├── players[]                 // Who was playing
    ├── gameMode                  // What game mode
    └── abandonedAt               // When it was abandoned
```

## 🔧 **Integration Points**

### **1. App Initialization**
```typescript
// src/context/Providers.tsx
MatchLifecycleService.initialize();
```

### **2. Match Creation**
```typescript
// src/components/dashboard/GameWaitingRoom.tsx
// Before creating new match:
await MatchLifecycleService.cleanupUserMatches(userId, 'new_match_created');
```

### **3. Admin Monitoring**
```typescript
// GET /api/admin/match-lifecycle - Get statistics
// POST /api/admin/match-lifecycle - Force cleanup
// PUT /api/admin/match-lifecycle - Control scheduler
```

## 📊 **Configuration**

### **Timeout Settings**
```typescript
const MATCH_TIMEOUT_MS = 10 * 60 * 1000;    // 10 minutes
const CLEANUP_INTERVAL_MS = 2 * 60 * 1000;   // Check every 2 minutes
```

### **Abandonment Reasons**
- `timeout` - Match exceeded 10-minute limit
- `inactivity` - No recent activity detected
- `conflict_resolution` - Cleaned up for new match
- `player_disconnect` - All players disconnected
- `system_cleanup` - General maintenance
- `new_match_created` - User started new match

## 🚀 **Benefits**

### **For Users**
- ✅ **Faster matchmaking** - No stagnant matches blocking system
- ✅ **Consistent experience** - Clean state every time
- ✅ **No conflicts** - Can't accidentally have multiple matches
- ✅ **Reliable timeouts** - 10-minute maximum match duration

### **For System**
- ✅ **Clean database** - Automatic garbage collection
- ✅ **Better performance** - Smaller active collections
- ✅ **Rich analytics** - Track why matches end
- ✅ **Admin control** - Monitor and manage lifecycle

### **For Developers**
- ✅ **Predictable behavior** - Known match lifetimes
- ✅ **Easy monitoring** - Built-in statistics
- ✅ **Flexible configuration** - Adjustable timeouts
- ✅ **Error recovery** - Graceful failure handling

## 🧪 **Testing**

### **Manual Testing**
```bash
# Run the test script
node test-match-lifecycle.js
```

### **Admin API Testing**
```bash
# Get statistics
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
     http://localhost:3000/api/admin/match-lifecycle

# Force cleanup
curl -X POST \
     -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"action":"cleanup"}' \
     http://localhost:3000/api/admin/match-lifecycle

# Clean specific user
curl -X POST \
     -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"action":"user-cleanup","userId":"user123"}' \
     http://localhost:3000/api/admin/match-lifecycle
```

## 📈 **Monitoring**

### **Key Metrics to Track**
- Total abandoned matches per day
- Most common abandonment reasons
- Average match duration
- Cleanup efficiency (matches cleaned per cycle)
- User conflict resolution frequency

### **Alerting Thresholds**
- 🟡 **Warning**: >100 matches abandoned per hour
- 🔴 **Critical**: >500 matches abandoned per hour
- 🟡 **Warning**: Cleanup cycle taking >30 seconds
- 🔴 **Critical**: Cleanup failing for >5 consecutive cycles

## 🔄 **Migration Guide**

### **From Old System**
1. **Backup existing data** (if needed)
2. **Deploy MatchLifecycleService**
3. **Run initial cleanup** via admin API
4. **Monitor statistics** for first 24 hours
5. **Adjust configuration** if needed

### **Rollback Plan**
1. Stop MatchLifecycleService scheduler
2. Restore previous cleanup services
3. Manually clean abandonedMatches if needed

## 🚨 **Important Notes**

- **10-minute timeout is strict** - Matches will be abandoned even if active
- **Conflict resolution is automatic** - Old matches are always cleaned
- **Abandoned matches are permanent** - They're never automatically deleted
- **Statistics are rolling** - Default 24-hour window
- **Admin access required** - All management APIs are admin-only

## 🔮 **Future Enhancements**

- [ ] **User notifications** before match timeout
- [ ] **Grace period** for active matches
- [ ] **Match pause/resume** functionality
- [ ] **Historical analytics** beyond 24 hours
- [ ] **Batch operations** for bulk user cleanup
- [ ] **Webhook integration** for external monitoring