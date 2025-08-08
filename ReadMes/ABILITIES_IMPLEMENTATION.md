# Powerups & Abilities System Implementation Guide

## Overview
A comprehensive abilities and progression system for DashDice allowing players to customize their gameplay with strategic powerups, manage loadouts, and progress through levels to unlock new abilities.

## Core Features
- **Ability System**: Strategic powerups with star point costs
- **Loadout Management**: Customizable ability loadouts with star limits
- **In-Match Integration**: Seamless UI for ability activation
- **Rarity System**: Common to Epic abilities with varying power levels
- **Progression System**: XP-based leveling with ability unlocks
- **Vault Integration**: Third component for ability management

## Database Schema

### Abilities Collection
```typescript
interface Ability {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  starCost: number; // 1-5 star points
  category: 'dice' | 'score' | 'defensive' | 'utility' | 'gamechanging';
  cooldown: number; // seconds
  maxUses?: number; // per match, undefined = unlimited
  effects: {
    type: 'dice_reroll' | 'score_multiply' | 'shield' | 'combo_chain' | 'time_freeze' | 'steal_turn' | 'bonus_roll';
    value?: number;
    duration?: number; // seconds
    condition?: string;
  }[];
  unlockLevel: number;
  iconUrl: string;
  animationUrl?: string;
  sounds: {
    activation: string;
    effect: string;
  };
  isActive: boolean;
}
```

### User Abilities Collection
```typescript
interface UserAbility {
  id: string;
  userId: string;
  abilityId: string;
  unlockedAt: Timestamp;
  timesUsed: number;
  successRate: number; // percentage
  isEquipped: boolean;
  loadoutSlot?: number; // 1-5
}
```

### Loadouts Collection
```typescript
interface UserLoadout {
  id: string;
  userId: string;
  name: string;
  abilities: {
    slot1?: string; // ability ID
    slot2?: string;
    slot3?: string;
    slot4?: string;
    slot5?: string;
  };
  totalStarCost: number;
  maxStarPoints: number; // based on level
  isActive: boolean;
  createdAt: Timestamp;
  lastUsed: Timestamp;
}
```

### User Progression Collection
```typescript
interface UserProgression {
  userId: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalWins: number;
  totalMatches: number;
  winStreak: number;
  maxStarPoints: number; // increases with level
  unlockedAbilities: string[]; // ability IDs
  stats: {
    abilitiesUsed: number;
    mostUsedAbility: string;
    favoriteCategory: string;
    averageMatchXP: number;
  };
  milestones: Array<{
    type: 'level' | 'wins' | 'abilities_unlocked';
    value: number;
    achievedAt: Timestamp;
    reward?: string;
  }>;
}
```

### Match Abilities Collection
```typescript
interface MatchAbilityUsage {
  id: string;
  matchId: string;
  userId: string;
  abilityId: string;
  usedAt: Timestamp;
  gameState: {
    round: number;
    userScore: number;
    opponentScore: number;
    diceValues: number[];
  };
  result: {
    success: boolean;
    effectValue?: number;
    scoreImpact?: number;
  };
}
```

## Pre-defined Abilities

### Common Abilities (1-2 Star Cost)
```typescript
const COMMON_ABILITIES: Ability[] = [
  {
    id: 'lucky_reroll',
    name: 'Lucky Reroll',
    description: 'Reroll one die of your choice',
    starCost: 1,
    category: 'dice',
    cooldown: 0,
    maxUses: 3,
    effects: [{ type: 'dice_reroll', value: 1 }],
    unlockLevel: 1
  },
  {
    id: 'focus_shot',
    name: 'Focus Shot',
    description: 'Next roll adds +1 to all dice',
    starCost: 2,
    category: 'dice',
    cooldown: 30,
    maxUses: 2,
    effects: [{ type: 'bonus_roll', value: 1, duration: 1 }],
    unlockLevel: 2
  },
  {
    id: 'shield_wall',
    name: 'Shield Wall',
    description: 'Blocks next opponent ability',
    starCost: 2,
    category: 'defensive',
    cooldown: 45,
    maxUses: 2,
    effects: [{ type: 'shield', duration: 30 }],
    unlockLevel: 3
  }
];
```

