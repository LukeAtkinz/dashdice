# Dice Customization Implementation Guide

## Overview
This README outlines the implementation of a comprehensive dice customization system for DashDice, allowing players to unlock and equip unique dice shapes and fonts using crystals earned through gameplay or purchased in the shop.

## Core Features
- **Dice Shapes**: Various 3D dice models (classic, rounded, gem, chrome, wooden, etc.)
- **Dice Fonts**: Different number/dot styles (classic dots, roman numerals, symbols, digital, etc.)
- **Crystal Currency**: Earned through gameplay, used for cosmetic unlocks
- **Collection System**: Track collected vs uncollected items
- **Shop Integration**: Purchase crystals or items directly with real money
- **Vault Integration**: Equip and preview dice customizations

## Database Schema

### Firestore Collections

#### Dice Shapes Collection
```typescript
// src/types/index.ts
interface DiceShape {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  crystalCost: number;
  shopPrice?: number; // USD price if purchasable
  previewImage: string;
  modelPath: string; // 3D model file path
  category: 'classic' | 'geometric' | 'themed' | 'premium';
  unlockRequirement?: {
    type: 'level' | 'wins' | 'streak' | 'achievement';
    value: number;
  };
  isDefault: boolean;
  createdAt: Timestamp;
  tags: string[];
}
```

#### Dice Fonts Collection
```typescript
interface DiceFont {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  crystalCost: number;
  shopPrice?: number; // USD price if purchasable
  previewImage: string;
  fontFamily: string;
  style: 'dots' | 'numbers' | 'roman' | 'symbols' | 'custom';
  category: 'classic' | 'modern' | 'themed' | 'premium';
  unlockRequirement?: {
    type: 'level' | 'wins' | 'streak' | 'achievement';
    value: number;
  };
  isDefault: boolean;
  createdAt: Timestamp;
  tags: string[];
}
```

#### User Crystals Collection
```typescript
interface UserCrystals {
  userId: string;
  totalCrystals: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lastUpdated: Timestamp;
  sources: {
    gameplay: number;
    achievements: number;
    dailyRewards: number;
    purchases: number;
    events: number;
  };
}
```

#### User Dice Collection
```typescript
interface UserDiceCollection {
  userId: string;
  ownedShapes: string[]; // Array of dice shape IDs
  ownedFonts: string[]; // Array of dice font IDs
  equippedShape: string; // Currently equipped shape ID
  equippedFont: string; // Currently equipped font ID
  collectionStats: {
    totalShapes: number;
    totalFonts: number;
    unlockedShapes: number;
    unlockedFonts: number;
    completionPercentage: number;
  };
  lastUpdated: Timestamp;
}
```

#### Crystal Transactions Collection
```typescript
interface CrystalTransaction {
  id: string;
  userId: string;
  type: 'earned' | 'spent' | 'purchased' | 'refunded';
  amount: number;
  source: 'match_win' | 'achievement' | 'daily_reward' | 'shop_purchase' | 'item_unlock' | 'tournament_prize';
  itemId?: string; // If spent on dice shape/font
  itemType?: 'dice_shape' | 'dice_font' | 'background' | 'music';
  matchId?: string; // If earned from match
  achievementId?: string; // If earned from achievement
  timestamp: Timestamp;
  balanceBefore: number;
  balanceAfter: number;
  metadata?: Record<string, any>;
}
```

## Implementation Architecture

### 1. Crystal Management Service

