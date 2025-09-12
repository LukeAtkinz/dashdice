/**
 * Enhanced Matchmaking Cleanup 
 * Aggressively removes all stale matchmaking data to enable proper matching
 */

async function runBrowserCleanup() {
  console.log('🧹 Starting enhanced matchmaking cleanup...');
  console.log('📋 Instructions for manual cleanup:');
  console.log('');
  console.log('1. Open your browser and go to http://localhost:3000');
  console.log('2. Open Developer Tools (F12)');
  console.log('3. Go to Console tab');
  console.log('4. Copy and paste this code:');
  console.log('');
  console.log('---BEGIN CLEANUP CODE---');
  console.log('');
  console.log('// Enhanced cleanup script for better matchmaking');
  console.log('(async function() {');
  console.log('  const { collection, getDocs, deleteDoc, query, where } = await import("firebase/firestore");');
  console.log('  const { db } = await import("./src/services/firebase");');
  console.log('');
  console.log('  console.log("🧹 Starting aggressive cleanup...");');
  console.log('  let totalCleaned = 0;');
  console.log('');
  console.log('  // 1. Clean ALL game sessions');
  console.log('  const gameSessionsRef = collection(db, "gameSessions");');
  console.log('  const gameSessionsSnapshot = await getDocs(gameSessionsRef);');
  console.log('  for (const doc of gameSessionsSnapshot.docs) {');
  console.log('    await deleteDoc(doc.ref);');
  console.log('    totalCleaned++;');
  console.log('    console.log(`Deleted game session: ${doc.id}`);');
  console.log('  }');
  console.log('');
  console.log('  // 2. Clean ALL waiting rooms');
  console.log('  const waitingRoomRef = collection(db, "waitingroom");');
  console.log('  const waitingRoomSnapshot = await getDocs(waitingRoomRef);');
  console.log('  for (const doc of waitingRoomSnapshot.docs) {');
  console.log('    await deleteDoc(doc.ref);');
  console.log('    totalCleaned++;');
  console.log('    console.log(`Deleted waiting room: ${doc.id}`);');
  console.log('  }');
  console.log('');
  console.log('  // 3. Clean matchmaking queue entries');
  console.log('  const queueRef = collection(db, "matchmakingQueue");');
  console.log('  const queueSnapshot = await getDocs(queueRef);');
  console.log('  for (const doc of queueSnapshot.docs) {');
  console.log('    await deleteDoc(doc.ref);');
  console.log('    totalCleaned++;');
  console.log('    console.log(`Deleted queue entry: ${doc.id}`);');
  console.log('  }');
  console.log('');
  console.log('  // 4. Clean user sessions');
  console.log('  const userSessionsRef = collection(db, "userSessions");');
  console.log('  const userSessionsSnapshot = await getDocs(userSessionsRef);');
  console.log('  for (const doc of userSessionsSnapshot.docs) {');
  console.log('    await deleteDoc(doc.ref);');
  console.log('    totalCleaned++;');
  console.log('    console.log(`Deleted user session: ${doc.id}`);');
  console.log('  }');
  console.log('');
  console.log('  console.log(`✅ Enhanced cleanup complete! Cleaned ${totalCleaned} total items`);');
  console.log('  console.log("🎯 Matchmaking should now work properly!");');
  console.log('  console.log("🔄 Refresh your browser and try Quick Game");');
  console.log('})();');
  console.log('');
  console.log('---END CLEANUP CODE---');
  console.log('');
  console.log('5. Press Enter to run the cleanup');
  console.log('6. Wait for "Enhanced cleanup complete!" message');
  console.log('7. Refresh your browser page');
  console.log('8. Try Quick Game - it should work without errors now!');
  console.log('');
  console.log('🎯 After cleanup:');
  console.log('- The aggressive cleanup service is now running automatically');
  console.log('- Stale rooms will be cleaned every 2 minutes');
  console.log('- Players should match within seconds of both clicking Quick Game');
  console.log('- Test with two browser windows (one incognito) to verify matching works');
}

// Run the function
runBrowserCleanup().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
