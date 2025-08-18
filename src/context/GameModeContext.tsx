'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { GameMode } from '@/types/gameModes';
import { GameModeService } from '@/services/gameModeService';

interface GameModeContextType {
  availableModes: GameMode[];
  selectedMode: GameMode | null;
  loading: boolean;
  error: string | null;
  selectMode: (modeId: string) => void;
  loadModes: (platform?: 'desktop' | 'mobile') => Promise<void>;
  validatePlayerCount: (playerCount: number, modeId?: string) => boolean;
}

const GameModeContext = createContext<GameModeContextType | null>(null);

export function GameModeProvider({ children }: { children: React.ReactNode }) {
  const [availableModes, setAvailableModes] = useState<GameMode[]>([]);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadModes = async (platform: 'desktop' | 'mobile' = 'desktop') => {
    setLoading(true);
    setError(null);
    
    try {
      const modes = await GameModeService.getAvailableGameModes(platform);
      setAvailableModes(modes);
      
      // Auto-select classic mode if available and no mode is selected
      if (!selectedMode && modes.length > 0) {
        const classicMode = modes.find(mode => mode.id === 'classic') || modes[0];
        setSelectedMode(classicMode);
      }
    } catch (err) {
      console.error('Error loading game modes:', err);
      setError('Failed to load game modes');
      // Fallback to default modes
      const defaultModes = GameModeService.getDefaultGameModes(platform);
      setAvailableModes(defaultModes);
      if (!selectedMode && defaultModes.length > 0) {
        setSelectedMode(defaultModes[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectMode = (modeId: string) => {
    const mode = availableModes.find(m => m.id === modeId);
    if (mode) {
      setSelectedMode(mode);
    }
  };

  const validatePlayerCount = (playerCount: number, modeId?: string): boolean => {
    const mode = modeId 
      ? availableModes.find(m => m.id === modeId)
      : selectedMode;
    
    if (!mode) return false;
    
    return playerCount >= mode.minPlayers && playerCount <= mode.maxPlayers;
  };

  // Load default modes on mount
  useEffect(() => {
    loadModes();
  }, []);

  const value: GameModeContextType = {
    availableModes,
    selectedMode,
    loading,
    error,
    selectMode,
    loadModes,
    validatePlayerCount
  };

  return (
    <GameModeContext.Provider value={value}>
      {children}
    </GameModeContext.Provider>
  );
}

export function useGameMode() {
  const context = useContext(GameModeContext);
  if (!context) {
    throw new Error('useGameMode must be used within a GameModeProvider');
  }
  return context;
}

// Custom hook for mode-specific logic
export function useModeRules(modeId?: string) {
  const { selectedMode, availableModes } = useGameMode();
  
  const mode = modeId 
    ? availableModes.find(m => m.id === modeId)
    : selectedMode;

  const canBank = mode?.rules.allowBanking ?? true;
  const hasRollLimit = mode?.rules.specialRules?.rollLimit;
  const isReverseScoring = mode?.rules.scoreDirection === 'down';
  const requiresExactScore = mode?.rules.specialRules?.exactScoreRequired;
  const isBestOfMode = mode?.rules.bestOf;
  const hasElimination = mode?.rules.eliminationRules.singleOne;

  return {
    mode,
    canBank,
    hasRollLimit,
    isReverseScoring,
    requiresExactScore,
    isBestOfMode,
    hasElimination,
    rules: mode?.rules,
    settings: mode?.settings
  };
}
