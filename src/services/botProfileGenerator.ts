/**
 * Bot Profile Generator Service
 * Creates realistic bot users with full profiles, stats, personalities, and equipment
 */

import { 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/services/firebase';

export interface BotProfile {
  // Core User Data (mirrors real users exactly)
  uid: string;
  displayName: string;
  email: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Player Statistics (realistic progression)
  stats: {
    gamesPlayed: number;
    matchWins: number;
    currentStreak: number;
    bestStreak: number;
    totalScore: number;
    averageScore: number;
    rank?: string;
    elo?: number;
  };
  
  // Inventory & Customization
  inventory: {
    displayBackgroundEquipped?: {
      id: string;
      name: string;
      rarity: string;
      image: string;
    };
    matchBackgroundEquipped?: {
      id: string;
      name: string;
      rarity: string;
      image: string;
    };
    items: Array<{
      id: string;
      name: string;
      type: string;
      rarity: string;
      equipped: boolean;
    }>;
  };
  
  // Advanced AI Personality Matrix
  personality: {
    // Core decision-making traits
    aggressiveness: number;        // 0.1-0.9 (conservative to aggressive)
    bankingTendency: number;       // 0.2-0.8 (when they bank)
    riskTolerance: number;         // 0.1-0.9 (risk comfort level)
    pressureResistance: number;    // 0.3-0.9 (handles pressure)
    
    // Advanced psychological modeling
    tiltResistance: number;        // 0.2-0.9 (bad luck handling)
    momentumAwareness: number;     // 0.3-0.9 (streak recognition)
    adaptationSpeed: number;       // 0.2-0.8 (opponent learning)
    confidenceLevel: number;       // 0.4-0.9 (base confidence)
    emotionalVolatility: number;   // 0.1-0.7 (mood swings)
    
    // Strategic thinking
    bluffDetection: number;        // 0.2-0.8 (pattern recognition)
    strategicThinking: number;     // 0.3-0.9 (long-term planning)
    situationalAwareness: number;  // 0.4-0.9 (context understanding)
  };
  
  // Dynamic state (changes during gameplay)
  emotionalState: {
    frustration: number;    // 0.0-1.0
    confidence: number;     // 0.0-1.0
    pressure: number;       // 0.0-1.0
    momentum: number;       // -1.0 to 1.0
    currentMood: 'calm' | 'aggressive' | 'defensive' | 'confident' | 'frustrated';
  };
  
  // Bot configuration
  botConfig: {
    isActive: boolean;
    region: 'us-east' | 'us-west' | 'eu-west' | 'eu-east' | 'asia-pacific';
    skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    archetypeCategory: 'conservative' | 'aggressive' | 'balanced' | 'unpredictable';
    generationDate: Timestamp;
    lastActiveDate: Timestamp;
  };
  
  // Real achievement integration
  achievements: {
    [achievementId: string]: {
      unlockedAt: Timestamp;
      progress: number;
    };
  };
}

export class BotProfileGenerator {
  // Realistic name pools for diversity
  private static readonly FIRST_NAMES = [
    // Male names
    'James', 'Michael', 'David', 'John', 'Robert', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher',
    'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Joshua', 'Kenneth', 'Kevin',
    'Brian', 'George', 'Timothy', 'Ronald', 'Jason', 'Edward', 'Jeffrey', 'Ryan', 'Jacob', 'Gary',
    'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon', 'Benjamin', 'Samuel',
    
    // Female names
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
    'Lisa', 'Nancy', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle',
    'Laura', 'Sarah', 'Kimberly', 'Deborah', 'Dorothy', 'Lisa', 'Nancy', 'Karen', 'Betty', 'Helen',
    'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle', 'Laura', 'Sarah', 'Kimberly', 'Amy',
    
    // Modern/Gaming names
    'Alex', 'Sam', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Avery', 'Quinn', 'Sage', 'River',
    'Phoenix', 'Skylar', 'Rowan', 'Blake', 'Cameron', 'Logan', 'Taylor', 'Jamie', 'Jesse', 'Drew'
  ];
  
  private static readonly LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
  ];
  
  private static readonly GAMING_SUFFIXES = [
    '', '94', '2k', 'Pro', 'X', '99', 'Gaming', 'TTV', '_YT', '2025', 'HD', 'Official', 
    'Real', 'OG', 'Elite', 'Master', 'Legend', 'King', 'Queen', '420', '69', '21', '77'
  ];
  
  // Available backgrounds from your system
  private static readonly BACKGROUNDS = [
    { id: 'bg_castle', name: 'Medieval Castle', rarity: 'rare', image: '/backgrounds/castle.webp' },
    { id: 'bg_space', name: 'Space Station', rarity: 'epic', image: '/backgrounds/space.webp' },
    { id: 'bg_forest', name: 'Enchanted Forest', rarity: 'common', image: '/backgrounds/forest.webp' },
    { id: 'bg_cyberpunk', name: 'Neon City', rarity: 'legendary', image: '/backgrounds/cyberpunk.webp' },
    { id: 'bg_beach', name: 'Tropical Beach', rarity: 'rare', image: '/backgrounds/beach.webp' },
    { id: 'bg_mountain', name: 'Snow Mountain', rarity: 'epic', image: '/backgrounds/mountain.webp' },
    { id: 'bg_desert', name: 'Ancient Desert', rarity: 'common', image: '/backgrounds/desert.webp' },
    { id: 'bg_volcano', name: 'Lava Volcano', rarity: 'legendary', image: '/backgrounds/volcano.webp' }
  ];
  
  /**
   * Generate a single realistic bot profile
   */
  static generateBotProfile(): BotProfile {
    const botId = `bot_${this.generateBotId()}`;
    const displayName = this.generateRealisticName();
    const email = this.generateEmail(displayName);
    const skillLevel = this.selectSkillLevel();
    const archetype = this.selectArchetype();
    const region = this.selectRegion();
    
    // Generate realistic stats based on skill level
    const stats = this.generateRealisticStats(skillLevel);
    
    // Generate personality matrix based on archetype
    const personality = this.generatePersonalityMatrix(archetype, skillLevel);
    
    // Generate realistic inventory
    const inventory = this.generateInventory(skillLevel);
    
    // Generate achievements based on stats
    const achievements = this.generateAchievements(stats);
    
    const now = serverTimestamp() as Timestamp;
    
    return {
      uid: botId,
      displayName,
      email,
      createdAt: now,
      updatedAt: now,
      
      stats,
      inventory,
      personality,
      
      emotionalState: {
        frustration: 0.1,
        confidence: personality.confidenceLevel,
        pressure: 0.0,
        momentum: 0.0,
        currentMood: 'calm'
      },
      
      botConfig: {
        isActive: true,
        region,
        skillLevel,
        archetypeCategory: archetype,
        generationDate: now,
        lastActiveDate: now
      },
      
      achievements
    };
  }
  
  /**
   * Generate unique bot ID
   */
  private static generateBotId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}${random}`;
  }
  
  /**
   * Generate realistic display name
   */
  private static generateRealisticName(): string {
    const firstName = this.randomFromArray(this.FIRST_NAMES);
    const lastName = this.randomFromArray(this.LAST_NAMES);
    const suffix = this.randomFromArray(this.GAMING_SUFFIXES);
    
    // 60% chance of full name, 40% chance of gaming-style name
    if (Math.random() < 0.6) {
      return suffix ? `${firstName}${suffix}` : `${firstName}_${lastName}`;
    } else {
      return `${firstName}${lastName}${suffix}`;
    }
  }
  
  /**
   * Generate email from display name
   */
  private static generateEmail(displayName: string): string {
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'proton.me'];
    const domain = this.randomFromArray(domains);
    const cleanName = displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${cleanName}@${domain}`;
  }
  
  /**
   * Select skill level with realistic distribution
   */
  private static selectSkillLevel(): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    const rand = Math.random();
    if (rand < 0.3) return 'beginner';
    if (rand < 0.7) return 'intermediate';
    if (rand < 0.9) return 'advanced';
    return 'expert';
  }
  
  /**
   * Select bot archetype
   */
  private static selectArchetype(): 'conservative' | 'aggressive' | 'balanced' | 'unpredictable' {
    const archetypes = ['conservative', 'aggressive', 'balanced', 'unpredictable'] as const;
    return this.randomFromArray(archetypes);
  }
  
  /**
   * Select regional distribution
   */
  private static selectRegion(): 'us-east' | 'us-west' | 'eu-west' | 'eu-east' | 'asia-pacific' {
    const regions = ['us-east', 'us-west', 'eu-west', 'eu-east', 'asia-pacific'] as const;
    return this.randomFromArray(regions);
  }
  
  /**
   * Generate realistic stats based on skill level
   */
  private static generateRealisticStats(skillLevel: string) {
    let baseGames: number;
    let baseWinRate: number;
    let baseStreak: number;
    
    switch (skillLevel) {
      case 'beginner':
        baseGames = this.randomBetween(5, 50);
        baseWinRate = this.randomBetween(0.3, 0.5);
        baseStreak = this.randomBetween(1, 3);
        break;
      case 'intermediate':
        baseGames = this.randomBetween(40, 200);
        baseWinRate = this.randomBetween(0.45, 0.65);
        baseStreak = this.randomBetween(2, 8);
        break;
      case 'advanced':
        baseGames = this.randomBetween(150, 500);
        baseWinRate = this.randomBetween(0.6, 0.8);
        baseStreak = this.randomBetween(5, 15);
        break;
      case 'expert':
        baseGames = this.randomBetween(400, 1000);
        baseWinRate = this.randomBetween(0.75, 0.9);
        baseStreak = this.randomBetween(10, 25);
        break;
      default:
        baseGames = 50;
        baseWinRate = 0.5;
        baseStreak = 3;
    }
    
    const gamesPlayed = baseGames;
    const matchWins = Math.floor(gamesPlayed * baseWinRate);
    const currentStreak = Math.random() < 0.7 ? this.randomBetween(0, Math.min(baseStreak, 10)) : 0;
    const bestStreak = Math.max(baseStreak, currentStreak);
    
    return {
      gamesPlayed,
      matchWins,
      currentStreak,
      bestStreak,
      totalScore: gamesPlayed * this.randomBetween(50, 150),
      averageScore: this.randomBetween(60, 120),
      rank: this.calculateRank(matchWins, gamesPlayed),
      elo: this.calculateElo(matchWins, gamesPlayed, skillLevel)
    };
  }
  
  /**
   * Generate personality matrix based on archetype
   */
  private static generatePersonalityMatrix(archetype: string, skillLevel: string) {
    let basePersonality: Partial<BotProfile['personality']>;
    
    switch (archetype) {
      case 'conservative':
        basePersonality = {
          aggressiveness: this.randomBetween(0.1, 0.4),
          bankingTendency: this.randomBetween(0.6, 0.8),
          riskTolerance: this.randomBetween(0.1, 0.4),
          pressureResistance: this.randomBetween(0.6, 0.9)
        };
        break;
      case 'aggressive':
        basePersonality = {
          aggressiveness: this.randomBetween(0.6, 0.9),
          bankingTendency: this.randomBetween(0.2, 0.4),
          riskTolerance: this.randomBetween(0.6, 0.9),
          pressureResistance: this.randomBetween(0.3, 0.7)
        };
        break;
      case 'balanced':
        basePersonality = {
          aggressiveness: this.randomBetween(0.4, 0.6),
          bankingTendency: this.randomBetween(0.4, 0.6),
          riskTolerance: this.randomBetween(0.4, 0.6),
          pressureResistance: this.randomBetween(0.5, 0.8)
        };
        break;
      case 'unpredictable':
        basePersonality = {
          aggressiveness: this.randomBetween(0.2, 0.8),
          bankingTendency: this.randomBetween(0.2, 0.8),
          riskTolerance: this.randomBetween(0.2, 0.8),
          pressureResistance: this.randomBetween(0.3, 0.7)
        };
        break;
      default:
        basePersonality = {
          aggressiveness: 0.5,
          bankingTendency: 0.5,
          riskTolerance: 0.5,
          pressureResistance: 0.6
        };
    }
    
    // Skill level affects advanced traits
    const skillMultiplier = {
      beginner: 0.6,
      intermediate: 0.75,
      advanced: 0.9,
      expert: 1.0
    }[skillLevel] || 0.75;
    
    return {
      ...basePersonality,
      aggressiveness: basePersonality.aggressiveness!,
      bankingTendency: basePersonality.bankingTendency!,
      riskTolerance: basePersonality.riskTolerance!,
      pressureResistance: basePersonality.pressureResistance!,
      
      // Advanced traits
      tiltResistance: this.randomBetween(0.2, 0.9) * skillMultiplier,
      momentumAwareness: this.randomBetween(0.3, 0.9) * skillMultiplier,
      adaptationSpeed: this.randomBetween(0.2, 0.8) * skillMultiplier,
      confidenceLevel: this.randomBetween(0.4, 0.9),
      emotionalVolatility: this.randomBetween(0.1, 0.7) * (2 - skillMultiplier),
      
      // Strategic thinking
      bluffDetection: this.randomBetween(0.2, 0.8) * skillMultiplier,
      strategicThinking: this.randomBetween(0.3, 0.9) * skillMultiplier,
      situationalAwareness: this.randomBetween(0.4, 0.9) * skillMultiplier
    };
  }
  
  /**
   * Generate realistic inventory based on skill level
   */
  private static generateInventory(skillLevel: string) {
    const rarityWeights = {
      beginner: { common: 0.7, rare: 0.25, epic: 0.05, legendary: 0.0 },
      intermediate: { common: 0.4, rare: 0.4, epic: 0.15, legendary: 0.05 },
      advanced: { common: 0.2, rare: 0.4, epic: 0.3, legendary: 0.1 },
      expert: { common: 0.1, rare: 0.3, epic: 0.4, legendary: 0.2 }
    }[skillLevel] || { common: 0.5, rare: 0.3, epic: 0.15, legendary: 0.05 };
    
    const displayBg = this.selectBackgroundByRarity(rarityWeights);
    const matchBg = Math.random() < 0.7 ? this.selectBackgroundByRarity(rarityWeights) : displayBg;
    
    return {
      displayBackgroundEquipped: displayBg,
      matchBackgroundEquipped: matchBg,
      items: [] // Could expand with dice skins, titles, etc.
    };
  }
  
  /**
   * Generate realistic achievements based on stats
   */
  private static generateAchievements(stats: any) {
    const achievements: BotProfile['achievements'] = {};
    const now = serverTimestamp() as Timestamp;
    
    // Basic achievements based on games played
    if (stats.gamesPlayed >= 10) {
      achievements['first_10_games'] = { unlockedAt: now, progress: 100 };
    }
    if (stats.gamesPlayed >= 50) {
      achievements['experienced_player'] = { unlockedAt: now, progress: 100 };
    }
    if (stats.gamesPlayed >= 100) {
      achievements['century_club'] = { unlockedAt: now, progress: 100 };
    }
    
    // Win-based achievements
    if (stats.matchWins >= 5) {
      achievements['first_victory_streak'] = { unlockedAt: now, progress: 100 };
    }
    if (stats.bestStreak >= 5) {
      achievements['hot_streak'] = { unlockedAt: now, progress: 100 };
    }
    if (stats.bestStreak >= 10) {
      achievements['unstoppable'] = { unlockedAt: now, progress: 100 };
    }
    
    return achievements;
  }
  
  /**
   * Helper: Select background by rarity weights
   */
  private static selectBackgroundByRarity(weights: any) {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const [rarity, weight] of Object.entries(weights)) {
      cumulative += weight as number;
      if (rand < cumulative) {
        const matching = this.BACKGROUNDS.filter(bg => bg.rarity === rarity);
        return matching.length > 0 ? this.randomFromArray(matching) : this.BACKGROUNDS[0];
      }
    }
    
    return this.BACKGROUNDS[0];
  }
  
  /**
   * Calculate rank based on performance
   */
  private static calculateRank(wins: number, games: number): string {
    const winRate = wins / games;
    if (winRate > 0.8 && games > 100) return 'Diamond';
    if (winRate > 0.7 && games > 50) return 'Platinum';
    if (winRate > 0.6 && games > 25) return 'Gold';
    if (winRate > 0.5 && games > 10) return 'Silver';
    return 'Bronze';
  }
  
  /**
   * Calculate ELO rating
   */
  private static calculateElo(wins: number, games: number, skillLevel: string): number {
    const winRate = wins / games;
    const baseElo = {
      beginner: 1000,
      intermediate: 1200,
      advanced: 1400,
      expert: 1600
    }[skillLevel] || 1000;
    
    return Math.floor(baseElo + (winRate - 0.5) * 400 + this.randomBetween(-50, 50));
  }
  
  /**
   * Helper: Random between min and max
   */
  private static randomBetween(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
  
  /**
   * Helper: Random from array
   */
  private static randomFromArray<T>(array: readonly T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  /**
   * Generate multiple bot profiles
   */
  static async generateBotProfiles(count: number = 200): Promise<BotProfile[]> {
    console.log(`🤖 Generating ${count} bot profiles...`);
    const profiles: BotProfile[] = [];
    
    for (let i = 0; i < count; i++) {
      const profile = this.generateBotProfile();
      profiles.push(profile);
      
      if (i % 50 === 0) {
        console.log(`Generated ${i}/${count} bot profiles...`);
      }
    }
    
    console.log(`✅ Generated ${count} bot profiles successfully!`);
    return profiles;
  }
  
  /**
   * Save bot profiles to Firebase
   */
  static async saveBotProfilesToFirebase(profiles: BotProfile[]): Promise<void> {
    console.log(`💾 Saving ${profiles.length} bot profiles to Firebase...`);
    
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      const botRef = doc(db, 'bot_profiles', profile.uid);
      
      try {
        await setDoc(botRef, profile);
        
        if (i % 25 === 0) {
          console.log(`Saved ${i + 1}/${profiles.length} bot profiles...`);
        }
      } catch (error) {
        console.error(`❌ Error saving bot profile ${profile.uid}:`, error);
      }
    }
    
    console.log(`✅ Successfully saved ${profiles.length} bot profiles to Firebase!`);
  }
  
  /**
   * Initialize bot ecosystem
   */
  static async initializeBotEcosystem(count: number = 200): Promise<void> {
    console.log('🚀 Initializing DashDice Bot Ecosystem...');
    
    try {
      // Generate bot profiles
      const profiles = await this.generateBotProfiles(count);
      
      // Save to Firebase
      await this.saveBotProfilesToFirebase(profiles);
      
      console.log('🎉 Bot ecosystem initialization complete!');
      console.log(`📊 Created ${count} diverse bot players with:
        - Realistic names and stats
        - Advanced personality matrices  
        - Dynamic emotional modeling
        - Full inventory integration
        - Achievement progression
        - Regional distribution
        - Anti-detection measures`);
        
    } catch (error) {
      console.error('❌ Error initializing bot ecosystem:', error);
      throw error;
    }
  }
}

export default BotProfileGenerator;
