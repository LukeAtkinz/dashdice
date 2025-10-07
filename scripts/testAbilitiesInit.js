/**
 * Simple Local Abilities Initialization
 * Uses client SDK with temporary security rules bypass
 */

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  doc,
  setDoc,
  getDocs, 
  query, 
  where,
  connectFirestoreEmulator
} = require('firebase/firestore');

// Firebase config (production environment)
const firebaseConfig = {
  apiKey: "AIzaSyB-vkL7PSqCOrKS7nTOtBEfUvX-CdhNZ6I",
  authDomain: "dashdice-d1b86.firebaseapp.com",
  projectId: "dashdice-d1b86",
  storageBucket: "dashdice-d1b86.appspot.com",
  messagingSenderId: "816081934821",
  appId: "1:816081934821:web:a81f03c18b89fc3038770c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Simplified abilities list for testing
const ESSENTIAL_ABILITIES = [
  {
    id: 'lucky_reroll',
    name: 'Lucky Reroll',
    description: 'Reroll one die of your choice',
    rarity: 'common',
    starCost: 1,
    category: 'utility',
    cooldown: 0,
    maxUses: 3,
    auraCost: 4,
    unlockLevel: 1,
    isActive: true
  },
  {
    id: 'focus_shot',
    name: 'Focus Shot',
    description: 'Next roll adds +1 to all dice',
    rarity: 'common',
    starCost: 2,
    category: 'utility',
    cooldown: 30,
    maxUses: 2,
    auraCost: 6,
    unlockLevel: 2,
    isActive: true
  },
  {
    id: 'shield_wall',
    name: 'Shield Wall',
    description: 'Prevent opponent\'s next ability',
    rarity: 'common',
    starCost: 2,
    category: 'defense',
    cooldown: 45,
    maxUses: 2,
    auraCost: 6,
    unlockLevel: 3,
    isActive: true
  },
  {
    id: 'time_warp',
    name: 'Time Warp',
    description: 'Take an extra turn immediately',
    rarity: 'rare',
    starCost: 4,
    category: 'gamechanger',
    cooldown: 120,
    maxUses: 1,
    auraCost: 12,
    unlockLevel: 10,
    isActive: true
  },
  {
    id: 'grand_slam',
    name: 'Grand Slam',
    description: 'Next scoring roll counts triple',
    rarity: 'epic',
    starCost: 6,
    category: 'attack',
    cooldown: 180,
    maxUses: 1,
    auraCost: 18,
    unlockLevel: 26,
    isActive: true
  },
  {
    id: 'grand_theft',
    name: 'Grand Theft',
    description: 'Steal opponent\'s highest loadout ability',
    rarity: 'legendary',
    starCost: 8,
    category: 'gamechanger',
    cooldown: 300,
    maxUses: 1,
    auraCost: 25,
    unlockLevel: 42,
    isActive: true
  }
];

async function testAbilitiesInit() {
  console.log('🎯 Testing minimal abilities initialization...');
  
  try {
    // Try to add just a few abilities to test
    for (const ability of ESSENTIAL_ABILITIES) {
      const abilityRef = doc(db, 'abilities', ability.id);
      await setDoc(abilityRef, ability);
      console.log(`✅ Added: ${ability.name} (${ability.rarity})`);
    }
    
    console.log('\n🎉 Test abilities added successfully!');
    console.log(`📊 Added ${ESSENTIAL_ABILITIES.length} essential abilities`);
    
    // Verify they're there
    const testQuery = query(collection(db, 'abilities'), where('isActive', '==', true));
    const snapshot = await getDocs(testQuery);
    console.log(`\n✅ Verification: ${snapshot.size} abilities found in database`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // If permission denied, guide user to manual setup
    if (error.message.includes('permission') || error.message.includes('denied')) {
      console.log('\n🔧 MANUAL SETUP REQUIRED:');
      console.log('1. Go to Firebase Console: https://console.firebase.google.com/');
      console.log('2. Select your dashdice-d1b86 project');
      console.log('3. Go to Firestore Database');
      console.log('4. Create a collection called "abilities"');
      console.log('5. Add documents with the ability data manually');
      console.log('\nOr temporarily modify Firestore rules to allow writes for testing.');
    }
  }
}

testAbilitiesInit();