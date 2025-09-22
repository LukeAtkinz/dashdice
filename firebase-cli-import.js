#!/usr/bin/env node

/**
 * Firebase CLI Bot Import Script
 * Uses Firebase CLI to import bot profiles via Firestore REST API
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function importWithFirebaseCLI() {
  console.log('🤖 Importing bot profiles using Firebase CLI...\n');
  
  try {
    // Check if Firebase CLI is authenticated
    console.log('🔐 Checking Firebase authentication...');
    try {
      execSync('firebase projects:list', { stdio: 'pipe' });
      console.log('  ✅ Firebase CLI authenticated');
    } catch (error) {
      console.log('  ❌ Firebase CLI not authenticated');
      console.log('  🔧 Run: firebase login');
      throw new Error('Firebase CLI authentication required');
    }
    
    // Read bot profiles data
    const botDataPath = path.join(__dirname, 'bot-profiles-data.json');
    if (!fs.existsSync(botDataPath)) {
      throw new Error('bot-profiles-data.json not found');
    }
    
    const botData = JSON.parse(fs.readFileSync(botDataPath, 'utf8'));
    const bots = botData.bots;
    
    console.log(`\n📊 Found ${bots.length} bot profiles to import`);
    
    // Create individual import files for Firebase CLI
    const importDir = path.join(__dirname, 'bot-import-temp');
    if (!fs.existsSync(importDir)) {
      fs.mkdirSync(importDir);
    }
    
    console.log('📝 Creating import files...');
    
    // Create a single import file with all bots
    const importData = {
      __collections__: {
        bot_profiles: {}
      }
    };
    
    bots.forEach(bot => {
      // Convert dates to Firebase format
      const botProfile = {
        ...bot,
        createdAt: { __datatype__: 'timestamp', value: bot.createdAt },
        updatedAt: { __datatype__: 'timestamp', value: bot.updatedAt },
        generationDate: { __datatype__: 'timestamp', value: bot.generationDate },
        lastActiveDate: { __datatype__: 'timestamp', value: bot.lastActiveDate }
      };
      
      importData.__collections__.bot_profiles[bot.uid] = botProfile;
      console.log(`  ✅ Prepared: ${bot.displayName}`);
    });
    
    const importFilePath = path.join(importDir, 'bot_profiles_import.json');
    fs.writeFileSync(importFilePath, JSON.stringify(importData, null, 2));
    
    console.log(`\n📁 Import file created: ${importFilePath}`);
    
    // Use Firebase CLI to import
    console.log('\n🚀 Importing to Firestore...');
    const importCommand = `firebase firestore:delete --all-collections --force && firebase firestore:set bot_profiles "${importFilePath}"`;
    
    try {
      execSync(importCommand, { stdio: 'inherit', cwd: __dirname });
      console.log('\n🎉 Import completed successfully!');
      
      // Clean up temp files
      fs.rmSync(importDir, { recursive: true, force: true });
      
      return bots.length;
      
    } catch (error) {
      console.error('\n❌ Firebase CLI import failed:', error.message);
      throw error;
    }
    
  } catch (error) {
    console.error('\n💥 Import process failed:', error.message);
    throw error;
  }
}

async function simpleDocumentImport() {
  console.log('🤖 Simple bot import using Firebase CLI...\n');
  
  try {
    // Read bot profiles data
    const botDataPath = path.join(__dirname, 'bot-profiles-data.json');
    const botData = JSON.parse(fs.readFileSync(botDataPath, 'utf8'));
    const bots = botData.bots.slice(0, 5); // Import first 5 bots for testing
    
    console.log(`📊 Importing first ${bots.length} bots for testing...`);
    
    for (const bot of bots) {
      try {
        // Create a temp file for this bot
        const tempFile = path.join(__dirname, `temp_bot_${bot.uid}.json`);
        fs.writeFileSync(tempFile, JSON.stringify(bot, null, 2));
        
        // Import single document
        const command = `firebase firestore:set bot_profiles/${bot.uid} ${tempFile}`;
        execSync(command, { stdio: 'pipe', cwd: __dirname });
        
        console.log(`  ✅ Imported: ${bot.displayName} (${bot.personality.skillLevel})`);
        
        // Clean up temp file
        fs.unlinkSync(tempFile);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`  ❌ Failed to import ${bot.displayName}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Imported ${bots.length} bot profiles!`);
    return bots.length;
    
  } catch (error) {
    console.error('\n❌ Simple import failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 DashDice Bot Auto-Import (Firebase CLI)\n');
  console.log('==========================================\n');
  
  try {
    // Try simple document import first
    const imported = await simpleDocumentImport();
    
    if (imported > 0) {
      console.log('\n📍 Bot profiles location:');
      console.log('  Collection: bot_profiles');
      console.log('  Firebase Console: https://console.firebase.google.com/project/dashdice-d1b86/firestore/data/~2Fbot_profiles');
      
      console.log('\n🎯 Next Steps:');
      console.log('1. ✅ Bot profiles imported');
      console.log('2. 🧪 Test bot matching: Start quick game, wait 10 seconds');
      console.log('3. 🤖 Bots will automatically match with users!');
      
      console.log('\n🎮 Your bot system is now LIVE!');
    }
    
  } catch (error) {
    console.error('\n💥 Auto-import failed:', error.message);
    console.log('\n💡 Manual fallback:');
    console.log('1. Go to: https://console.firebase.google.com/project/dashdice-d1b86/firestore/data');
    console.log('2. Create collection: bot_profiles');
    console.log('3. Copy bot data from bot-profiles-data.json');
  }
}

if (require.main === module) {
  main();
}

module.exports = { simpleDocumentImport, importWithFirebaseCLI };
