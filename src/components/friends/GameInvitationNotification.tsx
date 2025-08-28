'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useFriends } from '@/context/FriendsContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/context/NavigationContext';
import { GameInvitation } from '@/types/friends';

export const GameInvitationNotification: React.FC = () => {
  const { gameInvitations, acceptGameInvitation, declineGameInvitation } = useFriends();
  const { user } = useAuth();
  const { currentSection, setCurrentSection } = useNavigation();
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

  // Listen for user's currentGame changes to auto-navigate to waiting room
  useEffect(() => {
    if (!user?.uid) return;

    let unsubscribe: (() => void) | undefined;

    // Emergency cleanup for stuck users (temporary fix)
    const emergencyCleanup = async () => {
      try {
        console.log('🚨 Emergency cleanup: Checking if user is stuck with currentGame');
        
        // Get current user data
        const { getDoc, doc: firestoreDoc } = await import('firebase/firestore');
        const { db } = await import('@/services/firebase');
        const userDoc = await getDoc(firestoreDoc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.currentGame) {
            console.log('🚨 Emergency cleanup: User has currentGame, checking validity:', userData.currentGame);
            
            // Check if room exists
            const roomDoc = await getDoc(firestoreDoc(db, 'waitingroom', userData.currentGame));
            const matchDoc = await getDoc(firestoreDoc(db, 'matches', userData.currentGame));
            
            if (!roomDoc.exists() && !matchDoc.exists()) {
              console.log('🚨 Emergency cleanup: Room/match not found, clearing currentGame');
              const { updateDoc, serverTimestamp } = await import('firebase/firestore');
              await updateDoc(firestoreDoc(db, 'users', user.uid), {
                currentGame: null,
                updatedAt: serverTimestamp()
              });
              console.log('✅ Emergency cleanup: Cleared stale currentGame');
            }
          }
        }
      } catch (error) {
        console.error('❌ Emergency cleanup failed:', error);
      }
    };

    // Run emergency cleanup first, then set up listener
    emergencyCleanup().then(() => {
      // Set up the normal listener after cleanup
      const userRef = doc(db, 'users', user.uid);
      unsubscribe = onSnapshot(userRef, async (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          const currentGame = userData.currentGame;
          
          // If user has a currentGame, check if it actually exists before navigating
          if (currentGame) {
            console.log('🎮 GameInvitation: User has currentGame, verifying room exists:', currentGame);
            
            try {
              const { getDoc, doc: firestoreDoc } = await import('firebase/firestore');
              const { db } = await import('@/services/firebase');
              
              const waitingRoomDoc = await getDoc(firestoreDoc(db, 'waitingroom', currentGame));
              
              if (waitingRoomDoc.exists()) {
                console.log('✅ GameInvitation: Waiting room exists, navigating:', currentGame);
                setCurrentSection('waiting-room', { roomId: currentGame });
              } else {
                // Also check if it's a match
                const matchDoc = await getDoc(firestoreDoc(db, 'matches', currentGame));
                if (matchDoc.exists()) {
                  console.log('✅ GameInvitation: Match exists, navigating:', currentGame);
                  setCurrentSection('match', { matchId: currentGame });
                } else {
                  // Clear the stale currentGame reference
                  console.log('🧹 GameInvitation: Clearing stale currentGame reference:', currentGame);
                  const { updateDoc, serverTimestamp } = await import('firebase/firestore');
                  await updateDoc(userRef, {
                    currentGame: null,
                    updatedAt: serverTimestamp()
                  });
                }
              }
            } catch (error) {
              console.error('❌ GameInvitation: Error verifying room/match existence:', error);
            }
          }
        }
      }, (error) => {
        console.error('❌ GameInvitation: Error listening to user document:', error);
      });
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid, setCurrentSection]);

  const handleAccept = async (invitationId: string) => {
    try {
      const result = await acceptGameInvitation(invitationId);
      if (result.success && result.gameId) {
        // Navigate to waiting room with the room ID (gameId from invitation service is the waiting room ID)
        setCurrentSection('waiting-room', { roomId: result.gameId });
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
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full max-w-xs md:max-w-sm">
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
            className="bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-purple-900/95 
                     border border-blue-400/60 rounded-xl p-4 shadow-2xl
                     backdrop-blur-lg relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 58, 138, 0.95) 50%, rgba(88, 28, 135, 0.95) 100%)'
            }}
          >
            {/* Animated background accent */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 
                          animate-pulse opacity-60"></div>
            
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                  <h3 className="text-white font-bold text-sm md:text-base font-audiowide tracking-wider">
                    GAME INVITATION
                  </h3>
                </div>
                {timeLeft[invitation.id] && (
                  <div className="bg-gradient-to-r from-red-600 to-red-700 px-3 py-1 rounded-full 
                                text-xs text-white font-mono font-bold shadow-lg">
                    {formatTime(timeLeft[invitation.id])}
                  </div>
                )}
              </div>

              {/* Invitation Content with Game Mode Icon */}
              <div className="mb-5">
                <div className="flex items-center gap-3 mb-3">
                  <img 
                    src={getGameModeIcon(invitation.gameType)} 
                    alt={invitation.gameType}
                    className="w-10 h-10 md:w-12 md:h-12 object-contain opacity-90 drop-shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/Design Elements/Crown Mode.webp'; // Fallback icon
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-white text-sm md:text-base mb-1 font-audiowide">
                      <span className="font-bold text-blue-300">
                        {invitation.fromUserName || 'Friend'}
                      </span>
                      <span className="text-gray-300 mx-2">invited you to</span>
                    </p>
                    <p className="text-blue-200 text-base md:text-lg font-bold font-audiowide tracking-wide">
                      {invitation.gameType.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAccept(invitation.id)}
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
                  onClick={() => handleDecline(invitation.id)}
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
        ))}
      </AnimatePresence>
    </div>
  );
};
