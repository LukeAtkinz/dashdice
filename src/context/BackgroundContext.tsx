'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { AVAILABLE_BACKGROUNDS, getBackgroundById, migrateLegacyBackground, type Background as BackgroundType } from '@/config/backgrounds';

// Use the Background type from the new background system
type Background = BackgroundType;

interface BackgroundContextType {
  DisplayBackgroundEquip: Background | null;
  MatchBackgroundEquip: Background | null;
  setDisplayBackgroundEquip: (background: Background | null) => void;
  setMatchBackgroundEquip: (background: Background | null) => void;
  availableBackgrounds: Background[];
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export const useBackground = () => {
  const context = useContext(BackgroundContext);
  if (!context) {
    throw new Error('useBackground must be used within a BackgroundProvider');
  }
  return context;
};

interface BackgroundProviderProps {
  children: ReactNode;
}

export const BackgroundProvider: React.FC<BackgroundProviderProps> = ({ children }) => {
  const { user } = useAuth();
  
  // Use new background system (imported from backgrounds.ts)
  const availableBackgrounds = AVAILABLE_BACKGROUNDS;

  // Helper function to find background by item ID from inventory
  const findBackgroundByItemId = (itemId: string, inventory: any[]): Background | null => {
    const item = inventory?.find(item => item.id === itemId && item.type === 'background');
    console.log('BackgroundContext: findBackgroundByItemId', {
      itemId,
      item,
      inventoryLength: inventory?.length
    });
    
    if (!item) return null;
    
    // Migrate legacy name to ID, then find background
    const backgroundId = migrateLegacyBackground(item.name);
    const foundBackground = getBackgroundById(backgroundId);
    
    console.log('BackgroundContext: Found background match', {
      itemName: item.name,
      migratedId: backgroundId,
      foundBackground
    });
    
    return foundBackground || null;
  };

  // Helper function to find background by name/ID
  const findBackgroundByName = (backgroundId: string): Background | null => {
    // Migrate legacy references (handles "All For Glory", "Neon City", etc.)
    const migratedId = migrateLegacyBackground(backgroundId);
    const background = getBackgroundById(migratedId);
    
    console.log('BackgroundContext: findBackgroundByName', {
      backgroundId,
      migratedId,
      found: background
    });
    
    return background || null;
  };

  // Theme mapping for backgrounds (uses new IDs)
  const getThemeFromBackground = (background: Background | null): string => {
    if (!background) return 'default';
    
    const themeMap: Record<string, string> = {
      'new-day': 'new-day',
      'on-a-mission': 'on-a-mission', 
      'underwater': 'underwater',
      'relax': 'relax',
      'long-road-ahead': 'long-road-ahead',
      'as-they-fall': 'long-road-ahead',
      'end-of-the-dragon': 'long-road-ahead'
    };
    
    return themeMap[background.id] || 'default';
  };

  // State for equipped backgrounds
  const [DisplayBackgroundEquip, setDisplayBackgroundEquipState] = useState<Background | null>(null);
  const [MatchBackgroundEquip, setMatchBackgroundEquipState] = useState<Background | null>(null);

  // Helper function to ensure background is a complete object
  const ensureCompleteBackgroundObject = (background: Background | string | any | null): Background | null => {
    if (!background) return null;
    
    // If it's already a new Background object (has id field), return it
    if (typeof background === 'object' && background.id) {
      const bg = getBackgroundById(background.id);
      return bg || null;
    }
    
    // If it's a legacy object (has name/file/type), migrate it
    if (typeof background === 'object' && background.name) {
      return findBackgroundByName(background.name);
    }
    
    // If it's a string, try to find the complete object
    if (typeof background === 'string') {
      return findBackgroundByName(background);
    }
    
    console.warn('Invalid background format:', background);
    return null;
  };

  // Enhanced setter functions that persist to Firebase
  const setDisplayBackgroundEquip = async (background: Background | null) => {
    try {
      // Ensure we have a complete background object
      const completeBackground = ensureCompleteBackgroundObject(background);
      setDisplayBackgroundEquipState(completeBackground);
      
      if (user && completeBackground) {
        console.log('BackgroundContext: Saving display background to Firebase:', completeBackground);
        const userRef = doc(db, 'users', user.uid);
        
        // Save using new Background System V2.0 format (ID only)
        await updateDoc(userRef, {
          'inventory.displayBackgroundEquipped': {
            id: completeBackground.id,
            name: completeBackground.name,
            category: completeBackground.category,
            rarity: completeBackground.rarity
          }
        });
        
        console.log('✅ Display background saved to Firebase successfully:', {
          id: completeBackground.id,
          name: completeBackground.name
        });
      }
    } catch (error) {
      console.error('❌ Error saving display background to Firebase:', error);
    }
  };

  const setMatchBackgroundEquip = async (background: Background | null) => {
    try {
      // Ensure we have a complete background object
      const completeBackground = ensureCompleteBackgroundObject(background);
      setMatchBackgroundEquipState(completeBackground);
      
      if (user && completeBackground) {
        console.log('BackgroundContext: Saving match background to Firebase:', completeBackground);
        const userRef = doc(db, 'users', user.uid);
        
        // Save using new Background System V2.0 format (ID only)
        await updateDoc(userRef, {
          'inventory.matchBackgroundEquipped': {
            id: completeBackground.id,
            name: completeBackground.name,
            category: completeBackground.category,
            rarity: completeBackground.rarity
          }
        });
        
        console.log('✅ Match background saved to Firebase successfully:', {
          id: completeBackground.id,
          name: completeBackground.name
        });
      }
    } catch (error) {
      console.error('❌ Error saving match background to Firebase:', error);
    }
  };

  // Apply theme to document based on DisplayBackgroundEquip
  useEffect(() => {
    const theme = getThemeFromBackground(DisplayBackgroundEquip);
    document.documentElement.setAttribute('data-theme', theme);
  }, [DisplayBackgroundEquip]);

  // Listen to user data changes to sync equipped backgrounds from Firebase
  useEffect(() => {
    if (!user) {
      setDisplayBackgroundEquipState(null);
      setMatchBackgroundEquipState(null);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        const inventory = userData.inventory || [];
        
        // Reduced logging to prevent console spam
        if (process.env.NODE_ENV === 'development') {
          console.log('BackgroundContext: User inventory updated', {
            hasDisplayBg: !!userData.inventory?.displayBackgroundEquipped,
            hasMatchBg: !!userData.inventory?.matchBackgroundEquipped,
            inventoryLength: userData.inventory?.length || 0
          });
        }
        
        // Handle display background from inventory
        const displayBgData = userData.inventory?.displayBackgroundEquipped;
        if (displayBgData) {
          // If it's already a complete background object, use it directly
          if (typeof displayBgData === 'object' && displayBgData.name && displayBgData.file && displayBgData.type) {
            setDisplayBackgroundEquipState(displayBgData);
          } else if (typeof displayBgData === 'string') {
            // Legacy support: if it's a string, try to find the background
            const displayBackground = findBackgroundByName(displayBgData);
            setDisplayBackgroundEquipState(displayBackground);
          } else {
            setDisplayBackgroundEquipState(null);
          }
        } else {
          setDisplayBackgroundEquipState(null);
        }
        
        // Handle match background from inventory
        const matchBgData = userData.inventory?.matchBackgroundEquipped;
        if (matchBgData) {
          // If it's already a complete background object, use it directly
          if (typeof matchBgData === 'object' && matchBgData.name && matchBgData.file && matchBgData.type) {
            setMatchBackgroundEquipState(matchBgData);
          } else if (typeof matchBgData === 'string') {
            // Legacy support: if it's a string, try to find the background
            const matchBackground = findBackgroundByName(matchBgData);
            setMatchBackgroundEquipState(matchBackground);
          } else {
            setMatchBackgroundEquipState(null);
          }
        } else {
          setMatchBackgroundEquipState(null);
        }
      }
    }, (error) => {
      console.error('BackgroundContext: Error listening to user data:', error);
    });

    return unsubscribe;
  }, [user]);

  // Fallback: Load from localStorage if Firebase data is not available (for backwards compatibility)
  useEffect(() => {
    if (!user) {
      const savedDisplayBackground = localStorage.getItem('displayBackgroundEquipped');
      const savedMatchBackground = localStorage.getItem('matchBackgroundEquipped');

      if (savedDisplayBackground) {
        try {
          const parsed = JSON.parse(savedDisplayBackground);
          // Migrate legacy format to new ID-based system
          const backgroundId = migrateLegacyBackground(parsed.id || parsed.name || parsed.file);
          const found = getBackgroundById(backgroundId);
          if (found) setDisplayBackgroundEquipState(found);
        } catch (error) {
          console.error('Error loading saved display background:', error);
        }
      }

      if (savedMatchBackground) {
        try {
          const parsed = JSON.parse(savedMatchBackground);
          // Migrate legacy format to new ID-based system
          const backgroundId = migrateLegacyBackground(parsed.id || parsed.name || parsed.file);
          const found = getBackgroundById(backgroundId);
          if (found) setMatchBackgroundEquipState(found);
        } catch (error) {
          console.error('Error loading saved match background:', error);
        }
      }
    }
  }, [user]);

  // Update localStorage when backgrounds change (for backwards compatibility)
  useEffect(() => {
    if (DisplayBackgroundEquip) {
      localStorage.setItem('displayBackgroundEquipped', JSON.stringify(DisplayBackgroundEquip));
    } else {
      localStorage.removeItem('displayBackgroundEquipped');
    }
  }, [DisplayBackgroundEquip]);

  useEffect(() => {
    if (MatchBackgroundEquip) {
      localStorage.setItem('matchBackgroundEquipped', JSON.stringify(MatchBackgroundEquip));
    } else {
      localStorage.removeItem('matchBackgroundEquipped');
    }
  }, [MatchBackgroundEquip]);

  const value: BackgroundContextType = {
    DisplayBackgroundEquip,
    MatchBackgroundEquip,
    setDisplayBackgroundEquip,
    setMatchBackgroundEquip,
    availableBackgrounds,
  };

  return (
    <BackgroundContext.Provider value={value}>
      {children}
    </BackgroundContext.Provider>
  );
};
