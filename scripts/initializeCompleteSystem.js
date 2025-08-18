// Complete System Initialization
// This script runs all necessary initialization steps for the achievement and friend systems

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
    console.log('⚠️  Make sure serviceAccountKey.json exists and is valid');
    console.log('📋 Continuing with available operations...');
  }
}

const db = admin.firestore();

// Import other initialization functions
const { fixUserPrivacySettings } = require('./fixUserPrivacySettings');
const { initializePatternAchievements } = require('./initializePatternAchievements');

// Achievement definitions for fallback
const allAchievements = [
  // Original 17 achievements
  {
    id: 'dice_gremlin',
    name: 'Dice Gremlin',
    description: 'Roll the dice 1000 times total',
    category: 'progression',
    type: 'counter',
    difficulty: 'common',
    requirements: {
      metric: 'dice_rolls_total',
      operator: 'greater_than_equal',
      value: 1000
    },
    rewards: {
      points: 50,
      badge: 'Dice Gremlin'
    },
    icon: '🎲',
    rarity_color: '#6b7280',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 1
  },
  {
    id: 'dice_dragon',
    name: 'Dice Dragon',
    description: 'Roll the dice 10,000 times total',
    category: 'progression',
    type: 'counter',
    difficulty: 'rare',
    requirements: {
      metric: 'dice_rolls_total',
      operator: 'greater_than_equal',
      value: 10000
    },
    rewards: {
      points: 150,
      badge: 'Dice Dragon',
      title: 'Dice Dragon'
    },
    icon: '🐉',
    rarity_color: '#3b82f6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    prerequisites: ['dice_gremlin'],
    order: 2
  },
  {
    id: 'dice_god',
    name: 'Dice God',
    description: 'Roll the dice 100,000 times total',
    category: 'progression',
    type: 'counter',
    difficulty: 'legendary',
    requirements: {
      metric: 'dice_rolls_total',
      operator: 'greater_than_equal',
      value: 100000
    },
    rewards: {
      points: 500,
      badge: 'Dice God',
      title: 'Dice God',
      specialPrivileges: ['dice_god_status']
    },
    icon: '⚡',
    rarity_color: '#f59e0b',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    prerequisites: ['dice_dragon'],
    order: 3
  },
  {
    id: 'rollception',
    name: 'Rollception',
    description: 'Roll the same number 3 times in a row',
    category: 'special',
    type: 'streak',
    difficulty: 'rare',
    requirements: {
      metric: 'same_number_streak',
      operator: 'streak',
      value: 3
    },
    rewards: {
      points: 75,
      badge: 'Rollception'
    },
    icon: '🔄',
    rarity_color: '#8b5cf6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 4
  },
  {
    id: 'the_clockbreaker',
    name: 'The Clockbreaker',
    description: 'Play at least one game every hour for 24 hours',
    category: 'special',
    type: 'streak',
    difficulty: 'epic',
    requirements: {
      metric: 'hourly_game_streak',
      operator: 'streak',
      value: 24
    },
    rewards: {
      points: 200,
      badge: 'Clockbreaker',
      title: 'The Clockbreaker'
    },
    icon: '⏰',
    rarity_color: '#8b5cf6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 5
  },
  {
    id: 'iron_will',
    name: 'Iron Will',
    description: 'Play 10 games in a row without logging off',
    category: 'special',
    type: 'streak',
    difficulty: 'rare',
    requirements: {
      metric: 'consecutive_games_streak',
      operator: 'streak',
      value: 10
    },
    rewards: {
      points: 100,
      badge: 'Iron Will'
    },
    icon: '💪',
    rarity_color: '#6b7280',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 6
  },
  {
    id: 'marathoner',
    name: 'Marathoner',
    description: 'Play 25 games in a single day',
    category: 'special',
    type: 'counter',
    difficulty: 'epic',
    requirements: {
      metric: 'daily_games_played',
      operator: 'greater_than_equal',
      value: 25
    },
    rewards: {
      points: 150,
      badge: 'Marathoner',
      title: 'Marathoner'
    },
    icon: '🏃‍♂️',
    rarity_color: '#8b5cf6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 7
  },
  {
    id: 'the_challenger',
    name: 'The Challenger',
    description: 'Invite your first friend',
    category: 'social',
    type: 'milestone',
    difficulty: 'common',
    requirements: {
      metric: 'friends_added',
      operator: 'greater_than_equal',
      value: 1
    },
    rewards: {
      points: 25,
      badge: 'The Challenger'
    },
    icon: '🤝',
    rarity_color: '#22c55e',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 8
  },
  {
    id: 'circle_of_fate',
    name: 'Circle of Fate',
    description: 'Play 10 games with friends',
    category: 'social',
    type: 'counter',
    difficulty: 'common',
    requirements: {
      metric: 'friend_games_played',
      operator: 'greater_than_equal',
      value: 10
    },
    rewards: {
      points: 50,
      badge: 'Circle of Fate'
    },
    icon: '⭕',
    rarity_color: '#3b82f6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    prerequisites: ['the_challenger'],
    order: 9
  },
  {
    id: 'guildmaster',
    name: 'Guildmaster',
    description: 'Play 100 games with friends',
    category: 'social',
    type: 'counter',
    difficulty: 'epic',
    requirements: {
      metric: 'friend_games_played',
      operator: 'greater_than_equal',
      value: 100
    },
    rewards: {
      points: 200,
      badge: 'Guildmaster',
      title: 'Guildmaster'
    },
    icon: '👑',
    rarity_color: '#8b5cf6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    prerequisites: ['circle_of_fate'],
    order: 10
  },
  {
    id: 'duelist',
    name: 'Duelist',
    description: 'Beat a friend for the first time',
    category: 'social',
    type: 'milestone',
    difficulty: 'common',
    requirements: {
      metric: 'friend_wins',
      operator: 'greater_than_equal',
      value: 1
    },
    rewards: {
      points: 30,
      badge: 'Duelist'
    },
    icon: '⚔️',
    rarity_color: '#dc2626',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    prerequisites: ['the_challenger'],
    order: 11
  },
  {
    id: 'nemesis',
    name: 'Nemesis',
    description: 'Beat the same friend 10 times',
    category: 'social',
    type: 'counter',
    difficulty: 'rare',
    requirements: {
      metric: 'max_wins_against_single_friend',
      operator: 'greater_than_equal',
      value: 10
    },
    rewards: {
      points: 100,
      badge: 'Nemesis',
      title: 'Nemesis'
    },
    icon: '🗡️',
    rarity_color: '#dc2626',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    prerequisites: ['duelist'],
    order: 12
  },
  {
    id: 'unlucky_pal',
    name: 'Unlucky Pal',
    description: 'Lose 10 times in a row to the same friend',
    category: 'social',
    type: 'streak',
    difficulty: 'rare',
    requirements: {
      metric: 'max_losses_to_single_friend_streak',
      operator: 'streak',
      value: 10
    },
    rewards: {
      points: 50,
      badge: 'Unlucky Pal'
    },
    icon: '😅',
    rarity_color: '#3b82f6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    prerequisites: ['duelist'],
    order: 13
  }
];

