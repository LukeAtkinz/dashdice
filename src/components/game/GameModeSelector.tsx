'use client';

import React, { useState, useEffect } from 'react';
import { GameMode } from '@/types/gameModes';
import { GameModeService } from '@/services/gameModeService';

interface GameModeSelectorProps {
  selectedMode: string;
  onModeSelect: (modeId: string) => void;
  playerCount: number;
  platform?: 'desktop' | 'mobile';
}

export default function GameModeSelector({
  selectedMode,
  onModeSelect,
  playerCount,
  platform = 'desktop'
}: GameModeSelectorProps) {
  const [gameModes, setGameModes] = useState<GameMode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGameModes = async () => {
      try {
        const modes = await GameModeService.getAvailableGameModes(platform);
        setGameModes(modes);
      } catch (error) {
        console.error('Error loading game modes:', error);
        setGameModes(GameModeService.getDefaultGameModes(platform));
      } finally {
        setLoading(false);
      }
    };

    loadGameModes();
  }, [platform]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-white mb-4">Select Game Mode</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gameModes.map((mode) => {
          const isDisabled = playerCount < mode.minPlayers || playerCount > mode.maxPlayers;
          
          return (
            <div
              key={mode.id}
              className={`
                relative p-4 rounded-lg border-2 cursor-pointer transition-all
                ${selectedMode === mode.id 
                  ? 'border-blue-500 bg-blue-500/20' 
                  : 'border-gray-600 bg-gray-800/50'
                }
                ${isDisabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:border-blue-400'
                }
              `}
              onClick={() => !isDisabled && onModeSelect(mode.id)}
            >
              {/* Mode Icon/Badge */}
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-lg font-medium text-white">{mode.name}</h4>
                {mode.id === 'zero-hour' && (
                  <span className="bg-red-600 text-xs px-2 py-1 rounded-full">
                    Reverse
                  </span>
                )}
                {mode.id === 'last-line' && (
                  <span className="bg-yellow-600 text-xs px-2 py-1 rounded-full">
                    Quick
                  </span>
                )}
                {mode.id === 'true-grit' && (
                  <span className="bg-orange-600 text-xs px-2 py-1 rounded-full">
                    No Banking
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-gray-300 text-sm mb-3">{mode.description}</p>

              {/* Game Info */}
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div>
                  <span className="font-medium">Players:</span> {mode.minPlayers}
                  {mode.minPlayers !== mode.maxPlayers && `-${mode.maxPlayers}`}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> ~{mode.estimatedDuration}m
                </div>
                <div>
                  <span className="font-medium">Banking:</span> {mode.rules.allowBanking ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className="font-medium">Abilities:</span> {mode.settings.enableAbilities ? 'Yes' : 'No'}
                </div>
              </div>

              {/* Special Rules Indicators */}
              <div className="mt-3 flex flex-wrap gap-1">
                {mode.rules.bestOf && (
                  <span className="bg-blue-600 text-xs px-2 py-1 rounded">
                    Best of {mode.rules.bestOf}
                  </span>
                )}
                {mode.rules.scoreDirection === 'down' && (
                  <span className="bg-red-600 text-xs px-2 py-1 rounded">
                    Reverse Scoring
                  </span>
                )}
                {mode.rules.specialRules?.rollLimit && (
                  <span className="bg-yellow-600 text-xs px-2 py-1 rounded">
                    {mode.rules.specialRules.rollLimit} Roll Max
                  </span>
                )}
                {!mode.rules.allowBanking && (
                  <span className="bg-orange-600 text-xs px-2 py-1 rounded">
                    No Banking
                  </span>
                )}
                {mode.rules.specialRules?.exactScoreRequired && (
                  <span className="bg-purple-600 text-xs px-2 py-1 rounded">
                    Exact Score
                  </span>
                )}
              </div>

              {/* Player Count Warning */}
              {isDisabled && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    Requires {mode.minPlayers}-{mode.maxPlayers} players
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mode Details */}
      {selectedMode && (
        <div className="mt-6 bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">Mode Details:</h4>
          {selectedMode === 'classic' && (
            <div className="text-sm text-gray-300">
              <p>• First player to reach 50 points wins a round</p>
              <p>• Best of 3 rounds determines the winner</p>
              <p>• Banking allowed to secure points</p>
              <p>• Double 6s reset your turn score to 0</p>
            </div>
          )}
          {selectedMode === 'zero-hour' && (
            <div className="text-sm text-gray-300">
              <p>• Start with 100 points and count down</p>
              <p>• Must reach exactly 0 to win</p>
              <p>• Overshooting resets you back to 100</p>
              <p>• Strategic rolling required for precision</p>
            </div>
          )}
          {selectedMode === 'last-line' && (
            <div className="text-sm text-gray-300">
              <p>• One roll per turn - no banking</p>
              <p>• Rolling doubles grants one extra roll</p>
              <p>• Highest single roll wins</p>
              <p>• Quick elimination rounds</p>
            </div>
          )}
          {selectedMode === 'true-grit' && (
            <div className="text-sm text-gray-300">
              <p>• No banking allowed - one continuous turn</p>
              <p>• Rolling a single 1 eliminates you</p>
              <p>• Double 6s score normally (no reset)</p>
              <p>• Pure risk vs. reward strategy</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
