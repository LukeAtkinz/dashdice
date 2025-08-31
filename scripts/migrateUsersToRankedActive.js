/**
 * Migration Script: Set All Users to Ranked - Active
 * 
 * This script updates all existing users to have rankedStatus: 'Ranked - Active'
 * Run this once to prepare the system for the new ranked matchmaking system.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch, doc } = require('firebase/firestore');

// Firebase configuration (use your actual config)
const firebaseConfig = {
  // This would be loaded from environment variables in production
  // For now, using a placeholder - replace with actual config
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateUsersToRankedActive() {
  try {
    console.log('🚀 Starting user migration to Ranked - Active status...');
    console.log('⏰ This may take a few moments depending on the number of users...');
    
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    let updateCount = 0;
    const batchSize = 500; // Firestore batch limit
    let batch = writeBatch(db);
    let batchCount = 0;

    for (const document of snapshot.docs) {
      const userData = document.data();
      
      // Only update if rankedStatus is not already set
      if (!userData.rankedStatus) {
        batch.update(doc(db, 'users', document.id), {
          rankedStatus: 'Ranked - Active',
          updatedAt: new Date()
        });
        
        updateCount++;
        batchCount++;
        
        // Commit batch when it reaches the limit
        if (batchCount >= batchSize) {
          await batch.commit();
          console.log(`✅ Committed batch of ${batchCount} user updates`);
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
    }
    
    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ Committed final batch of ${batchCount} user updates`);
    }
    
    console.log(`✅ Migration completed successfully!`);
    console.log(`📊 Updated ${updateCount} users to rankedStatus: "Ranked - Active"`);
    console.log(`🎮 The ranked matchmaking system is ready to use.`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('🔧 Please check the error and try again.');
    console.log('💡 Make sure Firebase is properly configured and accessible.');
    console.log('🔑 Note: Update the firebaseConfig in this script with your actual Firebase project settings.');
  }
}

// Run the migration
console.log('🔧 IMPORTANT: Please update the firebaseConfig in this script with your actual Firebase project settings before running.');
console.log('📝 You can find your config in the Firebase Console > Project Settings > General > Your apps');
console.log('');

// Uncomment the line below after updating the Firebase config
// migrateUsersToRankedActive();
