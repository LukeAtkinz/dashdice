/**
 * Pan Slap Firebase Seeding Utility
 * 
 * Use this in browser console to seed Pan Slap to Firebase
 */

// Make the refresh function available globally
window.refreshAbilities = async () => {
  console.log('🍳 Seeding Pan Slap and other abilities to Firebase...');
  
  try {
    // This will be available when the page loads the AbilitiesService
    if (typeof window.AbilitiesService !== 'undefined') {
      await window.AbilitiesService.refreshAllAbilities();
      console.log('✅ Pan Slap successfully seeded to Firebase!');
    } else {
      console.log('⚠️ AbilitiesService not available. Trying alternative approach...');
      
      // Alternative: Direct Firebase seeding
      if (typeof window.firebase !== 'undefined' && window.firebase.firestore) {
        const db = window.firebase.firestore();
        
        // Pan Slap ability data
        const panSlapAbility = {
          id: 'pan_slap',
          name: 'Pan Slap',
          description: 'Turn Control / Instant Stop: Deliver a swift and decisive intervention — instantly ending your opponent\'s turn.',
          longDescription: 'Pan Slap delivers a swift and decisive intervention — instantly ending your opponent\'s turn and auto-banking their current turn score. With the iconic frying pan in hand, the player asserts control over the flow of the match, stopping momentum, thwarting combos, and creating space to strike back.',
          rarity: 'epic',
          starCost: 5,
          category: 'defense',
          cooldown: 2,
          maxUses: -1,
          auraCost: 6,
          hidden: false,
          unlockLevel: 1,
          timing: 'opponent_turn',
          iconUrl: '/abilities/defense/hand_holding_pan.png',
          effects: [
            {
              type: 'skip_turn',
              value: 100,
              target: 'opponent',
              condition: 'instant_with_banking'
            },
            {
              type: 'freeze_opponent',
              value: 100,
              target: 'opponent', 
              condition: 'full_disruption'
            }
          ],
          isActive: true
        };
        
        // Seed to Firebase
        await db.collection('abilities').doc('pan_slap').set(panSlapAbility);
        console.log('✅ Pan Slap manually seeded to Firebase!');
        
        // Also update Luck Turner if needed
        const luckTurnerAbility = {
          id: 'luck_turner',
          name: 'Luck Turner',
          description: 'Manipulate dice probability to reduce failure chance or increase doubles.',
          longDescription: 'Luck Turner lets you take control of chance itself, mechanically adjusting the odds of your dice rolls for a full turn. Spend 3 AURA to reduce bust chance by 50%, or 6 AURA to also increase double chance by 50%.',
          rarity: 'epic',
          starCost: 4,
          category: 'tactical',
          cooldown: 2,
          maxUses: -1,
          auraCost: 3,
          hidden: false,
          unlockLevel: 1,
          timing: 'own_turn',
          iconUrl: '/abilities/tactical/hand_holding_screwdriver.png',
          effects: [
            {
              type: 'modify_dice_probability',
              value: 50,
              target: 'self',
              condition: 'reduce_ones'
            }
          ],
          isActive: true
        };
        
        await db.collection('abilities').doc('luck_turner').set(luckTurnerAbility);
        console.log('✅ Luck Turner updated in Firebase!');
        
      } else {
        console.error('❌ Firebase not available. Make sure you\'re on the DashDice app.');
      }
    }
    
    console.log('\n🎉 Ability seeding complete!');
    console.log('💡 Now try:');
    console.log('1. Go to PowerTab/Vault');
    console.log('2. Check if Pan Slap appears in Defense category');
    console.log('3. Equip Pan Slap in your loadout');
    console.log('4. Start a match to test it!');
    
  } catch (error) {
    console.error('❌ Error seeding abilities:', error);
    console.log('💡 Try refreshing the page and running again');
  }
};

// Manual Firebase seeding for Pan Slap
window.seedPanSlapManually = async () => {
  console.log('🍳 Manually seeding Pan Slap...');
  
  if (!window.firebase || !window.firebase.firestore) {
    console.error('❌ Firebase not available');
    return;
  }
  
  const db = window.firebase.firestore();
  
  const panSlap = {
    id: 'pan_slap',
    name: 'Pan Slap',
    description: 'Turn Control / Instant Stop: Deliver a swift and decisive intervention — instantly ending your opponent\'s turn.',
    rarity: 'epic',
    starCost: 5,
    category: 'defense',
    cooldown: 2,
    auraCost: 6,
    timing: 'opponent_turn',
    iconUrl: '/abilities/defense/hand_holding_pan.png',
    isActive: true
  };
  
  try {
    await db.collection('abilities').doc('pan_slap').set(panSlap);
    console.log('✅ Pan Slap manually added to Firebase!');
  } catch (error) {
    console.error('❌ Manual seeding failed:', error);
  }
};

// Auto-run when script loads
console.log('🛠️ Pan Slap seeding utility loaded!');
console.log('📝 Available commands:');
console.log('- window.refreshAbilities() - Full ability refresh');
console.log('- window.seedPanSlapManually() - Manual Pan Slap seeding');
console.log('');
console.log('🚀 Auto-running ability refresh...');

// Auto-run refresh
window.refreshAbilities();