// 🧹 Emergency cleanup script - Paste this in browser console
// This will clean up any test matches with undefined fields

(async function cleanupTestData() {
  try {
    console.log('🧹 Starting emergency cleanup of test data...');
    
    // Import Firebase functions (assuming they're available globally)
    const { collection, query, where, getDocs, deleteDoc, doc } = window.firebase?.firestore || {};
    const { db } = window.firebase || {};
    
    if (!db) {
      console.error('❌ Firebase not available. Make sure you\'re on the app page.');
      return;
    }

    const testPlayerIds = [
      'test-user-1',
      'test-user-2', 
      'test-user-quick-1',
      'test-user-quick-2'
    ];

    let deletedCount = 0;

    // Delete test matches
    for (const playerId of testPlayerIds) {
      // Check host matches
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

      // Check opponent matches
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

    console.log(`✅ Cleanup complete! Deleted ${deletedCount} test documents.`);
    console.log('🎮 You can now click TEST MATCH again to create fresh test data.');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    console.log('💡 Try running: testUtils.deleteTestPlayers() instead');
  }
})();
