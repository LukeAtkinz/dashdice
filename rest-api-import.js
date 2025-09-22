#!/usr/bin/env node

/**
 * Direct Firebase REST API Bot Import
 * Uses Firebase Auth token to import bot profiles via REST API
 */

const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');

async function getFirebaseAuthToken() {
  try {
    console.log('🔐 Getting Firebase auth token...');
    const token = execSync('firebase auth:print-access-token', { encoding: 'utf8' }).trim();
    console.log('  ✅ Auth token obtained');
    return token;
  } catch (error) {
    console.error('  ❌ Failed to get auth token:', error.message);
    throw new Error('Run: firebase login');
  }
}

function makeFirestoreRequest(path, method, data, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: `/v1/projects/dashdice-d1b86/databases/(default)/documents/${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseData || '{}'));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

function convertToFirestoreDocument(bot) {
  return {
    fields: {
      uid: { stringValue: bot.uid },
      displayName: { stringValue: bot.displayName },
      email: { stringValue: bot.email },
      isBot: { booleanValue: bot.isBot },
      isActive: { booleanValue: bot.isActive },
      createdAt: { timestampValue: bot.createdAt },
      updatedAt: { timestampValue: bot.updatedAt },
      generationDate: { timestampValue: bot.generationDate },
      lastActiveDate: { timestampValue: bot.lastActiveDate },
      
      stats: {
        mapValue: {
          fields: {
            gamesPlayed: { integerValue: bot.stats.gamesPlayed.toString() },
            matchWins: { integerValue: bot.stats.matchWins.toString() },
            currentStreak: { integerValue: bot.stats.currentStreak.toString() },
            bestStreak: { integerValue: bot.stats.bestStreak.toString() },
            totalScore: { integerValue: bot.stats.totalScore.toString() },
            averageScore: { integerValue: bot.stats.averageScore.toString() },
            elo: { integerValue: bot.stats.elo.toString() }
          }
        }
      },
      
      personality: {
        mapValue: {
          fields: {
            aggressiveness: { doubleValue: bot.personality.aggressiveness },
            bankingTendency: { doubleValue: bot.personality.bankingTendency },
            riskTolerance: { doubleValue: bot.personality.riskTolerance },
            pressureResistance: { doubleValue: bot.personality.pressureResistance },
            skillLevel: { stringValue: bot.personality.skillLevel },
            archetypeCategory: { stringValue: bot.personality.archetypeCategory },
            region: { stringValue: bot.personality.region }
          }
        }
      },
      
      inventory: {
        mapValue: {
          fields: {
            items: { arrayValue: { values: [] } }
          }
        }
      },
      
      achievements: { mapValue: { fields: {} } },
      recentMatches: { arrayValue: { values: [] } }
    }
  };
}

async function importBotProfiles() {
  console.log('🤖 Importing bot profiles via Firebase REST API...\n');
  
  try {
    // Get auth token
    const token = await getFirebaseAuthToken();
    
    // Read bot data
    const botData = JSON.parse(fs.readFileSync('bot-profiles-data.json', 'utf8'));
    const bots = botData.bots.slice(0, 3); // Import first 3 for testing
    
    console.log(`📊 Importing ${bots.length} bot profiles...`);
    
    let imported = 0;
    
    for (const bot of bots) {
      try {
        console.log(`\n🔄 Importing: ${bot.displayName}...`);
        
        const firestoreDoc = convertToFirestoreDocument(bot);
        const path = `bot_profiles/${bot.uid}`;
        
        await makeFirestoreRequest(path, 'PATCH', firestoreDoc, token);
        
        console.log(`  ✅ Success: ${bot.displayName} (${bot.personality.skillLevel}, ELO: ${bot.stats.elo})`);
        imported++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`  ❌ Failed: ${bot.displayName} - ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Successfully imported ${imported} out of ${bots.length} bot profiles!`);
    
    if (imported > 0) {
      console.log('\n📍 Bot profiles location:');
      console.log('  Collection: bot_profiles');
      console.log('  Firebase Console: https://console.firebase.google.com/project/dashdice-d1b86/firestore/data/~2Fbot_profiles');
      
      console.log('\n🧪 Test the bot system:');
      console.log('1. Start a quick match in DashDice');
      console.log('2. Wait 10 seconds without finding human opponent');
      console.log('3. Should automatically match with one of the imported bots!');
    }
    
    return imported;
    
  } catch (error) {
    console.error('\n❌ REST API import failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 DashDice Bot Import (REST API)\n');
  console.log('================================\n');
  
  try {
    const imported = await importBotProfiles();
    
    if (imported > 0) {
      console.log('\n🎮 Bot system is now LIVE!');
      console.log('Your users will automatically match with bots after 10 seconds!');
    } else {
      console.log('\n⚠️  No bots were imported. Manual import may be required.');
    }
    
  } catch (error) {
    console.error('\n💥 Import failed:', error.message);
    console.log('\n💡 Manual alternative:');
    console.log('Go to Firebase Console and manually add bot documents from bot-profiles-data.json');
  }
}

if (require.main === module) {
  main();
}

module.exports = { importBotProfiles };
