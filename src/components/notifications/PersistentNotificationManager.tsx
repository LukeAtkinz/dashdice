'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/context/NavigationContext';
import { 
  PersistentNotificationService, 
  ActiveMatchNotification, 
  AbandonmentNotification 
} from '@/services/persistentNotificationService';
import { AlreadyInMatchNotification } from './AlreadyInMatchNotification';
import MatchAbandonmentNotification from './MatchAbandonmentNotification';

export const PersistentNotificationManager: React.FC = () => {
  const { user } = useAuth();
  const { setCurrentSection } = useNavigation();
  
  const [activeMatchNotification, setActiveMatchNotification] = useState<ActiveMatchNotification | null>(null);
  const [abandonmentNotification, setAbandonmentNotification] = useState<AbandonmentNotification | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    console.log('🔔 PersistentNotificationManager: Initializing for user:', user.uid);

    // Initialize the service
    PersistentNotificationService.initialize(user.uid);

    // Set up callbacks
    PersistentNotificationService.onActiveMatch((notification) => {
      console.log('📢 Active match notification:', notification);
      setActiveMatchNotification(notification);
    });

    PersistentNotificationService.onAbandonment((notification) => {
      console.log('⚠️ Abandonment notification:', notification);
      setAbandonmentNotification(notification);
    });

    // Cleanup on unmount
    return () => {
      PersistentNotificationService.cleanup();
    };
  }, [user?.uid]);

  const handleRejoinMatch = async () => {
    if (!activeMatchNotification || !user?.uid) return;
    
    console.log('🎮 Rejoining match:', activeMatchNotification.matchId);
    
    // Navigate to match
    setCurrentSection('match', { 
      matchId: activeMatchNotification.matchId,
      gameMode: activeMatchNotification.gameMode 
    });
    
    // Clear notification
    await PersistentNotificationService.rejoinMatch(activeMatchNotification.matchId);
    setActiveMatchNotification(null);
  };

  const handleAbandonMatch = async () => {
    if (!activeMatchNotification || !user?.uid) return;
    
    console.log('🏃‍♂️ Abandoning match:', activeMatchNotification.matchId);
    
    try {
      // Clear the user's currentGame field
      const { updateDoc, doc: firestoreDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/services/firebase');
      
      const userRef = firestoreDoc(db, 'users', user.uid);
      await updateDoc(userRef, {
        currentGame: null,
        updatedAt: serverTimestamp()
      });

      // Update user stats with loss
      const { UserService } = await import('@/services/userService');
      await UserService.updateMatchLoss(user.uid);
      
      console.log('✅ Successfully abandoned match');
    } catch (error) {
      console.error('❌ Error abandoning match:', error);
    }
    
    setActiveMatchNotification(null);
  };

  const handleClaimVictory = async () => {
    if (!abandonmentNotification || !user?.uid) return;
    
    console.log('🏆 Claiming victory for abandoned match:', abandonmentNotification.matchId);
    
    try {
      await PersistentNotificationService.claimVictory(abandonmentNotification.matchId, user.uid);
      
      // Update user stats with win
      const { UserService } = await import('@/services/userService');
      await UserService.updateMatchWin(user.uid);
      
      console.log('✅ Successfully claimed victory');
    } catch (error) {
      console.error('❌ Error claiming victory:', error);
    }
    
    setAbandonmentNotification(null);
  };

  const handleWaitForOpponent = () => {
    console.log('⏳ Waiting for opponent to return');
    setAbandonmentNotification(null);
  };

  return (
    <>
      {/* Active Match Rejoin Notification */}
      {activeMatchNotification && (
        <AlreadyInMatchNotification
          gameMode={activeMatchNotification.gameMode}
          currentGame={activeMatchNotification.matchId}
          userId={user?.uid || ''}
          onClose={() => setActiveMatchNotification(null)}
          onJoin={handleRejoinMatch}
          onAbandon={handleAbandonMatch}
        />
      )}

      {/* Match Abandonment Notification */}
      {abandonmentNotification && (
        <MatchAbandonmentNotification
          onClaim={handleClaimVictory}
          onWait={handleWaitForOpponent}
          opponentName="Your opponent"
          timeLeft={abandonmentNotification.timeLeft}
        />
      )}
    </>
  );
};

export default PersistentNotificationManager;