### Rare Abilities (3 Star Cost)
```typescript
const RARE_ABILITIES: Ability[] = [
  {
    id: 'double_trouble',
    name: 'Double Trouble',
    description: 'Double your score for this round',
    starCost: 3,
    category: 'score',
    cooldown: 60,
    maxUses: 1,
    effects: [{ type: 'score_multiply', value: 2 }],
    unlockLevel: 5
  },
  {
    id: 'time_warp',
    name: 'Time Warp',
    description: 'Freeze opponent\'s timer for 10 seconds',
    starCost: 3,
    category: 'utility',
    cooldown: 90,
    maxUses: 1,
    effects: [{ type: 'time_freeze', duration: 10 }],
    unlockLevel: 7
  }
];
```

### Epic Abilities (4-5 Star Cost)
```typescript
const EPIC_ABILITIES: Ability[] = [
  {
    id: 'combo_chain',
    name: 'Combo Chain',
    description: 'Guarantees doubles on next roll',
    starCost: 4,
    category: 'gamechanging',
    cooldown: 120,
    maxUses: 1,
    effects: [{ type: 'combo_chain', condition: 'guarantee_doubles' }],
    unlockLevel: 10
  },
  {
    id: 'grand_theft',
    name: 'Grand Theft',
    description: 'Steal 25% of opponent\'s score',
    starCost: 5,
    category: 'gamechanging',
    cooldown: 180,
    maxUses: 1,
    effects: [{ type: 'steal_turn', value: 0.25 }],
    unlockLevel: 15
  }
];
```

## Services Implementation

