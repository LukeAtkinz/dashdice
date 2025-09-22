#!/usr/bin/env node

/**
 * Firebase Bot Data Checker and Direct Import
 * Checks current Firebase state and imports bot data directly
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

async function checkAndImportBots() {
  console.log('🔍 Checking Firebase for bot data...\n');
  
  try {
    // Initialize Firebase Admin with service account
    let app;
    try {
      // Read service account key
      const serviceAccount = JSON.parse(fs.readFileSync('serviceAccountKey.json', 'utf8'));
      
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: 'dashdice-d1b86'
      });
    } catch (error) {
      console.log('⚠️  Service account not configured, trying default credentials...');
      // Try with default credentials
      app = initializeApp({
        projectId: 'dashdice-d1b86'
      });
    }
    
    const db = getFirestore(app);
    
    // Check if bot_profiles collection exists
    console.log('📊 Checking bot_profiles collection...');
    const botsRef = db.collection('bot_profiles');
    const snapshot = await botsRef.limit(5).get();
    
    if (snapshot.empty) {
      console.log('❌ No bot profiles found in Firebase!');
      console.log('📋 Collection bot_profiles appears to be empty or non-existent.\n');
      
      // Try to import bots directly
      console.log('🚀 Attempting direct import...');
      await importBotsDirectly(db);
      
    } else {
      console.log(`✅ Found ${snapshot.size} bot profiles in Firebase:`);
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.displayName} (${data.personality?.skillLevel || 'unknown'}, ELO: ${data.stats?.elo || 'unknown'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Firebase check failed:', error.message);
    
    if (error.message.includes('service account') || error.message.includes('credentials')) {
      console.log('\n🔧 Authentication Issue Detected!');
      console.log('The serviceAccountKey.json file contains template data, not real credentials.');
      console.log('\n📋 Manual Import Required:');
      console.log('1. Go to: https://console.firebase.google.com/project/dashdice-d1b86/firestore/data');
      console.log('2. Create collection: bot_profiles');
      console.log('3. Import files from: ./firebase-import/');
      console.log('4. Start with: 1_Hayden_Wilson.json');
    }
  }
}

async function importBotsDirectly(db) {
  try {
    // Read bot data
    const botData = JSON.parse(fs.readFileSync('bot-profiles-data.json', 'utf8'));
    const bots = botData.bots;
    
    console.log(`📥 Importing ${bots.length} bots to Firebase...`);
    
    // Import bots in batches
    const batch = db.batch();
    let imported = 0;
    
    for (const bot of bots.slice(0, 5)) { // Start with first 5 bots
      const botRef = db.collection('bot_profiles').doc(bot.uid);
      batch.set(botRef, bot);
      imported++;
      console.log(`  ⏳ Queued: ${bot.displayName} (${bot.personality.skillLevel})`);
    }
    
    await batch.commit();
    console.log(`\n🎉 Successfully imported ${imported} bots!`);
    
    // Verify import
    const verifySnapshot = await db.collection('bot_profiles').limit(3).get();
    console.log(`\n✅ Verification: Found ${verifySnapshot.size} bots in Firebase`);
    
  } catch (error) {
    console.error('❌ Direct import failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🤖 DashDice Bot Firebase Checker\n');
  console.log('=================================\n');
  
  await checkAndImportBots();
}

if (require.main === module) {
  main().catch(console.error);
}
