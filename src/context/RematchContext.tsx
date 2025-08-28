'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { RematchService, RematchRoom } from '@/services/rematchService';
import { useNavigation } from './NavigationContext';

interface RematchContextType {
  incomingRematches: RematchRoom[];
  acceptRematch: (rematchId: string) => Promise<void>;
  declineRematch: (rematchId: string) => Promise<void>;
  clearRematch: (rematchId: string) => void;
}

const RematchContext = createContext<RematchContextType | undefined>(undefined);

export const RematchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { setCurrentSection } = useNavigation();
  const [incomingRematches, setIncomingRematches] = useState<RematchRoom[]>([]);

  // Subscribe to incoming rematch requests globally
  useEffect(() => {
    if (!user?.uid) return;

    console.log('🔄 RematchContext: Subscribing to incoming rematches for user:', user.uid);
    
    try {
      const unsubscribe = RematchService.subscribeToIncomingRematches(
        user.uid,
        (rematches) => {
          console.log('🔔 RematchContext: Incoming rematches updated:', rematches);
          setIncomingRematches(rematches);
        }
      );

      return () => {
        console.log('🔄 RematchContext: Unsubscribing from rematch notifications');
        try {
          unsubscribe();
        } catch (error) {
          console.error('❌ RematchContext: Error unsubscribing from rematches:', error);
        }
      };
    } catch (error) {
      console.error('❌ RematchContext: Error setting up rematch subscription:', error);
      return () => {}; // Return empty cleanup function
    }
  }, [user?.uid]);

  // Accept rematch function
  const acceptRematch = useCallback(async (rematchId: string) => {
    if (!user?.uid) return;
    
    try {
      console.log('✅ RematchContext: Accepting rematch:', rematchId);
      const newMatchId = await RematchService.acceptRematch(rematchId, user.uid);
      
      // Remove the accepted rematch from the list
      setIncomingRematches(prev => prev.filter(r => r.id !== rematchId));
      
      // Navigate to the new match
      setCurrentSection('match' as any, { roomId: newMatchId });
      
      console.log('🎮 RematchContext: Navigated to new match:', newMatchId);
    } catch (error) {
      console.error('❌ RematchContext: Error accepting rematch:', error);
    }
  }, [user?.uid, setCurrentSection]);

  // Decline rematch function
  const declineRematch = useCallback(async (rematchId: string) => {
    if (!user?.uid) return;
    
    try {
      console.log('❌ RematchContext: Declining rematch:', rematchId);
      await RematchService.cancelRematch(rematchId, user.uid);
      
      // Remove the declined rematch from the list
      setIncomingRematches(prev => prev.filter(r => r.id !== rematchId));
      
      console.log('✅ RematchContext: Rematch declined');
    } catch (error) {
      console.error('❌ RematchContext: Error declining rematch:', error);
    }
  }, [user?.uid]);

  // Clear rematch from list (for expired/cancelled rematches)
  const clearRematch = useCallback((rematchId: string) => {
    setIncomingRematches(prev => prev.filter(r => r.id !== rematchId));
  }, []);

  const value: RematchContextType = {
    incomingRematches,
    acceptRematch,
    declineRematch,
    clearRematch
  };

  return (
    <RematchContext.Provider value={value}>
      {children}
    </RematchContext.Provider>
  );
};

export const useRematch = () => {
  const context = useContext(RematchContext);
  if (context === undefined) {
    throw new Error('useRematch must be used within a RematchProvider');
  }
  return context;
};
