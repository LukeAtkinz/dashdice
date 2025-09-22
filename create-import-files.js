#!/usr/bin/env node

/**
 * Firebase Import Helper - Creates formatted bot documents for manual import
 */

const fs = require('fs');
const path = require('path');

function createFirebaseImportFiles() {
  console.log('🤖 Creating Firebase import files for manual upload...\n');
  
  try {
    // Read bot data
    const botData = JSON.parse(fs.readFileSync('bot-profiles-data.json', 'utf8'));
    const bots = botData.bots;
    
    console.log(`📊 Processing ${bots.length} bot profiles...`);
    
    // Create import directory
    const importDir = 'firebase-import';
    if (!fs.existsSync(importDir)) {
      fs.mkdirSync(importDir);
    }
    
    // Create individual bot files for easy copy-paste
    bots.forEach((bot, index) => {
      const filename = `${index + 1}_${bot.displayName.replace(/\s+/g, '_')}.json`;
      const filepath = path.join(importDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(bot, null, 2));
      console.log(`  ✅ Created: ${filename} (${bot.personality.skillLevel}, ELO: ${bot.stats.elo})`);
    });
    
    // Create a simple import instruction file
    const instructions = `# Firebase Manual Import Instructions

## 🚀 How to Import Bot Profiles

### 1. Go to Firebase Console
https://console.firebase.google.com/project/dashdice-d1b86/firestore/data

### 2. Create Collection
- Click "Start collection" (or "Add collection")
- Collection ID: \`bot_profiles\`
- Click "Next"

### 3. Import Bot Documents
For each bot file in this directory:

1. **Document ID**: Use the \`uid\` from the JSON file (e.g., \`bot_1758028255316_bz9duqijt\`)
2. **Document Data**: 
   - Click the "JSON" button in Firebase Console
   - Copy and paste the entire JSON content from the bot file
   - Click "Save"

### 4. Quick Import (Recommended Bots)
Start with these bots for immediate testing:

**Bot 1: ${bots[0].displayName}** (${bots[0].personality.skillLevel})
- Document ID: \`${bots[0].uid}\`
- File: \`1_${bots[0].displayName.replace(/\s+/g, '_')}.json\`

**Bot 2: ${bots[1].displayName}** (${bots[1].personality.skillLevel})
- Document ID: \`${bots[1].uid}\`
- File: \`2_${bots[1].displayName.replace(/\s+/g, '_')}.json\`

**Bot 3: ${bots[2].displayName}** (${bots[2].personality.skillLevel})
- Document ID: \`${bots[2].uid}\`
- File: \`3_${bots[2].displayName.replace(/\s+/g, '_')}.json\`

### 5. Test Bot System
After importing at least 1 bot:
1. Start DashDice quick match
2. Wait 10 seconds
3. Should automatically match with imported bot!

## 📊 Bot Statistics
- Total Bots: ${bots.length}
- Beginner: ${bots.filter(b => b.personality.skillLevel === 'beginner').length}
- Intermediate: ${bots.filter(b => b.personality.skillLevel === 'intermediate').length}
- Advanced: ${bots.filter(b => b.personality.skillLevel === 'advanced').length}
- Expert: ${bots.filter(b => b.personality.skillLevel === 'expert').length}

## 🎯 Bot Matching
Once imported, the bot system will:
- Match users with bots after 10 seconds of no human matches
- Only for quick games (not ranked)
- Bots appear as real users in all interfaces
- Bot stats update after each match
`;
    
    fs.writeFileSync(path.join(importDir, 'IMPORT_INSTRUCTIONS.md'), instructions);
    
    // Create a summary file with all bot info
    const summary = {
      collection: "bot_profiles",
      total_bots: bots.length,
      import_instruction: "Use Firebase Console to create bot_profiles collection and import individual bot JSON files",
      firebase_console_url: "https://console.firebase.google.com/project/dashdice-d1b86/firestore/data",
      bots_summary: bots.map(bot => ({
        uid: bot.uid,
        displayName: bot.displayName,
        skillLevel: bot.personality.skillLevel,
        elo: bot.stats.elo,
        file: `${bots.indexOf(bot) + 1}_${bot.displayName.replace(/\s+/g, '_')}.json`
      }))
    };
    
    fs.writeFileSync(path.join(importDir, 'import_summary.json'), JSON.stringify(summary, null, 2));
    
    console.log(`\n🎉 Created ${bots.length} bot import files!`);
    console.log(`📁 Location: ./${importDir}/`);
    console.log(`📋 Instructions: ./${importDir}/IMPORT_INSTRUCTIONS.md`);
    
    console.log('\n🚀 Quick Start:');
    console.log('1. Open Firebase Console: https://console.firebase.google.com/project/dashdice-d1b86/firestore/data');
    console.log('2. Create collection: bot_profiles');
    console.log(`3. Import: ${importDir}/1_${bots[0].displayName.replace(/\s+/g, '_')}.json`);
    console.log('4. Test bot matching in DashDice!');
    
    return bots.length;
    
  } catch (error) {
    console.error('❌ Failed to create import files:', error.message);
    throw error;
  }
}

function main() {
  console.log('🚀 DashDice Bot Import Helper\n');
  console.log('============================\n');
  
  try {
    const created = createFirebaseImportFiles();
    
    if (created > 0) {
      console.log('\n✨ Import files ready!');
      console.log('📖 Follow the instructions in firebase-import/IMPORT_INSTRUCTIONS.md');
      console.log('🤖 Your bot system will be live after manual import!');
    }
    
  } catch (error) {
    console.error('\n💥 Failed to create import files:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createFirebaseImportFiles };
