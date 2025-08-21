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
    icon: '/Design Elements/Gem Bucket.webp'
  },
  {
    id: 'classic',
    name: 'Only One Will Rise',
    description: 'Traditional DashDice gameplay',
    icon: '/Design Elements/Crown Mode.webp'
  },
  {
    id: 'zero-hour',
    name: 'Zero Hour',
    description: 'Start at 100, race to exactly 0',
    icon: '/Design Elements/Satelite.webp'
  },
  {
    id: 'last-line',
    name: 'Last Line',
    description: 'Single roll elimination, doubles grant extra roll',
    icon: '/Design Elements/skull.webp'
  },
  {
    id: 'true-grit',
    name: 'True Grit',
    description: 'No banking allowed, pure risk vs reward',
    icon: '/Design Elements/Castle.webp'
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
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-md rounded-[20px] p-8 max-w-lg w-full border border-gray-600/50 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-8">
              <motion.h2 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold text-white mb-3" 
                style={{ fontFamily: 'Audiowide' }}
              >
                SELECT GAME MODE
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-gray-300 text-sm font-medium"
                style={{ fontFamily: 'Montserrat' }}
              >
                Choose a game mode for your rematch
              </motion.p>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-8">
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
                    group p-5 rounded-[20px] border-2 transition-all duration-300
                    bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm
                    ${selectedMode === mode.id 
                      ? 'border-blue-400 bg-gradient-to-r from-blue-600/30 to-blue-500/20 scale-95 shadow-lg shadow-blue-500/20' 
                      : 'border-gray-600/50 hover:border-gray-400/70 hover:bg-gradient-to-r hover:from-gray-700/60 hover:to-gray-600/60'
                    }
                  `}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-gray-800/50 backdrop-blur-sm border border-gray-600/30 flex items-center justify-center overflow-hidden group-hover:border-gray-400/50 transition-all">
                      <img 
                        src={mode.icon} 
                        alt={mode.name}
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/Design Elements/Crown Mode.webp';
                        }}
                      />
                    </div>
                    <div className="text-left flex-1">
                      <h3 
                        className="text-white font-bold text-lg mb-1 group-hover:text-blue-200 transition-colors" 
                        style={{ fontFamily: 'Audiowide' }}
                      >
                        {mode.name.toUpperCase()}
                      </h3>
                      <p 
                        className="text-gray-300 text-sm leading-relaxed"
                        style={{ fontFamily: 'Montserrat' }}
                      >
                        {mode.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            <motion.div 
              className="flex gap-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onCancel}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded-[20px] font-bold transition-all backdrop-blur-sm border border-gray-500/30"
                style={{ fontFamily: 'Audiowide' }}
              >
                CANCEL
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
