/**
 * Server-side script to clear Firebase collections using Admin SDK
 * Run with: node scripts/clearFirebaseAdmin.js
 */

const admin = require('firebase-admin');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

async function clearCollection(collectionName) {
  try {
    console.log(`🔥 Starting ${collectionName} collection cleanup...`);
    
    // Get all documents in the collection
    const snapshot = await db.collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log(`✅ No ${collectionName} documents found. Collection is already empty.`);
      return 0;
    }
    
    console.log(`📋 Found ${snapshot.size} ${collectionName} documents to delete.`);
    
    // Delete documents in batches of 500 (Firestore limit)
    const batchSize = 500;
    let deletedCount = 0;
    
    while (true) {
      const batch = db.batch();
      const docs = await db.collection(collectionName).limit(batchSize).get();
      
      if (docs.empty) break;
      
      docs.forEach((doc) => {
        console.log(`🗑️  Queuing deletion: ${doc.id}`);
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deletedCount += docs.size;
      console.log(`✅ Deleted batch of ${docs.size} documents (Total: ${deletedCount})`);
    }
    
    console.log(`🎉 Successfully cleared ${collectionName} collection! Deleted ${deletedCount} documents.`);
    return deletedCount;
    
  } catch (error) {
    console.error(`❌ Error clearing ${collectionName}:`, error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Firebase Admin Collection Cleanup Tool');
  console.log('==========================================');
  
  try {
    // Clear waiting room
    const waitingRoomDeleted = await clearCollection('waitingroom');
    
    console.log('');
    
    // Clear matches 
    const matchesDeleted = await clearCollection('matches');
    
    console.log('');
    console.log('📊 CLEANUP SUMMARY:');
    console.log(`   - Waiting Room: ${waitingRoomDeleted} documents deleted`);
    console.log(`   - Matches: ${matchesDeleted} documents deleted`);
    console.log('');
    console.log('🎯 Cleanup complete! Firebase is now ready for fresh testing.');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
