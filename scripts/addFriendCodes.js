// Script to add friend codes to existing users who don't have them
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, query, where } = require('firebase/firestore');

// Initialize Firebase (if not already initialized)
const firebaseConfig = {
  apiKey: "AIzaSyBoUIGvEBNDHPYnhJdH2L2wvLdIu3OZ2Dw",
  authDomain: "dashdice-d1b86.firebaseapp.com",
  projectId: "dashdice-d1b86",
  storageBucket: "dashdice-d1b86.appspot.com",
  messagingSenderId: "166479893528",
  appId: "1:166479893528:web:48b9e0de1e9c8e9db5c3e4"
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

// Generate unique friend code function
function generateRandomFriendCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function checkFriendCodeUnique(friendCode) {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('friendCode', '==', friendCode)
    );
    const snapshot = await getDocs(usersQuery);
    return snapshot.empty;
  } catch (error) {
    console.error('Error checking friend code uniqueness:', error);
    return false;
  }
}

async function generateUniqueFriendCode() {
  let friendCode;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    friendCode = generateRandomFriendCode();
    isUnique = await checkFriendCodeUnique(friendCode);
    attempts++;
  } while (!isUnique && attempts < maxAttempts);

  if (!isUnique) {
    throw new Error('Unable to generate unique friend code');
  }

  return friendCode;
}

async function addFriendCodesToUsers() {
  try {
    console.log('🔍 Checking users for missing friend codes...');
    
    const usersSnapshot = await getDocs(collection(db, 'users'));
    let usersNeedingCodes = 0;
    let usersUpdated = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      if (!userData.friendCode) {
        usersNeedingCodes++;
        console.log(`📝 User ${userData.displayName || userDoc.id} needs a friend code`);
        
        try {
          const friendCode = await generateUniqueFriendCode();
          await updateDoc(doc(db, 'users', userDoc.id), {
            friendCode: friendCode
          });
          console.log(`✅ Added friend code ${friendCode} to user ${userData.displayName || userDoc.id}`);
          usersUpdated++;
        } catch (error) {
          console.error(`❌ Failed to add friend code to user ${userDoc.id}:`, error);
        }
      } else {
        console.log(`✅ User ${userData.displayName || userDoc.id} already has friend code: ${userData.friendCode}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`- Total users: ${usersSnapshot.docs.length}`);
    console.log(`- Users needing codes: ${usersNeedingCodes}`);
    console.log(`- Users updated: ${usersUpdated}`);
    console.log(`✅ Friend code assignment complete!`);

  } catch (error) {
    console.error('❌ Error adding friend codes to users:', error);
  }
}

// Run the script
addFriendCodesToUsers();
