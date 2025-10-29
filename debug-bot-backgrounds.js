// Debug script to check bot backgrounds
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDIqWoTBcfCMtVZa5Wj3dLg7qfX7zQzr8Y",
  authDomain: "dashdice.firebaseapp.com",
  projectId: "dashdice",
  storageBucket: "dashdice.appspot.com",
  messagingSenderId: "774053256089",
  appId: "1:774053256089:web:8fce88c3d5d5c2a6f8e8e8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugBotBackgrounds() {
  try {
    console.log('🔍 Checking bot profiles in Firebase...');
    
    const botsCollection = collection(db, 'bots');
    const botsSnapshot = await getDocs(botsCollection);
    
    console.log(`📊 Found ${botsSnapshot.size} bots`);
    
    botsSnapshot.forEach((doc, index) => {
      const botData = doc.data();
      console.log(`\n🤖 Bot ${index + 1}: ${botData.displayName}`);
      console.log(`  - ID: ${doc.id}`);
      console.log(`  - Display Background: ${JSON.stringify(botData.inventory?.displayBackgroundEquipped)}`);
      console.log(`  - Match Background: ${JSON.stringify(botData.inventory?.matchBackgroundEquipped)}`);
      console.log(`  - Inventory Structure: ${JSON.stringify(botData.inventory, null, 2)}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking bot backgrounds:', error);
  }
}

debugBotBackgrounds();