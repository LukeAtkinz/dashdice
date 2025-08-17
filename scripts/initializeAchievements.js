// Script to initialize sample achievements in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const sampleAchievements = [
  {
    name: 'First Victory',
    description: 'Win your first game',
    category: 'gameplay',
    type: 'milestone',
    difficulty: 'common',
    requirements: {
      metric: 'games_won',
      operator: 'greater_than_equal',
      value: 1
    },
    rewards: {
      points: 100,
      title: 'Victor',
      currency: 50
    },
    icon: '/achievements/first_win.png',
    rarity_color: '#9CA3AF',
    isActive: true,
    isHidden: false,
    releaseDate: new Date(),
    order: 1
  },
  {
    name: 'Snake Eyes Master',
    description: 'Roll 100 ones',
    category: 'gameplay',
    type: 'counter',
    difficulty: 'rare',
    requirements: {
      metric: 'dice_ones_rolled',
      operator: 'greater_than_equal',
      value: 100
    },
    rewards: {
      points: 500,
      badge: 'snake_eyes_badge',
      cosmetics: ['dice_skin_silver']
    },
    icon: '/achievements/hundred_ones.png',
    rarity_color: '#3B82F6',
    isActive: true,
    isHidden: false,
    releaseDate: new Date(),
    order: 2
  },
  {
    name: 'Unstoppable',
    description: 'Win 10 games in a row',
    category: 'gameplay',
    type: 'streak',
    difficulty: 'epic',
    requirements: {
      metric: 'win_streak',
      operator: 'streak',
      value: 10
    },
    rewards: {
      points: 1000,
      title: 'Unstoppable',
      specialPrivileges: ['streak_badge_display']
    },
    icon: '/achievements/win_streak_10.png',
    rarity_color: '#8B5CF6',
    isActive: true,
    isHidden: false,
    releaseDate: new Date(),
    order: 3
  },
  {
    name: 'Social Butterfly',
    description: 'Add 10 friends',
    category: 'social',
    type: 'counter',
    difficulty: 'common',
    requirements: {
      metric: 'friends_added',
      operator: 'greater_than_equal',
      value: 10
    },
    rewards: {
      points: 300,
      currency: 100
    },
    icon: '/achievements/social_butterfly.png',
    rarity_color: '#9CA3AF',
    isActive: true,
    isHidden: false,
    releaseDate: new Date(),
    order: 4
  },
  {
    name: 'Perfect Combination',
    description: 'Roll 50 ones AND 50 sixes',
    category: 'gameplay',
    type: 'conditional',
    difficulty: 'legendary',
    requirements: {
      metric: 'custom',
      operator: 'custom',
      value: 1,
      conditions: {
        type: 'multiple_dice_milestone',
        requirements: [
          { metric: 'dice_ones_rolled', value: 50 },
          { metric: 'dice_sixes_rolled', value: 50 }
        ]
      }
    },
    rewards: {
      points: 2000,
      title: 'Dice Master',
      cosmetics: ['dice_skin_gold', 'table_theme_royal']
    },
    icon: '/achievements/perfect_combo.png',
    rarity_color: '#F59E0B',
    isActive: true,
    isHidden: true,
    releaseDate: new Date(),
    order: 5
  },
  {
    name: 'Getting Started',
    description: 'Play your first game',
    category: 'gameplay',
    type: 'milestone',
    difficulty: 'common',
    requirements: {
      metric: 'games_played',
      operator: 'greater_than_equal',
      value: 1
    },
    rewards: {
      points: 50,
      currency: 25
    },
    icon: '/achievements/getting_started.png',
    rarity_color: '#9CA3AF',
    isActive: true,
    isHidden: false,
    releaseDate: new Date(),
    order: 0
  },
  {
    name: 'Dice Roller',
    description: 'Roll 1000 dice total',
    category: 'gameplay',
    type: 'counter',
    difficulty: 'rare',
    requirements: {
      metric: 'total_dice_rolled',
      operator: 'greater_than_equal',
      value: 1000
    },
    rewards: {
      points: 750,
      currency: 200,
      badge: 'dice_roller_badge'
    },
    icon: '/achievements/dice_roller.png',
    rarity_color: '#3B82F6',
    isActive: true,
    isHidden: false,
    releaseDate: new Date(),
    order: 6
  },
  {
    name: 'Lucky Seven',
    description: 'Win 7 games',
    category: 'gameplay',
    type: 'counter',
    difficulty: 'common',
    requirements: {
      metric: 'games_won',
      operator: 'greater_than_equal',
      value: 7
    },
    rewards: {
      points: 350,
      currency: 75
    },
    icon: '/achievements/lucky_seven.png',
    rarity_color: '#9CA3AF',
    isActive: true,
    isHidden: false,
    releaseDate: new Date(),
    order: 7
  }
];

async function initializeAchievements() {
  try {
    console.log('Starting achievement initialization...');
    
    // Check if achievements already exist
    const existingQuery = query(collection(db, 'achievementDefinitions'));
    const existingSnapshot = await getDocs(existingQuery);
    
    if (existingSnapshot.size > 0) {
      console.log(`Found ${existingSnapshot.size} existing achievements. Skipping initialization.`);
      return;
    }

    // Add sample achievements
    const achievementsRef = collection(db, 'achievementDefinitions');
    
    for (const achievement of sampleAchievements) {
      try {
        const docRef = await addDoc(achievementsRef, achievement);
        console.log(`Added achievement: ${achievement.name} (ID: ${docRef.id})`);
      } catch (error) {
        console.error(`Error adding achievement ${achievement.name}:`, error);
      }
    }
    
    console.log('Achievement initialization complete!');
    console.log(`Total achievements added: ${sampleAchievements.length}`);
    
  } catch (error) {
    console.error('Error during achievement initialization:', error);
  }
}

// Run the initialization if this file is executed directly
if (typeof window === 'undefined') {
  initializeAchievements().then(() => {
    console.log('Achievement initialization script completed.');
    process.exit(0);
  }).catch((error) => {
    console.error('Achievement initialization failed:', error);
    process.exit(1);
  });
}

export default initializeAchievements;
