'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigation } from '@/context/NavigationContext';
import { GoBackendAdapter } from '@/services/goBackendAdapter';

interface AlreadyInMatchNotificationProps {
  gameMode: string;
  currentGame: string;
  userId: string;
  onClose: () => void;
  onJoin?: () => void;
}

export const AlreadyInMatchNotification: React.FC<AlreadyInMatchNotificationProps> = ({
  gameMode,
  currentGame,
  userId,
  onClose,
  onJoin
}) => {
  const { setCurrentSection } = useNavigation();

  const handleRejoinMatch = () => {
    console.log(`🎮 Rejoining ${gameMode} match: ${currentGame}`);
    
    if (onJoin) {
      onJoin();
    } else {
      // Default action: navigate to the match
      setCurrentSection('match', { matchId: currentGame, gameMode });
    }
    
    onClose();
  };

  const handleAbandonMatch = async () => {
    console.log(`🏃‍♂️ Abandoning ${gameMode} match: ${currentGame}`);
    
    try {
      // First update stats - abandoning counts as a loss
      const { UserService } = await import('@/services/userService');
      await UserService.updateMatchLoss(userId);
      console.log('✅ Updated user stats with loss for abandonment');
      
      // Then leave the match
      const result = await GoBackendAdapter.forceLeaveMatch(userId);
      
      if (result.success) {
        console.log('✅ Successfully abandoned match');
      } else {
        console.error('❌ Failed to abandon match:', result.message);
      }
    } catch (error) {
      console.error('❌ Error abandoning match:', error);
    }
    
    onClose();
  };

  const gameModeName = gameMode.charAt(0).toUpperCase() + gameMode.slice(1);

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4"
    >
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 shadow-lg">
        <div className="flex items-start space-x-3">
          {/* Info Icon */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 text-lg">⚠️</span>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Active Match Found
              </h3>
            </div>
            
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              You are already in a <span className="font-semibold">{gameModeName}</span> match. What would you like to do?
            </p>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleRejoinMatch}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded transition-colors duration-200"
              >
                Rejoin
              </button>
              <button
                onClick={handleAbandonMatch}
                className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium rounded transition-colors duration-200"
              >
                Abandon
              </button>
            </div>
            
            <button
              onClick={onClose}
              className="w-full mt-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded transition-colors duration-200"
            >
              Cancel
            </button>
            
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 text-center">
              Abandoning will count as a loss and reset your streak
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