```typescript
// src/services/crystalService.ts
import { 
  collection, 
  doc, 
  addDoc,
  updateDoc, 
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';

export class CrystalService {
  // Award crystals for gameplay
  static async awardCrystals(
    userId: string, 
    amount: number, 
    source: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      return await runTransaction(db, async (transaction) => {
        // Get current crystal balance
        const crystalRef = doc(db, 'userCrystals', userId);
        const crystalDoc = await transaction.get(crystalRef);
        
        let currentBalance = 0;
        if (crystalDoc.exists()) {
          currentBalance = crystalDoc.data().totalCrystals;
        }

        const newBalance = currentBalance + amount;

        // Update crystal balance
        const crystalData = {
          userId,
          totalCrystals: newBalance,
          lifetimeEarned: crystalDoc.exists() 
            ? crystalDoc.data().lifetimeEarned + amount 
            : amount,
          lifetimeSpent: crystalDoc.exists() 
            ? crystalDoc.data().lifetimeSpent 
            : 0,
          lastUpdated: serverTimestamp(),
          sources: {
            ...crystalDoc.exists() ? crystalDoc.data().sources : {},
            [source]: (crystalDoc.exists() ? crystalDoc.data().sources?.[source] || 0 : 0) + amount
          }
        };

        if (crystalDoc.exists()) {
          transaction.update(crystalRef, crystalData);
        } else {
          transaction.set(crystalRef, crystalData);
        }

        // Log transaction
        const transactionRef = doc(collection(db, 'crystalTransactions'));
        transaction.set(transactionRef, {
          userId,
          type: 'earned',
          amount,
          source,
          timestamp: serverTimestamp(),
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          metadata: metadata || null
        });

        return true;
      });
    } catch (error) {
      console.error('Error awarding crystals:', error);
      return false;
    }
  }

  // Spend crystals on items
  static async spendCrystals(
    userId: string, 
    amount: number, 
    itemId: string,
    itemType: 'dice_shape' | 'dice_font' | 'background' | 'music'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await runTransaction(db, async (transaction) => {
        // Get current crystal balance
        const crystalRef = doc(db, 'userCrystals', userId);
        const crystalDoc = await transaction.get(crystalRef);
        
        if (!crystalDoc.exists()) {
          return { success: false, error: 'No crystal balance found' };
        }

        const currentBalance = crystalDoc.data().totalCrystals;
        
        if (currentBalance < amount) {
          return { success: false, error: 'Insufficient crystals' };
        }

        const newBalance = currentBalance - amount;

        // Update crystal balance
        transaction.update(crystalRef, {
          totalCrystals: newBalance,
          lifetimeSpent: crystalDoc.data().lifetimeSpent + amount,
          lastUpdated: serverTimestamp()
        });

        // Log transaction
        const transactionRef = doc(collection(db, 'crystalTransactions'));
        transaction.set(transactionRef, {
          userId,
          type: 'spent',
          amount,
          source: 'item_unlock',
          itemId,
          itemType,
          timestamp: serverTimestamp(),
          balanceBefore: currentBalance,
          balanceAfter: newBalance
        });

        return { success: true };
      });
    } catch (error) {
      console.error('Error spending crystals:', error);
      return { success: false, error: 'Transaction failed' };
    }
  }

  // Get user's crystal balance
  static async getCrystalBalance(userId: string): Promise<number> {
    try {
      const crystalDoc = await getDoc(doc(db, 'userCrystals', userId));
      return crystalDoc.exists() ? crystalDoc.data().totalCrystals : 0;
    } catch (error) {
      console.error('Error getting crystal balance:', error);
      return 0;
    }
  }

  // Get crystal transaction history
  static async getCrystalHistory(userId: string, limit: number = 50): Promise<CrystalTransaction[]> {
    try {
      const q = query(
        collection(db, 'crystalTransactions'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limit)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CrystalTransaction[];
    } catch (error) {
      console.error('Error getting crystal history:', error);
      return [];
    }
  }

  // Calculate crystals earned from match
  static calculateMatchCrystals(
    matchResult: 'win' | 'loss' | 'draw',
    streakCount: number,
    playerLevel: number
  ): number {
    let baseCrystals = 0;
    
    switch (matchResult) {
      case 'win':
        baseCrystals = 3;
        break;
      case 'draw':
        baseCrystals = 1;
        break;
      case 'loss':
        baseCrystals = 1;
        break;
    }

    // Streak bonus (additional crystal per consecutive win)
    if (matchResult === 'win' && streakCount > 1) {
      baseCrystals += Math.min(streakCount - 1, 5); // Max 5 bonus crystals
    }

    // Level bonus (every 10 levels = +1 crystal)
    const levelBonus = Math.floor(playerLevel / 10);
    
    return baseCrystals + levelBonus;
  }
}
```

### 2. Dice Customization Service

