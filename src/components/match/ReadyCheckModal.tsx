'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReadyCheckModalProps {
  isVisible: boolean;
  timeRemaining: number; // in seconds
  onAccept: () => void;
  onDecline: () => void;
}

export const ReadyCheckModal: React.FC<ReadyCheckModalProps> = ({
  isVisible,
  timeRemaining,
  onAccept,
  onDecline
}) => {
  const [hasAccepted, setHasAccepted] = useState(false);
  const [hasDeclined, setHasDeclined] = useState(false);

  // Reset state when modal becomes visible
  useEffect(() => {
    if (isVisible) {
      setHasAccepted(false);
      setHasDeclined(false);
    }
  }, [isVisible]);

  const handleAccept = () => {
    if (!hasAccepted && !hasDeclined) {
      setHasAccepted(true);
      onAccept();
    }
  };

  const handleDecline = () => {
    if (!hasAccepted && !hasDeclined) {
      setHasDeclined(true);
      onDecline();
    }
  };

  // Calculate progress percentage
  const progressPercentage = (timeRemaining / 10) * 100;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            style={{ pointerEvents: 'auto' }}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[101]"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border-2 border-blue-500/50 p-8 min-w-[400px] max-w-[500px]">
              
              {/* Header */}
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="inline-block mb-4"
                >
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-4xl">🎮</span>
                  </div>
                </motion.div>
                
                <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Audiowide' }}>
                  MATCH FOUND!
                </h2>
                
                <p className="text-gray-300 text-lg">
                  Are you ready to play?
                </p>
              </div>

              {/* Timer Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Time remaining</span>
                  <span className="text-xl font-bold text-white" style={{ fontFamily: 'Orbitron' }}>
                    {timeRemaining}s
                  </span>
                </div>
                
                <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                    initial={{ width: '100%' }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.5, ease: 'linear' }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                {/* Decline Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDecline}
                  disabled={hasAccepted || hasDeclined}
                  className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                    hasDeclined
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 hover:bg-red-600 text-white border-2 border-gray-600 hover:border-red-500'
                  } ${(hasAccepted || hasDeclined) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ fontFamily: 'Audiowide' }}
                >
                  {hasDeclined ? '❌ DECLINED' : 'DECLINE'}
                </motion.button>

                {/* Accept Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAccept}
                  disabled={hasAccepted || hasDeclined}
                  className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                    hasAccepted
                      ? 'bg-green-600 text-white'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg'
                  } ${(hasAccepted || hasDeclined) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ fontFamily: 'Audiowide' }}
                >
                  {hasAccepted ? '✅ ACCEPTED' : 'ACCEPT'}
                </motion.button>
              </div>

              {/* Status Message */}
              {(hasAccepted || hasDeclined) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-center"
                >
                  <p className="text-sm text-gray-400">
                    {hasAccepted ? '⏳ Waiting for opponent...' : '🚫 You declined this match'}
                  </p>
                </motion.div>
              )}

              {/* Warning */}
              <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-xs text-yellow-500 text-center">
                  ⚠️ Declining or timing out will return you to matchmaking
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
