'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AbilityToastProps {
  abilityName: string | null;
  onComplete?: () => void;
}

const ABILITY_MESSAGES: { [key: string]: { title: string; description: string } } = {
  'luck-turner': {
    title: 'Luck Turner Activated',
    description: '50% less chance of getting out!'
  },
  'vital-rush': {
    title: 'Vital Rush Activated',
    description: '3x multiplier but don\'t roll a double!'
  },
  'aura-axe': {
    title: 'Aura Axe Activated',
    description: 'Reduced your opponents Aura by 50%'
  },
  'score-saw': {
    title: 'Score Saw Activated',
    description: 'Reduced your opponents Turn Score by 50%'
  },
  'hard-hat': {
    title: 'Hard Hat Activated',
    description: 'You are protected from attacks but gain less Aura'
  },
  'hard-hat-used': {
    title: 'Hard Hat Used',
    description: 'Ability blocked by Hard Hat!'
  },
  'pan-slap': {
    title: 'Pan Slap Activated',
    description: 'You ended your opponent\'s turn!'
  },
  'power-pull': {
    title: 'Power Pull Activated',
    description: 'Convert your turn score into Aura!'
  },
  'score-siphon': {
    title: 'Score Siphon Activated',
    description: 'Steal Aura when your opponent banks!'
  }
};

export const AbilityToast: React.FC<AbilityToastProps> = ({ abilityName, onComplete }) => {
  // Normalize ability name: convert underscores to hyphens for lookup
  const normalizedName = abilityName?.replace(/_/g, '-');
  const message = normalizedName ? ABILITY_MESSAGES[normalizedName] : null;

  React.useEffect(() => {
    if (abilityName && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [abilityName, onComplete]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            duration: 0.3
          }}
          className="fixed top-8 left-1/2 transform -translate-x-1/2 z-[9999] pointer-events-none"
          style={{
            minWidth: '300px',
            maxWidth: '90vw'
          }}
        >
          <div 
            className="bg-gradient-to-r from-purple-600/95 to-blue-600/95 backdrop-blur-md rounded-2xl px-8 py-4 shadow-2xl border-2 border-white/30"
            style={{
              boxShadow: '0 0 30px rgba(147, 51, 234, 0.5), 0 0 60px rgba(59, 130, 246, 0.3)'
            }}
          >
            <h3 
              className="text-white font-bold text-xl md:text-2xl text-center mb-1"
              style={{ 
                fontFamily: 'Audiowide',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
              }}
            >
              {message.title}
            </h3>
            <p 
              className="text-white/90 text-sm md:text-base text-center"
              style={{ 
                fontFamily: 'Montserrat',
                textShadow: '0 1px 5px rgba(0, 0, 0, 0.5)'
              }}
            >
              {message.description}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
