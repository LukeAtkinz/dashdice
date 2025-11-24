'use client';

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { Background, AVAILABLE_BACKGROUNDS, getBackgroundById, resolveBackgroundPath } from '@/config/backgrounds';

export class BackgroundService {
  /**
   * Update user's equipped background
   */
  static async updateEquippedBackground(userId: string, backgroundId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        equippedBackground: backgroundId
      });
    } catch (error) {
      console.error('Error updating equipped background:', error);
      throw error;
    }
  }

  /**
   * Get user's owned backgrounds
   */
  static getUserOwnedBackgrounds(ownedBackgroundIds: string[]): Background[] {
    return AVAILABLE_BACKGROUNDS.filter(bg => ownedBackgroundIds.includes(bg.id));
  }

  /**
   * Get background by ID with fallback
   */
  static getBackgroundSafely(backgroundId?: string): Background {
    if (!backgroundId) {
      return AVAILABLE_BACKGROUNDS[0]; // Default background
    }
    
    return getBackgroundById(backgroundId) || AVAILABLE_BACKGROUNDS[0];
  }

  /**
   * Get background URL with proper formatting
   */
  static getBackgroundUrl(background: Background): string {
    const resolved = resolveBackgroundPath(background.id, 'dashboard-display');
    return resolved?.path || '';
  }

  /**
   * Get all available backgrounds
   */
  static getAllBackgrounds(): Background[] {
    return [...AVAILABLE_BACKGROUNDS];
  }

  /**
   * Check if user owns a specific background
   */
  static userOwnsBackground(ownedBackgrounds: string[], backgroundId: string): boolean {
    return ownedBackgrounds.includes(backgroundId);
  }

  /**
   * Grant all backgrounds to a user (for new users)
   */
  static async grantAllBackgrounds(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const allBackgroundIds = AVAILABLE_BACKGROUNDS.map(bg => bg.id);
      
      await updateDoc(userRef, {
        ownedBackgrounds: allBackgroundIds
      });
    } catch (error) {
      console.error('Error granting backgrounds:', error);
      throw error;
    }
  }
}
