// Debug script to check user's abilities and power loadouts
const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  const serviceAccount = require('./path/to/serviceAccountKey.json'); // You'll need to update this path
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://dashdice-3b5d9-default-rtdb.firebaseio.com/"
  });
}

const db = admin.firestore();

async function debugUserAbilities(uid) {
  try {
    console.log(`🔍 Debugging abilities for user: ${uid}`);
    
    // Check user document
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      console.log('❌ User document not found');
      return;
    }
    
    const userData = userDoc.data();
    console.log('\n📱 User Data:', JSON.stringify(userData, null, 2));
    
    // Check powerLoadouts subcollection
    const powerLoadoutsRef = db.collection('users').doc(uid).collection('powerLoadouts');
    const powerLoadoutsSnapshot = await powerLoadoutsRef.get();
    
    console.log('\n🎮 Power Loadouts:');
    if (powerLoadoutsSnapshot.empty) {
      console.log('❌ No power loadouts found');
    } else {
      powerLoadoutsSnapshot.forEach(doc => {
        console.log(`Game Mode: ${doc.id}`);
        console.log('Loadout:', JSON.stringify(doc.data(), null, 2));
        console.log('---');
      });
    }
    
    // Check abilities subcollection
    const abilitiesRef = db.collection('users').doc(uid).collection('abilities');
    const abilitiesSnapshot = await abilitiesRef.get();
    
    console.log('\n🔮 User Abilities:');
    if (abilitiesSnapshot.empty) {
      console.log('❌ No abilities found');
    } else {
      abilitiesSnapshot.forEach(doc => {
        console.log(`Ability: ${doc.id}`);
        console.log('Data:', JSON.stringify(doc.data(), null, 2));
        console.log('---');
      });
    }
    
    // Check if Siphon specifically exists
    const siphonDoc = await abilitiesRef.doc('siphon').get();
    console.log('\n🩸 Siphon Ability Check:');
    if (siphonDoc.exists) {
      console.log('✅ Siphon exists:', JSON.stringify(siphonDoc.data(), null, 2));
    } else {
      console.log('❌ Siphon ability not found in user abilities');
    }
    
  } catch (error) {
    console.error('❌ Error debugging user abilities:', error);
  }
}

// Replace with the actual user ID you want to debug
const TEST_USER_ID = 'your-user-id-here';
debugUserAbilities(TEST_USER_ID);