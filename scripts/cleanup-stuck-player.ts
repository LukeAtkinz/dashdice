/**
 * Cleanup utility for stuck matchmaking sessions
 * Run this when players are stuck in active matchmaking
 */

import { PlayerStateService } from '../src/services/playerStateService';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function cleanupStuckPlayer(playerId: string) {
  console.log(`🧹 Starting cleanup for stuck player: ${playerId}`);
  
  try {
    // 1. Clear player state
    console.log('1. Setting player to idle state...');
    await PlayerStateService.setPlayerIdle(playerId);
    
    // 2. Clean up player sessions
    console.log('2. Cleaning up player sessions...');
    await PlayerStateService.cleanupPlayerSessions(playerId);
    
    // 3. Clean up any stuck waiting rooms
    console.log('3. Cleaning up waiting rooms...');
    const waitingRoomsQuery = query(
      collection(db, 'waitingroom'),
      where('hostData.playerId', '==', playerId)
    );
    
    const waitingSnapshot = await getDocs(waitingRoomsQuery);
    for (const docSnapshot of waitingSnapshot.docs) {
      console.log(`🗑️ Removing waiting room ${docSnapshot.id}`);
      await deleteDoc(doc(db, 'waitingroom', docSnapshot.id));
    }
    
    // 4. Clean up any opponent waiting rooms
    const opponentRoomsQuery = query(
      collection(db, 'waitingroom'),
      where('opponentData.playerId', '==', playerId)
    );
    
    const opponentSnapshot = await getDocs(opponentRoomsQuery);
    for (const docSnapshot of opponentSnapshot.docs) {
      console.log(`🗑️ Removing opponent waiting room ${docSnapshot.id}`);
      await deleteDoc(doc(db, 'waitingroom', docSnapshot.id));
    }
    
    // 5. Clean up any stuck gameSessions
    console.log('5. Cleaning up game sessions...');
    const gameSessionsQuery = query(
      collection(db, 'gameSessions'),
      where('hostData.playerId', '==', playerId)
    );
    
    const gameSessionSnapshot = await getDocs(gameSessionsQuery);
    for (const docSnapshot of gameSessionSnapshot.docs) {
      const sessionData = docSnapshot.data();
      // Only clean up waiting/searching sessions
      if (['waiting', 'searching', 'matched'].includes(sessionData.status)) {
        console.log(`🗑️ Removing game session ${docSnapshot.id} (status: ${sessionData.status})`);
        await deleteDoc(doc(db, 'gameSessions', docSnapshot.id));
      }
    }
    
    console.log(`✅ Cleanup completed for player ${playerId}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error during cleanup:`, error);
    return false;
  }
}

// Run cleanup for the stuck player from the error logs
const STUCK_PLAYER_ID = '4ZQeDsJKMRaDFoxqzDNuPy0YoNF3';

console.log('🚀 Starting stuck player cleanup utility...');
cleanupStuckPlayer(STUCK_PLAYER_ID)
  .then((success) => {
    if (success) {
      console.log('🎉 Cleanup completed successfully!');
      console.log('The player should now be able to join matchmaking again.');
    } else {
      console.log('❌ Cleanup failed. Check the errors above.');
    }
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
  });

export { cleanupStuckPlayer };