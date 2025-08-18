// Initialize Pattern-Based Achievements
// This script adds 26 new pattern-based and victory streak achievements to the database

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

// Achievement definitions
const patternAchievements = [
  // Eclipse Pattern Achievements
  {
    id: 'solar_eclipse',
    name: 'Solar Eclipse',
    description: 'Roll only even numbers in a game',
    category: 'special',
    type: 'conditional',
    difficulty: 'rare',
    requirements: {
      metric: 'game_only_even_rolls',
      operator: 'greater_than_equal',
      value: 1,
      conditions: {
        type: 'all_even_in_game',
        requirements: [{ metric: 'min_rolls_in_game', value: 5 }]
      }
    },
    rewards: {
      points: 75,
      badge: 'Solar Eclipse'
    },
    icon: '☀️',
    rarity_color: '#f59e0b',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 18
  },
  {
    id: 'lunar_eclipse',
    name: 'Lunar Eclipse',
    description: 'Roll only odd numbers in a game',
    category: 'special',
    type: 'conditional',
    difficulty: 'rare',
    requirements: {
      metric: 'game_only_odd_rolls',
      operator: 'greater_than_equal',
      value: 1,
      conditions: {
        type: 'all_odd_in_game',
        requirements: [{ metric: 'min_rolls_in_game', value: 5 }]
      }
    },
    rewards: {
      points: 75,
      badge: 'Lunar Eclipse'
    },
    icon: '🌙',
    rarity_color: '#8b5cf6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 19
  },
  {
    id: 'equinox',
    name: 'Equinox',
    description: 'Roll the same number of odd and even in one game',
    category: 'special',
    type: 'conditional',
    difficulty: 'epic',
    requirements: {
      metric: 'game_equal_odd_even',
      operator: 'greater_than_equal',
      value: 1,
      conditions: {
        type: 'equal_odd_even_in_game',
        requirements: [{ metric: 'min_rolls_in_game', value: 6 }]
      }
    },
    rewards: {
      points: 100,
      badge: 'Equinox',
      title: 'Balancer'
    },
    icon: '⚖️',
    rarity_color: '#8b5cf6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 20
  },
  
  // Sequential Pattern Achievements
  {
    id: 'the_convergence',
    name: 'The Convergence',
    description: 'Roll 1,2,3,4,5,6 in order',
    category: 'special',
    type: 'conditional',
    difficulty: 'legendary',
    requirements: {
      metric: 'sequential_1_to_6',
      operator: 'greater_than_equal',
      value: 1,
      conditions: {
        type: 'exact_sequence',
        requirements: [{ metric: 'sequence_pattern', value: 123456 }]
      }
    },
    rewards: {
      points: 250,
      badge: 'Convergence',
      title: 'The Convergence',
      specialPrivileges: ['cosmic_dice']
    },
    icon: '🌌',
    rarity_color: '#f59e0b',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 21
  },
  
  // Perfect Victory Achievements
  {
    id: 'the_chosen_one',
    name: 'The Chosen One',
    description: 'Win by exact number needed on final roll',
    category: 'special',
    type: 'conditional',
    difficulty: 'epic',
    requirements: {
      metric: 'exact_winning_roll',
      operator: 'greater_than_equal',
      value: 1
    },
    rewards: {
      points: 150,
      badge: 'Chosen One',
      title: 'The Chosen One'
    },
    icon: '⭐',
    rarity_color: '#f59e0b',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 22
  },
  {
    id: 'the_fated',
    name: 'The Fated',
    description: 'Lose by exact number needed on final roll',
    category: 'special',
    type: 'conditional',
    difficulty: 'rare',
    requirements: {
      metric: 'exact_losing_roll',
      operator: 'greater_than_equal',
      value: 1
    },
    rewards: {
      points: 100,
      badge: 'Fated One'
    },
    icon: '💀',
    rarity_color: '#6b7280',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 23
  },
  {
    id: 'perfect_run',
    name: 'Perfect Run',
    description: 'Win a game with all rolls above 4',
    category: 'special',
    type: 'conditional',
    difficulty: 'epic',
    requirements: {
      metric: 'game_all_high_rolls',
      operator: 'greater_than_equal',
      value: 1,
      conditions: {
        type: 'all_rolls_above',
        requirements: [{ metric: 'min_roll_value', value: 4 }]
      }
    },
    rewards: {
      points: 125,
      badge: 'Perfect Runner',
      title: 'Perfect Runner'
    },
    icon: '🏃‍♂️',
    rarity_color: '#8b5cf6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 24
  },
  
  // Victory Margin Achievements
  {
    id: 'the_closer',
    name: 'The Closer',
    description: 'Win by 1 point',
    category: 'special',
    type: 'conditional',
    difficulty: 'rare',
    requirements: {
      metric: 'win_by_one_point',
      operator: 'greater_than_equal',
      value: 1
    },
    rewards: {
      points: 75,
      badge: 'The Closer'
    },
    icon: '🎯',
    rarity_color: '#3b82f6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 25
  },
  {
    id: 'the_crusher',
    name: 'The Crusher',
    description: 'Win by 50+ points',
    category: 'special',
    type: 'conditional',
    difficulty: 'epic',
    requirements: {
      metric: 'win_by_fifty_plus',
      operator: 'greater_than_equal',
      value: 1
    },
    rewards: {
      points: 125,
      badge: 'The Crusher',
      title: 'The Crusher'
    },
    icon: '💥',
    rarity_color: '#dc2626',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 26
  },
  
  // Special Roll Pattern Achievements
  {
    id: 'mind_over_matter',
    name: 'Mind Over Matter',
    description: 'Win a game without rolling a 6',
    category: 'special',
    type: 'conditional',
    difficulty: 'epic',
    requirements: {
      metric: 'win_without_sixes',
      operator: 'greater_than_equal',
      value: 1
    },
    rewards: {
      points: 100,
      badge: 'Mind Master',
      title: 'Mind Over Matter'
    },
    icon: '🧠',
    rarity_color: '#8b5cf6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 27
  },
  {
    id: 'snake_whisperer',
    name: 'Snake Whisperer',
    description: 'Roll double 1 three times in a game',
    category: 'special',
    type: 'conditional',
    difficulty: 'rare',
    requirements: {
      metric: 'triple_snake_eyes_game',
      operator: 'greater_than_equal',
      value: 1
    },
    rewards: {
      points: 100,
      badge: 'Snake Whisperer'
    },
    icon: '🐍',
    rarity_color: '#22c55e',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 28
  },
  {
    id: 'twin_titans',
    name: 'Twin Titans',
    description: 'Roll double 6 five times in a game',
    category: 'special',
    type: 'conditional',
    difficulty: 'legendary',
    requirements: {
      metric: 'five_double_sixes_game',
      operator: 'greater_than_equal',
      value: 1
    },
    rewards: {
      points: 200,
      badge: 'Twin Titans',
      title: 'Twin Titans',
      specialPrivileges: ['titan_dice']
    },
    icon: '👯',
    rarity_color: '#f59e0b',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 29
  },
  {
    id: 'the_balance',
    name: 'The Balance',
    description: 'Roll 1 and 6 back-to-back',
    category: 'special',
    type: 'conditional',
    difficulty: 'common',
    requirements: {
      metric: 'one_six_consecutive',
      operator: 'greater_than_equal',
      value: 1
    },
    rewards: {
      points: 50,
      badge: 'The Balance'
    },
    icon: '⚖️',
    rarity_color: '#6b7280',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 30
  },
  
  // Fortune Achievements
  {
    id: 'fortunes_child',
    name: "Fortune's Child",
    description: 'Roll 10 sixes in one match',
    category: 'special',
    type: 'conditional',
    difficulty: 'epic',
    requirements: {
      metric: 'ten_sixes_in_match',
      operator: 'greater_than_equal',
      value: 1
    },
    rewards: {
      points: 150,
      badge: "Fortune's Child",
      title: "Fortune's Child"
    },
    icon: '🍀',
    rarity_color: '#22c55e',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 31
  },
  {
    id: 'cursed_hands',
    name: 'Cursed Hands',
    description: 'Roll 10 ones in one match',
    category: 'special',
    type: 'conditional',
    difficulty: 'rare',
    requirements: {
      metric: 'ten_ones_in_match',
      operator: 'greater_than_equal',
      value: 1
    },
    rewards: {
      points: 75,
      badge: 'Cursed Hands'
    },
    icon: '👻',
    rarity_color: '#6b7280',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 32
  },
  
  // Streak Achievements
  {
    id: 'lucky_streak',
    name: 'Lucky Streak',
    description: 'Roll 3 sixes in a row',
    category: 'special',
    type: 'streak',
    difficulty: 'rare',
    requirements: {
      metric: 'three_sixes_streak',
      operator: 'streak',
      value: 3
    },
    rewards: {
      points: 100,
      badge: 'Lucky Streak'
    },
    icon: '🎰',
    rarity_color: '#f59e0b',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 33
  },
  {
    id: 'doomed_streak',
    name: 'Doomed Streak',
    description: 'Roll 3 ones in a row',
    category: 'special',
    type: 'streak',
    difficulty: 'rare',
    requirements: {
      metric: 'three_ones_streak',
      operator: 'streak',
      value: 3
    },
    rewards: {
      points: 75,
      badge: 'Doomed Streak'
    },
    icon: '💀',
    rarity_color: '#6b7280',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 34
  },
  {
    id: 'dice_jester',
    name: 'Dice Jester',
    description: 'Roll doubles five times in one game',
    category: 'special',
    type: 'conditional',
    difficulty: 'epic',
    requirements: {
      metric: 'five_doubles_in_game',
      operator: 'greater_than_equal',
      value: 1
    },
    rewards: {
      points: 125,
      badge: 'Dice Jester',
      title: 'Dice Jester'
    },
    icon: '🃏',
    rarity_color: '#8b5cf6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 35
  },
  {
    id: 'cosmic_alignment',
    name: 'Cosmic Alignment',
    description: 'Roll the exact same number 3 times in a row',
    category: 'special',
    type: 'streak',
    difficulty: 'rare',
    requirements: {
      metric: 'same_number_three_streak',
      operator: 'streak',
      value: 3
    },
    rewards: {
      points: 100,
      badge: 'Cosmic Alignment'
    },
    icon: '🌌',
    rarity_color: '#8b5cf6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 36
  },
  
  // Victory Streak Achievements
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Win your first game',
    category: 'progression',
    type: 'milestone',
    difficulty: 'common',
    requirements: {
      metric: 'games_won',
      operator: 'greater_than_equal',
      value: 1
    },
    rewards: {
      points: 25,
      badge: 'First Blood'
    },
    icon: '🩸',
    rarity_color: '#dc2626',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 37
  },
  {
    id: 'victorys_child',
    name: "Victory's Child",
    description: 'Win 3 games in a row',
    category: 'progression',
    type: 'streak',
    difficulty: 'common',
    requirements: {
      metric: 'win_streak',
      operator: 'streak',
      value: 3
    },
    rewards: {
      points: 50,
      badge: "Victory's Child"
    },
    icon: '🏆',
    rarity_color: '#f59e0b',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 38
  },
  {
    id: 'stormbringer',
    name: 'Stormbringer',
    description: 'Win 5 games in a row',
    category: 'progression',
    type: 'streak',
    difficulty: 'rare',
    requirements: {
      metric: 'win_streak',
      operator: 'streak',
      value: 5
    },
    rewards: {
      points: 100,
      badge: 'Stormbringer',
      title: 'Stormbringer'
    },
    icon: '⛈️',
    rarity_color: '#3b82f6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    prerequisites: ['victorys_child'],
    order: 39
  },
  {
    id: 'the_ascended',
    name: 'The Ascended',
    description: 'Reach a 10 win streak',
    category: 'progression',
    type: 'streak',
    difficulty: 'epic',
    requirements: {
      metric: 'win_streak',
      operator: 'streak',
      value: 10
    },
    rewards: {
      points: 200,
      badge: 'The Ascended',
      title: 'The Ascended',
      specialPrivileges: ['ascended_aura']
    },
    icon: '👑',
    rarity_color: '#8b5cf6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    prerequisites: ['stormbringer'],
    order: 40
  },
  {
    id: 'legendborn',
    name: 'Legendborn',
    description: 'Reach a 15 win streak',
    category: 'progression',
    type: 'streak',
    difficulty: 'legendary',
    requirements: {
      metric: 'win_streak',
      operator: 'streak',
      value: 15
    },
    rewards: {
      points: 350,
      badge: 'Legendborn',
      title: 'Legendborn',
      specialPrivileges: ['legend_status', 'golden_crown']
    },
    icon: '⚡',
    rarity_color: '#f59e0b',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    prerequisites: ['the_ascended'],
    order: 41
  },
  {
    id: 'immortal_sovereign',
    name: 'Immortal Sovereign',
    description: 'Reach a 20 win streak',
    category: 'progression',
    type: 'streak',
    difficulty: 'mythic',
    requirements: {
      metric: 'win_streak',
      operator: 'streak',
      value: 20
    },
    rewards: {
      points: 500,
      badge: 'Immortal Sovereign',
      title: 'Immortal King/Queen',
      specialPrivileges: ['immortal_status', 'divine_crown', 'god_mode_unlocked']
    },
    icon: '👑',
    rarity_color: '#dc2626',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    prerequisites: ['legendborn'],
    order: 42
  }
];