### Abilities Service
```typescript
// src/services/abilitiesService.ts
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

export class AbilitiesService {
  // Get all available abilities
  static async getAllAbilities(): Promise<Ability[]> {
    try {
      const q = query(
        collection(db, 'abilities'),
        where('isActive', '==', true),
        orderBy('unlockLevel', 'asc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ability[];
    } catch (error) {
      console.error('Error getting abilities:', error);
      return [];
    }
  }

  // Get user's unlocked abilities
  static async getUserAbilities(userId: string): Promise<UserAbility[]> {
    try {
      const q = query(
        collection(db, 'userAbilities'),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserAbility[];
    } catch (error) {
      console.error('Error getting user abilities:', error);
      return [];
    }
  }

  // Unlock ability for user
  static async unlockAbility(userId: string, abilityId: string): Promise<boolean> {
    try {
      // Check if already unlocked
      const existing = await this.getUserAbility(userId, abilityId);
      if (existing) return true;

      await addDoc(collection(db, 'userAbilities'), {
        userId,
        abilityId,
        unlockedAt: serverTimestamp(),
        timesUsed: 0,
        successRate: 0,
        isEquipped: false
      });

      return true;
    } catch (error) {
      console.error('Error unlocking ability:', error);
      return false;
    }
  }

  // Use ability in match
  static async useAbility(
    matchId: string,
    userId: string,
    abilityId: string,
    gameState: any
  ): Promise<{ success: boolean; effect?: any; error?: string }> {
    try {
      const ability = await this.getAbility(abilityId);
      if (!ability) {
        return { success: false, error: 'Ability not found' };
      }

      // Check cooldown and usage limits
      const canUse = await this.canUseAbility(userId, abilityId, matchId);
      if (!canUse.allowed) {
        return { success: false, error: canUse.reason };
      }

      // Apply ability effect
      const effect = await this.applyAbilityEffect(ability, gameState);

      // Log usage
      await addDoc(collection(db, 'matchAbilityUsage'), {
        matchId,
        userId,
        abilityId,
        usedAt: serverTimestamp(),
        gameState,
        result: {
          success: true,
          effectValue: effect.value,
          scoreImpact: effect.scoreImpact
        }
      });

      // Update user ability stats
      await this.updateAbilityStats(userId, abilityId, true);

      return { success: true, effect };
    } catch (error) {
      console.error('Error using ability:', error);
      return { success: false, error: 'Failed to use ability' };
    }
  }

  // Create/update loadout
  static async saveLoadout(loadout: Partial<UserLoadout>): Promise<string> {
    try {
      // Validate star cost
      const totalCost = await this.calculateLoadoutCost(loadout.abilities!);
      const userProgression = await this.getUserProgression(loadout.userId!);
      
      if (totalCost > userProgression.maxStarPoints) {
        throw new Error('Loadout exceeds star point limit');
      }

      const loadoutData: Partial<UserLoadout> = {
        ...loadout,
        totalStarCost: totalCost,
        maxStarPoints: userProgression.maxStarPoints,
        lastUsed: serverTimestamp()
      };

      if (loadout.id) {
        await updateDoc(doc(db, 'userLoadouts', loadout.id), loadoutData);
        return loadout.id;
      } else {
        const docRef = await addDoc(collection(db, 'userLoadouts'), {
          ...loadoutData,
          createdAt: serverTimestamp()
        });
        return docRef.id;
      }
    } catch (error) {
      console.error('Error saving loadout:', error);
      throw error;
    }
  }

  // Get user's loadouts
  static async getUserLoadouts(userId: string): Promise<UserLoadout[]> {
    try {
      const q = query(
        collection(db, 'userLoadouts'),
        where('userId', '==', userId),
        orderBy('lastUsed', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserLoadout[];
    } catch (error) {
      console.error('Error getting user loadouts:', error);
      return [];
    }
  }

  // Award XP and check for level up
  static async awardXP(userId: string, xpAmount: number, isWin: boolean = false): Promise<{
    leveledUp: boolean;
    newLevel?: number;
    unlockedAbilities?: string[];
  }> {
    try {
      const progression = await this.getUserProgression(userId);
      const newXP = progression.xp + xpAmount;
      const newWins = isWin ? progression.totalWins + 1 : progression.totalWins;
      
      // Check for level up (every 5 wins)
      const newLevel = Math.floor(newWins / 5) + 1;
      const leveledUp = newLevel > progression.level;
      
      let unlockedAbilities: string[] = [];
      if (leveledUp) {
        // Unlock 2 new abilities per level
        unlockedAbilities = await this.unlockAbilitiesForLevel(userId, newLevel);
      }

      // Update progression
      await updateDoc(doc(db, 'userProgression', userId), {
        xp: newXP,
        level: newLevel,
        totalWins: newWins,
        totalMatches: progression.totalMatches + 1,
        maxStarPoints: Math.min(15, 5 + newLevel), // Max 15 star points
        xpToNextLevel: (newLevel * 5 - newWins) * 100, // XP needed for next level
        ...(isWin && { winStreak: progression.winStreak + 1 })
      });

      return { leveledUp, newLevel: leveledUp ? newLevel : undefined, unlockedAbilities };
    } catch (error) {
      console.error('Error awarding XP:', error);
      return { leveledUp: false };
    }
  }

  private static async applyAbilityEffect(ability: Ability, gameState: any): Promise<any> {
    const effect = ability.effects[0]; // Primary effect
    
    switch (effect.type) {
      case 'dice_reroll':
        return { type: 'reroll', value: effect.value, message: 'Select dice to reroll' };
      
      case 'score_multiply':
        return { 
          type: 'multiply', 
          value: effect.value, 
          scoreImpact: gameState.currentScore * (effect.value - 1),
          message: `Score multiplied by ${effect.value}!`
        };
      
      case 'combo_chain':
        return { 
          type: 'guarantee_doubles', 
          message: 'Next roll guaranteed doubles!',
          duration: 1
        };
      
      case 'shield':
        return { 
          type: 'shield', 
          duration: effect.duration,
          message: 'Shield activated!'
        };
      
      case 'time_freeze':
        return { 
          type: 'freeze_opponent', 
          duration: effect.duration,
          message: `Opponent frozen for ${effect.duration}s!`
        };
      
      case 'steal_turn':
        const stolenPoints = Math.floor(gameState.opponentScore * effect.value!);
        return { 
          type: 'steal', 
          value: stolenPoints,
          scoreImpact: stolenPoints,
          message: `Stole ${stolenPoints} points!`
        };
      
      default:
        return { type: 'unknown', message: 'Ability activated!' };
    }
  }

  private static async canUseAbility(
    userId: string, 
    abilityId: string, 
    matchId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const ability = await this.getAbility(abilityId);
    if (!ability) return { allowed: false, reason: 'Ability not found' };

    // Check if user has ability unlocked
    const userAbility = await this.getUserAbility(userId, abilityId);
    if (!userAbility) return { allowed: false, reason: 'Ability not unlocked' };

    // Check usage limit for this match
    if (ability.maxUses) {
      const usageCount = await this.getMatchUsageCount(matchId, userId, abilityId);
      if (usageCount >= ability.maxUses) {
        return { allowed: false, reason: 'Usage limit reached' };
      }
    }

    return { allowed: true };
  }

  private static async getMatchUsageCount(
    matchId: string, 
    userId: string, 
    abilityId: string
  ): Promise<number> {
    const q = query(
      collection(db, 'matchAbilityUsage'),
      where('matchId', '==', matchId),
      where('userId', '==', userId),
      where('abilityId', '==', abilityId)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  private static async unlockAbilitiesForLevel(userId: string, level: number): Promise<string[]> {
    // Get abilities available at this level
    const allAbilities = await this.getAllAbilities();
    const levelAbilities = allAbilities
      .filter(ability => ability.unlockLevel === level)
      .slice(0, 2); // 2 abilities per level

    const unlockedIds: string[] = [];
    for (const ability of levelAbilities) {
      const success = await this.unlockAbility(userId, ability.id);
      if (success) {
        unlockedIds.push(ability.id);
      }
    }

    return unlockedIds;
  }
}
```

