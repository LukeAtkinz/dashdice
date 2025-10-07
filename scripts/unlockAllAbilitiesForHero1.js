/**
 * Script to unlock all abilities for user "Hero1"
 * Run this script to give Hero1 access to all abilities for testing
 */

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp 
} = require('firebase/firestore');

// Firebase config (same as your app)
const firebaseConfig = {
  apiKey: "AIzaSyB-vkL7PSqCOrKS7nTOtBEfUvX-CdhNZ6I",
  authDomain: "dashdice-d1b86.firebaseapp.com",
  projectId: "dashdice-d1b86",
  storageBucket: "dashdice-d1b86.appspot.com",
  messagingSenderId: "816081934821",
  appId: "1:816081934821:web:a81f03c18b89fc3038770c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// All ability IDs from the predefined abilities
const ALL_ABILITY_IDS = [
  // Common Abilities
  'lucky_reroll',
  'focus_shot',
  'shield_wall',
  'vision_surge',
  'double_trouble',
  'aura_boost',
  'quick_hands',
  'steady_aim',
  
  // Rare Abilities
  'time_warp',
  'score_shield',
  'combo_chain',
  'aura_drain',
  'mirror_shield',
  'precision_strike',
  'momentum_shift',
  'dice_mastery',
  
  // Epic Abilities
  'grand_slam',
  'phoenix_rise',
  'ability_theft',
  'temporal_echo',
  'dice_storm',
  'aura_nova',
  'reality_shift',
  'perfect_balance',
  
  // Legendary Abilities
  'grand_theft',
  'time_master',
  'dice_god',
  'aura_singularity'
];

async function findUserByUsername(username) {
  try {
    console.log(`🔍 Searching for user with username: ${username}`);
    
    const usersQuery = query(
      collection(db, 'users'),
      where('username', '==', username)
    );
    
    const snapshot = await getDocs(usersQuery);
    
    if (snapshot.empty) {
      console.log(`❌ No user found with username: ${username}`);
      return null;
    }
    
    const userDoc = snapshot.docs[0];
    const userData = { id: userDoc.id, ...userDoc.data() };
    
    console.log(`✅ Found user: ${userData.id} (${userData.username})`);
    return userData;
    
  } catch (error) {
    console.error('Error finding user:', error);
    return null;
  }
}

async function unlockAbilityForUser(userId, abilityId) {
  try {
    // Check if already unlocked
    const userAbilitiesQuery = query(
      collection(db, 'userAbilities'),
      where('userId', '==', userId),
      where('abilityId', '==', abilityId)
    );
    
    const existing = await getDocs(userAbilitiesQuery);
    
    if (!existing.empty) {
      console.log(`⚡ ${abilityId} already unlocked`);
      return true;
    }
    
    // Unlock the ability
    await addDoc(collection(db, 'userAbilities'), {
      userId,
      abilityId,
      unlockedAt: serverTimestamp(),
      timesUsed: 0,
      successRate: 100,
      isEquipped: false
    });
    
    console.log(`🎯 Unlocked: ${abilityId}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error unlocking ${abilityId}:`, error);
    return false;
  }
}

async function updateUserProgression(userId) {
  try {
    const progressionRef = doc(db, 'userProgression', userId);
    const progressionDoc = await getDoc(progressionRef);
    
    const progressionData = {
      userId,
      level: 50, // Max level to unlock everything
      xp: 100000,
      xpToNextLevel: 0,
      totalWins: 100,
      totalMatches: 120,
      winStreak: 10,
      maxStarPoints: 25, // Generous star points
      unlockedAbilities: ALL_ABILITY_IDS,
      stats: {
        abilitiesUsed: 500,
        mostUsedAbility: 'lucky_reroll',
        favoriteCategory: 'utility',
        averageMatchXP: 850
      },
      milestones: ['first_ability', 'level_10', 'level_25', 'all_abilities']
    };
    
    if (progressionDoc.exists()) {
      await updateDoc(progressionRef, progressionData);
      console.log(`📈 Updated progression for user ${userId}`);
    } else {
      await setDoc(progressionRef, progressionData);
      console.log(`📈 Created progression for user ${userId}`);
    }
    
  } catch (error) {
    console.error('Error updating progression:', error);
  }
}

async function createDefaultLoadout(userId) {
  try {
    // Create a powerful default loadout
    const loadoutData = {
      userId,
      name: 'Hero1 Ultimate Loadout',
      abilities: {
        tactical: 'lucky_reroll',
        attack: 'grand_slam',
        defense: 'shield_wall',
        utility: 'time_warp',
        gamechanger: 'grand_theft'
      },
      totalStarCost: 20,
      maxStarPoints: 25,
      isActive: true,
      createdAt: serverTimestamp(),
      lastUsed: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'userLoadouts'), loadoutData);
    console.log(`⚔️ Created ultimate loadout: ${docRef.id}`);
    
  } catch (error) {
    console.error('Error creating loadout:', error);
  }
}

async function unlockAllAbilitiesForHero1() {
  console.log('🎮 UNLOCKING ALL ABILITIES FOR HERO1 🎮');
  console.log('==========================================');
  
  try {
    // 1. Find Hero1 user
    const user = await findUserByUsername('Hero1');
    
    if (!user) {
      console.log('❌ Hero1 user not found. Make sure the user exists in the database.');
      return;
    }
    
    const userId = user.id;
    
    // 2. Unlock all abilities
    console.log(`\n🚀 Unlocking ${ALL_ABILITY_IDS.length} abilities...`);
    
    let successCount = 0;
    for (const abilityId of ALL_ABILITY_IDS) {
      const success = await unlockAbilityForUser(userId, abilityId);
      if (success) successCount++;
    }
    
    console.log(`\n✅ Successfully unlocked ${successCount}/${ALL_ABILITY_IDS.length} abilities`);
    
    // 3. Update progression to max level
    console.log('\n📈 Updating user progression...');
    await updateUserProgression(userId);
    
    // 4. Create ultimate loadout
    console.log('\n⚔️ Creating ultimate loadout...');
    await createDefaultLoadout(userId);
    
    console.log('\n🎉 ALL DONE! Hero1 now has access to all abilities!');
    console.log('🎯 Hero1 is now level 50 with 25 star points');
    console.log('⚡ All abilities unlocked and ready to use');
    console.log('⚔️ Ultimate loadout created and equipped');
    
  } catch (error) {
    console.error('❌ Error in main function:', error);
  }
}

// Run the script
unlockAllAbilitiesForHero1().then(() => {
  console.log('\n🔚 Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});