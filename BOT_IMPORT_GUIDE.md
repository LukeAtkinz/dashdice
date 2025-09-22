# 🤖 Firebase Bot Import Guide

## 📋 Quick Manual Import Instructions

### Step 1: Open Firebase Console
1. Go to: https://console.firebase.google.com/project/dashdice-d1b86/firestore/data
2. Sign in with your Firebase account

### Step 2: Create Bot Profiles Collection
1. Click "Start Collection" 
2. Collection ID: `bot_profiles`
3. Click "Next"

### Step 3: Add First Bot
1. Document ID: `bot_1758028255316_bz9duqijt`
2. Import the JSON data from: `firebase-import/1_Hayden_Wilson.json`
3. Click "Save"

### Step 4: Add More Bots (Recommended)
Add these 2 more bots for different skill levels:

**Bot 2 - Expert Level:**
- Document ID: `bot_1758028255318_3f1sdcnkb` 
- Data: `firebase-import/2_Sam_Rodriguez.json`

**Bot 3 - Advanced Level:**
- Document ID: `bot_1758028255388_q4n8v6t1`
- Data: `firebase-import/3_Avery_Martin.json`

## 🎯 After Import - Test the System

### 1. Verify Bot Data
- Check Firebase Console shows bot_profiles collection
- Verify 3 bot documents exist

### 2. Test Bot Matching
1. Open DashDice app: http://localhost:3000
2. Start a quick game
3. Wait 10-15 seconds for bot matching
4. Verify bot appears as opponent

### 3. Bot Integration Check
- Bots should appear as regular players
- Bot names: Hayden Wilson, Sam Rodriguez, Avery Martin
- Different skill levels for variety

## 📁 All Bot Files Available
Location: `./firebase-import/`
- 20 total bots ready for import
- Different skill levels and personalities
- Full stats, inventory, and achievement data

## 🔧 Import Tips
- Import 3-5 bots initially to test
- Add more bots as needed for variety
- Each bot has unique personality and stats
- Bots integrate seamlessly with user system

## ✅ Success Indicators
- Bot profiles visible in Firebase Console
- Bots appear in matchmaking queue
- Realistic gameplay against bot opponents
- Bot stats update after matches

---

🚀 **Ready to Test!** After importing 3 bots, your bot system will be fully functional!