### Progression Service
```typescript
// src/services/progressionService.ts
export class ProgressionService {
  // Initialize user progression
  static async initializeProgression(userId: string): Promise<void> {
    try {
      const initialProgression: Partial<UserProgression> = {
        userId,
        level: 1,
        xp: 0,
        xpToNextLevel: 500, // 5 wins * 100 XP
        totalWins: 0,
        totalMatches: 0,
        winStreak: 0,
        maxStarPoints: 5, // Starting star points
        unlockedAbilities: [],
        stats: {
          abilitiesUsed: 0,
          mostUsedAbility: '',
          favoriteCategory: '',
          averageMatchXP: 0
        },
        milestones: []
      };

      await addDoc(collection(db, 'userProgression'), initialProgression);

      // Unlock first abilities
      await this.unlockStarterAbilities(userId);
    } catch (error) {
      console.error('Error initializing progression:', error);
    }
  }

  // Calculate match XP
  static calculateMatchXP(
    isWin: boolean,
    matchDuration: number,
    abilitiesUsed: number,
    scoreAchieved: number
  ): number {
    let baseXP = isWin ? 100 : 50;
    
    // Bonus for quick wins
    if (isWin && matchDuration < 60) {
      baseXP += 25;
    }
    
    // Bonus for using abilities strategically
    if (abilitiesUsed > 0) {
      baseXP += abilitiesUsed * 10;
    }
    
    // Score bonus
    baseXP += Math.floor(scoreAchieved / 100) * 5;
    
    return Math.min(baseXP, 200); // Cap at 200 XP
  }

  // Get progression summary
  static async getProgressionSummary(userId: string): Promise<{
    currentLevel: number;
    xpProgress: number;
    nextLevelXP: number;
    unlockedAbilities: number;
    totalAbilities: number;
    starPoints: number;
    maxStarPoints: number;
  }> {
    try {
      const progression = await AbilitiesService.getUserProgression(userId);
      const allAbilities = await AbilitiesService.getAllAbilities();
      const userAbilities = await AbilitiesService.getUserAbilities(userId);

      return {
        currentLevel: progression.level,
        xpProgress: progression.xp,
        nextLevelXP: progression.xpToNextLevel,
        unlockedAbilities: userAbilities.length,
        totalAbilities: allAbilities.length,
        starPoints: progression.maxStarPoints,
        maxStarPoints: 15
      };
    } catch (error) {
      console.error('Error getting progression summary:', error);
      return {
        currentLevel: 1,
        xpProgress: 0,
        nextLevelXP: 500,
        unlockedAbilities: 0,
        totalAbilities: 0,
        starPoints: 5,
        maxStarPoints: 15
      };
    }
  }

  private static async unlockStarterAbilities(userId: string): Promise<void> {
    const starterAbilities = ['lucky_reroll', 'focus_shot'];
    
    for (const abilityId of starterAbilities) {
      await AbilitiesService.unlockAbility(userId, abilityId);
    }
  }
}
```

## Frontend Components

