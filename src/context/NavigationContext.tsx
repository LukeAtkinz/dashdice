'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type DashboardSection = 'dashboard' | 'waiting-room' | 'match' | 'inventory' | 'profile' | 'settings';

interface SectionParams {
  gameMode?: string;
  actionType?: 'live' | 'custom';
  matchId?: string; // Add matchId for match navigation
  roomId?: string; // Add roomId for waiting room navigation
}

interface NavigationContextType {
  currentSection: DashboardSection;
  sectionParams: SectionParams;
  setCurrentSection: (section: DashboardSection, params?: SectionParams) => void;
  previousSection: DashboardSection | null;
  isTransitioning: boolean;
  setIsTransitioning: (transitioning: boolean) => void;
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

  const setCurrentSection = (section: DashboardSection, params: SectionParams = {}) => {
    console.log('🧭 NavigationContext: setCurrentSection called:', {
      from: currentSection,
      to: section,
      params,
      isTransitioning,
      timestamp: new Date().toISOString()
    });
    
    if (section !== currentSection && !isTransitioning) {
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
        reason: section === currentSection ? 'Same section' : 'Already transitioning',
        currentSection,
        targetSection: section,
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
