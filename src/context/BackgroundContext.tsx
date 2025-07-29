'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';

interface Background {
  name: string;
  file: string;
  type: 'image' | 'video';
}

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
  
  // Available backgrounds from the reference
  const availableBackgrounds: Background[] = [
    { name: "All For Glory", file: "/backgrounds/All For Glory.jpg", type: "image" },
    { name: "New Day", file: "/backgrounds/New Day.mp4", type: "video" },
    { name: "On A Mission", file: "/backgrounds/On A Mission.mp4", type: "video" },
    { name: "Relax", file: "/backgrounds/Relax.png", type: "image" },
    { name: "Underwater", file: "/backgrounds/Underwater.mp4", type: "video" },
    { name: "Long Road Ahead", file: "/backgrounds/Long Road Ahead.jpg", type: "image" }
  ];

  // Helper function to find background by item ID from inventory
  const findBackgroundByItemId = (itemId: string, inventory: any[]): Background | null => {
    const item = inventory?.find(item => item.id === itemId && item.type === 'background');
    console.log('BackgroundContext: findBackgroundByItemId', {
      itemId,
      item,
      inventoryLength: inventory?.length
    });
    
    if (!item) return null;
    
    const foundBackground = availableBackgrounds.find(bg => bg.name === item.name);
    console.log('BackgroundContext: Found background match', {
      itemName: item.name,
      foundBackground
    });
    
    return foundBackground || null;
  };

  // Helper function to find background by name/ID
  const findBackgroundByName = (backgroundId: string): Background | null => {
    // Try to find by exact name match first
    let background = availableBackgrounds.find(bg => 
      bg.name.toLowerCase().replace(/\s+/g, '-') === backgroundId
    );
    
    // If not found, try by name directly
    if (!background) {
      background = availableBackgrounds.find(bg => 
        bg.name.toLowerCase() === backgroundId.toLowerCase()
      );
    }
    
    // If still not found, try without spaces/dashes
    if (!background) {
      background = availableBackgrounds.find(bg => 
        bg.name.toLowerCase().replace(/[\s-]/g, '') === backgroundId.toLowerCase().replace(/[\s-]/g, '')
      );
    }
    
    console.log('BackgroundContext: findBackgroundByName', {
      backgroundId,
      found: background
    });
    
    return background || null;
  };

  // Theme mapping for backgrounds
  const getThemeFromBackground = (background: Background | null): string => {
    if (!background) return 'default';
    
    const themeMap: Record<string, string> = {
      'New Day': 'new-day',
      'On A Mission': 'on-a-mission', 
      'Underwater': 'underwater',
      'Relax': 'relax',
      'All For Glory': 'all-for-glory',
      'Long Road Ahead': 'long-road-ahead'
    };
    
    return themeMap[background.name] || 'default';
  };

  // State for equipped backgrounds
  const [DisplayBackgroundEquip, setDisplayBackgroundEquipState] = useState<Background | null>(null);
  const [MatchBackgroundEquip, setMatchBackgroundEquipState] = useState<Background | null>(null);

  // Enhanced setter functions that persist to Firebase
  const setDisplayBackgroundEquip = async (background: Background | null) => {
    try {
      setDisplayBackgroundEquipState(background);
      
      if (user && background) {
        console.log('BackgroundContext: Saving display background to Firebase:', background);
        const userRef = doc(db, 'users', user.uid);
        
        // Save only to the inventory.displayBackgroundEquipped field
        await updateDoc(userRef, {
          'inventory.displayBackgroundEquipped': background.name
        });
        
        console.log('✅ Display background saved to Firebase');
      }
    } catch (error) {
      console.error('❌ Error saving display background to Firebase:', error);
    }
  };

  const setMatchBackgroundEquip = async (background: Background | null) => {
    try {
      setMatchBackgroundEquipState(background);
      
      if (user && background) {
        console.log('BackgroundContext: Saving match background to Firebase:', background);
        const userRef = doc(db, 'users', user.uid);
        
        // Save only to the inventory.matchBackgroundEquipped field
        await updateDoc(userRef, {
          'inventory.matchBackgroundEquipped': background.name
        });
        
        console.log('✅ Match background saved to Firebase');
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
        
        console.log('BackgroundContext: User data updated', {
          inventoryDisplayBg: userData.inventory?.displayBackgroundEquipped,
          inventoryMatchBg: userData.inventory?.matchBackgroundEquipped,
          inventoryLength: userData.inventory?.length || 0
        });
        
        // Handle display background from inventory
        const displayBgName = userData.inventory?.displayBackgroundEquipped;
        if (displayBgName) {
          const displayBackground = findBackgroundByName(displayBgName);
          console.log('BackgroundContext: Found display background', displayBackground);
          setDisplayBackgroundEquipState(displayBackground);
        } else {
          setDisplayBackgroundEquipState(null);
        }
        
        // Handle match background from inventory
        const matchBgName = userData.inventory?.matchBackgroundEquipped;
        if (matchBgName) {
          const matchBackground = findBackgroundByName(matchBgName);
          console.log('BackgroundContext: Found match background', matchBackground);
          setMatchBackgroundEquipState(matchBackground);
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
          const found = availableBackgrounds.find(bg => bg.file === parsed.file);
          if (found) setDisplayBackgroundEquipState(found);
        } catch (error) {
          console.error('Error loading saved display background:', error);
        }
      }

      if (savedMatchBackground) {
        try {
          const parsed = JSON.parse(savedMatchBackground);
          const found = availableBackgrounds.find(bg => bg.file === parsed.file);
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
