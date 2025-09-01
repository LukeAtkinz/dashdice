'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type DashboardSection = 'dashboard' | 'waiting-room' | 'match' | 'inventory' | 'achievements' | 'friends' | 'profile' | 'settings' | 'ranked' | 'user-profile';

interface SectionParams {
  gameMode?: string;
  actionType?: 'live' | 'custom';
  matchId?: string; // Add matchId for match navigation
  roomId?: string; // Add roomId for waiting room navigation
  gameType?: 'quick' | 'ranked'; // Add gameType for match type identification
  userId?: string; // Add userId for user profile viewing
  userName?: string; // Add userName for user profile display
}

interface NavigationContextType {
  currentSection: DashboardSection;
  sectionParams: SectionParams;
  setCurrentSection: (section: DashboardSection, params?: SectionParams) => void;
  previousSection: DashboardSection | null;
  isTransitioning: boolean;
  setIsTransitioning: (transitioning: boolean) => void;
  isGameOver: boolean;
  setIsGameOver: (gameOver: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [currentSection, setCurrentSectionState] = useState<DashboardSection>('dashboard');
  const [sectionParams, setSectionParams] = useState<SectionParams>({});
  const [previousSection, setPreviousSection] = useState<DashboardSection | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const setCurrentSection = (section: DashboardSection, params: SectionParams = {}) => {
    console.log('🧭 NavigationContext: setCurrentSection called:', {
      from: currentSection,
      to: section,
      params,
      isTransitioning,
      timestamp: new Date().toISOString()
    });
    
    // Allow navigation if:
    // 1. Different sections
    // 2. Same section but different params (for rematch with different matchId)
    // 3. Not currently transitioning
    const isDifferentSection = section !== currentSection;
    const isDifferentParams = JSON.stringify(params) !== JSON.stringify(sectionParams);
    const shouldAllowNavigation = (isDifferentSection || isDifferentParams) && !isTransitioning;
    
    if (shouldAllowNavigation) {
      console.log('🧭 NavigationContext: Navigation approved - changing section');
      setPreviousSection(currentSection);
      setCurrentSectionState(section);
      setSectionParams(params);
      console.log('🧭 NavigationContext: Navigation completed:', {
        newSection: section,
        newParams: params,
        previousSection: currentSection
      });
    } else {
      console.log('🧭 NavigationContext: Navigation blocked:', {
        reason: isTransitioning ? 'Already transitioning' : 'Same section and params',
        currentSection,
        targetSection: section,
        currentParams: sectionParams,
        targetParams: params,
        isTransitioning
      });
    }
  };

  return (
    <NavigationContext.Provider
      value={{
        currentSection,
        sectionParams,
        setCurrentSection,
        previousSection,
        isTransitioning,
        setIsTransitioning,
        isGameOver,
        setIsGameOver,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