### Abilities Context
```typescript
// src/context/AbilitiesContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AbilitiesService, ProgressionService } from '@/services/abilitiesService';
import { useAuth } from './AuthContext';

interface AbilitiesContextType {
  // Abilities
  allAbilities: Ability[];
  userAbilities: UserAbility[];
  activeLoadout: UserLoadout | null;
  loadouts: UserLoadout[];
  
  // Progression
  progression: UserProgression | null;
  progressionSummary: any;
  
  // State
  isLoading: boolean;
  
  // Actions
  useAbility: (abilityId: string, matchId: string, gameState: any) => Promise<any>;
  saveLoadout: (loadout: Partial<UserLoadout>) => Promise<string>;
  setActiveLoadout: (loadoutId: string) => Promise<boolean>;
  awardMatchXP: (xpAmount: number, isWin: boolean) => Promise<any>;
  
  // Utilities
  canAffordAbility: (abilityId: string) => boolean;
  getAbilityCooldown: (abilityId: string) => number;
  getAbilityUsageCount: (abilityId: string, matchId: string) => number;
}

const AbilitiesContext = createContext<AbilitiesContextType | undefined>(undefined);

export function AbilitiesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [allAbilities, setAllAbilities] = useState<Ability[]>([]);
  const [userAbilities, setUserAbilities] = useState<UserAbility[]>([]);
  const [activeLoadout, setActiveLoadout] = useState<UserLoadout | null>(null);
  const [loadouts, setLoadouts] = useState<UserLoadout[]>([]);
  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [progressionSummary, setProgressionSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAbilitiesData();
    }
  }, [user]);

  const loadAbilitiesData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [abilities, userAbils, userLoadouts, prog, summary] = await Promise.all([
        AbilitiesService.getAllAbilities(),
        AbilitiesService.getUserAbilities(user.uid),
        AbilitiesService.getUserLoadouts(user.uid),
        AbilitiesService.getUserProgression(user.uid),
        ProgressionService.getProgressionSummary(user.uid)
      ]);

      setAllAbilities(abilities);
      setUserAbilities(userAbils);
      setLoadouts(userLoadouts);
      setProgression(prog);
      setProgressionSummary(summary);
      
      // Set active loadout
      const active = userLoadouts.find(l => l.isActive);
      setActiveLoadout(active || null);
    } catch (error) {
      console.error('Error loading abilities data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const useAbility = async (abilityId: string, matchId: string, gameState: any) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    return await AbilitiesService.useAbility(matchId, user.uid, abilityId, gameState);
  };

  const saveLoadout = async (loadout: Partial<UserLoadout>) => {
    if (!user) throw new Error('Not authenticated');
    
    const loadoutData = { ...loadout, userId: user.uid };
    const id = await AbilitiesService.saveLoadout(loadoutData);
    await loadAbilitiesData(); // Refresh data
    return id;
  };

  const setActiveLoadoutById = async (loadoutId: string): Promise<boolean> => {
    try {
      // Deactivate current loadout
      if (activeLoadout) {
        await AbilitiesService.updateLoadout(activeLoadout.id, { isActive: false });
      }
      
      // Activate new loadout
      await AbilitiesService.updateLoadout(loadoutId, { isActive: true });
      await loadAbilitiesData();
      return true;
    } catch (error) {
      console.error('Error setting active loadout:', error);
      return false;
    }
  };

  const awardMatchXP = async (xpAmount: number, isWin: boolean) => {
    if (!user) return { leveledUp: false };
    
    const result = await AbilitiesService.awardXP(user.uid, xpAmount, isWin);
    if (result.leveledUp) {
      await loadAbilitiesData(); // Refresh to show new unlocks
    }
    return result;
  };

  const canAffordAbility = (abilityId: string): boolean => {
    if (!activeLoadout) return false;
    
    const ability = allAbilities.find(a => a.id === abilityId);
    if (!ability) return false;
    
    const currentCost = activeLoadout.totalStarCost;
    const availablePoints = activeLoadout.maxStarPoints - currentCost;
    
    return ability.starCost <= availablePoints;
  };

  const getAbilityCooldown = (abilityId: string): number => {
    // Implementation would track cooldowns per match
    return 0;
  };

  const getAbilityUsageCount = (abilityId: string, matchId: string): number => {
    // Implementation would track usage count per match
    return 0;
  };

  const value: AbilitiesContextType = {
    allAbilities,
    userAbilities,
    activeLoadout,
    loadouts,
    progression,
    progressionSummary,
    isLoading,
    useAbility,
    saveLoadout,
    setActiveLoadout: setActiveLoadoutById,
    awardMatchXP,
    canAffordAbility,
    getAbilityCooldown,
    getAbilityUsageCount
  };

  return (
    <AbilitiesContext.Provider value={value}>
      {children}
    </AbilitiesContext.Provider>
  );
}

export function useAbilities() {
  const context = useContext(AbilitiesContext);
  if (context === undefined) {
    throw new Error('useAbilities must be used within an AbilitiesProvider');
  }
  return context;
}
```

