// Script to initialize sample achievements in Firestore
import { collection, addDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import AchievementDefinitionsService from '../services/achievementDefinitionsService';

export async function initializeSampleAchievements() {
  console.log('Initializing sample achievements...');
  
  try {
    // Check if achievements already exist
    const achievementsRef = collection(db, 'achievementDefinitions');
    const existingQuery = query(achievementsRef, where('isActive', '==', true));
    const existingSnapshot = await getDocs(existingQuery);
    
    if (existingSnapshot.size > 0) {
      console.log(`Found ${existingSnapshot.size} existing achievements. Skipping initialization.`);
      return;
    }

    // Get sample achievements
    const sampleAchievements = AchievementDefinitionsService.getSampleAchievements();
    
    // Add each achievement to Firestore
    const promises = sampleAchievements.map(achievement => 
      addDoc(achievementsRef, achievement)
    );
    
    await Promise.all(promises);
    
    console.log(`Successfully added ${sampleAchievements.length} sample achievements!`);
    
    // Log the achievements that were added
    sampleAchievements.forEach(achievement => {
      console.log(`- ${achievement.name} (${achievement.difficulty}): ${achievement.description}`);
    });
    
  } catch (error) {
    console.error('Error initializing sample achievements:', error);
    throw error;
  }
}

// Function to manually reset achievements (for development)
export async function resetAchievements() {
  console.log('Resetting achievements...');
  
  try {
    // Delete all existing achievements
    const achievementsRef = collection(db, 'achievementDefinitions');
    const snapshot = await getDocs(achievementsRef);
    
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log('Deleted all existing achievements');
    
    // Re-initialize with sample data
    await initializeSampleAchievements();
    
  } catch (error) {
    console.error('Error resetting achievements:', error);
    throw error;
  }
}

// Helper function to add a single custom achievement
export async function addCustomAchievement(achievement: any) {
  try {
    const achievementsRef = collection(db, 'achievementDefinitions');
    const docRef = await addDoc(achievementsRef, achievement);
    console.log(`Added custom achievement with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('Error adding custom achievement:', error);
    throw error;
  }
}

// Additional sample achievements for different categories
export const additionalAchievements = [
  // More gameplay achievements
  {
    name: 'Lucky Number Seven',
    description: 'Win 7 games in a row',
    category: 'gameplay',
    type: 'streak',
    difficulty: 'rare',
    requirements: {
      metric: 'win_streak',
      operator: 'streak',
      value: 7
    },
    rewards: {
      points: 750,
      currency: 200,
      badge: 'lucky_seven'
    },
    icon: '/achievements/lucky_seven.png',
    rarity_color: '#3B82F6',
    isActive: true,
    isHidden: false,
    releaseDate: new Date()
  },
  
  // Social achievements
  {
    name: 'Party Starter',
    description: 'Play 50 games with friends',
    category: 'social',
    type: 'counter',
    difficulty: 'epic',
    requirements: {
      metric: 'games_with_friends',
      operator: 'greater_than_equal',
      value: 50
    },
    rewards: {
      points: 1500,
      title: 'Party Starter',
      specialPrivileges: ['friend_invite_bonus']
    },
    icon: '/achievements/party_starter.png',
    rarity_color: '#8B5CF6',
    isActive: true,
    isHidden: false,
    releaseDate: new Date()
  },
  
  // Progression achievements
  {
    name: 'High Roller',
    description: 'Reach level 25',
    category: 'progression',
    type: 'milestone',
    difficulty: 'epic',
    requirements: {
      metric: 'level',
      operator: 'greater_than_equal',
      value: 25
    },
    rewards: {
      points: 2500,
      title: 'High Roller',
      cosmetics: ['premium_dice_set', 'royal_table_theme']
    },
    icon: '/achievements/high_roller.png',
    rarity_color: '#8B5CF6',
    isActive: true,
    isHidden: false,
    releaseDate: new Date()
  },
  
  // Special achievements
  {
    name: 'Perfect Week',
    description: 'Play every day for a week',
    category: 'special',
    type: 'streak',
    difficulty: 'rare',
    requirements: {
      metric: 'consecutive_days_played',
      operator: 'streak',
      value: 7
    },
    rewards: {
      points: 1000,
      currency: 500,
      badge: 'consistency_badge'
    },
    icon: '/achievements/perfect_week.png',
    rarity_color: '#3B82F6',
    isActive: true,
    isHidden: false,
    releaseDate: new Date()
  },
  
  // Hidden/Secret achievements
  {
    name: 'The Chosen One',
    description: 'Roll exactly 111 total dice',
    category: 'special',
    type: 'milestone',
    difficulty: 'legendary',
    requirements: {
      metric: 'total_dice_rolled',
      operator: 'equal',
      value: 111
    },
    rewards: {
      points: 3000,
      title: 'The Chosen One',
      cosmetics: ['mystical_dice_glow', 'sacred_table']
    },
    icon: '/achievements/chosen_one.png',
    rarity_color: '#F59E0B',
    isActive: true,
    isHidden: true, // Secret achievement
    releaseDate: new Date()
  }
];

// Function to add additional achievements
export async function addAdditionalAchievements() {
  console.log('Adding additional achievements...');
  
  try {
    const achievementsRef = collection(db, 'achievementDefinitions');
    
    for (const achievement of additionalAchievements) {
      await addDoc(achievementsRef, achievement);
      console.log(`Added: ${achievement.name}`);
    }
    
    console.log(`Successfully added ${additionalAchievements.length} additional achievements!`);
    
  } catch (error) {
    console.error('Error adding additional achievements:', error);
    throw error;
  }
}
