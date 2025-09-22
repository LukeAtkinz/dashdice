/**
 * Browser Console Cleanup Script
 * Paste this into the browser console on the DashDice dashboard to clear stuck matchmaking
 */

(async function cleanupStuckPlayer() {
  const STUCK_PLAYER_ID = '4ZQeDsJKMRaDFoxqzDNuPy0YoNF3';
  
  console.log('🧹 Starting cleanup for stuck player:', STUCK_PLAYER_ID);
  
  try {
    // Access Firebase from window (should be available in the app)
    const { db } = window;
    
    if (!db) {
      console.error('❌ Firebase db not found. Make sure you\'re on the DashDice app page.');
      return;
    }
    
    const { collection, query, where, getDocs, deleteDoc, doc, updateDoc } = window.firebaseFirestore;
    
    // 1. Clear playerStates collection
    console.log('1. Clearing player state...');
    try {
      const playerStateRef = doc(db, 'playerStates', STUCK_PLAYER_ID);
      await deleteDoc(playerStateRef);
      console.log('✅ Player state cleared');
    } catch (error) {
      console.log('⚠️ Player state not found or already cleared');
    }
    
    // 2. Clean up waiting rooms where player is host
    console.log('2. Cleaning up waiting rooms (host)...');
    const hostRoomsQuery = query(
      collection(db, 'waitingroom'),
      where('hostData.playerId', '==', STUCK_PLAYER_ID)
    );
    
    const hostSnapshot = await getDocs(hostRoomsQuery);
    let roomsDeleted = 0;
    for (const docSnapshot of hostSnapshot.docs) {
      console.log(`🗑️ Removing waiting room ${docSnapshot.id}`);
      await deleteDoc(doc(db, 'waitingroom', docSnapshot.id));
      roomsDeleted++;
    }
    console.log(`✅ Removed ${roomsDeleted} host waiting rooms`);
    
    // 3. Clean up waiting rooms where player is opponent
    console.log('3. Cleaning up waiting rooms (opponent)...');
    const opponentRoomsQuery = query(
      collection(db, 'waitingroom'),
      where('opponentData.playerId', '==', STUCK_PLAYER_ID)
    );
    
    const opponentSnapshot = await getDocs(opponentRoomsQuery);
    roomsDeleted = 0;
    for (const docSnapshot of opponentSnapshot.docs) {
      console.log(`🗑️ Removing opponent waiting room ${docSnapshot.id}`);
      await deleteDoc(doc(db, 'waitingroom', docSnapshot.id));
      roomsDeleted++;
    }
    console.log(`✅ Removed ${roomsDeleted} opponent waiting rooms`);
    
    // 4. Clean up game sessions
    console.log('4. Cleaning up game sessions...');
    const gameSessionsQuery = query(
      collection(db, 'gameSessions'),
      where('hostData.playerId', '==', STUCK_PLAYER_ID)
    );
    
    const gameSessionSnapshot = await getDocs(gameSessionsQuery);
    let sessionsDeleted = 0;
    for (const docSnapshot of gameSessionSnapshot.docs) {
      const sessionData = docSnapshot.data();
      if (['waiting', 'searching', 'matched'].includes(sessionData.status)) {
        console.log(`🗑️ Removing game session ${docSnapshot.id} (status: ${sessionData.status})`);
        await deleteDoc(doc(db, 'gameSessions', docSnapshot.id));
        sessionsDeleted++;
      }
    }
    console.log(`✅ Removed ${sessionsDeleted} game sessions`);
    
    // 5. Clear any user currentGameId reference
    console.log('5. Clearing user currentGameId...');
    try {
      const userRef = doc(db, 'users', STUCK_PLAYER_ID);
      await updateDoc(userRef, {
        currentGameId: null,
        isInGame: false
      });
      console.log('✅ User currentGameId cleared');
    } catch (error) {
      console.log('⚠️ Could not update user document:', error);
    }
    
    console.log('🎉 Cleanup completed successfully!');
    console.log('The player should now be able to join matchmaking again.');
    console.log('Try refreshing the page and starting a new match.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    console.log('Make sure you\'re on the DashDice app page with Firebase loaded.');
  }
})();