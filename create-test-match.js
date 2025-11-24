/**
 * Create a test Firebase match to verify opponent stats display and turn decider functionality
 */
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyAj8Kfv35NM6DGX_9Z2w8dWZ2OYvJeOxUg',
  authDomain: 'dashdice-7ad25.firebaseapp.com',
  projectId: 'dashdice-7ad25',
  storageBucket: 'dashdice-7ad25.appspot.com',
  messagingSenderId: '1096444108420',
  appId: '1:1096444108420:web:1743c4fc2c3e0e4e2bb2b3'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestMatch() {
  console.log('🧪 Creating test Firebase match with proper opponent data and turn decider...');
  
  try {
    const testMatchData = {
      gameMode: 'classic',
      status: 'active',
      createdAt: serverTimestamp(),
      startedAt: serverTimestamp(),
      authorizedPlayers: ['test-host-123', 'test-opponent-456'],
      
      hostData: {
        playerId: 'test-host-123',
        playerDisplayName: 'TestHost',
        playerStats: {
          bestStreak: 5,
          currentStreak: 2,
          gamesPlayed: 10,
          matchWins: 7
        },
        matchData: {
          playerScore: 0,
          turnActive: false
        },
        displayBackgroundEquipped: { id: 'relax', name: 'Relax', category: 'Images', rarity: 'COMMON' },
        matchBackgroundEquipped: { id: 'new-day', name: 'New Day', category: 'Videos', rarity: 'RARE' }
      },
      
      opponentData: {
        playerId: 'test-opponent-456', 
        playerDisplayName: 'TestOpponent',
        playerStats: {
          bestStreak: 8,
          currentStreak: 4,
          gamesPlayed: 15,
          matchWins: 12
        },
        matchData: {
          playerScore: 0,
          turnActive: false
        },
        displayBackgroundEquipped: { id: 'underwater', name: 'Underwater', category: 'Videos', rarity: 'RARE' },
        matchBackgroundEquipped: { rarity: 'COMMON', name: 'Classic Blue' }
      },
      
      gameData: {
        type: 'dice',
        settings: {},
        turnDecider: 1, // Host decides
        chooserPlayerIndex: 1, // Host chooses first (FIXED: Added missing field)
        turnScore: 0,
        diceOne: 0,
        diceTwo: 0,
        roundObjective: 50,
        startingScore: 0,
        status: 'active',
        gamePhase: 'turnDecider', // Start in turn decider phase
        isRolling: false
        // Note: turnDeciderChoice and turnDeciderDice will be added when player makes choice
      },
      
      matchMetadata: {
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp()
      }
    };
    
    const matchRef = await addDoc(collection(db, 'matches'), testMatchData);
    console.log('✅ Test match created with ID:', matchRef.id);
    
    console.log('🔍 Test match structure:');
    console.log('- Game Phase:', testMatchData.gameData.gamePhase);
    console.log('- Turn Decider:', testMatchData.gameData.turnDecider);
    console.log('- Chooser Player Index:', testMatchData.gameData.chooserPlayerIndex);
    console.log('- Host Display Name:', testMatchData.hostData.playerDisplayName);
    console.log('- Host Stats:', testMatchData.hostData.playerStats);
    console.log('- Opponent Display Name:', testMatchData.opponentData.playerDisplayName);
    console.log('- Opponent Stats:', testMatchData.opponentData.playerStats);
    
    console.log('\n📝 Issues Fixed:');
    console.log('✅ Added missing chooserPlayerIndex field');
    console.log('✅ Proper opponent data structure with stats');
    console.log('✅ Turn decider phase initialization');
    
    console.log('\n🔗 Test this match by navigating to:');
    console.log(`   Match ID: ${matchRef.id}`);
    console.log(`   URL: http://localhost:3001 (login and navigate to matches)`);
    
    console.log('\n🎯 Test Steps:');
    console.log('1. Login to the app');
    console.log('2. Navigate to matches section');
    console.log('3. Look for match with ID:', matchRef.id);
    console.log('4. Verify opponent stats are displayed in UI');
    console.log('5. Test turn decider choice functionality');
    
    return matchRef.id;
    
  } catch (error) {
    console.error('❌ Error creating test match:', error);
  }
}

createTestMatch();
