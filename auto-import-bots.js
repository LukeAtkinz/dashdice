#!/usr/bin/env node

/**
 * Firebase Bot Profiles Import Script using Admin SDK
 * This script will automatically import all bot profiles to Firestore
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
function initializeFirebase() {
  if (admin.apps.length === 0) {
    try {
      // Try to use service account key file
      const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: 'dashdice-d1b86'
        });
        console.log('✅ Firebase Admin initialized with service account');
      } else {
        // Fallback to environment variables
        admin.initializeApp({
          projectId: 'dashdice-d1b86'
        });
        console.log('✅ Firebase Admin initialized with default credentials');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin:', error.message);
      throw error;
    }
  }
  
  return admin.firestore();
}

async function importBotProfiles() {
  console.log('🤖 Starting bot profiles import to Firebase...\n');
  
  try {
    // Initialize Firebase
    const db = initializeFirebase();
    
    // Read bot profiles data
    const botDataPath = path.join(__dirname, 'bot-profiles-data.json');
    if (!fs.existsSync(botDataPath)) {
      throw new Error('bot-profiles-data.json not found');
    }
    
    const botData = JSON.parse(fs.readFileSync(botDataPath, 'utf8'));
    const bots = botData.bots;
    
    console.log(`📊 Found ${bots.length} bot profiles to import`);
    console.log('🔄 Starting import process...\n');
    
    // Use batch writes for better performance
    const batch = db.batch();
    let importCount = 0;
    
    for (const bot of bots) {
      try {
        // Convert date strings to Firebase timestamps
        const botProfile = {
          ...bot,
          createdAt: admin.firestore.Timestamp.fromDate(new Date(bot.createdAt)),
          updatedAt: admin.firestore.Timestamp.fromDate(new Date(bot.updatedAt)),
          generationDate: admin.firestore.Timestamp.fromDate(new Date(bot.generationDate)),
          lastActiveDate: admin.firestore.Timestamp.fromDate(new Date(bot.lastActiveDate))
        };
        
        // Add to batch using bot's uid as document ID
        const botRef = db.collection('bot_profiles').doc(bot.uid);
        batch.set(botRef, botProfile);
        
        console.log(`  ✅ Queued: ${bot.displayName} (${bot.personality.skillLevel}, ELO: ${bot.stats.elo})`);
        importCount++;
        
      } catch (error) {
        console.error(`  ❌ Failed to queue ${bot.displayName}:`, error.message);
      }
    }
    
    // Commit the batch
    console.log('\n🚀 Committing batch write to Firebase...');
    await batch.commit();
    
    console.log(`\n🎉 Successfully imported ${importCount} bot profiles!`);
    console.log(`📍 Collection: bot_profiles`);
    console.log(`🌐 Firebase Console: https://console.firebase.google.com/project/dashdice-d1b86/firestore/data/~2Fbot_profiles`);
    
    return importCount;
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    
    if (error.message.includes('permission-denied')) {
      console.log('\n💡 Permission denied. Possible solutions:');
      console.log('1. Ensure serviceAccountKey.json has proper Firebase Admin permissions');
      console.log('2. Check Firebase IAM roles for the service account');
      console.log('3. Verify project ID is correct (dashdice-d1b86)');
    }
    
    if (error.message.includes('INVALID_CREDENTIAL')) {
      console.log('\n💡 Invalid credentials. Try:');
      console.log('1. Download fresh serviceAccountKey.json from Firebase Console');
      console.log('2. Ensure the file is properly formatted JSON');
      console.log('3. Check if service account has Firestore permissions');
    }
    
    throw error;
  }
}

async function verifyImport() {
  console.log('\n🔍 Verifying bot profiles import...');
  
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('bot_profiles').limit(5).get();
    
    console.log(`  ✅ Found ${snapshot.size} bot profiles in database`);
    
    if (snapshot.size > 0) {
      snapshot.forEach(doc => {
        const bot = doc.data();
        console.log(`    🤖 ${bot.displayName} (ELO: ${bot.stats.elo})`);
      });
    }
    
    return snapshot.size;
    
  } catch (error) {
    console.error('  ❌ Verification failed:', error.message);
    return 0;
  }
}

async function main() {
  console.log('🚀 DashDice Bot Profiles Auto-Import\n');
  console.log('====================================\n');
  
  try {
    const imported = await importBotProfiles();
    const verified = await verifyImport();
    
    if (imported > 0 && verified > 0) {
      console.log('\n🎯 Next Steps:');
      console.log('1. ✅ Bot profiles imported successfully');
      console.log('2. 🧪 Test bot matching: Start quick game, wait 10 seconds');
      console.log('3. 👁️  Verify bots appear as real users in profile viewing');
      console.log('4. 📊 Monitor bot stats updates after matches');
      
      console.log('\n🤖 Your bot system is now LIVE!');
      console.log('Users will automatically match with bots after 10 seconds in quick games.');
    } else {
      console.log('\n⚠️  Import may have failed. Check Firebase Console manually.');
    }
    
  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { importBotProfiles, verifyImport };
