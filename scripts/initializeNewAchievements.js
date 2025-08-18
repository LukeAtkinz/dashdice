const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const newAchievements = [
  {
    id: 'dice_gremlin',
    name: 'Dice Gremlin',
    description: 'Roll the dice 1,000 times total',
    category: 'progression',
    type: 'counter',
    difficulty: 'common',
    requirements: {
      metric: 'total_dice_rolled',
      operator: 'greater_than_equal',
      value: 1000
    },
    rewards: {
      points: 30,
      badge: 'Gremlin'
    },
    icon: '🎲',
    rarity_color: '#6b7280',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 5
  },
  {
    id: 'dice_dragon',
    name: 'Dice Dragon',
    description: 'Roll the dice 10,000 times total',
    category: 'progression',
    type: 'counter',
    difficulty: 'epic',
    requirements: {
      metric: 'total_dice_rolled',
      operator: 'greater_than_equal',
      value: 10000
    },
    rewards: {
      points: 100,
      badge: 'Dragon',
      title: 'Dragon'
    },
    icon: '🐉',
    rarity_color: '#8b5cf6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    prerequisites: ['dice_gremlin'],
    order: 6
  },
  {
    id: 'dice_god',
    name: 'Dice God',
    description: 'Roll the dice 100,000 times total',
    category: 'progression',
    type: 'counter',
    difficulty: 'mythic',
    requirements: {
      metric: 'total_dice_rolled',
      operator: 'greater_than_equal',
      value: 100000
    },
    rewards: {
      points: 500,
      badge: 'Deity',
      title: 'Dice God',
      specialPrivileges: ['golden_dice', 'god_mode_cosmetics']
    },
    icon: '⚡',
    rarity_color: '#dc2626',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    prerequisites: ['dice_dragon'],
    order: 7
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
      value: 3,
      conditions: {
        type: 'consecutive_same_roll',
        requirements: [{ metric: 'consecutive_count', value: 3 }]
      }
    },
    rewards: {
      points: 50,
      badge: 'Triple Roll'
    },
    icon: '🔄',
    rarity_color: '#3b82f6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 8
  },
  {
    id: 'the_clockbreaker',
    name: 'The Clockbreaker',
    description: 'Play at least one game every hour for 24 hours',
    category: 'special',
    type: 'time_based',
    difficulty: 'legendary',
    requirements: {
      metric: 'hourly_game_streak',
      operator: 'greater_than_equal',
      value: 24,
      timeframe: 1,
      conditions: {
        type: 'hourly_consistency',
        requirements: [{ metric: 'games_per_hour', value: 1 }]
      }
    },
    rewards: {
      points: 200,
      badge: 'Clockbreaker',
      title: 'The Clockbreaker',
      specialPrivileges: ['time_master']
    },
    icon: '⏰',
    rarity_color: '#f59e0b',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 9
  },
  {
    id: 'iron_will',
    name: 'Iron Will',
    description: 'Play 10 games in a row without logging off',
    category: 'progression',
    type: 'streak',
    difficulty: 'rare',
    requirements: {
      metric: 'consecutive_games_streak',
      operator: 'streak',
      value: 10
    },
    rewards: {
      points: 75,
      badge: 'Iron Will'
    },
    icon: '🛡️',
    rarity_color: '#3b82f6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 10
  },
  {
    id: 'marathoner',
    name: 'Marathoner',
    description: 'Play 25 games in a single day',
    category: 'progression',
    type: 'time_based',
    difficulty: 'epic',
    requirements: {
      metric: 'daily_games_played',
      operator: 'greater_than_equal',
      value: 25,
      timeframe: 1
    },
    rewards: {
      points: 100,
      badge: 'Marathoner',
      title: 'Marathoner'
    },
    icon: '🏃',
    rarity_color: '#8b5cf6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 11
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
      badge: 'Challenger'
    },
    icon: '🤝',
    rarity_color: '#6b7280',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    order: 12
  },
  {
    id: 'circle_of_fate',
    name: 'Circle of Fate',
    description: 'Play 10 games with friends',
    category: 'social',
    type: 'counter',
    difficulty: 'common',
    requirements: {
      metric: 'games_with_friends',
      operator: 'greater_than_equal',
      value: 10
    },
    rewards: {
      points: 50,
      badge: 'Circle Member'
    },
    icon: '⭕',
    rarity_color: '#6b7280',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    prerequisites: ['the_challenger'],
    order: 13
  },
  {
    id: 'guildmaster',
    name: 'Guildmaster',
    description: 'Play 100 games with friends',
    category: 'social',
    type: 'counter',
    difficulty: 'epic',
    requirements: {
      metric: 'games_with_friends',
      operator: 'greater_than_equal',
      value: 100
    },
    rewards: {
      points: 150,
      badge: 'Guildmaster',
      title: 'Guildmaster',
      specialPrivileges: ['guild_leader']
    },
    icon: '🏛️',
    rarity_color: '#8b5cf6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    prerequisites: ['circle_of_fate'],
    order: 14
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
    rarity_color: '#6b7280',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    prerequisites: ['the_challenger'],
    order: 15
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
      points: 75,
      badge: 'Nemesis',
      title: 'Nemesis'
    },
    icon: '😈',
    rarity_color: '#3b82f6',
    isActive: true,
    isHidden: false,
    releaseDate: admin.firestore.Timestamp.now(),
    prerequisites: ['duelist'],
    order: 16
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
    order: 17
  }
];

