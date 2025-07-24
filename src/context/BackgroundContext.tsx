'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  // Available backgrounds from the reference
  const availableBackgrounds: Background[] = [
    { name: "All For Glory", file: "/backgrounds/All For Glory.jpg", type: "image" },
    { name: "New Day", file: "/backgrounds/New Day.mp4", type: "video" },
    { name: "On A Mission", file: "/backgrounds/On A Mission.mp4", type: "video" },
    { name: "Relax", file: "/backgrounds/Relax.png", type: "image" },
    { name: "Underwater", file: "/backgrounds/Underwater.mp4", type: "video" },
    { name: "Long Road Ahead", file: "/backgrounds/Long Road Ahead.jpg", type: "image" }
  ];

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

  // Load saved backgrounds from localStorage on mount
  useEffect(() => {
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
  }, []);

  // Save to localStorage when backgrounds change
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
