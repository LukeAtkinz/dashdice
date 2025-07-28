// Script to clear all waiting room documents
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc } = require('firebase/firestore');

// Initialize Firebase (you'll need to replace with your config)
const firebaseConfig = {
  // Your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearWaitingRooms() {
  try {
    console.log('Clearing all waiting room documents...');
    
    const waitingRoomsRef = collection(db, 'waitingroom');
    const snapshot = await getDocs(waitingRoomsRef);
    
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`Deleted ${snapshot.docs.length} waiting room documents`);
  } catch (error) {
    console.error('Error clearing waiting rooms:', error);
  }
}

clearWaitingRooms();
