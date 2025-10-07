/**
 * Initialize Abilities Database
 * Populates Firebase with all predefined abilities from the codebase
 * Uses Firebase Admin SDK with environment variables
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.production' });

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const firebaseAdminConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    admin.initializeApp({
      credential: admin.credential.cert(firebaseAdminConfig),
      projectId: firebaseAdminConfig.projectId,
    });
    console.log('🔧 Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
    console.log('⚠️  Make sure .env.production has FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
    process.exit(1);
  }
}

const db = admin.firestore();

// All predefined abilities (copied from predefinedAbilities.ts)
const ALL_PREDEFINED_ABILITIES = [
  // COMMON ABILITIES
  {
    id: 'lucky_reroll',
    name: 'Lucky Reroll',
    description: 'Reroll one die of your choice',
    longDescription: 'Select any die from your roll and reroll it once. Perfect for turning a bust into a scoring roll.',
    rarity: 'common',
    starCost: 1,
    category: 'utility',
    cooldown: 0,
    maxUses: 3,
    auraCost: 4,
    hidden: true,
    unlockLevel: 1,
    effects: [{ type: 'dice_reroll', value: 1, target: 'self' }],
    isActive: true
  },
  {
    id: 'focus_shot',
    name: 'Focus Shot',
    description: 'Next roll adds +1 to all dice',
    longDescription: 'Your next dice roll will have +1 added to each die result. Can turn average rolls into great ones.',
    rarity: 'common',
    starCost: 2,
    category: 'utility',
    cooldown: 30,
    maxUses: 2,
    auraCost: 6,
    hidden: true,
    unlockLevel: 2,
    effects: [{ type: 'bonus_roll', value: 1, duration: 1, target: 'self' }],
    isActive: true
  },
  {
    id: 'shield_wall',
    name: 'Shield Wall',
    description: 'Prevent opponent\'s next ability',
    longDescription: 'Create a protective barrier that blocks the next ability your opponent tries to use against you.',
    rarity: 'common',
    starCost: 2,
    category: 'defense',
    cooldown: 45,
    maxUses: 2,
    auraCost: 6,
    hidden: true,
    unlockLevel: 3,
    effects: [{ type: 'ability_block', duration: 1, target: 'self' }],
    isActive: true
  },
  {
    id: 'vision_surge',
    name: 'Vision Surge',
    description: 'See opponent\'s next roll prediction',
    longDescription: 'Gain insight into your opponent\'s likely next roll, giving you strategic advantage.',
    rarity: 'common',
    starCost: 1,
    category: 'tactical',
    cooldown: 60,
    maxUses: 3,
    auraCost: 4,
    hidden: true,
    unlockLevel: 4,
    effects: [{ type: 'opponent_preview', duration: 1, target: 'opponent' }],
    isActive: true
  },
  {
    id: 'double_trouble',
    name: 'Double Trouble',
    description: 'Roll twice, keep better result',
    longDescription: 'Roll your dice twice in succession and choose which result to keep. Great for second chances.',
    rarity: 'common',
    starCost: 2,
    category: 'utility',
    cooldown: 45,
    maxUses: 2,
    auraCost: 8,
    hidden: true,
    unlockLevel: 5,
    effects: [{ type: 'double_roll', value: 1, target: 'self' }],
    isActive: true
  },
  {
    id: 'aura_boost',
    name: 'Aura Boost',
    description: 'Gain +3 aura immediately',
    longDescription: 'Instantly gain 3 aura points to fuel more abilities this turn or save for later.',
    rarity: 'common',
    starCost: 1,
    category: 'utility',
    cooldown: 30,
    maxUses: 4,
    auraCost: 5,
    hidden: true,
    unlockLevel: 6,
    effects: [{ type: 'aura_gain', value: 3, target: 'self' }],
    isActive: true
  },
  {
    id: 'quick_hands',
    name: 'Quick Hands',
    description: 'Reduce all cooldowns by 15 seconds',
    longDescription: 'Speed up your recovery time, making all your abilities available again faster.',
    rarity: 'common',
    starCost: 2,
    category: 'utility',
    cooldown: 90,
    maxUses: 1,
    auraCost: 7,
    hidden: true,
    unlockLevel: 7,
    effects: [{ type: 'cooldown_reduction', value: 15, target: 'self' }],
    isActive: true
  },
  {
    id: 'steady_aim',
    name: 'Steady Aim',
    description: 'Next 3 rolls can\'t roll 1s',
    longDescription: 'Guarantee your next three rolls won\'t bust by preventing any dice from showing 1.',
    rarity: 'common',
    starCost: 2,
    category: 'defense',
    cooldown: 60,
    maxUses: 1,
    auraCost: 8,
    hidden: true,
    unlockLevel: 8,
    effects: [{ type: 'prevent_ones', duration: 3, target: 'self' }],
    isActive: true
  },

  // RARE ABILITIES
  {
    id: 'time_warp',
    name: 'Time Warp',
    description: 'Take an extra turn immediately',
    longDescription: 'Bend time to your will and take another turn right now. The ultimate momentum shifter.',
    rarity: 'rare',
    starCost: 4,
    category: 'gamechanger',
    cooldown: 120,
    maxUses: 1,
    auraCost: 12,
    hidden: true,
    unlockLevel: 10,
    effects: [{ type: 'extra_turn', value: 1, target: 'self' }],
    isActive: true
  },
  {
    id: 'score_shield',
    name: 'Score Shield',
    description: 'Protect current score from reduction',
    longDescription: 'Create an impenetrable barrier around your score that prevents any score-reducing effects.',
    rarity: 'rare',
    starCost: 3,
    category: 'defense',
    cooldown: 90,
    maxUses: 2,
    auraCost: 10,
    hidden: true,
    unlockLevel: 12,
    effects: [{ type: 'score_protection', duration: 3, target: 'self' }],
    isActive: true
  },
  {
    id: 'combo_chain',
    name: 'Combo Chain',
    description: 'Each consecutive scoring roll adds +2 bonus',
    longDescription: 'Build momentum with each successful roll, gaining increasing bonuses for consecutive scores.',
    rarity: 'rare',
    starCost: 3,
    category: 'attack',
    cooldown: 75,
    maxUses: 1,
    auraCost: 9,
    hidden: true,
    unlockLevel: 14,
    effects: [{ type: 'score_multiplier', value: 2, duration: 5, target: 'self' }],
    isActive: true
  },
  {
    id: 'aura_drain',
    name: 'Aura Drain',
    description: 'Steal 4 aura from opponent',
    longDescription: 'Siphon aura energy from your opponent, weakening their ability usage while strengthening yours.',
    rarity: 'rare',
    starCost: 3,
    category: 'attack',
    cooldown: 60,
    maxUses: 2,
    auraCost: 8,
    hidden: true,
    unlockLevel: 16,
    effects: [
      { type: 'aura_steal', value: 4, target: 'opponent' },
      { type: 'aura_gain', value: 4, target: 'self' }
    ],
    isActive: true
  },
  {
    id: 'mirror_shield',
    name: 'Mirror Shield',
    description: 'Reflect next ability back to opponent',
    longDescription: 'Create a reflective barrier that bounces the next ability used against you back at your opponent.',
    rarity: 'rare',
    starCost: 4,
    category: 'defense',
    cooldown: 100,
    maxUses: 1,
    auraCost: 11,
    hidden: true,
    unlockLevel: 18,
    effects: [{ type: 'ability_reflect', duration: 1, target: 'self' }],
    isActive: true
  },
  {
    id: 'precision_strike',
    name: 'Precision Strike',
    description: 'Choose exact dice values for next roll',
    longDescription: 'Take complete control of your next roll by setting each die to exactly the value you want.',
    rarity: 'rare',
    starCost: 4,
    category: 'utility',
    cooldown: 120,
    maxUses: 1,
    auraCost: 14,
    hidden: true,
    unlockLevel: 20,
    effects: [{ type: 'set_dice_values', duration: 1, target: 'self' }],
    isActive: true
  },
  {
    id: 'momentum_shift',
    name: 'Momentum Shift',
    description: 'Swap scores with opponent',
    longDescription: 'Dramatically alter the game state by exchanging your current score with your opponent\'s.',
    rarity: 'rare',
    starCost: 5,
    category: 'gamechanger',
    cooldown: 150,
    maxUses: 1,
    auraCost: 15,
    hidden: true,
    unlockLevel: 22,
    effects: [{ type: 'score_swap', target: 'both' }],
    isActive: true
  },
  {
    id: 'dice_mastery',
    name: 'Dice Mastery',
    description: 'All dice show 4+ for next 3 rolls',
    longDescription: 'Achieve perfect dice control, ensuring every die shows at least 4 for your next three rolls.',
    rarity: 'rare',
    starCost: 4,
    category: 'utility',
    cooldown: 90,
    maxUses: 1,
    auraCost: 12,
    hidden: true,
    unlockLevel: 24,
    effects: [{ type: 'minimum_roll', value: 4, duration: 3, target: 'self' }],
    isActive: true
  },

  // EPIC ABILITIES
  {
    id: 'grand_slam',
    name: 'Grand Slam',
    description: 'Next scoring roll counts triple',
    longDescription: 'Channel immense power into your next scoring roll, making it count for three times its normal value.',
    rarity: 'epic',
    starCost: 6,
    category: 'attack',
    cooldown: 180,
    maxUses: 1,
    auraCost: 18,
    hidden: true,
    unlockLevel: 26,
    effects: [{ type: 'score_multiplier', value: 3, duration: 1, target: 'self' }],
    isActive: true
  },
  {
    id: 'phoenix_rise',
    name: 'Phoenix Rise',
    description: 'Reset score to 25 if below 10',
    longDescription: 'Rise from the ashes of defeat. If your score is critically low, restore it to a respectable 25 points.',
    rarity: 'epic',
    starCost: 5,
    category: 'defense',
    cooldown: 200,
    maxUses: 1,
    auraCost: 16,
    hidden: true,
    unlockLevel: 28,
    effects: [{ type: 'conditional_score_set', value: 25, condition: 'score_below_10', target: 'self' }],
    isActive: true
  },
  {
    id: 'ability_theft',
    name: 'Ability Theft',
    description: 'Copy and use opponent\'s last ability',
    longDescription: 'Master the art of mimicry by copying your opponent\'s most recently used ability and using it against them.',
    rarity: 'epic',
    starCost: 5,
    category: 'tactical',
    cooldown: 150,
    maxUses: 1,
    auraCost: 15,
    hidden: true,
    unlockLevel: 30,
    effects: [{ type: 'ability_copy', target: 'opponent' }],
    isActive: true
  },
  {
    id: 'temporal_echo',
    name: 'Temporal Echo',
    description: 'Repeat your last turn exactly',
    longDescription: 'Echo through time to repeat your previous turn\'s actions and results exactly as they happened.',
    rarity: 'epic',
    starCost: 6,
    category: 'gamechanger',
    cooldown: 180,
    maxUses: 1,
    auraCost: 17,
    hidden: true,
    unlockLevel: 32,
    effects: [{ type: 'turn_repeat', target: 'self' }],
    isActive: true
  },
  {
    id: 'dice_storm',
    name: 'Dice Storm',
    description: 'Roll 10 dice, keep best 6',
    longDescription: 'Unleash a tempest of dice, rolling ten and selecting the six best results for maximum potential.',
    rarity: 'epic',
    starCost: 6,
    category: 'utility',
    cooldown: 160,
    maxUses: 1,
    auraCost: 18,
    hidden: true,
    unlockLevel: 34,
    effects: [{ type: 'multi_roll', value: 10, keep: 6, target: 'self' }],
    isActive: true
  },
  {
    id: 'aura_nova',
    name: 'Aura Nova',
    description: 'Gain aura equal to current score',
    longDescription: 'Convert your success into raw power, gaining aura points equal to your current score.',
    rarity: 'epic',
    starCost: 5,
    category: 'utility',
    cooldown: 140,
    maxUses: 1,
    auraCost: 10,
    hidden: true,
    unlockLevel: 36,
    effects: [{ type: 'aura_from_score', target: 'self' }],
    isActive: true
  },
  {
    id: 'reality_shift',
    name: 'Reality Shift',
    description: 'Change opponent\'s last roll to all 1s',
    longDescription: 'Alter the fabric of reality itself, retroactively changing your opponent\'s last roll to complete failure.',
    rarity: 'epic',
    starCost: 7,
    category: 'attack',
    cooldown: 200,
    maxUses: 1,
    auraCost: 20,
    hidden: true,
    unlockLevel: 38,
    effects: [{ type: 'retroactive_roll_change', value: 1, target: 'opponent' }],
    isActive: true
  },
  {
    id: 'perfect_balance',
    name: 'Perfect Balance',
    description: 'Both players gain equal scores (average)',
    longDescription: 'Restore balance to the universe by setting both players\' scores to the average of their current totals.',
    rarity: 'epic',
    starCost: 6,
    category: 'gamechanger',
    cooldown: 180,
    maxUses: 1,
    auraCost: 16,
    hidden: true,
    unlockLevel: 40,
    effects: [{ type: 'score_average', target: 'both' }],
    isActive: true
  },

  // LEGENDARY ABILITIES
  {
    id: 'grand_theft',
    name: 'Grand Theft',
    description: 'Steal opponent\'s highest loadout ability',
    longDescription: 'Master thief of abilities! Permanently steal your opponent\'s most powerful loaded ability for this match.',
    rarity: 'legendary',
    starCost: 8,
    category: 'gamechanger',
    cooldown: 300,
    maxUses: 1,
    auraCost: 25,
    hidden: true,
    unlockLevel: 42,
    effects: [{ type: 'ability_steal_permanent', target: 'opponent' }],
    isActive: true
  },
  {
    id: 'time_master',
    name: 'Time Master',
    description: 'Reverse last 3 turns completely',
    longDescription: 'Achieve ultimate temporal control by rewinding the game state back three complete turns.',
    rarity: 'legendary',
    starCost: 9,
    category: 'gamechanger',
    cooldown: 400,
    maxUses: 1,
    auraCost: 30,
    hidden: true,
    unlockLevel: 45,
    effects: [{ type: 'time_rewind', value: 3, target: 'both' }],
    isActive: true
  },
  {
    id: 'dice_god',
    name: 'Dice God',
    description: 'Control all dice for rest of match',
    longDescription: 'Ascend to divine status with complete control over all dice results for the remainder of the match.',
    rarity: 'legendary',
    starCost: 10,
    category: 'utility',
    cooldown: 500,
    maxUses: 1,
    auraCost: 35,
    hidden: true,
    unlockLevel: 48,
    effects: [{ type: 'dice_control_permanent', target: 'self' }],
    isActive: true
  },
  {
    id: 'aura_singularity',
    name: 'Aura Singularity',
    description: 'Infinite aura for 5 turns',
    longDescription: 'Create a singularity of pure energy, granting unlimited aura for five turns to unleash devastating combinations.',
    rarity: 'legendary',
    starCost: 8,
    category: 'utility',
    cooldown: 600,
    maxUses: 1,
    auraCost: 20,
    hidden: true,
    unlockLevel: 50,
    effects: [{ type: 'infinite_aura', duration: 5, target: 'self' }],
    isActive: true
  }
];

async function initializeAbilities() {
  console.log('🚀 Starting abilities database initialization...');
  console.log(`📊 Total abilities to initialize: ${ALL_PREDEFINED_ABILITIES.length}`);
  
  try {
    // Check if abilities already exist
    const abilitiesRef = db.collection('abilities');
    const existingSnapshot = await abilitiesRef.where('isActive', '==', true).get();
    
    if (existingSnapshot.size > 0) {
      console.log(`⚠️  Found ${existingSnapshot.size} existing abilities. Proceeding to update/add missing ones...`);
    }
    
    let addedCount = 0;
    let updatedCount = 0;
    
    // Use batch operations for better performance
    const batch = db.batch();
    
    // Add each ability to Firestore
    for (const ability of ALL_PREDEFINED_ABILITIES) {
      try {
        const abilityDoc = abilitiesRef.doc(ability.id);
        
        // Check if this specific ability exists
        const existingDoc = await abilityDoc.get();
        
        if (!existingDoc.exists) {
          // Add new ability
          batch.set(abilityDoc, ability);
          addedCount++;
          console.log(`✅ Will add: ${ability.name} (${ability.rarity})`);
        } else {
          // Update existing ability
          batch.set(abilityDoc, ability, { merge: true });
          updatedCount++;
          console.log(`🔄 Will update: ${ability.name} (${ability.rarity})`);
        }
      } catch (error) {
        console.error(`❌ Error with ability ${ability.id}:`, error.message);
      }
    }
    
    // Commit all changes at once
    console.log('\n⚡ Committing batch operations...');
    await batch.commit();
    
    console.log('\n🎉 ABILITIES INITIALIZATION COMPLETE!');
    console.log(`➕ Added: ${addedCount} new abilities`);
    console.log(`🔄 Updated: ${updatedCount} existing abilities`);
    console.log(`📊 Total abilities processed: ${addedCount + updatedCount}`);
    
    // Verify the abilities are in the database
    const finalSnapshot = await abilitiesRef.get();
    console.log(`\n✅ Database verification: ${finalSnapshot.size} abilities found`);
    
    // Show breakdown by rarity
    const rarities = { common: 0, rare: 0, epic: 0, legendary: 0 };
    finalSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.rarity) {
        rarities[data.rarity]++;
      }
    });
    
    console.log('\n📈 Abilities by rarity:');
    console.log(`  🟢 Common: ${rarities.common}`);
    console.log(`  🔵 Rare: ${rarities.rare}`);
    console.log(`  🟣 Epic: ${rarities.epic}`);
    console.log(`  🟡 Legendary: ${rarities.legendary}`);
    
    console.log('\n🎯 Next step: Run the admin API to unlock abilities for Hero1');
    console.log('   POST https://dashdice-1dib-git-development-dash-dice.vercel.app/api/admin/unlock-abilities');
    console.log('   Body: { "username": "Hero1", "secret": "unlock-abilities-admin-2025" }');
    
  } catch (error) {
    console.error('❌ Error initializing abilities:', error);
    throw error;
  }
}

// Run the initialization
initializeAbilities()
  .then(() => {
    console.log('\n🎊 All done! Abilities are now ready in Firebase.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to initialize abilities:', error);
    process.exit(1);
  });