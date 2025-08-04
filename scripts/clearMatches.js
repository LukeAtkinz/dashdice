const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAdqJlXO_TjKGQTi7TFBaDmJJfZJg7sG-I",
  authDomain: "dashdice-f39fe.firebaseapp.com",
  projectId: "dashdice-f39fe",
  storageBucket: "dashdice-f39fe.firebasestorage.app",
  messagingSenderId: "1028906580513",
  appId: "1:1028906580513:web:f1ed24c0bb0b53ecac3c4a",
  measurementId: "G-S7QMYV8JLN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearAllMatches() {
  try {
    console.log('🔥 Starting to clear all matches...');
    
    // Get all documents in the matches collection
    const matchesSnapshot = await getDocs(collection(db, 'matches'));
    
    if (matchesSnapshot.empty) {
      console.log('✅ No matches found to delete.');
      return;
    }
    
    console.log(`📋 Found ${matchesSnapshot.size} matches to delete...`);
    
    // Delete each match document
    const deletePromises = matchesSnapshot.docs.map(async (matchDoc) => {
      console.log(`🗑️ Deleting match: ${matchDoc.id}`);
      await deleteDoc(doc(db, 'matches', matchDoc.id));
    });
    
    // Wait for all deletions to complete
    await Promise.all(deletePromises);
    
    console.log('✅ All matches have been successfully cleared!');
    console.log('🎯 Players can now create fresh matches with the new pregame system.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing matches:', error);
    process.exit(1);
  }
}

clearAllMatches();
