const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, limit } = require('firebase/firestore');

// Load environment variables from .env.local manually
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...values] = line.split('=');
      if (key && values.length > 0) {
        process.env[key.trim()] = values.join('=').trim();
      }
    }
  });
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testBotMatching() {
  try {
    console.log('🔍 Testing bot database connectivity...');
    
    // Test basic bot query
    const botsQuery = query(
      collection(db, 'bots'),
      where('isActive', '==', true),
      where('isBot', '==', true),
      limit(5)
    );
    
    const snapshot = await getDocs(botsQuery);
    console.log(`📊 Found ${snapshot.size} active bots in database`);
    
    snapshot.forEach((doc) => {
      const botData = doc.data();
      console.log(`🤖 Bot: ${botData.displayName} (${botData.personality?.skillLevel || 'Unknown'} skill)`);
    });
    
    if (snapshot.size === 0) {
      console.log('❌ No bots found! This explains why bot matching is failing.');
    } else {
      console.log('✅ Bot database is accessible and contains bots');
    }
    
  } catch (error) {
    console.error('❌ Error testing bot matching:', error);
  }
}

testBotMatching();