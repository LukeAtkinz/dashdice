import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameMode {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface GameModeSelectorProps {
  onSelect: (gameMode: string) => void;
  onCancel: () => void;
  isOpen: boolean;
}

const GAME_MODES: GameMode[] = [
  {
    id: 'quickfire',
    name: 'Quickfire',
    description: 'Fast-paced rounds with quick decisions',
    icon: '⚡'
  },
  {
    id: 'classic',
    name: 'Only One Will Rise',
    description: 'Traditional DashDice gameplay',
    icon: '🎯'
  },
  {
    id: 'zero-hour',
    name: 'Zero Hour',
    description: 'Start at 100, race to exactly 0',
    icon: '⏰'
  },
  {
    id: 'last-line',
    name: 'Last Line',
    description: 'Single roll elimination, doubles grant extra roll',
    icon: '🎲'
  },
  {
    id: 'true-grit',
    name: 'True Grit',
    description: 'No banking allowed, pure risk vs reward',
    icon: '�'
  }
];

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  onSelect,
  onCancel,
  isOpen
}) => {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  const handleSelect = (gameMode: string) => {
    setSelectedMode(gameMode);
    // Add a small delay for visual feedback
    setTimeout(() => {
      onSelect(gameMode);
      setSelectedMode(null);
    }, 150);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-gray-900/95 backdrop-blur-md rounded-2xl p-6 max-w-md w-full border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Audiowide' }}>
                SELECT GAME MODE
              </h2>
              <p className="text-gray-400 text-sm">
                Choose a game mode for your rematch
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 mb-6">
              {GAME_MODES.map((mode, index) => (
                <motion.button
                  key={mode.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3, ease: "easeOut" }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(mode.id)}
                  className={`
                    p-4 rounded-xl border-2 transition-all duration-200
                    ${selectedMode === mode.id 
                      ? 'border-blue-400 bg-blue-500/20 scale-95' 
                      : 'border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-700/50'
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{mode.icon}</span>
                    <div className="text-left flex-1">
                      <h3 className="text-white font-semibold text-lg" style={{ fontFamily: 'Audiowide' }}>
                        {mode.name.toUpperCase()}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {mode.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onCancel}
                className="flex-1 py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
                style={{ fontFamily: 'Audiowide' }}
              >
                CANCEL
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
