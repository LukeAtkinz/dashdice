/**
 * Direct Firebase REST API Approach
 * Add abilities directly to Firestore using REST API
 */

const abilities = [
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
  }
];

async function addAbilitiesToFirebase() {
  const projectId = 'dashdice-d1b86';
  
  console.log('🚀 Adding abilities directly to Firebase...');
  
  for (const ability of abilities) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/abilities/${ability.id}`;
      
      // Convert ability to Firestore format
      const firestoreDoc = {
        fields: {}
      };
      
      // Convert each field to Firestore format
      Object.entries(ability).forEach(([key, value]) => {
        if (typeof value === 'string') {
          firestoreDoc.fields[key] = { stringValue: value };
        } else if (typeof value === 'number') {
          firestoreDoc.fields[key] = { integerValue: value.toString() };
        } else if (typeof value === 'boolean') {
          firestoreDoc.fields[key] = { booleanValue: value };
        } else if (Array.isArray(value)) {
          firestoreDoc.fields[key] = {
            arrayValue: {
              values: value.map(item => ({
                mapValue: {
                  fields: Object.entries(item).reduce((acc, [k, v]) => {
                    if (typeof v === 'string') {
                      acc[k] = { stringValue: v };
                    } else if (typeof v === 'number') {
                      acc[k] = { integerValue: v.toString() };
                    }
                    return acc;
                  }, {})
                }
              }))
            }
          };
        }
      });
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(firestoreDoc)
      });
      
      if (response.ok) {
        console.log(`✅ Added: ${ability.name} (${ability.rarity})`);
      } else {
        const error = await response.text();
        console.log(`❌ Failed to add ${ability.name}: ${error}`);
      }
      
    } catch (error) {
      console.error(`❌ Error adding ${ability.name}:`, error.message);
    }
  }
  
  console.log('\n🎉 Ability addition attempt complete!');
}

addAbilitiesToFirebase();