### Vault Abilities Tab
```typescript
// src/components/vault/AbilitiesTab.tsx
'use client';

import React, { useState } from 'react';
import { useAbilities } from '@/context/AbilitiesContext';
import AbilityCard from './AbilityCard';
import LoadoutEditor from './LoadoutEditor';
import ProgressionPanel from './ProgressionPanel';

export default function AbilitiesTab() {
  const {
    allAbilities,
    userAbilities,
    activeLoadout,
    loadouts,
    progressionSummary,
    isLoading
  } = useAbilities();
  
  const [activeView, setActiveView] = useState<'collection' | 'loadouts' | 'progression'>('collection');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const filteredAbilities = allAbilities.filter(ability => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'unlocked') {
      return userAbilities.some(ua => ua.abilityId === ability.id);
    }
    return ability.category === selectedCategory;
  });

  const rarityColors = {
    common: 'border-gray-500 bg-gray-800',
    rare: 'border-blue-500 bg-blue-900',
    epic: 'border-purple-500 bg-purple-900',
    legendary: 'border-yellow-500 bg-yellow-900'
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Abilities</h2>
          <div className="flex gap-2">
            {['collection', 'loadouts', 'progression'].map(view => (
              <button
                key={view}
                onClick={() => setActiveView(view as any)}
                className={`px-4 py-2 rounded-lg font-medium capitalize ${
                  activeView === view
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">
              {progressionSummary?.currentLevel || 1}
            </p>
            <p className="text-sm text-gray-400">Level</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">
              {progressionSummary?.unlockedAbilities || 0}/{progressionSummary?.totalAbilities || 0}
            </p>
            <p className="text-sm text-gray-400">Unlocked</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {progressionSummary?.starPoints || 5}/{progressionSummary?.maxStarPoints || 15}
            </p>
            <p className="text-sm text-gray-400">Star Points</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">
              {loadouts.length}
            </p>
            <p className="text-sm text-gray-400">Loadouts</p>
          </div>
        </div>
      </div>

      {/* Content based on active view */}
      {activeView === 'collection' && (
        <div>
          {/* Category Filter */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {['all', 'unlocked', 'dice', 'score', 'defensive', 'utility', 'gamechanging'].map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap capitalize ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {category.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Abilities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAbilities.map(ability => {
              const userAbility = userAbilities.find(ua => ua.abilityId === ability.id);
              const isUnlocked = !!userAbility;
              
              return (
                <AbilityCard
                  key={ability.id}
                  ability={ability}
                  userAbility={userAbility}
                  isUnlocked={isUnlocked}
                  canEquip={isUnlocked}
                />
              );
            })}
          </div>
        </div>
      )}

      {activeView === 'loadouts' && (
        <LoadoutEditor
          abilities={allAbilities}
          userAbilities={userAbilities}
          loadouts={loadouts}
          activeLoadout={activeLoadout}
          maxStarPoints={progressionSummary?.starPoints || 5}
        />
      )}

      {activeView === 'progression' && (
        <ProgressionPanel
          progression={progressionSummary}
          recentUnlocks={userAbilities.slice(-5)}
        />
      )}
    </div>
  );
}
```

### In-Match Abilities UI
```typescript
// src/components/match/AbilitiesPanel.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAbilities } from '@/context/AbilitiesContext';

interface AbilitiesPanelProps {
  matchId: string;
  gameState: any;
  onAbilityUsed: (effect: any) => void;
  isPlayerTurn: boolean;
}

export default function AbilitiesPanel({ 
  matchId, 
  gameState, 
  onAbilityUsed, 
  isPlayerTurn 
}: AbilitiesPanelProps) {
  const { 
    activeLoadout, 
    allAbilities, 
    useAbility, 
    getAbilityCooldown,
    getAbilityUsageCount 
  } = useAbilities();
  
  const [cooldowns, setCooldowns] = useState<{ [key: string]: number }>({});
  const [isExpanded, setIsExpanded] = useState(false);

  // Update cooldowns
  useEffect(() => {
    const interval = setInterval(() => {
      setCooldowns(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(abilityId => {
          if (updated[abilityId] > 0) {
            updated[abilityId] -= 1;
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!activeLoadout) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center">
        <p className="text-gray-400">No active loadout</p>
      </div>
    );
  }

  const loadoutAbilities = Object.values(activeLoadout.abilities)
    .filter(Boolean)
    .map(abilityId => allAbilities.find(a => a.id === abilityId))
    .filter(Boolean) as Ability[];

  const handleAbilityClick = async (ability: Ability) => {
    if (!isPlayerTurn) return;
    
    const cooldown = cooldowns[ability.id] || 0;
    if (cooldown > 0) return;
    
    const usageCount = getAbilityUsageCount(ability.id, matchId);
    if (ability.maxUses && usageCount >= ability.maxUses) return;

    const result = await useAbility(ability.id, matchId, gameState);
    if (result.success) {
      onAbilityUsed(result.effect);
      setCooldowns(prev => ({
        ...prev,
        [ability.id]: ability.cooldown
      }));
    }
  };

  const getAbilityStatus = (ability: Ability) => {
    const cooldown = cooldowns[ability.id] || 0;
    const usageCount = getAbilityUsageCount(ability.id, matchId);
    
    if (cooldown > 0) return { disabled: true, reason: `${cooldown}s` };
    if (ability.maxUses && usageCount >= ability.maxUses) {
      return { disabled: true, reason: 'Used' };
    }
    if (!isPlayerTurn) return { disabled: true, reason: 'Wait' };
    
    return { disabled: false, reason: '' };
  };

  const rarityColors = {
    common: 'border-gray-500',
    rare: 'border-blue-500',
    epic: 'border-purple-500',
    legendary: 'border-yellow-500'
  };

  return (
    <div className={`fixed bottom-4 left-4 bg-gray-800 rounded-lg shadow-xl border border-gray-700 transition-all duration-300 ${
      isExpanded ? 'w-80' : 'w-16'
    }`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 text-white hover:bg-gray-700 rounded-lg transition-colors"
      >
        {isExpanded ? (
          <div className="flex items-center justify-between">
            <span className="font-medium">Abilities</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        ) : (
          <div className="flex justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        )}
      </button>

      {/* Abilities List */}
      {isExpanded && (
        <div className="p-3 pt-0 space-y-2">
          {loadoutAbilities.map(ability => {
            const status = getAbilityStatus(ability);
            const usageCount = getAbilityUsageCount(ability.id, matchId);
            
            return (
              <button
                key={ability.id}
                onClick={() => handleAbilityClick(ability)}
                disabled={status.disabled}
                className={`w-full p-3 rounded-lg border-2 transition-all ${
                  rarityColors[ability.rarity]
                } ${
                  status.disabled 
                    ? 'opacity-50 cursor-not-allowed bg-gray-700' 
                    : 'hover:bg-gray-700 bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="font-medium text-white text-sm">{ability.name}</div>
                    <div className="text-xs text-gray-400">{ability.description}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex text-yellow-400">
                        {'★'.repeat(ability.starCost)}
                      </div>
                      {ability.maxUses && (
                        <span className="text-xs text-gray-400">
                          {ability.maxUses - usageCount}/{ability.maxUses}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {status.disabled && (
                    <div className="text-xs text-red-400 font-bold">
                      {status.reason}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
          
          {loadoutAbilities.length === 0 && (
            <div className="text-center text-gray-400 py-4">
              <p className="text-sm">No abilities equipped</p>
              <p className="text-xs">Configure loadout in Vault</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Ability Card Component
```typescript
// src/components/vault/AbilityCard.tsx
'use client';

import React, { useState } from 'react';

interface AbilityCardProps {
  ability: Ability;
  userAbility?: UserAbility;
  isUnlocked: boolean;
  canEquip: boolean;
  onEquip?: (abilityId: string) => void;
}

export default function AbilityCard({ 
  ability, 
  userAbility, 
  isUnlocked, 
  canEquip, 
  onEquip 
}: AbilityCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const rarityColors = {
    common: 'border-gray-500 bg-gradient-to-br from-gray-800 to-gray-900',
    rare: 'border-blue-500 bg-gradient-to-br from-blue-900 to-blue-800',
    epic: 'border-purple-500 bg-gradient-to-br from-purple-900 to-purple-800',
    legendary: 'border-yellow-500 bg-gradient-to-br from-yellow-900 to-yellow-800'
  };

  const categoryIcons = {
    dice: '🎲',
    score: '⭐',
    defensive: '🛡️',
    utility: '⚡',
    gamechanging: '💫'
  };

  const getUnlockRequirement = () => {
    if (isUnlocked) return null;
    return `Unlocks at Level ${ability.unlockLevel}`;
  };

  return (
    <div className={`relative rounded-lg border-2 p-4 transition-all duration-300 ${
      rarityColors[ability.rarity]
    } ${!isUnlocked ? 'opacity-60' : 'hover:scale-105'}`}>
      {/* Rarity Badge */}
      <div className="absolute top-2 right-2">
        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
          ability.rarity === 'common' ? 'bg-gray-600' :
          ability.rarity === 'rare' ? 'bg-blue-600' :
          ability.rarity === 'epic' ? 'bg-purple-600' :
          'bg-yellow-600'
        } text-white`}>
          {ability.rarity}
        </span>
      </div>

      {/* Category Icon */}
      <div className="absolute top-2 left-2">
        <span className="text-2xl">{categoryIcons[ability.category]}</span>
      </div>

      <div className="mt-8">
        {/* Ability Name */}
        <h3 className="text-lg font-bold text-white mb-2">{ability.name}</h3>

        {/* Star Cost */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex text-yellow-400">
            {'★'.repeat(ability.starCost)}
            {'☆'.repeat(5 - ability.starCost)}
          </div>
          <span className="text-sm text-gray-400">({ability.starCost} stars)</span>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm mb-3">{ability.description}</p>

        {/* Usage Stats */}
        {userAbility && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="text-center">
              <p className="text-lg font-bold text-blue-400">{userAbility.timesUsed}</p>
              <p className="text-xs text-gray-400">Times Used</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-400">{userAbility.successRate}%</p>
              <p className="text-xs text-gray-400">Success Rate</p>
            </div>
          </div>
        )}

        {/* Unlock Requirement */}
        {!isUnlocked && (
          <div className="bg-gray-700 rounded p-2 mb-3">
            <p className="text-sm text-yellow-400 text-center">{getUnlockRequirement()}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
          
          {isUnlocked && canEquip && onEquip && (
            <button
              onClick={() => onEquip(ability.id)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                userAbility?.isEquipped
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {userAbility?.isEquipped ? 'Equipped' : 'Equip'}
            </button>
          )}
        </div>

        {/* Detailed Info */}
        {showDetails && (
          <div className="mt-3 p-3 bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-300 mb-2">{ability.longDescription}</p>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Cooldown:</span>
                <span className="text-white ml-1">{ability.cooldown}s</span>
              </div>
              {ability.maxUses && (
                <div>
                  <span className="text-gray-400">Max Uses:</span>
                  <span className="text-white ml-1">{ability.maxUses}</span>
                </div>
              )}
              <div>
                <span className="text-gray-400">Category:</span>
                <span className="text-white ml-1 capitalize">{ability.category}</span>
              </div>
              <div>
                <span className="text-gray-400">Unlock:</span>
                <span className="text-white ml-1">Level {ability.unlockLevel}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

## Implementation Phases

### Phase 1: Core System (Week 1)
- Database schema and basic services
- Ability definitions and effects system
- Basic progression tracking

### Phase 2: Vault Integration (Week 2)
- Abilities tab in vault
- Loadout management system
- Ability card components

### Phase 3: Match Integration (Week 3)
- In-match abilities panel
- Ability activation and effects
- Real-time cooldown tracking

### Phase 4: Progression & Polish (Week 4)
- XP system and level progression
- Unlock animations and notifications
- Balance testing and adjustments

This abilities system adds strategic depth to DashDice matches while providing clear progression goals and customization options for players.
