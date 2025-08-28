'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFriends } from '@/context/FriendsContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/context/NavigationContext';
import { GameInvitation } from '@/types/friends';

export const GameInvitationNotification: React.FC = () => {
  const { gameInvitations, acceptGameInvitation, declineGameInvitation } = useFriends();
  const { user } = useAuth();
  const { currentSection, setCurrentSection } = useNavigation();
  const [timeLeft, setTimeLeft] = useState<{ [key: string]: number }>({});

  // Don't show notifications if user is already in a match
  const shouldShowNotifications = currentSection !== 'match';

  // Handle countdown timers for each invitation
  useEffect(() => {
    const intervals: { [key: string]: NodeJS.Timeout } = {};

    gameInvitations.forEach(invitation => {
      if (invitation.expiresAt) {
        const updateTimer = () => {
          const now = Date.now();
          const expiry = invitation.expiresAt.toDate().getTime();
          const remaining = Math.max(0, expiry - now);
          
          setTimeLeft(prev => ({ ...prev, [invitation.id]: Math.ceil(remaining / 1000) }));
        };

        updateTimer(); // Initial update
        intervals[invitation.id] = setInterval(updateTimer, 1000);
      }
    });

    return () => {
      Object.values(intervals).forEach(interval => clearInterval(interval));
    };
  }, [gameInvitations]);

  const handleAccept = async (invitationId: string) => {
    try {
      const result = await acceptGameInvitation(invitationId);
      if (result.success && result.gameId) {
        // Navigate to waiting room
        setCurrentSection('waiting-room');
      }
    } catch (error) {
      console.error('Error accepting game invitation:', error);
    }
  };

  const handleDecline = async (invitationId: string) => {
    try {
      await declineGameInvitation(invitationId);
    } catch (error) {
      console.error('Error declining game invitation:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!shouldShowNotifications || gameInvitations.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      <AnimatePresence>
        {gameInvitations.map((invitation) => (
          <motion.div
            key={invitation.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.3 
            }}
            className="bg-gradient-to-br from-blue-900/95 to-purple-900/95 
                     border border-blue-400/50 rounded-xl p-4 shadow-2xl
                     backdrop-blur-md relative overflow-hidden"
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 
                          animate-pulse opacity-50"></div>
            
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <h3 className="text-white font-bold text-sm font-audiowide">
                    GAME INVITATION
                  </h3>
                </div>
                {timeLeft[invitation.id] && (
                  <div className="bg-red-600/80 px-2 py-1 rounded text-xs text-white font-mono">
                    {formatTime(timeLeft[invitation.id])}
                  </div>
                )}
              </div>

              {/* Invitation Content */}
              <div className="mb-4">
                <p className="text-white text-sm mb-1">
                  <span className="font-semibold text-blue-300">
                    {invitation.fromUserName || 'Friend'}
                  </span>
                  {' '}invited you to play
                </p>
                <p className="text-blue-200 text-sm font-medium">
                  {invitation.gameType}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAccept(invitation.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white 
                           text-xs font-semibold py-2 px-3 rounded-lg
                           transition-colors duration-200 font-audiowide"
                >
                  ACCEPT
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDecline(invitation.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white 
                           text-xs font-semibold py-2 px-3 rounded-lg
                           transition-colors duration-200 font-audiowide"
                >
                  DECLINE
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
