/**
 * API Route to initialize turn decider and victory backgrounds for all users
 * Call with: POST /api/admin/initialize-backgrounds
 * 
 * This is a server-side operation that updates all user documents
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/services/firebase-admin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional: Add authentication check here
  // const { authorization } = req.headers;
  // if (authorization !== `Bearer ${process.env.ADMIN_API_KEY}`) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  console.log('🎬 Starting background initialization for all users...');

  try {
    // Default backgrounds
    const defaultTurnDecider = {
      id: 'crazy-cough',
      name: 'Crazy Cough',
      category: 'Videos',
      rarity: 'COMMON'
    };

    const defaultVictory = {
      id: 'wind-blade',
      name: 'Wind Blade',
      category: 'Videos',
      rarity: 'LEGENDARY'
    };

    // Get all users
    const usersSnapshot = await adminDb.collection('users').get();

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    console.log(`📊 Found ${usersSnapshot.size} total users`);

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      try {
        // Check if user already has these backgrounds
        const hasTurnDecider = userData.inventory?.turnDeciderBackgroundEquipped;
        const hasVictory = userData.inventory?.victoryBackgroundEquipped;

        if (!hasTurnDecider || !hasVictory) {
          const updates: any = {};

          if (!hasTurnDecider) {
            updates['inventory.turnDeciderBackgroundEquipped'] = defaultTurnDecider;
          }

          if (!hasVictory) {
            updates['inventory.victoryBackgroundEquipped'] = defaultVictory;
          }

          // Only update if there are changes to make
          if (Object.keys(updates).length > 0) {
            await userDoc.ref.update(updates);
            updated++;
            console.log(`✅ Updated user ${userId}`);
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      } catch (error: any) {
        errors.push(`User ${userId}: ${error.message}`);
        console.error(`❌ Error updating user ${userId}:`, error.message);
      }
    }

    console.log('✅ Background initialization complete');

    return res.status(200).json({
      success: true,
      message: 'Background initialization complete',
      summary: {
        totalUsers: usersSnapshot.size,
        updated,
        skipped,
        errors: errors.length,
        errorDetails: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error: any) {
    console.error('❌ Fatal error during initialization:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to initialize backgrounds',
      message: error.message
    });
  }
}
