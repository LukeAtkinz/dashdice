const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const defaultAchievements = [
  {
    id: 'first_win',
    name: 'First Victory',
    description: 'Win your first game',
    category: 'gameplay',
    type: 'milestone',
    condition: {
      type: 'win_count',
      target: 1
    },
    reward: {
      xp: 100,
      items: []
    },
    rarity: 'common',
    order: 1,
    isActive: true,
    icon: '🏆'
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Win 5 games in a row',
    category: 'gameplay',
    type: 'milestone',
    condition: {
      type: 'win_streak',
      target: 5
    },
    reward: {
      xp: 500,
      items: []
    },
    rarity: 'rare',
    order: 2,
    isActive: true,
    icon: '🔥'
  },
  {
    id: 'dice_master',
    name: 'Dice Master',
    description: 'Roll double 6s five times',
    category: 'dice',
    type: 'cumulative',
    condition: {
      type: 'double_sixes',
      target: 5
    },
    reward: {
      xp: 300,
      items: []
    },
    rarity: 'uncommon',
    order: 3,
    isActive: true,
    icon: '🎲'
  },
  {
    id: 'classic_champion',
    name: 'Classic Champion',
    description: 'Win 10 Classic Mode games',
    category: 'mode_specific',
    type: 'cumulative',
    condition: {
      type: 'mode_wins',
      target: 10,
      gameMode: 'classic'
    },
    reward: {
      xp: 750,
      items: []
    },
    rarity: 'rare',
    order: 4,
    isActive: true,
    icon: '👑'
  },
  {
    id: 'zero_hour_hero',
    name: 'Zero Hour Hero',
    description: 'Win 5 Zero Hour games',
    category: 'mode_specific',
    type: 'cumulative',
    condition: {
      type: 'mode_wins',
      target: 5,
      gameMode: 'zero-hour'
    },
    reward: {
      xp: 600,
      items: []
    },
    rarity: 'rare',
    order: 5,
    isActive: true,
    icon: '⏰'
  },
  {
    id: 'last_line_legend',
    name: 'Last Line Legend',
    description: 'Win 3 Last Line games',
    category: 'mode_specific',
    type: 'cumulative',
    condition: {
      type: 'mode_wins',
      target: 3,
      gameMode: 'last-line'
    },
    reward: {
      xp: 450,
      items: []
    },
    rarity: 'uncommon',
    order: 6,
    isActive: true,
    icon: '💀'
  },
  {
    id: 'true_grit_warrior',
    name: 'True Grit Warrior',
    description: 'Win 5 True Grit games',
    category: 'mode_specific',
    type: 'cumulative',
    condition: {
      type: 'mode_wins',
      target: 5,
      gameMode: 'true-grit'
    },
    reward: {
      xp: 800,
      items: []
    },
    rarity: 'epic',
    order: 7,
    isActive: true,
    icon: '⚔️'
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Add 5 friends',
    category: 'social',
    type: 'cumulative',
    condition: {
      type: 'friend_count',
      target: 5
    },
    reward: {
      xp: 250,
      items: []
    },
    rarity: 'uncommon',
    order: 8,
    isActive: true,
    icon: '👥'
  }
];

async function initializeAchievements() {
  console.log('🏆 Initializing achievement definitions...');
  
  try {
    const batch = db.batch();
    
    for (const achievement of defaultAchievements) {
      const achievementRef = db.collection('achievementDefinitions').doc(achievement.id);
      batch.set(achievementRef, achievement);
    }
    
    await batch.commit();
    console.log(`✅ Successfully initialized ${defaultAchievements.length} achievement definitions`);
    
    // Also create indexes for the collection
    console.log('📊 Achievement definitions ready for use');
    
  } catch (error) {
    console.error('❌ Error initializing achievements:', error);
  }
}

async function initializeGameModes() {
  console.log('🎮 Initializing game mode definitions...');
  
  const defaultGameModes = [
    {
      id: 'classic',
      name: 'Classic Mode',
      description: 'First to 50 points, best of 3 rounds',
      rules: {
        startingScore: 0,
        targetScore: 50,
        bestOf: 3,
        allowBanking: true,
        allowDoubleRolls: true,
        scoreDirection: 'up',
        eliminationRules: {
          singleOne: false,
          doubleOne: true,
          doubleSix: 'reset'
        }
      },
      settings: {
        timePerTurn: 30,
        maxConsecutiveRolls: 10,
        showRunningTotal: true,
        showOpponentScore: true,
        enableChat: true,
        enableAbilities: true
      },
      isActive: true,
      platforms: ['desktop', 'mobile'],
      minPlayers: 2,
      maxPlayers: 4,
      estimatedDuration: 15
    },
    {
      id: 'zero-hour',
      name: 'Zero Hour',
      description: 'Start at 100, first to reach exactly 0 wins',
      rules: {
        startingScore: 100,
        targetScore: 0,
        allowBanking: true,
        allowDoubleRolls: true,
        scoreDirection: 'down',
        eliminationRules: {
          singleOne: false,
          doubleOne: true,
          doubleSix: 'reset'
        },
        specialRules: {
          exactScoreRequired: true
        }
      },
      settings: {
        timePerTurn: 45,
        maxConsecutiveRolls: 15,
        showRunningTotal: true,
        showOpponentScore: true,
        enableChat: true,
        enableAbilities: true
      },
      isActive: true,
      platforms: ['desktop', 'mobile'],
      minPlayers: 2,
      maxPlayers: 4,
      estimatedDuration: 12
    },
    {
      id: 'last-line',
      name: 'Last Line',
      description: 'Single roll elimination, doubles grant extra roll',
      rules: {
        startingScore: 0,
        targetScore: 100,
        allowBanking: false,
        allowDoubleRolls: false,
        scoreDirection: 'up',
        eliminationRules: {
          singleOne: true,    // Single 1 eliminates player
          doubleOne: false,
          doubleSix: 'score'
        },
        specialRules: {
          rollLimit: 1,
          doubleGrantsExtraRoll: true
        }
      },
      settings: {
        timePerTurn: 15,
        showRunningTotal: false,
        showOpponentScore: false,
        enableChat: true,
        enableAbilities: false
      },
      isActive: true,
      platforms: ['desktop', 'mobile'],
      minPlayers: 2,
      maxPlayers: 6,
      estimatedDuration: 5
    },
    {
      id: 'true-grit',
      name: 'True Grit',
      description: 'No banking, single 1 eliminates, double 6s score',
      rules: {
        startingScore: 0,
        targetScore: 100,
        allowBanking: false,
        allowDoubleRolls: true,
        scoreDirection: 'up',
        eliminationRules: {
          singleOne: true,
          doubleOne: false,
          doubleSix: 'score'
        }
      },
      settings: {
        timePerTurn: 60,
        showRunningTotal: true,
        showOpponentScore: true,
        enableChat: true,
        enableAbilities: true
      },
      isActive: true,
      platforms: ['desktop', 'mobile'],
      minPlayers: 2,
      maxPlayers: 4,
      estimatedDuration: 10
    }
  ];
  
  try {
    const batch = db.batch();
    
    for (const gameMode of defaultGameModes) {
      const gameModeRef = db.collection('gameModes').doc(gameMode.id);
      batch.set(gameModeRef, gameMode);
    }
    
    await batch.commit();
    console.log(`✅ Successfully initialized ${defaultGameModes.length} game mode definitions`);
    
  } catch (error) {
    console.error('❌ Error initializing game modes:', error);
  }
}

async function main() {
  await initializeAchievements();
  await initializeGameModes();
  console.log('🎉 Database initialization complete!');
  process.exit(0);
}

main().catch(console.error);
