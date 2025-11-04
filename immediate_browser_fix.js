/**
 * IMMEDIATE BROWSER CONSOLE FIX
 * Copy and paste this entire script into your browser console on DashDice
 */

// Step 1: Import what we need from the global window object
const { collection, doc, setDoc, addDoc, getDocs, query, where, serverTimestamp } = window.firebase?.firestore || {};
const { db } = window.firebaseConfig || {};

console.log('🔧 IMMEDIATE ABILITIES FIX STARTING...');

// Step 2: Define the correct ability data with proper icon paths
const correctAbilities = [
  {
    id: 'luck_turner',
    name: 'Luck Turner',
    description: 'Risk–Reward Probability Manipulation: Take control of chance itself.',
    longDescription: 'Luck Turner lets players take control of chance itself, mechanically adjusting the odds of their dice rolls for a full turn.',
    rarity: 'epic',
    starCost: 4,
    category: 'tactical',
    cooldown: 2,
    maxUses: -1,
    auraCost: 3,
    hidden: false,
    unlockLevel: 1,
    timing: 'own_turn',
    iconUrl: '/Abilities/Base Images/hand holding screwdriver.png', // CORRECT PATH
    isActive: true,
    effects: [
      {
        type: 'dice_reroll',
        value: 50,
        duration: 1,
        condition: 'on_roll',
        target: 'self'
      }
    ]
  },
  {
    id: 'pan_slap',
    name: 'Pan Slap',
    description: 'Turn Control / Instant Stop: Deliver a swift and decisive intervention — instantly ending your opponent\'s turn.',
    longDescription: 'Pan Slap delivers a swift and decisive intervention — instantly ending your opponent\'s turn and auto-banking their current turn score.',
    rarity: 'epic',
    starCost: 5,
    category: 'defense',
    cooldown: 2,
    maxUses: -1,
    auraCost: 6,
    hidden: false,
    unlockLevel: 1,
    timing: 'opponent_turn',
    iconUrl: '/Abilities/Base Images/hand holding pan.png', // CORRECT PATH
    isActive: true,
    effects: [
      {
        type: 'steal_turn',
        value: 1,
        duration: 0,
        condition: 'instant',
        target: 'opponent'
      }
    ]
  }
];

// Step 3: Get current user ID
const getCurrentUserId = () => {
  // Try multiple ways to get user ID
  if (window.firebase?.auth?.currentUser?.uid) return window.firebase.auth.currentUser.uid;
  if (window.firebaseAuth?.currentUser?.uid) return window.firebaseAuth.currentUser.uid;
  if (localStorage.getItem('userId')) return localStorage.getItem('userId');
  
  // Look for it in the console logs
  const userIdMatch = document.body.innerHTML.match(/userId['":\s]*['"]([a-zA-Z0-9]+)['"]/);
  if (userIdMatch) return userIdMatch[1];
  
  return null;
};

// Step 4: Main fix function
async function immediateAbilitiesFix() {
  try {
    const userId = getCurrentUserId();
    console.log('👤 Current user ID:', userId ? userId.substring(0, 8) + '...' : 'NOT FOUND');
    
    if (!userId) {
      console.error('❌ Cannot find user ID. Make sure you\'re logged in.');
      return;
    }

    console.log('🔄 Step 1: Updating Firebase abilities with correct icon paths...');
    
    // Update abilities in Firebase
    for (const ability of correctAbilities) {
      try {
        await setDoc(doc(db, 'abilities', ability.id), ability);
        console.log(`✅ Updated ${ability.name} with correct icon path: ${ability.iconUrl}`);
      } catch (error) {
        console.error(`❌ Failed to update ${ability.name}:`, error);
      }
    }
    
    console.log('🔓 Step 2: Unlocking Pan Slap for current user...');
    
    // Check if user already has Pan Slap
    const userAbilitiesQuery = query(
      collection(db, 'userAbilities'),
      where('userId', '==', userId),
      where('abilityId', '==', 'pan_slap')
    );
    
    const existingPanSlap = await getDocs(userAbilitiesQuery);
    
    if (existingPanSlap.empty) {
      // Add Pan Slap to user abilities
      await addDoc(collection(db, 'userAbilities'), {
        userId: userId,
        abilityId: 'pan_slap',
        unlockedAt: serverTimestamp(),
        timesUsed: 0,
        successRate: 0,
        isEquipped: false
      });
      console.log('✅ Pan Slap unlocked for user!');
    } else {
      console.log('✅ User already has Pan Slap unlocked');
    }
    
    console.log('🎉 IMMEDIATE FIX COMPLETED!');
    console.log('🔄 Please refresh the page to see the changes');
    console.log('💡 Pan Slap should now appear in Defense category with proper icon');
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Immediate fix failed:', error);
    return { success: false, error };
  }
}

// Step 5: Execute the fix
immediateAbilitiesFix();

// Make it available for re-running
window.immediateAbilitiesFix = immediateAbilitiesFix;

console.log('🛠️ Fix completed! If you need to run again: window.immediateAbilitiesFix()');