```typescript
// src/services/diceCustomizationService.ts
import { 
  collection, 
  doc, 
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';
import { CrystalService } from './crystalService';

export class DiceCustomizationService {
  // Get all available dice shapes
  static async getAllDiceShapes(): Promise<DiceShape[]> {
    try {
      const q = query(
        collection(db, 'diceShapes'),
        orderBy('rarity'),
        orderBy('name')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DiceShape[];
    } catch (error) {
      console.error('Error getting dice shapes:', error);
      return [];
    }
  }

  // Get all available dice fonts
  static async getAllDiceFonts(): Promise<DiceFont[]> {
    try {
      const q = query(
        collection(db, 'diceFonts'),
        orderBy('rarity'),
        orderBy('name')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DiceFont[];
    } catch (error) {
      console.error('Error getting dice fonts:', error);
      return [];
    }
  }

  // Get user's dice collection
  static async getUserDiceCollection(userId: string): Promise<UserDiceCollection | null> {
    try {
      const collectionDoc = await getDoc(doc(db, 'userDiceCollections', userId));
      
      if (!collectionDoc.exists()) {
        // Create default collection
        const defaultCollection: UserDiceCollection = {
          userId,
          ownedShapes: ['classic_cube'], // Default shape
          ownedFonts: ['classic_dots'], // Default font
          equippedShape: 'classic_cube',
          equippedFont: 'classic_dots',
          collectionStats: {
            totalShapes: 0,
            totalFonts: 0,
            unlockedShapes: 1,
            unlockedFonts: 1,
            completionPercentage: 0
          },
          lastUpdated: new Date()
        };

        await updateDoc(doc(db, 'userDiceCollections', userId), defaultCollection);
        return defaultCollection;
      }

      return { id: collectionDoc.id, ...collectionDoc.data() } as UserDiceCollection;
    } catch (error) {
      console.error('Error getting user dice collection:', error);
      return null;
    }
  }

  // Unlock dice shape with crystals
  static async unlockDiceShape(userId: string, shapeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await runTransaction(db, async (transaction) => {
        // Get dice shape details
        const shapeDoc = await transaction.get(doc(db, 'diceShapes', shapeId));
        if (!shapeDoc.exists()) {
          return { success: false, error: 'Dice shape not found' };
        }

        const shape = shapeDoc.data() as DiceShape;
        
        // Get user's collection
        const collectionRef = doc(db, 'userDiceCollections', userId);
        const collectionDoc = await transaction.get(collectionRef);
        
        if (!collectionDoc.exists()) {
          return { success: false, error: 'User collection not found' };
        }

        const collection = collectionDoc.data() as UserDiceCollection;
        
        // Check if already owned
        if (collection.ownedShapes.includes(shapeId)) {
          return { success: false, error: 'Already owned' };
        }

        // Check unlock requirements
        if (shape.unlockRequirement) {
          // TODO: Implement requirement checking based on user stats
        }

        // Spend crystals
        const crystalResult = await CrystalService.spendCrystals(
          userId, 
          shape.crystalCost, 
          shapeId, 
          'dice_shape'
        );

        if (!crystalResult.success) {
          return crystalResult;
        }

        // Add to collection
        const updatedShapes = [...collection.ownedShapes, shapeId];
        const allShapes = await this.getAllDiceShapes();
        const totalShapes = allShapes.length;

        transaction.update(collectionRef, {
          ownedShapes: updatedShapes,
          'collectionStats.unlockedShapes': updatedShapes.length,
          'collectionStats.totalShapes': totalShapes,
          'collectionStats.completionPercentage': 
            ((updatedShapes.length + collection.ownedFonts.length) / (totalShapes + collection.collectionStats.totalFonts)) * 100,
          lastUpdated: new Date()
        });

        return { success: true };
      });
    } catch (error) {
      console.error('Error unlocking dice shape:', error);
      return { success: false, error: 'Failed to unlock shape' };
    }
  }

  // Unlock dice font with crystals
  static async unlockDiceFont(userId: string, fontId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await runTransaction(db, async (transaction) => {
        // Get dice font details
        const fontDoc = await transaction.get(doc(db, 'diceFonts', fontId));
        if (!fontDoc.exists()) {
          return { success: false, error: 'Dice font not found' };
        }

        const font = fontDoc.data() as DiceFont;
        
        // Get user's collection
        const collectionRef = doc(db, 'userDiceCollections', userId);
        const collectionDoc = await transaction.get(collectionRef);
        
        if (!collectionDoc.exists()) {
          return { success: false, error: 'User collection not found' };
        }

        const collection = collectionDoc.data() as UserDiceCollection;
        
        // Check if already owned
        if (collection.ownedFonts.includes(fontId)) {
          return { success: false, error: 'Already owned' };
        }

        // Check unlock requirements
        if (font.unlockRequirement) {
          // TODO: Implement requirement checking based on user stats
        }

        // Spend crystals
        const crystalResult = await CrystalService.spendCrystals(
          userId, 
          font.crystalCost, 
          fontId, 
          'dice_font'
        );

        if (!crystalResult.success) {
          return crystalResult;
        }

        // Add to collection
        const updatedFonts = [...collection.ownedFonts, fontId];
        const allFonts = await this.getAllDiceFonts();
        const totalFonts = allFonts.length;

        transaction.update(collectionRef, {
          ownedFonts: updatedFonts,
          'collectionStats.unlockedFonts': updatedFonts.length,
          'collectionStats.totalFonts': totalFonts,
          'collectionStats.completionPercentage': 
            ((collection.ownedShapes.length + updatedFonts.length) / (collection.collectionStats.totalShapes + totalFonts)) * 100,
          lastUpdated: new Date()
        });

        return { success: true };
      });
    } catch (error) {
      console.error('Error unlocking dice font:', error);
      return { success: false, error: 'Failed to unlock font' };
    }
  }

  // Equip dice shape
  static async equipDiceShape(userId: string, shapeId: string): Promise<boolean> {
    try {
      const collectionRef = doc(db, 'userDiceCollections', userId);
      const collectionDoc = await getDoc(collectionRef);
      
      if (!collectionDoc.exists()) {
        return false;
      }

      const collection = collectionDoc.data() as UserDiceCollection;
      
      // Check if user owns the shape
      if (!collection.ownedShapes.includes(shapeId)) {
        return false;
      }

      await updateDoc(collectionRef, {
        equippedShape: shapeId,
        lastUpdated: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error equipping dice shape:', error);
      return false;
    }
  }

  // Equip dice font
  static async equipDiceFont(userId: string, fontId: string): Promise<boolean> {
    try {
      const collectionRef = doc(db, 'userDiceCollections', userId);
      const collectionDoc = await getDoc(collectionRef);
      
      if (!collectionDoc.exists()) {
        return false;
      }

      const collection = collectionDoc.data() as UserDiceCollection;
      
      // Check if user owns the font
      if (!collection.ownedFonts.includes(fontId)) {
        return false;
      }

      await updateDoc(collectionRef, {
        equippedFont: fontId,
        lastUpdated: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error equipping dice font:', error);
      return false;
    }
  }

  // Get user's equipped dice customization
  static async getEquippedCustomization(userId: string): Promise<{
    shape: DiceShape | null;
    font: DiceFont | null;
  }> {
    try {
      const collection = await this.getUserDiceCollection(userId);
      if (!collection) {
        return { shape: null, font: null };
      }

      const [shapeDoc, fontDoc] = await Promise.all([
        getDoc(doc(db, 'diceShapes', collection.equippedShape)),
        getDoc(doc(db, 'diceFonts', collection.equippedFont))
      ]);

      return {
        shape: shapeDoc.exists() ? { id: shapeDoc.id, ...shapeDoc.data() } as DiceShape : null,
        font: fontDoc.exists() ? { id: fontDoc.id, ...fontDoc.data() } as DiceFont : null
      };
    } catch (error) {
      console.error('Error getting equipped customization:', error);
      return { shape: null, font: null };
    }
  }
}
```

