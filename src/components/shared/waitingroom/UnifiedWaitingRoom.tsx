import React, { useState, useEffect } from 'react';
import { PlayerCard, BackgroundDisplay, VSCountdown, SearchingDisplay, ActionButton } from './index';
import { useGuestMatch, GuestPlayerData, GuestMatchState } from './GuestMatchManager';
import './animations.css';

// Types for both guest and authenticated data
export interface UnifiedPlayerData {
  id: string;
  displayName: string;
  isBot?: boolean;
  stats: {
    matchWins: number;
    gamesPlayed: number;
    bestStreak: number;
    currentStreak: number;
  };
  background?: {
    type: 'image' | 'video';
    file: string;
  };
}

export interface UnifiedMatchState {
  id: string;
  hostPlayer: UnifiedPlayerData;
  opponentPlayer: UnifiedPlayerData | null;
  status: 'waiting' | 'opponent_found' | 'countdown' | 'starting' | 'in_progress' | 'completed';
  countdown: number | null;
  gameMode: string;
  isGuestMatch: boolean;
}

interface UnifiedWaitingRoomProps {
  // For guest mode
  isGuest?: boolean;
  guestPlayerName?: string;
  guestUserData?: any; // Full guest user data including backgrounds and stats
  gameMode?: string;
  onGameStart?: () => void;
  onLeave?: () => void;
  
  // For authenticated mode
  matchData?: UnifiedMatchState;
  onAuthenticatedAction?: (action: 'ready' | 'leave') => void;
  
  // Shared props
  isMobile?: boolean;
  isScrolled?: boolean;
}