async function initializePatternAchievements() {
  console.log('🎯 Initializing 26 Pattern-Based Achievements...');
  
  try {
    const batch = db.batch();
    
    for (const achievement of patternAchievements) {
      const achievementRef = db.collection('achievementDefinitions').doc(achievement.id);
      batch.set(achievementRef, achievement);
    }
    
    await batch.commit();
    
    console.log(`✅ Successfully added ${patternAchievements.length} pattern achievements to database`);
    console.log('📊 Achievement Categories Added:');
    console.log('   • Eclipse Patterns (Solar, Lunar, Equinox)');
    console.log('   • Sequential Patterns (The Convergence)');
    console.log('   • Victory Conditions (Chosen One, Perfect Run, etc.)');
    console.log('   • Victory Margins (The Closer, The Crusher)');
    console.log('   • Special Patterns (Snake Whisperer, Twin Titans, etc.)');
    console.log('   • Fortune Events (Fortune\'s Child, Cursed Hands)');
    console.log('   • Streak Patterns (Lucky Streak, Doomed Streak, etc.)');
    console.log('   • Victory Progressions (First Blood → Immortal Sovereign)');
    console.log('');
    console.log('🎮 All achievements are now ready for tracking in-game!');
    
  } catch (error) {
    console.error('❌ Error initializing achievements:', error);
    throw error;
  }
}

// Run the initialization
if (require.main === module) {
  initializePatternAchievements()
    .then(() => {
      console.log('🎉 Pattern achievements initialization complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed to initialize pattern achievements:', error);
      process.exit(1);
    });
}

module.exports = { initializePatternAchievements };
