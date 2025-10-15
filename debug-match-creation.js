// Debug script to test Firebase match creation
const { db } = require('./src/services/firebase');
const { collection, addDoc, serverTimestamp } = require('firebase/firestore');

async function testMatchCreation() {
  try {
    console.log('Testing Firebase match creation...');
    console.log('Firebase config loaded:', !!db);
    
    const testMatchData = {
      createdAt: serverTimestamp(),
      gameMode: 'test',
      status: 'active',
      testField: 'debug-test'
    };
    
    console.log('Attempting to create match document...');
    const docRef = await addDoc(collection(db, 'matches'), testMatchData);
    console.log('✅ Match document created successfully with ID:', docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating match document:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  }
}

testMatchCreation();