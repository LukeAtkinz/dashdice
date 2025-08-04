const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc, query, where } = require('firebase/firestore');

// Load environment variables - handle missing dotenv gracefully
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  console.log('⚠️ dotenv not available, using environment variables directly');
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixStuckTurnDecider() {
  try {
    console.log('🔧 Looking for stuck turn decider matches...');
    
    // Find matches in turnDecider phase without choices
    const matchesQuery = query(
      collection(db, 'matches'),
      where('gameData.gamePhase', '==', 'turnDecider')
    );
    const matchesSnapshot = await getDocs(matchesQuery);
    
    if (matchesSnapshot.empty) {
      console.log('✅ No stuck turn decider matches found');
      return;
    }
    
    for (const matchDoc of matchesSnapshot.docs) {
      const matchData = matchDoc.data();
      const matchId = matchDoc.id;
      
      console.log(`\n🎮 Match ${matchId}:`);
      console.log(`  - Game Phase: ${matchData.gameData.gamePhase}`);
      console.log(`  - Turn Decider: ${matchData.gameData.turnDecider}`);
      console.log(`  - Turn Decider Choice: ${matchData.gameData.turnDeciderChoice || 'NONE'}`);
      console.log(`  - Host: ${matchData.hostData.playerDisplayName} (${matchData.hostData.playerId})`);
      console.log(`  - Opponent: ${matchData.opponentData?.playerDisplayName || 'NONE'} (${matchData.opponentData?.playerId || 'NONE'})`);
      
      // Check if both players are present
      if (!matchData.opponentData || !matchData.opponentData.playerId) {
        console.log(`  ⚠️ Missing opponent data - skipping`);
        continue;
      }
      
      // If no choice has been made and we have both players, reset the turn decider
      if (!matchData.gameData.turnDeciderChoice) {
        console.log(`  🔧 Resetting turn decider for match ${matchId}...`);
        
        // Randomly assign who should make the choice (1 = host, 2 = opponent)
        const newTurnDecider = Math.floor(Math.random() * 2) + 1;
        
        const matchRef = doc(db, 'matches', matchId);
        await updateDoc(matchRef, {
          'gameData.turnDecider': newTurnDecider,
          'gameData.turnDeciderChoice': null,
          'gameData.turnDeciderDice': null,
          'gameData.isRolling': false
        });
        
        console.log(`  ✅ Reset turn decider to player ${newTurnDecider} (${newTurnDecider === 1 ? 'Host' : 'Opponent'})`);
      }
    }
    
    console.log('\n🎯 Turn decider fix complete!');
    
  } catch (error) {
    console.error('❌ Error fixing turn decider:', error);
  }
}

// Run the fix
fixStuckTurnDecider().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
