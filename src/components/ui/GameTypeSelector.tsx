'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GameType } from '@/types/ranked';

interface GameTypeSelectorProps {
  selectedGameType: GameType;
  onGameTypeChange: (gameType: GameType) => void;
  disabled?: boolean;
  showTooltips?: boolean;
}

export const GameTypeSelector: React.FC<GameTypeSelectorProps> = ({
  selectedGameType,
  onGameTypeChange,
  disabled = false,
  showTooltips = true
}) => {
  const [hoveredType, setHoveredType] = useState<GameType | null>(null);

  const gameTypes = [
    {
      id: 'quick' as GameType,
      name: 'Quick Game',
      description: 'Casual matches, play with friends',
      icon: '⚡',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'ranked' as GameType,
      name: 'Ranked',
      description: 'Competitive seasonal progression',
      icon: '🏆',
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  return (
    <div className="flex space-x-4 p-4">
      {gameTypes.map((type) => {
        const isSelected = selectedGameType === type.id;
        const isHovered = hoveredType === type.id;
        
        return (
          <motion.button
            key={type.id}
            onClick={() => !disabled && onGameTypeChange(type.id)}
            onMouseEnter={() => setHoveredType(type.id)}
            onMouseLeave={() => setHoveredType(null)}
            disabled={disabled}
            className={`
              relative flex flex-col items-center justify-center
              w-32 h-20 rounded-lg border-2 transition-all duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${isSelected 
                ? 'border-white bg-white/10 shadow-lg' 
                : 'border-gray-400 bg-black/20 hover:border-white/60'
              }
            `}
            whileHover={!disabled ? { scale: 1.05 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
          >
            {/* Background gradient */}
            <div className={`
              absolute inset-0 rounded-lg opacity-20
              bg-gradient-to-br ${type.color}
              ${isSelected || isHovered ? 'opacity-30' : 'opacity-10'}
              transition-opacity duration-200
            `} />
            
            {/* Icon */}
            <div className="text-2xl mb-1 relative z-10">
              {type.icon}
            </div>
            
            {/* Name */}
            <div className="text-sm font-semibold text-white relative z-10">
              {type.name}
            </div>
            
            {/* Selection indicator */}
            {isSelected && (
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
      
      {/* Tooltip */}
      {showTooltips && hoveredType && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute mt-24 bg-black/90 text-white p-2 rounded-lg text-sm max-w-xs z-50"
        >
          {gameTypes.find(type => type.id === hoveredType)?.description}
        </motion.div>
      )}
    </div>
  );
};
