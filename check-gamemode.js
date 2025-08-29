const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAndAddTrueGrit() {
  try {
    console.log('🔍 Checking for true-grit game mode in Firestore...');
    
    // Check if true-grit document exists
    const trueGritDoc = await db.collection('gameModes').doc('true-grit').get();
    
    if (trueGritDoc.exists()) {
      console.log('✅ true-grit game mode already exists in Firestore');
      console.log('Data:', trueGritDoc.data());
      return;
    }
    
    console.log('❌ true-grit game mode not found, creating it...');
    
    // Add the true-grit game mode
    const trueGritData = {
      id: 'true-grit',
      name: 'True Grit',
      description: 'Each player gets one turn only, roll until single 1 ends turn, highest score wins',
      rules: {
        startingScore: 0,
        targetScore: 999999, // No target score, highest wins
        allowBanking: false,
        allowDoubleRolls: true,
        scoreDirection: 'up',
        eliminationRules: {
          singleOne: true,      // Single 1 ends turn (not eliminates player)
          doubleOne: false,     // Double 1 gets special x7 multiplier
          doubleSix: 'score'    // Double 6 scores normally
        },
        specialRules: {
          multiplierSystem: true,
          exactScoreRequired: false,
          doublesEffects: {
            'double1': { scoreBonus: 0, multiplier: 7, opponentPenalty: 0, affectsOpponentOnBank: false },
            'double2': { scoreBonus: 0, multiplier: 2, opponentPenalty: 0, affectsOpponentOnBank: false },
            'double3': { scoreBonus: 0, multiplier: 3, opponentPenalty: 0, affectsOpponentOnBank: false },
            'double4': { scoreBonus: 0, multiplier: 4, opponentPenalty: 0, affectsOpponentOnBank: false },
            'double5': { scoreBonus: 0, multiplier: 5, opponentPenalty: 0, affectsOpponentOnBank: false },
            'double6': { scoreBonus: 0, multiplier: 6, opponentPenalty: 0, affectsOpponentOnBank: false }
          }
        }
      },
      settings: {
        timePerTurn: 120,  // 2 minutes max per turn
        maxConsecutiveRolls: 50,
        showRunningTotal: true,
        allowSpectating: true
      },
      isActive: true,
      platforms: ['desktop', 'mobile'],
      minPlayers: 2,
      maxPlayers: 2,
      estimatedDuration: 5
    };
    
    await db.collection('gameModes').doc('true-grit').set(trueGritData);
    console.log('✅ true-grit game mode added to Firestore successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkAndAddTrueGrit();
