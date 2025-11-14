/**
 * Quick script to update Score Saw auraCost from 2 to 4 in Firestore
 * Run with: node update-score-saw-aura.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateScoreSawAura() {
  try {
    console.log('🔍 Looking for Score Saw ability...');
    
    const abilitiesSnapshot = await db.collection('abilities')
      .where('id', '==', 'score_saw')
      .get();
    
    if (abilitiesSnapshot.empty) {
      console.log('❌ Score Saw not found in Firestore abilities collection');
      console.log('📝 Creating Score Saw with correct auraCost: 4');
      
      await db.collection('abilities').add({
        id: 'score_saw',
        name: 'Score Saw',
        description: 'Score Sabotage: Slice your opponent\'s turn score in half when they bank - you steal 50%, they keep 50%.',
        longDescription: 'Score Saw places a curse on your opponent. When they try to bank their turn score, the curse triggers: their score is split in half. They keep 50%, and you steal the other 50% for yourself. Perfect timing can swing the game in your favor.',
        category: 'attack',
        rarity: 'epic',
        starCost: 4,
        auraCost: 4, // FIXED: Changed from 2 to 4
        cooldown: 0,
        timing: 'opponent_turn',
        iconUrl: '/Abilities/Catagories/Attack/Score Saw.webp',
        hidden: false,
        unlockLevel: 1,
        maxUses: -1,
        isActive: true,
        effects: [
          {
            type: 'modify_score',
            value: 'split_turn_score_50_50',
            target: 'opponent',
            condition: 'on_bank'
          }
        ]
      });
      
      console.log('✅ Score Saw created with auraCost: 4');
    } else {
      console.log(`✅ Found Score Saw ability (${abilitiesSnapshot.size} document(s))`);
      
      for (const doc of abilitiesSnapshot.docs) {
        const currentData = doc.data();
        console.log(`📊 Current auraCost: ${currentData.auraCost}`);
        
        if (currentData.auraCost !== 4) {
          await doc.ref.update({
            auraCost: 4
          });
          console.log(`✅ Updated ${doc.id} auraCost from ${currentData.auraCost} to 4`);
        } else {
          console.log(`✅ ${doc.id} already has auraCost: 4 (no update needed)`);
        }
      }
    }
    
    console.log('✅ Score Saw auraCost update complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating Score Saw:', error);
    process.exit(1);
  }
}

updateScoreSawAura();
