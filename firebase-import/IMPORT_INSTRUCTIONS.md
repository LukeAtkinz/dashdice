# Firebase Manual Import Instructions

## 🚀 How to Import Bot Profiles

### 1. Go to Firebase Console
https://console.firebase.google.com/project/dashdice-d1b86/firestore/data

### 2. Create Collection
- Click "Start collection" (or "Add collection")
- Collection ID: `bot_profiles`
- Click "Next"

### 3. Import Bot Documents
For each bot file in this directory:

1. **Document ID**: Use the `uid` from the JSON file (e.g., `bot_1758028255316_bz9duqijt`)
2. **Document Data**: 
   - Click the "JSON" button in Firebase Console
   - Copy and paste the entire JSON content from the bot file
   - Click "Save"

### 4. Quick Import (Recommended Bots)
Start with these bots for immediate testing:

**Bot 1: Hayden Wilson** (beginner)
- Document ID: `bot_1758028255316_bz9duqijt`
- File: `1_Hayden_Wilson.json`

**Bot 2: Sam Rodriguez** (expert)
- Document ID: `bot_1758028255318_3f1sdcnkb`
- File: `2_Sam_Rodriguez.json`

**Bot 3: Avery Martin** (advanced)
- Document ID: `bot_1758028255319_84j56qtjr`
- File: `3_Avery_Martin.json`

### 5. Test Bot System
After importing at least 1 bot:
1. Start DashDice quick match
2. Wait 10 seconds
3. Should automatically match with imported bot!

## 📊 Bot Statistics
- Total Bots: 20
- Beginner: 2
- Intermediate: 6
- Advanced: 2
- Expert: 10

## 🎯 Bot Matching
Once imported, the bot system will:
- Match users with bots after 10 seconds of no human matches
- Only for quick games (not ranked)
- Bots appear as real users in all interfaces
- Bot stats update after each match
