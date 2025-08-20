// Simple Firebase connection test
// Run this with: node debug-firebase.js

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://dashdice-d1b86-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

async function testFirebaseConnection() {
  try {
    console.log('🔍 Testing Firebase connection...');
    
    // Test reading a collection
    const usersRef = db.collection('users');
    const snapshot = await usersRef.limit(1).get();
    
    console.log('✅ Firebase connection successful');
    console.log(`📊 Found ${snapshot.size} users in database`);
    
    // Test security rules by checking collections
    const collections = ['users', 'matches', 'completedmatches', 'achievementProgress'];
    
    for (const collectionName of collections) {
      try {
        const testRef = db.collection(collectionName);
        const testSnapshot = await testRef.limit(1).get();
        console.log(`✅ Collection '${collectionName}': ${testSnapshot.size} documents`);
      } catch (error) {
        console.error(`❌ Collection '${collectionName}': ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
  }
}

testFirebaseConnection();
