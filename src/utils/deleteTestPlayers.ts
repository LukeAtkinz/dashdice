import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/services/firebase';

/**
 * Deletes all test match data from Firebase
 * Call this when user says "Delete Test Players"
 */
export const deleteTestPlayers = async () => {
  try {
    console.log('🧹 Deleting all test match data...');

    // Delete all matches with test player IDs
    const testPlayerIds = [
      'test-user-1',
      'test-user-2', 
      'test-user-quick-1',
      'test-user-quick-2'
    ];

    let deletedCount = 0;

    // Query matches collection for test players
    for (const playerId of testPlayerIds) {
      // Check for matches where this player is host
      const hostQuery = query(
        collection(db, 'matches'),
        where('hostData.playerId', '==', playerId)
      );
      const hostSnapshot = await getDocs(hostQuery);
      
      for (const docSnapshot of hostSnapshot.docs) {
        await deleteDoc(doc(db, 'matches', docSnapshot.id));
        deletedCount++;
        console.log('🗑️ Deleted test match (host):', docSnapshot.id);
      }

      // Check for matches where this player is opponent
      const opponentQuery = query(
        collection(db, 'matches'),
        where('opponentData.playerId', '==', playerId)
      );
      const opponentSnapshot = await getDocs(opponentQuery);
      
      for (const docSnapshot of opponentSnapshot.docs) {
        await deleteDoc(doc(db, 'matches', docSnapshot.id));
        deletedCount++;
        console.log('🗑️ Deleted test match (opponent):', docSnapshot.id);
      }
    }

    // Also delete any waiting room entries with test players
    for (const playerId of testPlayerIds) {
      const waitingRoomQuery = query(
        collection(db, 'waitingroom'),
        where('hostData.playerId', '==', playerId)
      );
      const waitingRoomSnapshot = await getDocs(waitingRoomQuery);
      
      for (const docSnapshot of waitingRoomSnapshot.docs) {
        await deleteDoc(doc(db, 'waitingroom', docSnapshot.id));
        deletedCount++;
        console.log('🗑️ Deleted test waiting room entry:', docSnapshot.id);
      }
    }

    console.log(`✅ Successfully deleted ${deletedCount} test documents`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Error deleting test players:', error);
    throw error;
  }
};

/**
 * Utility to check if there are any test matches in the database
 */
export const checkForTestMatches = async () => {
  try {
    const testPlayerIds = [
      'test-user-1',
      'test-user-2', 
      'test-user-quick-1',
      'test-user-quick-2'
    ];

    let testMatchCount = 0;

    for (const playerId of testPlayerIds) {
      const hostQuery = query(
        collection(db, 'matches'),
        where('hostData.playerId', '==', playerId)
      );
      const hostSnapshot = await getDocs(hostQuery);
      testMatchCount += hostSnapshot.docs.length;

      const opponentQuery = query(
        collection(db, 'matches'),
        where('opponentData.playerId', '==', playerId)
      );
      const opponentSnapshot = await getDocs(opponentQuery);
      testMatchCount += opponentSnapshot.docs.length;
    }

    console.log(`📊 Found ${testMatchCount} test matches in database`);
    return testMatchCount;
  } catch (error) {
    console.error('❌ Error checking for test matches:', error);
    return 0;
  }
};
