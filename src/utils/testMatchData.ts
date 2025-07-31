import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';

/**
 * Creates test match data for local development
 * This will be easily removable when you say "Delete Test Players"
 */
export const createTestMatch = async () => {
  try {
    console.log('🧪 Creating test match data...');

    // Test match data with 2 players
    const testMatchData = {
      createdAt: serverTimestamp(),
      gameMode: 'classic',
      gameType: 'Open Server',
      status: 'active',
      startedAt: serverTimestamp(),
      
      // Host player data (Test Player 1 - You)
      hostData: {
        displayBackgroundEquipped: {
          name: "All For Glory",
          file: "/backgrounds/All For Glory.jpg",
          type: "image"
        },
        matchBackgroundEquipped: {
          name: "New Day", 
          file: "/backgrounds/New Day.mp4",
          type: "video"
        },
        playerDisplayName: "You (TestPlayer1)",
        playerId: "test-user-1", // Use test-user-1 as host so you can play
        playerStats: {
          bestStreak: 5,
          currentStreak: 2,
          gamesPlayed: 15,
          matchWins: 8
        },
        turnActive: true,  // You (host) go first
        playerScore: 25,
        roundScore: 0,
        // Initialize match statistics for testing
        matchStats: {
          banks: 3,
          doubles: 2,
          biggestTurnScore: 16,
          lastDiceSum: 8
        }
      },

      // Opponent player data (Test Player 2) 
      opponentData: {
        displayBackgroundEquipped: {
          name: "Underwater",
          file: "/backgrounds/Underwater.mp4", 
          type: "video"
        },
        matchBackgroundEquipped: {
          name: "Relax",
          file: "/backgrounds/Relax.png",
          type: "image"
        },
        playerDisplayName: "TestPlayer2 (AI)",
        playerId: "test-user-2", // Test opponent
        playerStats: {
          bestStreak: 3,
          currentStreak: 1,
          gamesPlayed: 12,
          matchWins: 6
        },
        turnActive: false, // Opponent waits
        playerScore: 18,
        roundScore: 0,
        // Initialize match statistics for testing
        matchStats: {
          banks: 2,
          doubles: 1,
          biggestTurnScore: 12,
          lastDiceSum: 7
        }
      },

      // Game state data - Only include defined fields
      gameData: {
        type: 'dice',
        settings: {},
        turnDecider: 1, // Host decided turn order
        turnScore: 0,
        diceOne: 0,
        diceTwo: 0,
        roundObjective: 100, // Classic mode
        startingScore: 0,
        status: 'active',
        startedAt: serverTimestamp(),
        gamePhase: 'gameplay', // Skip turn decider for easier testing
        isRolling: false,
        turnDeciderChoice: 'odd',
        turnDeciderDice: 3
        // Note: No undefined fields for Firebase compatibility
      }
    };

    // Validate data before sending to Firebase
    console.log('🔍 Validating test match data:', testMatchData);
    
    // Create the test match
    const matchDocRef = await addDoc(collection(db, 'matches'), testMatchData);
    console.log('✅ Test match created with ID:', matchDocRef.id);
    
    return matchDocRef.id;
  } catch (error) {
    console.error('❌ Error creating test match:', error);
    console.error('❌ Full error details:', error);
    throw error;
  }
};

/**
 * Alternative: Create test match starting with turn decider phase
 */
export const createTestMatchWithTurnDecider = async () => {
  try {
    console.log('🧪 Creating test match with turn decider...');

    const testMatchData = {
      createdAt: serverTimestamp(),
      gameMode: 'quickfire',
      gameType: 'Open Server',
      status: 'active',
      startedAt: serverTimestamp(),
      
      hostData: {
        displayBackgroundEquipped: {
          name: "On A Mission",
          file: "/backgrounds/On A Mission.mp4",
          type: "video"
        },
        matchBackgroundEquipped: {
          name: "Long Road Ahead",
          file: "/backgrounds/Long Road Ahead.jpg",
          type: "image"
        },
        playerDisplayName: "QuickPlayer1",
        playerId: "test-user-quick-1",
        playerStats: {
          bestStreak: 7,
          currentStreak: 3,
          gamesPlayed: 20,
          matchWins: 12
        },
        turnActive: false,
        playerScore: 0,
        roundScore: 0,
        // Initialize match statistics
        matchStats: {
          banks: 0,
          doubles: 0,
          biggestTurnScore: 0,
          lastDiceSum: 0
        }
      },

      opponentData: {
        displayBackgroundEquipped: {
          name: "Relax",
          file: "/backgrounds/Relax.png",
          type: "image"
        },
        matchBackgroundEquipped: {
          name: "Underwater", 
          file: "/backgrounds/Underwater.mp4",
          type: "video"
        },
        playerDisplayName: "QuickPlayer2",
        playerId: "test-user-quick-2",
        playerStats: {
          bestStreak: 4,
          currentStreak: 1,
          gamesPlayed: 18,
          matchWins: 9
        },
        turnActive: false,
        playerScore: 0,
        roundScore: 0,
        // Initialize match statistics
        matchStats: {
          banks: 0,
          doubles: 0,
          biggestTurnScore: 0,
          lastDiceSum: 0
        }
      },

      // Game state data - Only include defined fields
      gameData: {
        type: 'dice',
        settings: {},
        turnDecider: 1, // Host gets to decide
        turnScore: 0,
        diceOne: 0,
        diceTwo: 0,
        roundObjective: 50, // Quick Fire mode
        startingScore: 0,
        status: 'active',
        startedAt: serverTimestamp(),
        gamePhase: 'turnDecider',
        isRolling: false
        // Note: No undefined fields for Firebase compatibility
      }
    };

    const matchDocRef = await addDoc(collection(db, 'matches'), testMatchData);
    console.log('✅ Test match (turn decider) created with ID:', matchDocRef.id);
    
    return matchDocRef.id;
  } catch (error) {
    console.error('❌ Error creating test match with turn decider:', error);
    throw error;
  }
};
