'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRematch } from '@/context/RematchContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/context/NavigationContext';

export const GlobalRematchNotification: React.FC = () => {
  const { incomingRematches, acceptRematch, declineRematch, clearRematch } = useRematch();
  const { user } = useAuth();
  const { currentSection } = useNavigation();
  const [timeLeft, setTimeLeft] = useState<{ [key: string]: number }>({});

  // Game mode display name mapping
  const getGameModeDisplayName = (gameType: string): string => {
    const modeNames: Record<string, string> = {
      'classic': 'Classic Mode',
      'quickfire': 'Quick Fire',
      'zero-hour': 'Zero Hour',
      'last-line': 'Last Line',
      'true-grit': 'True Grit',
      'tag-team': 'Tag Team'
    };
    return modeNames[gameType.toLowerCase()] || gameType.charAt(0).toUpperCase() + gameType.slice(1);
  };

  // Don't show notifications if user is already in a match
  const shouldShowNotifications = currentSection !== 'match';

  // Handle countdown timers for each rematch
  useEffect(() => {
    const intervals: { [key: string]: NodeJS.Timeout } = {};

    incomingRematches.forEach(rematch => {
      if (rematch.expiresAt) {
        const updateTimer = () => {
          const now = Date.now();
          const expiry = rematch.expiresAt.toDate ? rematch.expiresAt.toDate().getTime() : rematch.expiresAt.getTime();
          const remaining = Math.max(0, expiry - now);
          
          setTimeLeft(prev => ({ ...prev, [rematch.id]: Math.ceil(remaining / 1000) }));
          
          if (remaining <= 0) {
            clearRematch(rematch.id);
          }
        };

        updateTimer(); // Initial update
        intervals[rematch.id] = setInterval(updateTimer, 1000);
      }
    });

    return () => {
      Object.values(intervals).forEach(interval => clearInterval(interval));
    };
  }, [incomingRematches, clearRematch]);

  const handleAccept = async (rematchId: string) => {
    try {
      await acceptRematch(rematchId);
    } catch (error) {
      console.error('Error accepting rematch:', error);
    }
  };

  const handleDecline = async (rematchId: string) => {
    try {
      await declineRematch(rematchId);
    } catch (error) {
      console.error('Error declining rematch:', error);
    }
  };

  if (!shouldShowNotifications || incomingRematches.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-4">
      <AnimatePresence>
        {incomingRematches.map((rematch) => (
          <motion.div
            key={rematch.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-gradient-to-br from-blue-600/90 to-purple-600/90 backdrop-blur-md border-2 border-blue-400/50 rounded-2xl p-6 min-w-[350px] shadow-2xl"
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-center mb-4"
            >
              <h3 
                className="text-xl font-bold text-white mb-2"
                style={{ fontFamily: 'Audiowide' }}
              >
                🎮 REMATCH REQUEST
              </h3>
              <motion.p 
                className="text-blue-200 text-sm"
                animate={{ 
                  textShadow: [
                    '0 0 5px rgba(59, 130, 246, 0.5)',
                    '0 0 15px rgba(59, 130, 246, 0.8)',
                    '0 0 5px rgba(59, 130, 246, 0.5)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <strong>{rematch.requesterDisplayName}</strong> wants a rematch!
              </motion.p>
            </motion.div>

            {/* Game Mode Info */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="bg-white/10 rounded-xl p-3 mb-4 text-center"
            >
              <p className="text-white text-sm mb-1">Game Mode:</p>
              <p 
                className="text-yellow-400 font-bold text-lg"
                style={{ fontFamily: 'Audiowide' }}
              >
                {getGameModeDisplayName(rematch.gameMode)}
              </p>
            </motion.div>

            {/* Timer */}
            {timeLeft[rematch.id] !== undefined && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="text-center mb-4"
              >
                <p className="text-gray-300 text-xs mb-1">Expires in:</p>
                <motion.div
                  className={`text-lg font-bold ${
                    timeLeft[rematch.id] <= 3 ? 'text-red-400' : 'text-white'
                  }`}
                  animate={timeLeft[rematch.id] <= 3 ? {
                    scale: [1, 1.1, 1],
                    color: ['#f87171', '#dc2626', '#f87171']
                  } : {}}
                  transition={{ duration: 0.5, repeat: timeLeft[rematch.id] <= 3 ? Infinity : 0 }}
                  style={{ fontFamily: 'Audiowide' }}
                >
                  {timeLeft[rematch.id]}s
                </motion.div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="flex gap-3"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAccept(rematch.id)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition-all transform border-2 border-green-400/50"
                style={{ fontFamily: 'Audiowide' }}
              >
                ✅ ACCEPT
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleDecline(rematch.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition-all transform border-2 border-red-400/50"
                style={{ fontFamily: 'Audiowide' }}
              >
                ❌ DECLINE
              </motion.button>
            </motion.div>

            {/* Pulse animation for urgency */}
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-yellow-400/50"
              animate={{
                opacity: [0, 0.5, 0],
                scale: [1, 1.02, 1]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