const UnifiedWaitingRoom: React.FC<UnifiedWaitingRoomProps> = ({
  isGuest = false,
  guestPlayerName = 'Guest Player',
  guestUserData,
  gameMode = 'classic',
  onGameStart,
  onLeave,
  matchData,
  onAuthenticatedAction,
  isMobile = false,
  isScrolled = false
}) => {
  // Guest state management
  const { matchState: guestMatchState, isSearching, createMatch, leaveMatch, setOnGameStart } = useGuestMatch();
  
  // Unified state
  const [currentMatch, setCurrentMatch] = useState<UnifiedMatchState | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [searchText, setSearchText] = useState('Searching for opponents...');

  // Animated search text for guest mode
  useEffect(() => {
    if (isGuest && isSearching) {
      const texts = [
        'Searching for opponents...',
        'Finding the perfect match...',
        'Looking for worthy challengers...',
        'Scanning the arena...'
      ];
      let currentIndex = 0;
      
      const interval = setInterval(() => {
        currentIndex = (currentIndex + 1) % texts.length;
        setSearchText(texts[currentIndex]);
      }, 2000);

      return () => clearInterval(interval);
    } else if (isGuest) {
      setSearchText('Finding AI Opponent');
    }
  }, [isGuest, isSearching]);

  // Set up guest game start callback
  useEffect(() => {
    if (isGuest && onGameStart && setOnGameStart) {
      console.log('🎮 UnifiedWaitingRoom: Setting up guest game start callback');
      const cleanup = setOnGameStart(() => {
        console.log('🚀 UnifiedWaitingRoom: Guest game start triggered!');
        setTimeout(() => {
          onGameStart();
        }, 2000); // 2 second delay for smooth transition
      });
      
      return cleanup;
    }
  }, [isGuest, onGameStart, setOnGameStart]);

  // Initialize guest match if in guest mode
  useEffect(() => {
    if (isGuest && guestPlayerName && !hasInitialized) {
      console.log('🎮 UnifiedWaitingRoom: Creating guest match for', guestPlayerName, 'in', gameMode, 'with user data:', guestUserData);
      createMatch(guestPlayerName, gameMode, guestUserData);
      setHasInitialized(true);
    }
  }, [isGuest, guestPlayerName, gameMode, hasInitialized, guestUserData, createMatch]);

  // Convert guest state to unified state
  useEffect(() => {
    if (isGuest && guestMatchState) {
      console.log('🎮 UnifiedWaitingRoom: Converting guest state to unified state:', guestMatchState);
      const unifiedState: UnifiedMatchState = {
        id: guestMatchState.id,
        hostPlayer: guestMatchState.hostPlayer,
        opponentPlayer: guestMatchState.opponentPlayer,
        status: guestMatchState.status,
        countdown: guestMatchState.countdown,
        gameMode: guestMatchState.gameMode,
        isGuestMatch: true
      };
      setCurrentMatch(unifiedState);
    } else if (!isGuest && matchData) {
      setCurrentMatch(matchData);
    }
  }, [isGuest, guestMatchState, matchData]);

  // Handle leave action
  const handleLeave = async () => {
    setIsLeaving(true);
    
    if (isGuest) {
      leaveMatch();
      onLeave?.();
    } else {
      onAuthenticatedAction?.('leave');
    }
    
    setTimeout(() => setIsLeaving(false), 1000);
  };

  // Handle ready action (authenticated only)
  const handleReady = () => {
    if (!isGuest) {
      onAuthenticatedAction?.('ready');
    }
  };

  if (!currentMatch) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        color: '#E2E2E2',
        fontFamily: 'Audiowide',
        fontSize: isMobile ? '18px' : '24px'
      }}>
        Initializing match...
      </div>
    );
  }

  const hostPlayer = currentMatch.hostPlayer;
  const opponentPlayer = currentMatch.opponentPlayer;
  const vsCountdown = currentMatch.countdown;
  const isWaiting = currentMatch.status === 'waiting';
  const hasOpponent = !!opponentPlayer;
  const isCountingDown = currentMatch.status === 'countdown' && vsCountdown !== null;

  // Get display background for guests
  const displayBackground = isGuest && guestUserData?.displayBackgroundEquipped 
    ? guestUserData.displayBackgroundEquipped 
    : null;

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        minHeight: '100vh',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: isMobile ? '20px' : '40px',
        background: displayBackground?.type !== 'video' && displayBackground?.file
          ? `linear-gradient(135deg, rgba(30, 30, 46, 0.8) 0%, rgba(45, 27, 61, 0.8) 50%, rgba(26, 26, 46, 0.8) 100%), url('${displayBackground.file}') center/cover no-repeat`
          : 'linear-gradient(135deg, #1e1e2e 0%, #2d1b3d 50%, #1a1a2e 100%)',
        padding: isMobile ? '20px' : '40px 20px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'auto'
      }}
    >
      {/* Display background video if applicable */}
      {displayBackground?.type === 'video' && (
        <>
          <video
            autoPlay
            loop
            muted
            playsInline
            controls={false}
            webkit-playsinline="true"
            x5-playsinline="true"
            preload="metadata"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: -2
            }}
          >
            <source src={displayBackground.file} type="video/mp4" />
          </video>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(30, 30, 46, 0.6) 0%, rgba(45, 27, 61, 0.6) 50%, rgba(26, 26, 46, 0.6) 100%)',
              zIndex: -1,
              pointerEvents: 'none'
            }}
          />
        </>
      )}
      <style jsx>{`
        @keyframes goGlow {
          0%, 100% {
            text-shadow: 0 0 20px rgba(0, 255, 0, 0.8), 0 0 40px rgba(0, 255, 0, 0.4);
          }
          50% {
            text-shadow: 0 0 30px rgba(0, 255, 0, 1), 0 0 60px rgba(0, 255, 0, 0.6);
          }
        }

        @keyframes subtleGlow {
          0%, 100% {
            text-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
          }
          50% {
            text-shadow: 0 0 25px rgba(255, 255, 255, 0.6);
          }
        }
      `}</style>

      {/* Game Mode Header */}
      <div
        style={{
          color: '#E2E2E2',
          textAlign: 'center',
          fontFamily: 'Audiowide',
          fontSize: isMobile ? '24px' : '32px',
          fontWeight: 400,
          textTransform: 'uppercase',
          marginBottom: isMobile ? '10px' : '20px'
        }}
      >
        {currentMatch.gameMode} Match
        {isGuest && ' (Guest Mode)'}
      </div>

      {/* Main Game Area */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: '1400px',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'center',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          gap: isMobile ? '20px' : '40px',
          flex: '1 0 0'
        }}
      >
        {/* Host Player Section */}
        <div
          style={{
            display: 'flex',
            height: isMobile ? '200px' : '410px',
            padding: isMobile ? '15px' : '20px',
            alignItems: 'flex-start',
            gap: isMobile ? '15px' : '20px',
            flex: isMobile ? 'none' : '1 0 0',
            width: isMobile ? '100%' : 'auto',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'transparent',
            order: isMobile ? 0 : 0
          }}
        >
          {/* Host Background - on the left (outside) */}
          <BackgroundDisplay
            playerName={hostPlayer.displayName}
            background={hostPlayer.background}
            isMobile={isMobile}
          />

          {/* Host Stats - on the right (inside) */}
          <PlayerCard
            stats={hostPlayer.stats}
            isOpponent={false}
            isMobile={isMobile}
          />
        </div>

        {/* VS / Countdown Section */}
        <VSCountdown
          countdown={vsCountdown}
          isStarting={currentMatch.status === 'starting'}
          isMobile={isMobile}
        />

        {/* Opponent Section */}
        {hasOpponent ? (
          <div
            style={{
              display: 'flex',
              height: isMobile ? '200px' : '410px',
              padding: isMobile ? '15px' : '20px',
              alignItems: 'flex-start',
              gap: isMobile ? '15px' : '20px',
              flex: isMobile ? 'none' : '1 0 0',
              width: isMobile ? '100%' : 'auto',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'transparent',
              order: isMobile ? 2 : 0
            }}
          >
            {/* Opponent Stats - on the left (inside) */}
            <PlayerCard
              stats={opponentPlayer!.stats}
              isOpponent={true}
              isMobile={isMobile}
            />

            {/* Opponent Background - on the right (outside) */}
            <BackgroundDisplay
              playerName={opponentPlayer!.displayName}
              background={opponentPlayer!.background}
              isMobile={isMobile}
            />
          </div>
        ) : (
          <SearchingDisplay
            isSearching={isWaiting}
            searchText={isGuest ? searchText : 'Searching for Opponent'}
            showBotCountdown={false}
            friendInviteReady={false}
            isMobile={isMobile}
          />
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px',
        width: isMobile ? '100%' : 'auto',
        alignItems: 'center'
      }}>
        {/* Ready Button - Only for authenticated mode with friend invitations */}
        {!isGuest && hasOpponent && currentMatch.status === 'opponent_found' && (
          <ActionButton
            onClick={handleReady}
            variant="ready"
            isMobile={isMobile}
            isScrolled={isScrolled}
          >
            Mark Ready
          </ActionButton>
        )}

        {/* Leave Button */}
        <ActionButton
          onClick={handleLeave}
          disabled={isCountingDown || currentMatch.status === 'starting' || isLeaving}
          loading={isLeaving}
          variant="leave"
          isMobile={isMobile}
          isScrolled={isScrolled}
        >
          {isCountingDown ? 'Starting Game...' : 
           isLeaving ? 'Leaving...' : 'Leave Game'}
        </ActionButton>
      </div>
    </div>
  );
};

export default UnifiedWaitingRoom;