### 3. Dice Customization Context

```typescript
// src/context/DiceCustomizationContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DiceCustomizationService } from '@/services/diceCustomizationService';
import { CrystalService } from '@/services/crystalService';
import { useAuth } from './AuthContext';

interface DiceCustomizationContextType {
  // Collection state
  allShapes: DiceShape[];
  allFonts: DiceFont[];
  userCollection: UserDiceCollection | null;
  crystalBalance: number;
  
  // Equipped items
  equippedShape: DiceShape | null;
  equippedFont: DiceFont | null;
  
  // Loading states
  isLoading: boolean;
  
  // Actions
  unlockShape: (shapeId: string) => Promise<{ success: boolean; error?: string }>;
  unlockFont: (fontId: string) => Promise<{ success: boolean; error?: string }>;
  equipShape: (shapeId: string) => Promise<boolean>;
  equipFont: (fontId: string) => Promise<boolean>;
  refreshCollection: () => Promise<void>;
  refreshCrystals: () => Promise<void>;
  
  // Utility functions
  isShapeOwned: (shapeId: string) => boolean;
  isFontOwned: (fontId: string) => boolean;
  getCollectionProgress: () => { collected: number; total: number; percentage: number };
}

const DiceCustomizationContext = createContext<DiceCustomizationContextType | undefined>(undefined);

export function DiceCustomizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [allShapes, setAllShapes] = useState<DiceShape[]>([]);
  const [allFonts, setAllFonts] = useState<DiceFont[]>([]);
  const [userCollection, setUserCollection] = useState<UserDiceCollection | null>(null);
  const [crystalBalance, setCrystalBalance] = useState(0);
  const [equippedShape, setEquippedShape] = useState<DiceShape | null>(null);
  const [equippedFont, setEquippedFont] = useState<DiceFont | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load all data on user change
  useEffect(() => {
    if (user) {
      loadAllData();
    } else {
      resetState();
    }
  }, [user]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [shapes, fonts, collection, crystals, equipped] = await Promise.all([
        DiceCustomizationService.getAllDiceShapes(),
        DiceCustomizationService.getAllDiceFonts(),
        DiceCustomizationService.getUserDiceCollection(user!.uid),
        CrystalService.getCrystalBalance(user!.uid),
        DiceCustomizationService.getEquippedCustomization(user!.uid)
      ]);

      setAllShapes(shapes);
      setAllFonts(fonts);
      setUserCollection(collection);
      setCrystalBalance(crystals);
      setEquippedShape(equipped.shape);
      setEquippedFont(equipped.font);
    } catch (error) {
      console.error('Error loading dice customization data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setAllShapes([]);
    setAllFonts([]);
    setUserCollection(null);
    setCrystalBalance(0);
    setEquippedShape(null);
    setEquippedFont(null);
  };

  const unlockShape = async (shapeId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const result = await DiceCustomizationService.unlockDiceShape(user.uid, shapeId);
    
    if (result.success) {
      // Refresh collection and crystals
      await Promise.all([
        refreshCollection(),
        refreshCrystals()
      ]);
    }
    
    return result;
  };

  const unlockFont = async (fontId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const result = await DiceCustomizationService.unlockDiceFont(user.uid, fontId);
    
    if (result.success) {
      // Refresh collection and crystals
      await Promise.all([
        refreshCollection(),
        refreshCrystals()
      ]);
    }
    
    return result;
  };

  const equipShape = async (shapeId: string): Promise<boolean> => {
    if (!user) return false;

    const success = await DiceCustomizationService.equipDiceShape(user.uid, shapeId);
    
    if (success) {
      // Update equipped shape
      const shape = allShapes.find(s => s.id === shapeId);
      setEquippedShape(shape || null);
      await refreshCollection();
    }
    
    return success;
  };

  const equipFont = async (fontId: string): Promise<boolean> => {
    if (!user) return false;

    const success = await DiceCustomizationService.equipDiceFont(user.uid, fontId);
    
    if (success) {
      // Update equipped font
      const font = allFonts.find(f => f.id === fontId);
      setEquippedFont(font || null);
      await refreshCollection();
    }
    
    return success;
  };

  const refreshCollection = async () => {
    if (!user) return;
    
    const collection = await DiceCustomizationService.getUserDiceCollection(user.uid);
    setUserCollection(collection);
  };

  const refreshCrystals = async () => {
    if (!user) return;
    
    const crystals = await CrystalService.getCrystalBalance(user.uid);
    setCrystalBalance(crystals);
  };

  const isShapeOwned = (shapeId: string): boolean => {
    return userCollection?.ownedShapes.includes(shapeId) || false;
  };

  const isFontOwned = (fontId: string): boolean => {
    return userCollection?.ownedFonts.includes(fontId) || false;
  };

  const getCollectionProgress = (): { collected: number; total: number; percentage: number } => {
    if (!userCollection) {
      return { collected: 0, total: 0, percentage: 0 };
    }

    const collected = userCollection.ownedShapes.length + userCollection.ownedFonts.length;
    const total = allShapes.length + allFonts.length;
    const percentage = total > 0 ? (collected / total) * 100 : 0;

    return { collected, total, percentage };
  };

  const value: DiceCustomizationContextType = {
    allShapes,
    allFonts,
    userCollection,
    crystalBalance,
    equippedShape,
    equippedFont,
    isLoading,
    unlockShape,
    unlockFont,
    equipShape,
    equipFont,
    refreshCollection,
    refreshCrystals,
    isShapeOwned,
    isFontOwned,
    getCollectionProgress
  };

  return (
    <DiceCustomizationContext.Provider value={value}>
      {children}
    </DiceCustomizationContext.Provider>
  );
}

export function useDiceCustomization() {
  const context = useContext(DiceCustomizationContext);
  if (context === undefined) {
    throw new Error('useDiceCustomization must be used within a DiceCustomizationProvider');
  }
  return context;
}
```

