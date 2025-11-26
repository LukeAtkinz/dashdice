'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRematch } from '@/context/RematchContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/context/NavigationContext';
import { RematchService } from '@/services/rematchService';

export const GlobalRematchNotification: React.FC = () => {
  const { incomingRematches, acceptRematch, declineRematch, clearRematch } = useRematch();
  const { user } = useAuth();
  const { currentSection } = useNavigation();
  const [timeLeft, setTimeLeft] = useState<{ [key: string]: number }>({});

  // Game mode icons mapping
  const getGameModeIcon = (gameType: string): string => {
    const iconMap: { [key: string]: string } = {
      'quickfire': '/Design Elements/Shield.webp',
      'classic': '/Design Elements/Crown Mode.webp',
      'zero-hour': '/Design Elements/time out.webp',
      'last-line': '/Design Elements/skull.webp',
      'true-grit': '/Design Elements/Castle.webp'
    };
    return iconMap[gameType.toLowerCase()] || iconMap['classic'];
  };

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
            // When timeout occurs, treat it as a decline (sends notification)
            if (user?.uid) {
              RematchService.cancelRematch(rematch.id, user.uid, 'timeout');
            }
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <AnimatePresence>
        {incomingRematches.map((rematch) => (
          <React.Fragment key={rematch.id}>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => handleDecline(rematch.id)}
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                duration: 0.5 
              }}
              className="relative z-10 bg-slate-800/95 border-2 border-slate-600/60 rounded-2xl p-6 shadow-2xl
                       backdrop-blur-xl max-w-md w-full mx-4 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
              }}
            >
              {/* Animated background accent */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-400/5 via-slate-300/8 to-slate-400/5 
                            animate-pulse opacity-40"></div>
            
              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                    <h3 className="text-white font-bold text-sm md:text-base font-audiowide tracking-wider">
                      REMATCH REQUEST
                    </h3>
                  </div>
                  {timeLeft[rematch.id] !== undefined && (
                    <div className="px-3 py-1 text-xs text-white font-mono font-bold bg-transparent">
                      {timeLeft[rematch.id]}s
                    </div>
                  )}
                </div>

                {/* Rematch Content */}
                <div className="mb-5">
                  <div className="flex items-center gap-3 mb-3">
                    <img 
                      src={getGameModeIcon(rematch.gameMode)} 
                      alt={rematch.gameMode}
                      className="w-10 h-10 md:w-12 md:h-12 object-contain opacity-90 drop-shadow-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/Design Elements/Crown Mode.webp'; // Fallback icon
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-white text-sm md:text-base mb-1 font-audiowide">
                        <span className="font-bold text-blue-300">
                          {rematch.requesterDisplayName}
                        </span>
                        <span className="text-gray-300 mx-2">wants a rematch!</span>
                      </p>
                      <p className="text-blue-200 text-base md:text-lg font-bold font-audiowide tracking-wide">
                        {getGameModeDisplayName(rematch.gameMode)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAccept(rematch.id)}
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500
                             text-black text-sm md:text-base font-bold py-3 px-4 rounded-lg
                             transition-all duration-200 font-audiowide tracking-wide
                             shadow-lg shadow-yellow-500/30 hover:shadow-yellow-400/40
                             border border-yellow-400/50"
                  >
                    ACCEPT
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDecline(rematch.id)}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600
                             text-white text-sm md:text-base font-bold py-3 px-4 rounded-lg
                             transition-all duration-200 font-audiowide tracking-wide
                             shadow-lg shadow-red-600/30 hover:shadow-red-500/40
                             border border-red-500/50"
                  >
                    DECLINE
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </React.Fragment>
        ))}
      </AnimatePresence>
    </div>
  );
};
