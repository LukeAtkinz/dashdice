import React, { useState, useEffect } from 'react';
import { UnifiedWaitingRoom } from '../shared/waitingroom';
import { useRouter } from 'next/navigation';

interface GuestGameWaitingRoomV2Props {
  guestPlayerName: string;
  gameMode: string;
  onReturn: () => void;
}

const EnhancedGuestGameWaitingRoomV2: React.FC<GuestGameWaitingRoomV2Props> = ({
  guestPlayerName,
  gameMode,
  onReturn
}) => {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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
    // Navigate to guest game
    router.push('/guest-game');
  };

  const handleLeave = () => {
    onReturn();
  };

  return (
    <UnifiedWaitingRoom
      isGuest={true}
      guestPlayerName={guestPlayerName}
      gameMode={gameMode}
      onGameStart={handleGameStart}
      onLeave={handleLeave}
      isMobile={isMobile}
      isScrolled={isScrolled}
    />
  );
};

export default EnhancedGuestGameWaitingRoomV2;