## Frontend Components

### 1. Dice Collection Tab

```typescript
// src/components/vault/DiceCollectionTab.tsx
'use client';

import React, { useState } from 'react';
import { useDiceCustomization } from '@/context/DiceCustomizationContext';
import { DiceShapeCard } from './DiceShapeCard';
import { DiceFontCard } from './DiceFontCard';
import { CollectionProgress } from './CollectionProgress';
import { CrystalBalance } from '../ui/CrystalBalance';

export default function DiceCollectionTab() {
  const {
    allShapes,
    allFonts,
    crystalBalance,
    isLoading,
    getCollectionProgress
  } = useDiceCustomization();
  
  const [activeTab, setActiveTab] = useState<'shapes' | 'fonts'>('shapes');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'collected' | 'uncollected'>('all');

  const progress = getCollectionProgress();

  const filterItems = <T extends { rarity: string }>(items: T[], isOwned: (id: string) => boolean) => {
    return items.filter(item => {
      const rarityMatch = rarityFilter === 'all' || item.rarity === rarityFilter;
      const collectionMatch = collectionFilter === 'all' || 
        (collectionFilter === 'collected' && isOwned(item.id)) ||
        (collectionFilter === 'uncollected' && !isOwned(item.id));
      
      return rarityMatch && collectionMatch;
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Dice Collection</h2>
          <p className="text-gray-400">Customize your dice with unique shapes and fonts</p>
        </div>
        <CrystalBalance balance={crystalBalance} />
      </div>

      {/* Collection Progress */}
      <CollectionProgress
        collected={progress.collected}
        total={progress.total}
        percentage={progress.percentage}
      />

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('shapes')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'shapes'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Dice Shapes ({allShapes.length})
        </button>
        <button
          onClick={() => setActiveTab('fonts')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'fonts'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Dice Fonts ({allFonts.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Rarity
          </label>
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2"
          >
            <option value="all">All Rarities</option>
            <option value="common">Common</option>
            <option value="rare">Rare</option>
            <option value="epic">Epic</option>
            <option value="legendary">Legendary</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Collection
          </label>
          <select
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value as any)}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2"
          >
            <option value="all">All Items</option>
            <option value="collected">Collected</option>
            <option value="uncollected">Uncollected</option>
          </select>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {activeTab === 'shapes' ? (
          filterItems(allShapes, (id) => true).map(shape => (
            <DiceShapeCard key={shape.id} shape={shape} />
          ))
        ) : (
          filterItems(allFonts, (id) => true).map(font => (
            <DiceFontCard key={font.id} font={font} />
          ))
        )}
      </div>

      {/* Empty State */}
      {((activeTab === 'shapes' && filterItems(allShapes, () => true).length === 0) ||
        (activeTab === 'fonts' && filterItems(allFonts, () => true).length === 0)) && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎲</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No items match your filters
          </h3>
          <p className="text-gray-400">
            Try adjusting your filters to see more items
          </p>
        </div>
      )}
    </div>
  );
}
```