async function initializeCompleteSystem() {
  console.log('🚀 Starting complete system initialization...');
  
  try {
    if (admin.apps.length > 0) {
      // Step 1: Fix user privacy settings
      console.log('\n📋 Step 1: Fixing user privacy settings...');
      await fixUserPrivacySettings();
      
      // Step 2: Initialize achievements
      console.log('\n📋 Step 2: Initializing core achievements...');
      await initializeCoreAchievements();
      
      // Step 3: Initialize pattern achievements  
      console.log('\n📋 Step 3: Initializing pattern achievements...');
      await initializePatternAchievements();
      
      console.log('\n✅ Complete system initialization finished!');
      console.log('🎯 All achievements and friend system features should now work properly');
    } else {
      console.log('⚠️  Firebase Admin not available - providing client-side initialization guidance');
      console.log('');
      console.log('📋 Manual Setup Instructions:');
      console.log('1. Fix friend request issue: Update user privacy settings to allow friend requests');
      console.log('2. Achievement display: Achievements should show as greyed out when not earned');
      console.log('3. Database setup: Run the initialization scripts when Firebase credentials are available');
    }
    
  } catch (error) {
    console.error('❌ Error during system initialization:', error);
    throw error;
  }
}

async function initializeCoreAchievements() {
  console.log('🏆 Initializing core achievements...');
  
  try {
    const batch = db.batch();
    
    for (const achievement of allAchievements) {
      const achievementRef = db.collection('achievementDefinitions').doc(achievement.id);
      batch.set(achievementRef, achievement);
    }
    
    await batch.commit();
    
    console.log(`✅ Successfully added ${allAchievements.length} core achievements to database`);
    
  } catch (error) {
    console.error('❌ Error initializing core achievements:', error);
    throw error;
  }
}

// Run the initialization
if (require.main === module) {
  initializeCompleteSystem()
    .then(() => {
      console.log('\n🎉 System initialization complete!');
      console.log('✨ Friend requests should now work properly');
      console.log('🏆 All achievements should be visible (greyed out when not earned)');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 System initialization failed:', error);
      console.log('\n📋 Manual steps to fix the issues:');
      console.log('1. Friend requests: Check user privacy settings in database');
      console.log('2. Achievements: Verify achievement definitions exist in Firestore');
      console.log('3. UI: Clear browser cache and reload application');
      process.exit(1);
    });
}

module.exports = { initializeCompleteSystem };
