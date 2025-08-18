'use client';

import React from 'react';
import { useGameMode } from '@/context/GameModeContext';

interface GameModesMiniProps {
  className?: string;
}

export default function GameModesMini({ className = '' }: GameModesMiniProps) {
  const { availableModes, selectedMode, selectMode, loading } = useGameMode();

  if (loading) {
    return (
      <div className={`bg-gray-800/50 rounded-lg p-4 ${className}`}>
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Game Modes</h3>
        <div className="flex justify-center items-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (availableModes.length === 0) {
    return (
      <div className={`bg-gray-800/50 rounded-lg p-4 ${className}`}>
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Game Modes</h3>
        <div className="text-xs text-gray-500">No modes available</div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/50 rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Quick Select Mode</h3>
      
      <div className="space-y-2">
        {availableModes.slice(0, 4).map((mode) => (
          <button
            key={mode.id}
            onClick={() => selectMode(mode.id)}
            className={`w-full p-3 rounded-lg text-left transition-all ${
              selectedMode?.id === mode.id
                ? 'bg-blue-600/30 border border-blue-500/50 text-blue-300'
                : 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white'
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <div className="font-medium text-sm">{mode.name}</div>
                <div className="text-xs opacity-75 mt-1">
                  {mode.description}
                </div>
              </div>
              <div className="flex flex-col items-end text-xs opacity-60 ml-2">
                <span>{mode.minPlayers}-{mode.maxPlayers}p</span>
                <span>~{mode.estimatedDuration}m</span>
              </div>
            </div>
            
            {/* Mode indicators */}
            <div className="flex flex-wrap gap-1 mt-2">
              {mode.rules.bestOf && (
                <span className="bg-blue-600 text-xs px-2 py-1 rounded">
                  Best of {mode.rules.bestOf}
                </span>
              )}
              {mode.rules.scoreDirection === 'down' && (
                <span className="bg-red-600 text-xs px-2 py-1 rounded">
                  Reverse
                </span>
              )}
              {mode.rules.specialRules?.rollLimit && (
                <span className="bg-yellow-600 text-xs px-2 py-1 rounded">
                  {mode.rules.specialRules.rollLimit} Roll
                </span>
              )}
              {!mode.rules.allowBanking && (
                <span className="bg-orange-600 text-xs px-2 py-1 rounded">
                  No Banking
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      
      {/* Selected mode details */}
      {selectedMode && (
        <div className="mt-3 p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
          <div className="text-xs text-gray-400 mb-1">Current Selection:</div>
          <div className="text-sm text-white font-medium">{selectedMode.name}</div>
          <div className="text-xs text-gray-300 mt-1">{selectedMode.description}</div>
          <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
            <span>
              {selectedMode.rules.scoreDirection === 'up' ? 'First to' : 'Start at'} {selectedMode.rules.targetScore}
            </span>
            <span>Banking: {selectedMode.rules.allowBanking ? 'Yes' : 'No'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
