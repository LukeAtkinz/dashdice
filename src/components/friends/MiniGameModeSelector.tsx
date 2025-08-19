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
  const [isExpanded, setIsExpanded] = useState(false);
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
    setIsExpanded(false);
    onGameModeSelect(modeId);
  };

  const toggleExpanded = () => {
    if (!isDisabled) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Selected Mode Display */}
      <button
        onClick={toggleExpanded}
        disabled={isDisabled}
        className={`
          w-full flex items-center justify-between p-2 rounded-lg
          bg-black/20 backdrop-blur-sm border border-white/10
          transition-all duration-200 hover:bg-black/30
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isExpanded ? 'border-blue-400/50' : ''}
        `}
      >
        <div className="flex items-center space-x-2">
          {selectedModeData && (
            <>
              <img 
                src={selectedModeData.icon} 
                alt={selectedModeData.name}
                className="w-5 h-5 object-contain"
              />
              <div className="text-left">
                <div className="text-sm font-medium text-white">
                  {selectedModeData.name}
                </div>
                <div className="text-xs text-gray-300">
                  {selectedModeData.description}
                </div>
              </div>
            </>
          )}
        </div>
        {!isDisabled && (
          <div className="text-gray-400">
            {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </div>
        )}
      </button>

      {/* Dropdown Options */}
      {isExpanded && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl">
          {gameModes
            .filter(mode => mode.available && mode.id !== selectedMode)
            .map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleModeSelect(mode.id)}
                className="w-full flex items-center space-x-2 p-2 hover:bg-white/10 transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg"
              >
                <img 
                  src={mode.icon} 
                  alt={mode.name}
                  className="w-4 h-4 object-contain"
                />
                <div className="text-left">
                  <div className="text-sm font-medium text-white">
                    {mode.name}
                  </div>
                  <div className="text-xs text-gray-300">
                    {mode.description}
                  </div>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default MiniGameModeSelector;
