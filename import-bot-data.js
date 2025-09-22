#!/usr/bin/env node

/**
 * Firebase Bot Data Import Script
 * Uses Firebase v9 SDK to import bot profiles without admin SDK
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, connectFirestoreEmulator } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Firebase configuration (using environment or default values)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDHxsqOPqMh8YQDxVj6IgB_c8xZ-y9p4qM",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dashdice-d1b86.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dashdice-d1b86",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dashdice-d1b86.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function importBotProfiles() {
  console.log('🚀 Importing bot profiles to Firebase...\n');
  
  try {
    // Read the bot data file
    const botDataFile = path.join(__dirname, 'bot-profiles-data.json');
    if (!fs.existsSync(botDataFile)) {
      throw new Error('bot-profiles-data.json not found. Run generate-bot-data.js first.');
    }
    
    const botData = JSON.parse(fs.readFileSync(botDataFile, 'utf8'));
    const bots = botData.bots;
    
    console.log(`📊 Found ${bots.length} bot profiles to import`);
    
    // Import each bot profile
    let imported = 0;
    let errors = 0;
    
    for (const bot of bots) {
      try {
        // Convert date strings to Firebase timestamps
        const botProfile = {
          ...bot,
          createdAt: new Date(bot.createdAt),
          updatedAt: new Date(bot.updatedAt),
          generationDate: new Date(bot.generationDate),
          lastActiveDate: new Date(bot.lastActiveDate)
        };
        
        // Use the bot's uid as the document ID
        const botRef = doc(db, 'bot_profiles', bot.uid);
        await setDoc(botRef, botProfile);
        
        console.log(`  ✅ ${bot.displayName} (${bot.personality.skillLevel}, ELO: ${bot.stats.elo})`);
        imported++;
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`  ❌ Failed to import ${bot.displayName}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n🎉 Bot import complete!`);
    console.log(`  ✅ Successfully imported: ${imported} bots`);
    if (errors > 0) {
      console.log(`  ❌ Failed imports: ${errors} bots`);
    }
    
    console.log(`\n📍 Bot profiles imported to:`);
    console.log(`  Collection: bot_profiles`);
    console.log(`  Firebase Console: https://console.firebase.google.com/project/dashdice-d1b86/firestore/data/~2Fbot_profiles`);
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    
    if (error.message.includes('permission-denied') || error.message.includes('unauthenticated')) {
      console.log('\n💡 Alternative import methods:');
      console.log('1. Manual import via Firebase Console:');
      console.log('   - Go to: https://console.firebase.google.com/project/dashdice-d1b86/firestore/data');
      console.log('   - Create collection: bot_profiles');
      console.log('   - Import bot-profiles-data.json manually');
      console.log('\n2. Use Firebase Admin SDK with service account credentials');
    }
  }
}

async function validateImport() {
  console.log('\n🔍 Validating bot import...');
  
  try {
    // This will fail without authentication, but that's expected
    // The main goal is to provide import instructions
    console.log('  ℹ️  Manual validation required via Firebase Console');
    
  } catch (error) {
    console.log('  ℹ️  Check Firebase Console to verify bot profiles were imported');
  }
}

async function main() {
  console.log('🤖 DashDice Bot Data Import Tool\n');
  
  try {
    await importBotProfiles();
    await validateImport();
    
    console.log('\n🎯 Next Steps:');
    console.log('1. ✅ Bot profiles imported (or ready for manual import)');
    console.log('2. 🧪 Test bot matching: Start quick game, wait 10 seconds');
    console.log('3. 👁️  Verify bots appear as real users in profile viewing');
    console.log('4. 📊 Check bot stats update after matches');
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { importBotProfiles, validateImport };
