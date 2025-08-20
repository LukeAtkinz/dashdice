'use client';

import React, { useState } from 'react';
// Simple chevron icons using CSS
const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

interface GameModeOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  available: boolean;
}

interface MiniGameModeSelectorProps {
  onGameModeSelect: (gameMode: string) => void;
  isDisabled?: boolean;
  className?: string;
}

const MiniGameModeSelector: React.FC<MiniGameModeSelectorProps> = ({
  onGameModeSelect,
  isDisabled = false,
  className = ''
}) => {
  const [selectedMode, setSelectedMode] = useState<string>('classic');

  // Game mode configurations (subset from dashboard)
  const gameModes: GameModeOption[] = [
    {
      id: 'classic',
      name: 'Classic Mode',
      description: 'First to 50, best of 3',
      icon: '/Design Elements/Crown Mode.webp',
      available: true
    },
    {
      id: 'quickfire',
      name: 'Quick Fire',
      description: 'More speed, more skill',
      icon: '/Design Elements/Shield.webp',
      available: true
    },
    {
      id: 'zero-hour',
      name: 'Zero Hour',
      description: 'Countdown to victory',
      icon: '/Design Elements/time out.webp',
      available: true
    },
    {
      id: 'last-line',
      name: 'Last Line',
      description: 'One roll, highest wins',
      icon: '/Design Elements/skull.webp',
      available: true
    },
    {
      id: 'true-grit',
      name: 'True Grit',
      description: 'No banking, no mercy',
      icon: '/Design Elements/Castle.webp',
      available: true
    }
  ];

  const selectedModeData = gameModes.find(mode => mode.id === selectedMode);

  const handleModeSelect = (modeId: string) => {
    setSelectedMode(modeId);
    onGameModeSelect(modeId);
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: "Audiowide" }}>
          Select Game Mode
        </h3>
        <p className="text-sm text-gray-300">
          Choose your preferred game mode for the match
        </p>
      </div>

      {/* Desktop: Side by side cards */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
        {gameModes.filter(mode => mode.available).map((mode) => (
          <button
            key={mode.id}
            onClick={() => handleModeSelect(mode.id)}
            disabled={isDisabled}
            className={`
              p-3 rounded-lg border transition-all duration-200 text-left
              ${selectedMode === mode.id 
                ? 'border-blue-400 bg-blue-500/20 backdrop-blur-sm shadow-lg' 
                : 'border-white/20 bg-black/20 backdrop-blur-sm hover:border-blue-400/50 hover:bg-blue-500/10'
              }
              ${isDisabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'cursor-pointer hover:scale-105'
              }
            `}
          >
            <div className="flex items-center gap-2 mb-2">
              <img 
                src={mode.icon} 
                alt={mode.name}
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div className="font-semibold text-white text-sm">
                {mode.name}
              </div>
            </div>
            <div className="text-xs text-gray-300">
              {mode.description}
            </div>
          </button>
        ))}
      </div>

      {/* Mobile: Stacked cards */}
      <div className="md:hidden space-y-3">
        {gameModes.filter(mode => mode.available).map((mode) => (
          <button
            key={mode.id}
            onClick={() => handleModeSelect(mode.id)}
            disabled={isDisabled}
            className={`
              w-full p-3 rounded-lg border transition-all duration-200 text-left
              ${selectedMode === mode.id 
                ? 'border-blue-400 bg-blue-500/20 backdrop-blur-sm shadow-lg' 
                : 'border-white/20 bg-black/20 backdrop-blur-sm hover:border-blue-400/50 hover:bg-blue-500/10'
              }
              ${isDisabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'cursor-pointer'
              }
            `}
          >
            <div className="flex items-center gap-2 mb-2">
              <img 
                src={mode.icon} 
                alt={mode.name}
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div className="font-semibold text-white text-sm">
                {mode.name}
              </div>
            </div>
            <div className="text-xs text-gray-300">
              {mode.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MiniGameModeSelector;
