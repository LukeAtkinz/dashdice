/**
 * Script to clear all documents from the Firebase waitingroom collection
 * Run with: node scripts/clearWaitingRoom.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearWaitingRoom() {
  try {
    console.log('🔥 Starting Firebase waiting room cleanup...');
    
    // Get all documents in the waitingroom collection
    const waitingRoomRef = collection(db, 'waitingroom');
    const snapshot = await getDocs(waitingRoomRef);
    
    if (snapshot.empty) {
      console.log('✅ No waiting room documents found. Collection is already empty.');
      return;
    }
    
    console.log(`📋 Found ${snapshot.size} waiting room documents to delete.`);
    
    // Delete all documents
    const deletePromises = [];
    snapshot.forEach((document) => {
      console.log(`🗑️  Deleting document: ${document.id}`);
      deletePromises.push(deleteDoc(doc(db, 'waitingroom', document.id)));
    });
    
    // Wait for all deletions to complete
    await Promise.all(deletePromises);
    
    console.log(`✅ Successfully deleted ${snapshot.size} waiting room documents.`);
    console.log('🎉 Firebase waiting room collection has been cleared!');
    
  } catch (error) {
    console.error('❌ Error clearing waiting room:', error);
    process.exit(1);
  }
}

// Also clear matches collection if needed
async function clearMatches() {
  try {
    console.log('🔥 Starting Firebase matches cleanup...');
    
    // Get all documents in the matches collection
    const matchesRef = collection(db, 'matches');
    const snapshot = await getDocs(matchesRef);
    
    if (snapshot.empty) {
      console.log('✅ No match documents found. Collection is already empty.');
      return;
    }
    
    console.log(`📋 Found ${snapshot.size} match documents to delete.`);
    
    // Delete all documents
    const deletePromises = [];
    snapshot.forEach((document) => {
      console.log(`🗑️  Deleting document: ${document.id}`);
      deletePromises.push(deleteDoc(doc(db, 'matches', document.id)));
    });
    
    // Wait for all deletions to complete
    await Promise.all(deletePromises);
    
    console.log(`✅ Successfully deleted ${snapshot.size} match documents.`);
    console.log('🎉 Firebase matches collection has been cleared!');
    
  } catch (error) {
    console.error('❌ Error clearing matches:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Firebase Collection Cleanup Tool');
  console.log('=====================================');
  
  // Clear waiting room
  await clearWaitingRoom();
  
  console.log('');
  
  // Clear matches (optional)
  await clearMatches();
  
  console.log('');
  console.log('🎯 Cleanup complete! You can now test with a fresh Firebase state.');
  process.exit(0);
}

// Run the cleanup
main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
