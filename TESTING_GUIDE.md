# 🧪 Match System Testing Guide

## 🎮 How to Test the Match System

### **Starting a Test Match:**
1. **Click the "TEST MATCH" button** (formerly SHOP button) in the dashboard
2. **System automatically creates:**
   - 2 test players with random backgrounds and stats
   - An active match in the 'gameplay' phase
   - Real Firebase documents for testing

### **What You Can Test:**
✅ **Real-time match interface** with live Firebase data  
✅ **Slot machine dice animations** with progressive deceleration  
✅ **Complete game rules:**
- Single 1: Turn over, no score added
- Double 6: Player score reset to 0  
- Snake Eyes (Double 1): +20 to turn score, continue
- Normal scoring: Add dice sum to turn score

✅ **Banking system** to convert turn score to player score  
✅ **Turn management** and player switching  
✅ **Win conditions** when reaching round objective  
✅ **Dynamic backgrounds** from test player data  

### **Test Player Details:**
- **TestPlayer1** (YOU control): Classic mode, "All For Glory" background
- **TestPlayer2** (Opponent): Various backgrounds, realistic stats
- **Round Objective:** 100 points (Classic mode)
- **Starting Scores:** TestPlayer1: 25, TestPlayer2: 18

---

## 🧹 Cleanup Commands

### **Browser Console Commands:**
```javascript
// Delete all test data
testUtils.deleteTestPlayers()

// Check how many test matches exist  
testUtils.checkTestMatches()

// Full cleanup with summary
testUtils.cleanupAndCheck()
```

### **When You Say "Delete Test Players":**
Run this command in browser console:
```javascript
testUtils.deleteTestPlayers()
```

**This will:**
- ✅ Delete ALL test matches from Firebase
- ✅ Delete ALL test waiting room entries  
- ✅ Clean up completely without affecting real data
- ✅ Safe and reversible (just click TEST MATCH again)

---

## 🎯 Testing Scenarios

### **Scenario 1: Basic Gameplay**
1. Click TEST MATCH
2. Roll dice and see animations
3. Test game rules (try to get Snake Eyes!)
4. Bank your score
5. Try to reach 100 points

### **Scenario 2: Game Rules Testing**
- **Roll until you get a 1** (single 1 = turn over)
- **Try to get double 6** (resets your score to 0)
- **Look for double 1** (Snake Eyes = +20 bonus)

### **Scenario 3: Win Condition**
- Bank scores strategically to reach 100 points
- See victory screen with celebration animation

---

## 🔧 Technical Details

### **Test Data Structure:**
- Test matches use Firebase real-time subscriptions
- Compatible with existing matchmaking system
- Uses actual MatchService and game logic
- No hardcoded data - everything dynamic

### **Safety Features:**
- ✅ **No impact on real users** - test players have unique IDs
- ✅ **Easy cleanup** - single command removes everything  
- ✅ **Isolated testing** - doesn't break existing functionality
- ✅ **Reversible** - can recreate test data instantly

---

**Status:** ✅ Ready for Testing  
**Cleanup:** Available via console commands or "Delete Test Players" request
