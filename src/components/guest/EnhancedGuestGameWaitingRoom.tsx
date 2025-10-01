'use client';

import React, { useState, useEffect } from 'react';
import { UnifiedWaitingRoom } from '@/components/shared/waitingroom';
import { guestMatchManager } from '@/components/shared/waitingroom/GuestMatchManager';
import { GuestUserData } from '@/services/enhancedGuestMatchmaking';

interface EnhancedGuestGameWaitingRoomProps {
  gameMode: string;
  guestUser: GuestUserData;
  onBack: () => void;
  onMatchStart: (roomId: string, gameMode: string) => void;
}

export const EnhancedGuestGameWaitingRoom: React.FC<EnhancedGuestGameWaitingRoomProps> = ({
  gameMode,
  guestUser,
  onBack,
  onMatchStart
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  console.log('🎮 EnhancedGuestGameWaitingRoom: Initialized with:', { gameMode, guestUser });

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll detection for mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  const handleGameStart = () => {
    // Use the existing match ID from GuestMatchManager instead of generating a new one
    console.log('🎯 EnhancedGuestGameWaitingRoom: handleGameStart called');
    
    // Get the current match ID from the guest match manager
    const currentMatch = guestMatchManager.getCurrentMatch();
    const matchId = currentMatch?.id || `guest-room-${Date.now()}`;
    console.log('🎯 EnhancedGuestGameWaitingRoom: Using match ID:', matchId);
    onMatchStart(matchId, gameMode);
  };

  const handleLeave = () => {
    onBack();
  };

  return (
    <UnifiedWaitingRoom
      isGuest={true}
      guestPlayerName={guestUser.displayName || 'Guest Player'}
      guestUserData={guestUser}
      gameMode={gameMode}
      onGameStart={handleGameStart}
      onLeave={handleLeave}
      isMobile={isMobile}
      isScrolled={isScrolled}
    />
  );
};

export default EnhancedGuestGameWaitingRoom;