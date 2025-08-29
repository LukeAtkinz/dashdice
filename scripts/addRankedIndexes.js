const admin = require('firebase-admin');

// Initialize Firebase Admin if not already done
if (admin.apps.length === 0) {
  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://dashdice-d1b86.firebaseio.com'
  });
}

const db = admin.firestore();

async function addRankedIndexes() {
  console.log('🔥 Adding Firebase indexes for ranked system...');
  
  try {
    // The indexes we need for ranked system queries
    const rankedIndexes = [
      {
        collection: 'rankedStats',
        fields: [
          { field: 'currentSeason.dashNumber', order: 'ASCENDING' },
          { field: 'currentSeason.level', order: 'DESCENDING' },
          { field: 'currentSeason.totalWins', order: 'DESCENDING' },
          { field: 'currentSeason.winsInLevel', order: 'DESCENDING' }
        ]
      },
      {
        collection: 'rankedStats',
        fields: [
          { field: 'allTime.maxLevelReached', order: 'DESCENDING' },
          { field: 'allTime.totalRankedWins', order: 'DESCENDING' },
          { field: 'allTime.totalRankedGames', order: 'DESCENDING' }
        ]
      },
      {
        collection: 'rankedStats',
        fields: [
          { field: 'currentSeason.dashNumber', order: 'ASCENDING' },
          { field: 'currentSeason.level', order: 'ASCENDING' },
          { field: 'currentSeason.totalWins', order: 'DESCENDING' },
          { field: 'currentSeason.winsInLevel', order: 'DESCENDING' }
        ]
      },
      {
        collection: 'seasons',
        fields: [
          { field: 'isActive', order: 'ASCENDING' },
          { field: 'dashNumber', order: 'DESCENDING' }
        ]
      },
      {
        collection: 'rankedMatches',
        fields: [
          { field: 'hostData.playerId', order: 'ASCENDING' },
          { field: 'completedAt', order: 'DESCENDING' }
        ]
      },
      {
        collection: 'rankedMatches',
        fields: [
          { field: 'opponentData.playerId', order: 'ASCENDING' },
          { field: 'completedAt', order: 'DESCENDING' }
        ]
      },
      {
        collection: 'rankedAchievements',
        fields: [
          { field: 'userId', order: 'ASCENDING' },
          { field: 'unlockedAt', order: 'DESCENDING' }
        ]
      }
    ];
    
    console.log(`📊 Attempting to create ${rankedIndexes.length} indexes...`);
    
    // Note: Firebase Admin SDK doesn't have direct index creation API
    // Users need to create these manually or via Firebase CLI
    
    console.log('\n🎯 REQUIRED FIREBASE INDEXES FOR RANKED SYSTEM:');
    console.log('==================================================');
    
    rankedIndexes.forEach((index, i) => {
      console.log(`\n${i + 1}. Collection: ${index.collection}`);
      console.log('   Fields:');
      index.fields.forEach(field => {
        console.log(`   - ${field.field} (${field.order})`);
      });
    });
    
    console.log('\n📝 TO CREATE THESE INDEXES:');
    console.log('1. Go to Firebase Console > Firestore > Indexes');
    console.log('2. Click "Create Index" for each collection above');
    console.log('3. Add the fields in the exact order shown');
    console.log('4. Or use the Firebase CLI with the firestore.indexes.json file');
    console.log('\n⚠️  These indexes are REQUIRED for optimal performance!');
    console.log('   Without them, queries will be slow or fail entirely.');
    
  } catch (error) {
    console.error('❌ Error setting up indexes:', error);
  }
}

// Test query to see if indexes are needed
async function testRankedQueries() {
  console.log('\n🧪 Testing ranked system queries...');
  
  try {
    // Test current season leaderboard query
    console.log('Testing current season leaderboard query...');
    const testQuery = db.collection('rankedStats')
      .where('currentSeason.dashNumber', '==', 1)
      .orderBy('currentSeason.level', 'desc')
      .orderBy('currentSeason.totalWins', 'desc')
      .limit(10);
    
    const snapshot = await testQuery.get();
    console.log(`✅ Current season query successful: ${snapshot.size} results`);
    
    // Test all-time leaderboard query
    console.log('Testing all-time leaderboard query...');
    const allTimeQuery = db.collection('rankedStats')
      .orderBy('allTime.maxLevelReached', 'desc')
      .orderBy('allTime.totalRankedWins', 'desc')
      .limit(10);
    
    const allTimeSnapshot = await allTimeQuery.get();
    console.log(`✅ All-time query successful: ${allTimeSnapshot.size} results`);
    
    console.log('\n🎉 All ranked system queries are working!');
    
  } catch (error) {
    console.error('❌ Query test failed:', error.message);
    console.log('\n💡 This likely means the required indexes are missing.');
    console.log('   Please create the indexes shown above.');
  }
}

// Run the functions
async function main() {
  await addRankedIndexes();
  await testRankedQueries();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { addRankedIndexes, testRankedQueries };
