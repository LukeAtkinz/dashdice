/**
 * Firebase Abilities Sync Script
 * 
 * Run this script to:
 * 1. Upload all ability definitions to Firebase
 * 2. Grant all abilities to all existing users
 * 3. Verify icon paths
 * 
 * Usage: npx ts-node sync-abilities-to-firebase.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ALL_ABILITIES } from './src/constants/abilities';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin (you'll need your service account key)
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function syncAbilitiesToFirebase() {
  console.log('🔄 Starting Firebase abilities sync...\n');
  
  // Step 1: Upload ability definitions to Firebase
  console.log('📤 Step 1: Uploading ability definitions...');
  const abilitiesCollection = db.collection('abilities');
  
  for (const ability of ALL_ABILITIES) {
    try {
      await abilitiesCollection.doc(ability.id).set({
        ...ability,
        syncedAt: new Date(),
        version: ability.version || 1
      }, { merge: true });
      
      console.log(`✅ Synced: ${ability.name} (${ability.id})`);
    } catch (error) {
      console.error(`❌ Failed to sync ${ability.id}:`, error);
    }
  }
  
  console.log(`\n✅ Uploaded ${ALL_ABILITIES.length} abilities to Firebase\n`);
  
  // Step 2: Grant abilities to all users
  console.log('👥 Step 2: Granting abilities to all users...');
  const usersSnapshot = await db.collection('users').get();
  
  const abilityIds = ALL_ABILITIES.map(a => a.id);
  let userCount = 0;
  
  for (const userDoc of usersSnapshot.docs) {
    try {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // Check if user already has ownedAbilities
      const existingAbilities = userData.ownedAbilities || [];
      
      // Add all new abilities that user doesn't have
      const newAbilities = abilityIds.filter(id => !existingAbilities.includes(id));
      
      if (newAbilities.length > 0) {
        await db.collection('users').doc(userId).update({
          ownedAbilities: [...existingAbilities, ...newAbilities],
          abilitiesUpdatedAt: new Date()
        });
        
        console.log(`✅ Granted ${newAbilities.length} abilities to user: ${userData.displayName || userId}`);
        userCount++;
      } else {
        console.log(`ℹ️  User ${userData.displayName || userId} already has all abilities`);
      }
    } catch (error) {
      console.error(`❌ Failed to update user ${userDoc.id}:`, error);
    }
  }
  
  console.log(`\n✅ Updated ${userCount} users with new abilities\n`);
  
  // Step 3: Verify icon paths
  console.log('🖼️  Step 3: Verifying icon paths...');
  const publicDir = path.join(__dirname, 'public');
  const abilitiesDir = path.join(publicDir, 'Abilities', 'Catagories');
  
  for (const ability of ALL_ABILITIES) {
    const iconPath = ability.iconUrl.replace(/^\//, ''); // Remove leading slash
    const fullPath = path.join(publicDir, iconPath);
    
    if (fs.existsSync(fullPath)) {
      console.log(`✅ Icon exists: ${ability.name}`);
    } else {
      console.warn(`⚠️  Icon missing: ${ability.name}`);
      console.warn(`   Expected: ${fullPath}`);
      console.warn(`   Create placeholder or update iconUrl in abilities.ts`);
    }
  }
  
  console.log('\n🎉 Sync complete!\n');
  
  // Print summary
  console.log('📊 Summary:');
  console.log(`   - Abilities synced: ${ALL_ABILITIES.length}`);
  console.log(`   - Users updated: ${userCount}`);
  console.log(`   - Total users: ${usersSnapshot.size}`);
  console.log('\n✨ All abilities are now available to all players!');
}

// Run the sync
syncAbilitiesToFirebase()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
