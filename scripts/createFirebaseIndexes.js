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

async function createFirebaseIndexes() {
  console.log('Creating Firebase indexes...');
  
  try {
    // The error message indicates we need a composite index for achievementDefinitions collection
    // Fields: isActive, category, order, __name__
    
    console.log('Note: You need to create the following composite index manually in Firebase Console:');
    console.log('Collection: achievementDefinitions');
    console.log('Fields: isActive (Ascending), category (Ascending), order (Ascending), __name__ (Ascending)');
    console.log('URL: https://console.firebase.google.com/v1/r/project/dashdice-d1b86/firestore/indexes?create_composite=Cl1wcm9qZWN0cy9kYXNoZGljZS1kMWI4Ni9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvYWNoaWV2ZW1lbnREZWZpbml0aW9ucy9pbmRleGVzL18QARoMCghpc0FjdGl2ZRABGgwKCGNhdGVnb3J5EAEaCQoFb3JkZXIQARoMCghfX25hbWVfXxAB');
    
    // Alternative: Update the query to not require the composite index
    console.log('\nAlternatively, we can modify the query to avoid the composite index requirement...');
    
    console.log('Indexes creation process completed.');
    
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

// Check current achievement definitions and see what query is causing the issue
async function checkAchievementQuery() {
  try {
    console.log('Checking achievement definitions...');
    
    // This query likely causes the index error
    const snapshot = await db.collection('achievementDefinitions')
      .where('isActive', '==', true)
      .orderBy('category')
      .orderBy('order')
      .get();
      
    console.log(`Found ${snapshot.docs.length} achievement definitions`);
    
  } catch (error) {
    console.error('Query error (expected):', error.message);
    console.log('This confirms the index is needed.');
  }
}

// Run the functions
async function main() {
  await checkAchievementQuery();
  await createFirebaseIndexes();
  process.exit(0);
}

main().catch(console.error);
