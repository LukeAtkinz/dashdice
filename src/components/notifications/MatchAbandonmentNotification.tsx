'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MatchAbandonmentNotificationProps {
  onClaim: () => void;
  onWait: () => void;
  opponentName?: string;
  timeLeft?: number;
}

export const MatchAbandonmentNotification: React.FC<MatchAbandonmentNotificationProps> = ({
  onClaim,
  onWait,
  opponentName = 'Your opponent',
  timeLeft
}) => {
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4"
    >
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 shadow-lg">
        <div className="flex items-start space-x-3">
          {/* Warning Icon */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <span className="text-orange-600 dark:text-orange-400 text-lg">⚠️</span>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                Opponent Left Match
              </h3>
              {timeLeft && (
                <span className="text-xs text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/50 px-2 py-1 rounded">
                  {timeLeft}s
                </span>
              )}
            </div>
            
            <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
              {opponentName} has disconnected from the match. What would you like to do?
            </p>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={onClaim}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded transition-colors duration-200"
              >
                Claim Win
              </button>
              <button
                onClick={onWait}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded transition-colors duration-200"
              >
                Keep Waiting
              </button>
            </div>
            
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 text-center">
              Claiming will end the match and award you a victory
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MatchAbandonmentNotification;