### 2. Dice Shape Card

```typescript
// src/components/vault/DiceShapeCard.tsx
'use client';

import React, { useState } from 'react';
import { useDiceCustomization } from '@/context/DiceCustomizationContext';
import { getRarityColor, getRarityBadge } from '@/utils/rarityUtils';

interface DiceShapeCardProps {
  shape: DiceShape;
}

export function DiceShapeCard({ shape }: DiceShapeCardProps) {
  const {
    crystalBalance,
    equippedShape,
    isShapeOwned,
    unlockShape,
    equipShape
  } = useDiceCustomization();
  
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isEquipping, setIsEquipping] = useState(false);

  const isOwned = isShapeOwned(shape.id);
  const isEquipped = equippedShape?.id === shape.id;
  const canAfford = crystalBalance >= shape.crystalCost;
  const rarityColor = getRarityColor(shape.rarity);

  const handleUnlock = async () => {
    if (!canAfford || isUnlocking) return;

    setIsUnlocking(true);
    try {
      const result = await unlockShape(shape.id);
      if (!result.success) {
        // Show error message
        console.error('Failed to unlock shape:', result.error);
      }
    } catch (error) {
      console.error('Error unlocking shape:', error);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleEquip = async () => {
    if (!isOwned || isEquipping || isEquipped) return;

    setIsEquipping(true);
    try {
      await equipShape(shape.id);
    } catch (error) {
      console.error('Error equipping shape:', error);
    } finally {
      setIsEquipping(false);
    }
  };

  return (
    <div className={`bg-gray-800 rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${
      isEquipped ? 'border-blue-500' : 'border-gray-700 hover:border-gray-600'
    }`}>
      {/* Preview Image */}
      <div className="relative aspect-square bg-gray-900 flex items-center justify-center overflow-hidden">
        <img
          src={shape.previewImage}
          alt={shape.name}
          className="w-full h-full object-cover"
        />
        
        {/* Rarity Badge */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold text-white ${rarityColor}`}>
          {getRarityBadge(shape.rarity)}
        </div>

        {/* Equipped Badge */}
        {isEquipped && (
          <div className="absolute top-2 left-2 bg-blue-600 px-2 py-1 rounded text-xs font-bold text-white">
            EQUIPPED
          </div>
        )}

        {/* Lock Overlay */}
        {!isOwned && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-3xl mb-2">🔒</div>
              <div className="text-sm font-medium">
                {shape.crystalCost} Crystals
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-white mb-1">{shape.name}</h3>
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">
          {shape.description}
        </p>

        {/* Tags */}
        {shape.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {shape.tags.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Button */}
        {!isOwned ? (
          <button
            onClick={handleUnlock}
            disabled={!canAfford || isUnlocking}
            className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
              canAfford && !isUnlocking
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isUnlocking ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Unlocking...
              </div>
            ) : (
              `Unlock (${shape.crystalCost} 💎)`
            )}
          </button>
        ) : isEquipped ? (
          <button
            disabled
            className="w-full py-2 px-4 rounded-lg font-medium text-sm bg-green-600 text-white cursor-default"
          >
            ✓ Equipped
          </button>
        ) : (
          <button
            onClick={handleEquip}
            disabled={isEquipping}
            className="w-full py-2 px-4 rounded-lg font-medium text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            {isEquipping ? 'Equipping...' : 'Equip'}
          </button>
        )}
      </div>
    </div>
  );
}
```

### 3. Crystal Balance Component

```typescript
// src/components/ui/CrystalBalance.tsx
'use client';

