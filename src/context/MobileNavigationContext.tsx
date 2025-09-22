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
  isOptimistic?: boolean; // Add flag for optimistic UI state
}

interface MobileNavigationContextType {
  currentSection: DashboardSection;
  sectionParams: SectionParams;
  setCurrentSection: (section: DashboardSection, params?: SectionParams) => void;
  previousSection: DashboardSection | null;
  isTransitioning: boolean;
  setIsTransitioning: (transitioning: boolean) => void;
  isGameOver: boolean;
  setIsGameOver: (gameOver: boolean) => void;
}

const MobileNavigationContext = createContext<MobileNavigationContextType | undefined>(undefined);

interface MobileNavigationProviderProps {
  children: ReactNode;
}

export const MobileNavigationProvider: React.FC<MobileNavigationProviderProps> = ({ children }) => {
  const [currentSection, setCurrentSectionState] = useState<DashboardSection>('dashboard');
  const [sectionParams, setSectionParams] = useState<SectionParams>({});
  const [previousSection, setPreviousSection] = useState<DashboardSection | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const setCurrentSection = (section: DashboardSection, params: SectionParams = {}) => {
    console.log('🧭 MobileNavigationContext: setCurrentSection called:', {
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
      console.log('🧭 MobileNavigationContext: Navigation approved - changing section');
      setPreviousSection(currentSection);
      setCurrentSectionState(section);
      setSectionParams(params);
      console.log('🧭 MobileNavigationContext: Navigation completed:', {
        newSection: section,
        newParams: params,
        previousSection: currentSection
      });
    } else {
      console.log('🧭 MobileNavigationContext: Navigation blocked:', {
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
    <MobileNavigationContext.Provider
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
    </MobileNavigationContext.Provider>
  );
};

export const useMobileNavigation = (): MobileNavigationContextType => {
  const context = useContext(MobileNavigationContext);
  if (context === undefined) {
    throw new Error('useMobileNavigation must be used within a MobileNavigationProvider');
  }
  return context;
};

// Export for compatibility with web app patterns
export const useNavigation = useMobileNavigation;
export const NavigationProvider = MobileNavigationProvider;