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

  // Helper function to ensure background is a complete object
  const ensureCompleteBackgroundObject = (background: Background | string | null): Background | null => {
    if (!background) return null;
    
    // If it's already a complete object, return it
    if (typeof background === 'object' && background.name && background.file && background.type) {
      return background;
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
        
        // Save only to the inventory.displayBackgroundEquipped field
        await updateDoc(userRef, {
          'inventory.displayBackgroundEquipped': {
            name: completeBackground.name,
            file: completeBackground.file,
            type: completeBackground.type
          }
        });
        
        console.log('✅ Display background saved to Firebase successfully:', {
          name: completeBackground.name,
          file: completeBackground.file,
          type: completeBackground.type
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
        
        // Save only to the inventory.matchBackgroundEquipped field
        await updateDoc(userRef, {
          'inventory.matchBackgroundEquipped': {
            name: completeBackground.name,
            file: completeBackground.file,
            type: completeBackground.type
          }
        });
        
        console.log('✅ Match background saved to Firebase successfully:', {
          name: completeBackground.name,
          file: completeBackground.file,
          type: completeBackground.type
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
        
        console.log('BackgroundContext: User data updated', {
          inventoryDisplayBg: userData.inventory?.displayBackgroundEquipped,
          inventoryMatchBg: userData.inventory?.matchBackgroundEquipped,
          inventoryLength: userData.inventory?.length || 0
        });
        
        // Handle display background from inventory
        const displayBgData = userData.inventory?.displayBackgroundEquipped;
        if (displayBgData) {
          console.log('🔍 Processing display background data:', displayBgData);
          
          // If it's already a complete background object, use it directly
          if (typeof displayBgData === 'object' && displayBgData.name && displayBgData.file && displayBgData.type) {
            console.log('✅ Display background is complete object:', displayBgData);
            setDisplayBackgroundEquipState(displayBgData);
          } else if (typeof displayBgData === 'string') {
            // Legacy support: if it's a string, try to find the background
            console.log('⚠️ Display background is legacy string, converting:', displayBgData);
            const displayBackground = findBackgroundByName(displayBgData);
            setDisplayBackgroundEquipState(displayBackground);
          } else {
            console.log('❌ Invalid display background data format:', displayBgData);
            setDisplayBackgroundEquipState(null);
          }
        } else {
          setDisplayBackgroundEquipState(null);
        }
        
        // Handle match background from inventory
        const matchBgData = userData.inventory?.matchBackgroundEquipped;
        if (matchBgData) {
          console.log('🔍 Processing match background data:', matchBgData);
          
          // If it's already a complete background object, use it directly
          if (typeof matchBgData === 'object' && matchBgData.name && matchBgData.file && matchBgData.type) {
            console.log('✅ Match background is complete object:', matchBgData);
            setMatchBackgroundEquipState(matchBgData);
          } else if (typeof matchBgData === 'string') {
            // Legacy support: if it's a string, try to find the background
            console.log('⚠️ Match background is legacy string, converting:', matchBgData);
            const matchBackground = findBackgroundByName(matchBgData);
            setMatchBackgroundEquipState(matchBackground);
          } else {
            console.log('❌ Invalid match background data format:', matchBgData);
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