import React from 'react';

interface CrystalBalanceProps {
  balance: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CrystalBalance({ balance, showLabel = true, size = 'md' }: CrystalBalanceProps) {
  const formatBalance = (amount: number): string => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`flex items-center space-x-2 ${sizeClasses[size]}`}>
      {showLabel && (
        <span className="text-gray-400 font-medium">Crystals:</span>
      )}
      <div className="flex items-center space-x-1">
        <div className={`${iconSizes[size]} text-blue-400`}>💎</div>
        <span className="font-bold text-white">
          {formatBalance(balance)}
        </span>
      </div>
    </div>
  );
}
```

### 4. Collection Progress Component

```typescript
// src/components/vault/CollectionProgress.tsx
'use client';

import React from 'react';

interface CollectionProgressProps {
  collected: number;
  total: number;
  percentage: number;
}

export function CollectionProgress({ collected, total, percentage }: CollectionProgressProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-white">Collection Progress</h3>
        <span className="text-sm text-gray-400">
          {collected} / {total} items
        </span>
      </div>
      
      <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">
          {percentage.toFixed(1)}% Complete
        </span>
        <span className="text-gray-400">
          {total - collected} remaining
        </span>
      </div>
      
      {percentage === 100 && (
        <div className="mt-2 text-center text-yellow-400 font-medium">
          🏆 Collection Complete!
        </div>
      )}
    </div>
  );
}
```

## Game Integration

### Match Completion Crystal Award

```typescript
// src/services/gameService.ts - Add to existing service
export class GameService {
  // Existing methods...

