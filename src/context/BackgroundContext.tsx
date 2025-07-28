'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
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
  const [DisplayBackgroundEquip, setDisplayBackgroundEquip] = useState<Background | null>(null);
  const [MatchBackgroundEquip, setMatchBackgroundEquip] = useState<Background | null>(null);

  // Apply theme to document based on DisplayBackgroundEquip
  useEffect(() => {
    const theme = getThemeFromBackground(DisplayBackgroundEquip);
    document.documentElement.setAttribute('data-theme', theme);
  }, [DisplayBackgroundEquip]);

  // Listen to user data changes to sync equipped backgrounds from Firebase
  useEffect(() => {
    if (!user) {
      setDisplayBackgroundEquip(null);
      setMatchBackgroundEquip(null);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        const inventory = userData.inventory || [];
        const equippedBackgroundId = userData.equippedBackground;
        
        console.log('BackgroundContext: User data updated', {
          equippedBackgroundId,
          inventoryLength: inventory.length
        });
        
        // Find the equipped background from inventory
        if (equippedBackgroundId) {
          const equippedBackground = findBackgroundByItemId(equippedBackgroundId, inventory);
          console.log('BackgroundContext: Found equipped background', equippedBackground);
          
          if (equippedBackground) {
            setDisplayBackgroundEquip(equippedBackground);
            setMatchBackgroundEquip(equippedBackground); // Use same for both display and match
          }
        } else {
          console.log('BackgroundContext: No equipped background found');
          setDisplayBackgroundEquip(null);
          setMatchBackgroundEquip(null);
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
          if (found) setDisplayBackgroundEquip(found);
        } catch (error) {
          console.error('Error loading saved display background:', error);
        }
      }

      if (savedMatchBackground) {
        try {
          const parsed = JSON.parse(savedMatchBackground);
          const found = availableBackgrounds.find(bg => bg.file === parsed.file);
          if (found) setMatchBackgroundEquip(found);
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
