import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/services/firebase';

/**
 * Migration script to update all existing users to the new structure
 * This should be run once to fix all existing user profiles
 */
export const migrateAllUsers = async () => {
  try {
    console.log('Starting migration of all users...');
    
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    let migratedCount = 0;
    let totalUsers = snapshot.docs.length;
    
    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      const uid = userDoc.id;
      
      // Check if user needs migration
      const needsMigration = !userData.inventory || Array.isArray(userData.inventory) || 
                            !userData.stats || !userData.settings || !userData.userTag;
      
      if (needsMigration) {
        console.log(`Migrating user: ${uid}`);
        
        // Generate userTag if missing
        let userTag = userData.userTag;
        if (!userTag) {
          if (userData.displayName) {
            userTag = `@${userData.displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          } else if (userData.email) {
            userTag = `@${userData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          } else {
            userTag = `@user${uid.slice(-6)}`;
          }
        }

        const updateData: any = {
          updatedAt: new Date(),
          userTag
        };

        // Migrate inventory structure
        if (!userData.inventory || Array.isArray(userData.inventory)) {
          updateData.inventory = {
            displayBackgroundEquipped: userData.displayBackgroundEquipped || userData.equippedBackground || "New Day",
            matchBackgroundEquipped: userData.matchBackgroundEquipped || "Long Road Ahead",
            ownedBackgrounds: userData.ownedBackgrounds || [
              "default",
              "All For Glory", 
              "Long Road Ahead",
              "Relax",
              "New Day",
              "On A Mission",
              "Underwater"
            ]
          };
        }

        // Reset all stats to 0 as requested
        updateData.stats = {
          bestStreak: 0,
          currentStreak: 0,
          gamesPlayed: 0,
          matchWins: 0
        };

        // Add settings if missing
        if (!userData.settings) {
          updateData.settings = {
            notificationsEnabled: true,
            soundEnabled: true,
            theme: "auto"
          };
        }

        // Remove old fields
        updateData.equippedBackground = null;
        if (Array.isArray(userData.inventory)) {
          updateData.inventory = updateData.inventory; // Override the array
        }

        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, updateData);
        migratedCount++;
      }
    }
    
    console.log(`Migration complete! Migrated ${migratedCount} out of ${totalUsers} users.`);
    return { migratedCount, totalUsers };
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
};
