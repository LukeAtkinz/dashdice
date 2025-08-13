'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useBackgroundPositioning } from '@/hooks/useBackgroundPositioning';

interface MobileBackgroundControlProps {
  className?: string;
  currentSection?: string;
}

export const MobileBackgroundControl: React.FC<MobileBackgroundControlProps> = ({ 
  className = '',
  currentSection
}) => {
  const { isMobile, setMobilePosition, currentPosition } = useBackgroundPositioning();

  // Completely disabled - no background position controls on mobile
  return null;

  const positions = [
    { key: 'left', label: '←', title: 'Move background left' },
    { key: 'center', label: '●', title: 'Center background' },
    { key: 'right', label: '→', title: 'Move background right' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed bottom-20 right-4 z-40 flex flex-col gap-2 ${className}`}
    >
      <div className="text-xs text-white/80 text-center mb-1 font-semibold">
        Background
      </div>
      {positions.map((position) => (
        <motion.button
          key={position.key}
          onClick={() => setMobilePosition(position.key as any)}
          title={position.title}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-all ${
            currentPosition === position.key 
              ? 'bg-yellow-500 shadow-lg' 
              : 'bg-black/50 hover:bg-black/70'
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{
            backdropFilter: 'blur(8px)'
          }}
        >
          {position.label}
        </motion.button>
      ))}
    </motion.div>
  );
};