  static async completeMatch(
    matchId: string,
    winnerId: string,
    loserId: string,
    matchResult: 'win' | 'loss' | 'draw'
  ): Promise<void> {
    try {
      // Existing match completion logic...

      // Award crystals to players
      const winnerStats = await this.getUserGameStats(winnerId);
      const loserStats = await this.getUserGameStats(loserId);

      // Calculate crystals for winner
      const winnerCrystals = CrystalService.calculateMatchCrystals(
        'win',
        winnerStats.currentStreak + 1,
        winnerStats.level
      );

      // Calculate crystals for loser
      const loserCrystals = CrystalService.calculateMatchCrystals(
        'loss',
        0, // Streak resets on loss
        loserStats.level
      );

      // Award crystals
      await Promise.all([
        CrystalService.awardCrystals(
          winnerId,
          winnerCrystals,
          'match_win',
          { matchId, opponentId: loserId }
        ),
        CrystalService.awardCrystals(
          loserId,
          loserCrystals,
          'match_participation',
          { matchId, opponentId: winnerId }
        )
      ]);

    } catch (error) {
      console.error('Error completing match:', error);
      throw error;
    }
  }
}
```

## Shop Integration

### Crystal Purchase Options

```typescript
// src/services/shopService.ts - Add to existing service
export class ShopService {
  // Existing methods...

  static readonly CRYSTAL_PACKAGES = [
    {
      id: 'crystals_small',
      name: '100 Crystals',
      crystals: 100,
      price: 0.99,
      bonus: 0,
      popular: false
    },
    {
      id: 'crystals_medium',
      name: '500 Crystals',
      crystals: 500,
      price: 4.99,
      bonus: 50,
      popular: false
    },
    {
      id: 'crystals_large',
      name: '1,200 Crystals',
      crystals: 1200,
      price: 9.99,
      bonus: 200,
      popular: true
    },
    {
      id: 'crystals_xl',
      name: '2,500 Crystals',
      crystals: 2500,
      price: 19.99,
      bonus: 500,
      popular: false
    }
  ];

  static async purchaseCrystals(
    userId: string,
    packageId: string,
    paymentIntentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const crystalPackage = this.CRYSTAL_PACKAGES.find(p => p.id === packageId);
      if (!crystalPackage) {
        return { success: false, error: 'Invalid package' };
      }

      const totalCrystals = crystalPackage.crystals + crystalPackage.bonus;

      // Award crystals
      const success = await CrystalService.awardCrystals(
        userId,
        totalCrystals,
        'shop_purchase',
        {
          packageId,
          paymentIntentId,
          baseAmount: crystalPackage.crystals,
          bonusAmount: crystalPackage.bonus,
          price: crystalPackage.price
        }
      );

      return { success };
    } catch (error) {
      console.error('Error purchasing crystals:', error);
      return { success: false, error: 'Purchase failed' };
    }
  }
}
```

## Implementation Phases

### Phase 1: Core System (Week 1)
1. **Database Setup**
   - Create Firestore collections for dice shapes, fonts, crystals, and collections
   - Implement basic crystal management service
   - Set up default dice shapes and fonts

2. **Crystal System**
   - Implement crystal earning from matches
   - Create crystal transaction logging
   - Build crystal balance tracking

### Phase 2: Collection System (Week 2)
1. **Dice Customization Service**
   - Implement unlock/equip functionality
   - Create collection progress tracking
   - Build user collection management

2. **Basic UI Components**
   - Dice collection tab in vault
   - Crystal balance display
   - Basic dice shape/font cards

### Phase 3: Advanced Features (Week 3)
1. **Enhanced UI**
   - Detailed dice preview system
   - Collection progress indicators
   - Filtering and sorting options

2. **Shop Integration**
   - Crystal purchase packages
   - Direct dice shape/font purchases
   - Premium customization options

### Phase 4: Polish & Optimization (Week 4)
1. **Game Integration**
   - Apply equipped dice in matches
   - Visual dice customization in game
   - Performance optimization

2. **Testing & Refinement**
   - Balance crystal earning rates
   - Test unlock progression
   - Mobile responsiveness

This implementation provides a comprehensive dice customization system that enhances player engagement through collectible cosmetics while generating revenue through crystal purchases and premium items.
