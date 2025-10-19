const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where } = require('firebase/firestore');

// Firebase config (same as your project)
const firebaseConfig = {
  apiKey: "AIzaSyC5WklqHk6T4_8vqJqSI5kKb1WkO_8iHhg",
  authDomain: "dashdice-9c6b6.firebaseapp.com",
  projectId: "dashdice-9c6b6",
  storageBucket: "dashdice-9c6b6.appspot.com",
  messagingSenderId: "1062089617562",
  appId: "1:1062089617562:web:e4dc2a7d85dae3a6e30b85",
  measurementId: "G-0M3EE1NHQJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugAbilitiesSetup() {
  const userId = '3btTalpeutXbynqJHfGISC9bD2Y2';
  
  console.log('🔍 Debugging abilities setup for user:', userId);
  
  try {
    // Check if user document exists
    console.log('\n=== Checking User Document ===');
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      console.log('✅ User document exists');
      const userData = userDoc.data();
      console.log('📊 PowerLoadouts in user doc:', userData.powerLoadouts || 'Not found');
    } else {
      console.log('❌ User document not found');
    }
    
    // Check userLoadouts collection
    console.log('\n=== Checking userLoadouts Collection ===');
    const loadoutsQuery = query(collection(db, 'userLoadouts'), where('userId', '==', userId));
    const loadoutsSnapshot = await getDocs(loadoutsQuery);
    
    if (loadoutsSnapshot.empty) {
      console.log('❌ No userLoadouts found for user');
      
      // Create a default loadout
      console.log('\n=== Creating Default Loadout ===');
      const defaultLoadout = {
        userId: userId,
        name: 'Default Classic Loadout',
        abilities: {
          attack: 'siphon',
          defense: 'lucky_reroll',
          tactical: 'focus_shot'
        },
        totalStarCost: 9,
        maxStarPoints: 15,
        isActive: true,
        createdAt: new Date(),
        lastUsed: new Date()
      };
      
      const docRef = doc(collection(db, 'userLoadouts'));
      await setDoc(docRef, defaultLoadout);
      console.log('✅ Created default loadout:', docRef.id);
      
    } else {
      console.log('✅ Found', loadoutsSnapshot.size, 'userLoadouts:');
      loadoutsSnapshot.forEach(doc => {
        console.log('  -', doc.id, ':', doc.data());
      });
    }
    
    // Check user's powerLoadouts in user document
    console.log('\n=== Checking PowerLoadouts in User Doc ===');
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const powerLoadouts = userData.powerLoadouts;
      
      if (!powerLoadouts || !powerLoadouts.classic) {
        console.log('❌ No classic powerLoadout found, creating one...');
        
        const defaultPowerLoadouts = {
          classic: {
            tactical: 'focus_shot',
            attack: 'siphon', 
            defense: 'lucky_reroll',
            utility: '',
            gamechanger: ''
          },
          'zero-hour': {
            tactical: 'focus_shot',
            attack: 'siphon',
            defense: 'lucky_reroll', 
            utility: '',
            gamechanger: ''
          },
          'true-grit': {
            tactical: 'focus_shot',
            attack: 'siphon',
            defense: 'lucky_reroll',
            utility: '',
            gamechanger: ''
          },
          'last-line': {
            tactical: 'focus_shot', 
            attack: 'siphon',
            defense: 'lucky_reroll',
            utility: '',
            gamechanger: ''
          }
        };
        
        await setDoc(doc(db, 'users', userId), {
          powerLoadouts: defaultPowerLoadouts
        }, { merge: true });
        
        console.log('✅ Created default powerLoadouts in user document');
      } else {
        console.log('✅ Classic powerLoadout exists:', powerLoadouts.classic);
      }
    }
    
    // Check abilities collection
    console.log('\n=== Checking Abilities Collection ===');
    const abilitiesSnapshot = await getDocs(collection(db, 'abilities'));
    console.log('📊 Total abilities in collection:', abilitiesSnapshot.size);
    
    if (abilitiesSnapshot.size === 0) {
      console.log('❌ No abilities found in collection');
      console.log('🔧 This might be the root cause - abilities need to be seeded');
    } else {
      console.log('✅ Abilities collection has data');
      // Show first few abilities
      let count = 0;
      abilitiesSnapshot.forEach(doc => {
        if (count < 3) {
          console.log('  -', doc.id, ':', doc.data().name);
          count++;
        }
      });
    }
    
    console.log('\n🎯 Debug complete!');
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

debugAbilitiesSetup();