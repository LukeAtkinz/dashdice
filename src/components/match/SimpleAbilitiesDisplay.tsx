'use client';

import React from 'react';
import { MatchData } from '@/types/match';

interface SimpleAbilitiesDisplayProps {
  matchData: MatchData;
  onAbilityUsed: (effect: any) => void;
  isPlayerTurn: boolean;
  playerId: string;
  className?: string;
}

export default function SimpleAbilitiesDisplay({ 
  matchData, 
  onAbilityUsed, 
  isPlayerTurn,
  playerId,
  className = ''
}: SimpleAbilitiesDisplayProps) {
  
  return (
    <div className={`flex items-center justify-center p-4 bg-gray-800/50 rounded-lg backdrop-blur-sm ${className}`}>
      <div className="text-center">
        <div className="text-purple-400 text-2xl mb-2">🔮</div>
        <p className="text-gray-300 text-sm">
          Abilities system temporarily disabled
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Fixing module import issues
        </p>
      </div>
    </div>
  );
}