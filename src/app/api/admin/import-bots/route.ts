/**
 * Bot Import API Route
 * Admin endpoint to import bot profiles to Firebase
 */

import { NextRequest } from 'next/server';

// Bot data (subset for initial import)


























const BOT_PROFILES = [
  {
    uid: "bot_1758028255316_bz9duqijt",
    displayName: "Hayden Wilson",
    email: "hayden.wilson@dashdice.bot",
    createdAt: "2025-09-16T13:10:55.316Z",
    updatedAt: "2025-09-16T13:10:55.318Z",
    isBot: true,
    isActive: true,
    stats: {
      gamesPlayed: 94,
      matchWins: 28,
      currentStreak: 2,
      bestStreak: 6,
      totalScore: 94859,
      averageScore: 1009,
      elo: 1587,
      rank: "Bronze"
    },
    personality: {
      skillLevel: "beginner",
      aggressiveness: 0.23,
      riskTaking: 0.34,
      patience: 0.67,
      adaptability: 0.45,
      bluffingFrequency: 0.12,
      emotionalStability: 0.78
    },
    inventory: {
      displayBackgroundEquipped: {
        id: "cyber_city",
        name: "Cyber City",
        rarity: "rare",
        type: "display"
      },
      matchBackgroundEquipped: {
        id: "neon_grid",
        name: "Neon Grid", 
        rarity: "common",
        type: "match"
      },
      items: []
    }
  },
  {
    uid: "bot_1758028255354_x7k2m9pq",
    displayName: "Sam Rodriguez",
    email: "sam.rodriguez@dashdice.bot",
    createdAt: "2025-09-16T13:10:55.354Z",
    updatedAt: "2025-09-16T13:10:55.354Z",
    isBot: true,
    isActive: true,
    stats: {
      gamesPlayed: 156,
      matchWins: 89,
      currentStreak: 1,
      bestStreak: 12,
      totalScore: 187443,
      averageScore: 1201,
      elo: 1266,
      rank: "Silver"
    },
    personality: {
      skillLevel: "expert",
      aggressiveness: 0.78,
      riskTaking: 0.89,
      patience: 0.34,
      adaptability: 0.92,
      bluffingFrequency: 0.45,
      emotionalStability: 0.56
    },
    inventory: {
      displayBackgroundEquipped: {
        id: "quantum_void",
        name: "Quantum Void",
        rarity: "legendary",
        type: "display"
      },
      matchBackgroundEquipped: {
        id: "matrix_rain",
        name: "Matrix Rain",
        rarity: "epic", 
        type: "match"
      },
      items: []
    }
  },
  {
    uid: "bot_1758028255388_q4n8v6t1",
    displayName: "Avery Martin",
    email: "avery.martin@dashdice.bot",
    createdAt: "2025-09-16T13:10:55.388Z",
    updatedAt: "2025-09-16T13:10:55.388Z",
    isBot: true,
    isActive: true,
    stats: {
      gamesPlayed: 72,
      matchWins: 41,
      currentStreak: 0,
      bestStreak: 8,
      totalScore: 92736,
      averageScore: 1288,
      elo: 1288,
      rank: "Silver"
    },
    personality: {
      skillLevel: "advanced",
      aggressiveness: 0.56,
      riskTaking: 0.67,
      patience: 0.45,
      adaptability: 0.78,
      bluffingFrequency: 0.34,
      emotionalStability: 0.89
    },
    inventory: {
      displayBackgroundEquipped: {
        id: "starfield",
        name: "Starfield",
        rarity: "common",
        type: "display"
      },
      matchBackgroundEquipped: {
        id: "retro_wave",
        name: "Retro Wave",
        rarity: "rare",
        type: "match"
      },
      items: []
    }
  }
];

export async function GET() {
  try {
    // Dynamic import to prevent build-time Firebase initialization
    const { collection, getDocs, query, limit } = await import('firebase/firestore');
    const { db } = await import('@/services/firebase');
    
    // Check if bots already exist
    const botsRef = collection(db, 'bot_profiles');
    const existingBots = await getDocs(query(botsRef, limit(1)));
    
    if (!existingBots.empty) {
      return Response.json({
        success: true,
        message: "Bot profiles already exist in database",
        existingCount: existingBots.size
      });
    }

    return Response.json({
      success: true,
      message: "Bot import endpoint ready",
      availableBots: BOT_PROFILES.length,
      instruction: "Use POST to import bots"
    });

  } catch (error) {
    console.error('Error checking bot profiles:', error);
    return Response.json({
      success: false,
      error: "Failed to check bot profiles"
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Dynamic import to prevent build-time Firebase initialization
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('@/services/firebase');
    
    console.log('🤖 Starting bot profiles import...');
    
    let imported = 0;
    let errors = 0;

    for (const botProfile of BOT_PROFILES) {
      try {
        const botRef = doc(db, 'bot_profiles', botProfile.uid);
        
        // Convert date strings to Date objects
        const profileWithDates = {
          ...botProfile,
          createdAt: new Date(botProfile.createdAt),
          updatedAt: new Date(botProfile.updatedAt)
        };
        
        await setDoc(botRef, profileWithDates);
        console.log(`✅ Imported: ${botProfile.displayName}`);
        imported++;
        
      } catch (error) {
        console.error(`❌ Failed to import ${botProfile.displayName}:`, error);
        errors++;
      }
    }

    console.log(`🎉 Bot import complete! ${imported} imported, ${errors} errors`);

    return Response.json({
      success: true,
      imported,
      errors,
      message: `Successfully imported ${imported} bot profiles`
    });

  } catch (error) {
    console.error('Error importing bot profiles:', error);
    return Response.json({
      success: false,
      error: "Failed to import bot profiles",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}