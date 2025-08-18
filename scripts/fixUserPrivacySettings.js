// Fix User Privacy Settings
// This script ensures all users have proper privacy settings for friend requests

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

async function fixUserPrivacySettings() {
  console.log('🔧 Fixing user privacy settings...');
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const batch = db.batch();
    let updatedCount = 0;

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const userId = doc.id;

      // Check if privacy settings exist
      if (!userData.privacy || userData.privacy.allowFriendRequests === undefined) {
        console.log(`📝 Updating privacy settings for user: ${userData.displayName || userId}`);
        
        const userRef = db.collection('users').doc(userId);
        batch.update(userRef, {
          'privacy.allowFriendRequests': true,
          'privacy.showOnlineStatus': userData.privacy?.showOnlineStatus ?? true,
          'privacy.allowGameInvites': userData.privacy?.allowGameInvites ?? true,
          'privacy.showActivity': userData.privacy?.showActivity ?? true
        });
        
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`✅ Updated privacy settings for ${updatedCount} users`);
    } else {
      console.log('✅ All users already have proper privacy settings');
    }

  } catch (error) {
    console.error('❌ Error fixing user privacy settings:', error);
    throw error;
  }
}

// Run the fix
if (require.main === module) {
  fixUserPrivacySettings()
    .then(() => {
      console.log('🎉 User privacy settings fix complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed to fix user privacy settings:', error);
      process.exit(1);
    });
}

module.exports = { fixUserPrivacySettings };
