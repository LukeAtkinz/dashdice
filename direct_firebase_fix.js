/**
 * DIRECT FIREBASE FIX - COPY PASTE INTO BROWSER CONSOLE
 * This bypasses all service layers and directly fixes Firebase
 */

// Get current user ID from various possible sources
const getCurrentUserId = () => {
  // Try React context (most reliable)
  const reactFiberKey = Object.keys(document.querySelector('#__next')).find(key => key.startsWith('__reactFiber'));
  if (reactFiberKey) {
    const fiber = document.querySelector('#__next')[reactFiberKey];
    // Navigate React fiber to find user context
    let current = fiber;
    let attempts = 0;
    while (current && attempts < 100) {
      if (current.memoizedState?.user?.uid) {
        return current.memoizedState.user.uid;
      }
      if (current.child?.memoizedState?.user?.uid) {
        return current.child.memoizedState.user.uid;
      }
      current = current.child || current.sibling || current.return;
      attempts++;
    }
  }
  
  // Try from console logs
  const logs = window.console.history || [];
  for (const log of logs.reverse()) {
    const match = log.toString().match(/user[:\s]+['"]*([a-zA-Z0-9]{20,})['"]/i);
    if (match) return match[1];
  }
  
  // Try from localStorage
  const stored = localStorage.getItem('currentUserId') || localStorage.getItem('userId');
  if (stored) return stored;
  
  return null;
};

// Main fix function
async function directFirebaseFix() {
  console.log('🔧 DIRECT FIREBASE FIX STARTING...');
  
  try {
    // Get Firebase instance
    const firebase = window.firebase;
    if (!firebase) {
      console.error('❌ Firebase not available');
      return;
    }
    
    const db = firebase.firestore();
    const userId = getCurrentUserId();
    
    if (!userId) {
      console.error('❌ Could not find user ID. Are you logged in?');
      console.log('💡 Try: Check if you see your avatar in the top right');
      return;
    }
    
    console.log('👤 User ID found:', userId.substring(0, 8) + '...');
    
    // Step 1: Update abilities in Firebase with correct data
    console.log('🔄 Step 1: Updating abilities in Firebase...');
    
    const abilities = [
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
        iconUrl: '/Abilities/Base Images/hand holding screwdriver.png',
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
        iconUrl: '/Abilities/Base Images/hand holding pan.png',
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
    
    // Update each ability
    for (const ability of abilities) {
      await db.collection('abilities').doc(ability.id).set(ability, { merge: true });
      console.log(`✅ Updated ${ability.name} with correct icon: ${ability.iconUrl}`);
    }
    
    // Step 2: Unlock abilities for user
    console.log('🔓 Step 2: Unlocking abilities for user...');
    
    for (const ability of abilities) {
      // Check if already unlocked
      const existing = await db.collection('userAbilities')
        .where('userId', '==', userId)
        .where('abilityId', '==', ability.id)
        .get();
      
      if (existing.empty) {
        // Add user ability
        await db.collection('userAbilities').add({
          userId: userId,
          abilityId: ability.id,
          unlockedAt: firebase.firestore.FieldValue.serverTimestamp(),
          timesUsed: 0,
          successRate: 0,
          isEquipped: false
        });
        console.log(`✅ Unlocked ${ability.name} for user`);
      } else {
        console.log(`✅ ${ability.name} already unlocked`);
      }
    }
    
    console.log('🎉 DIRECT FIX COMPLETED!');
    console.log('🔄 Please refresh the page completely to see changes');
    console.log('💡 Both abilities should now appear in their categories');
    console.log('💡 Icons should load correctly');
    console.log('💡 No more "Ability not unlocked" errors');
    
    return { success: true, userId, abilitiesUpdated: abilities.length };
    
  } catch (error) {
    console.error('❌ Direct fix failed:', error);
    console.log('💡 Try: window.directFirebaseFix() again in a few seconds');
    return { success: false, error: error.message };
  }
}

// Make available globally and run immediately
window.directFirebaseFix = directFirebaseFix;
console.log('🛠️ Direct fix available: window.directFirebaseFix()');

// Auto-run the fix
directFirebaseFix();