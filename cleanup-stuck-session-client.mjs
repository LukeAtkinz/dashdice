// Client-side Firebase cleanup script
// This uses the Firebase client SDK instead of admin SDK

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanupStuckSession() {
  const userId = '4ZQeDsJKMRaDFoxqzDNuPy0YoNF3';
  const sessionId = 'PYBN5GJvNfafUyqP3dSy';
  
  console.log('🧹 Emergency cleanup of stuck session...');
  
  try {
    // 1. Clear user's currentGame field
    console.log('1. Clearing user currentGame field...');
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      currentGame: null
    });
    console.log('✅ User currentGame cleared');
    
    // 2. Delete the stuck session
    console.log('2. Deleting stuck session...');
    const sessionRef = doc(db, 'waitingRooms', sessionId);
    await deleteDoc(sessionRef);
    console.log('✅ Stuck session deleted');
    
    console.log('🎉 Emergency cleanup complete! User should be able to join matches now.');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    console.log('This might be due to Firebase security rules restricting client access.');
    console.log('The cleanup will need to be done server-side or through Firebase console.');
  }
}

cleanupStuckSession();