'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameModeOption {
  id: string;
  name: string;
  icon: string;
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

  // Simplified game mode configurations - no descriptions, just icons and names
  const gameModes: GameModeOption[] = [
    {
      id: 'classic',
      name: 'Only One Will Rise',
      icon: '/Design Elements/Crown Mode.webp'
    },
    {
      id: 'quickfire',
      name: 'Quickfire',
      icon: '/Design Elements/Gem Bucket.webp'
    },
    {
      id: 'zero-hour',
      name: 'Zero Hour',
      icon: '/Design Elements/Satelite.webp'
    },
    {
      id: 'last-line',
      name: 'Last Line',
      icon: '/Design Elements/skull.webp'
    },
    {
      id: 'true-grit',
      name: 'True Grit',
      icon: '/Design Elements/Castle.webp'
    }
  ];

  const handleModeSelect = (modeId: string) => {
    try {
      setIsExpanded(false);
      onGameModeSelect(modeId);
    } catch (error) {
      console.error('Error selecting game mode:', error);
    }
  };

  const toggleExpanded = () => {
    if (!isDisabled) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <motion.button
        onClick={toggleExpanded}
        disabled={isDisabled}
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        className={`
          w-full flex items-center justify-center p-3 rounded-xl
          bg-blue-600 hover:bg-blue-700 text-white font-semibold
          transition-colors duration-200
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{ fontFamily: 'Audiowide' }}
      >
        {isExpanded ? 'SELECT GAME MODE' : 'INVITE TO GAME'}
      </motion.button>

      {/* Game Mode Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 mt-2 z-50 
                       bg-gray-900/95 backdrop-blur-md border border-gray-700 
                       rounded-xl p-4 shadow-xl"
          >
            <div className="grid grid-cols-2 gap-3">
              {gameModes.map((mode, index) => (
                <motion.button
                  key={mode.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  onClick={() => handleModeSelect(mode.id)}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center p-3 rounded-lg
                           bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600
                           hover:border-blue-400 transition-all duration-200"
                >
                  <img 
                    src={mode.icon} 
                    alt={mode.name}
                    className="w-8 h-8 object-contain mb-2"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/Design Elements/Crown Mode.webp'; // Fallback icon
                    }}
                  />
                  <span className="text-xs text-white font-medium text-center leading-tight">
                    {mode.name}
                  </span>
                </motion.button>
              ))}
            </div>
            
            {/* Cancel Button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => setIsExpanded(false)}
              className="w-full mt-3 py-2 px-4 bg-gray-700 hover:bg-gray-600 
                         text-white rounded-lg font-medium transition-colors"
              style={{ fontFamily: 'Audiowide' }}
            >
              CANCEL
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MiniGameModeSelector;