async function initializeAchievements() {
  console.log('🎯 Initializing new achievements...');
  
  try {
    const batch = db.batch();
    let addedCount = 0;
    
    for (const achievement of newAchievements) {
      const achievementRef = db.collection('achievementDefinitions').doc(achievement.id);
      
      // Check if achievement already exists
      const existingDoc = await achievementRef.get();
      if (!existingDoc.exists) {
        batch.set(achievementRef, achievement);
        addedCount++;
        console.log(`✅ Adding achievement: ${achievement.name}`);
      } else {
        console.log(`⚠️ Achievement already exists: ${achievement.name}`);
      }
    }
    
    if (addedCount > 0) {
      await batch.commit();
      console.log(`🎉 Successfully added ${addedCount} new achievements!`);
    } else {
      console.log('ℹ️ All achievements already exist in the database.');
    }
    
    // Initialize achievement progress for existing users
    await initializeUserMetrics();
    
  } catch (error) {
    console.error('❌ Error initializing achievements:', error);
  }
}

async function initializeUserMetrics() {
  console.log('🔧 Initializing user metrics for new achievements...');
  
  try {
    const progressCollection = db.collection('achievementProgress');
    const progressSnapshot = await progressCollection.get();
    
    const batch = db.batch();
    let updatedCount = 0;
    
    progressSnapshot.forEach(doc => {
      const data = doc.data();
      const updates = {};
      
      // Initialize new metrics if they don't exist
      const newMetrics = [
        'friends_added',
        'friend_wins',
        'max_wins_against_single_friend',
        'max_losses_to_single_friend_streak',
        'daily_games_played',
        'hourly_game_streak',
        'same_number_streak',
        'consecutive_games_streak'
      ];
      
      let needsUpdate = false;
      
      for (const metric of newMetrics) {
        if (!data.metrics || !(metric in data.metrics)) {
          updates[`metrics.${metric}`] = 0;
          needsUpdate = true;
        }
      }
      
      // Initialize new streaks if they don't exist
      const newStreaks = [
        'same_number_streak',
        'consecutive_games_streak'
      ];
      
      for (const streak of newStreaks) {
        if (!data.streaks || !(streak in data.streaks)) {
          updates[`streaks.${streak}`] = {
            current: 0,
            best: 0,
            lastUpdate: admin.firestore.Timestamp.now()
          };
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        batch.update(doc.ref, updates);
        updatedCount++;
      }
    });
    
    if (updatedCount > 0) {
      await batch.commit();
      console.log(`✅ Updated metrics for ${updatedCount} users`);
    } else {
      console.log('ℹ️ All user metrics are already up to date.');
    }
    
  } catch (error) {
    console.error('❌ Error initializing user metrics:', error);
  }
}

// Run the initialization
initializeAchievements()
  .then(() => {
    console.log('🎯 Achievement initialization complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Achievement initialization failed:', error);
    process.exit(1);
  });
