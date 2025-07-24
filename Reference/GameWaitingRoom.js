import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBackground } from '../context/BackgroundContext';
import { usePlayerBackground } from '../context/PlayerBackgroundContext';
import { multiplayerGameService } from '../services/multiplayerGameService';
import { getUserEquippedPlayerBackgroundFirestore, loadUserDataFirestore, getUserEquippedPlayerBackground } from '../utils/inventoryLogic';

export default function GameWaitingRoom({ 
  gameType, 
  gameMode, 
  actionType, // 'live' or 'custom'
  gameConfig,
  onGameStart, 
  onBack,
  onBackToDashboard,
  onGameSessionUpdate, // New callback to notify parent of game session changes
  matchBackground // <-- Add this prop
}) {
  const { currentUser } = useAuth();
  // Use DisplayBackgroundEquip and MatchBackgroundEquip for background logic
  const { DisplayBackgroundEquip } = useBackground();
  const { MatchBackgroundEquip } = useBackground();
  // Use equippedPlayerBackground from PlayerBackgroundContext
  const { equippedPlayerBackground } = usePlayerBackground();
  
  const [roomCode, setRoomCode] = useState('');
  const [gameSession, setGameSession] = useState(null);
  const [isHost, setIsHost] = useState(true);
  const [isWaiting, setIsWaiting] = useState(true);
  const [players, setPlayers] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [error, setError] = useState('');
  const [searchingText, setSearchingText] = useState('Searching for opponents...'); // Updated
  const [opponentPlayerBackground, setOpponentPlayerBackground] = useState(null);
  const [currentUserPlayerBackground, setCurrentUserPlayerBackground] = useState(null);
  const [playerStats, setPlayerStats] = useState({
    matchWins: 127,
    leagueWins: 43,
    masterpieces: 8,
    abilities: 15
  });
  const [opponentStats, setOpponentStats] = useState({
    matchWins: 89,
    leagueWins: 22,
    masterpieces: 12,
    abilities: 9
  });

  // Get display name from user email
  const getDisplayName = () => {
    return currentUser?.email?.split('@')[0] || 'Anonymous';
  };

  // Generate deterministic stats based on userId to ensure consistency across players
  const getDeterministicStat = (userId, statType, min, max) => {
    // Create a simple hash from userId and statType for deterministic "randomness"
    let hash = 0;
    const str = userId + statType;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Use absolute value and modulo to get a number in our range
    return min + (Math.abs(hash) % (max - min + 1));
  };

  // Game mode display configurations
  const gameModeConfig = {
    quickfire: { 
      name: 'Quick Fire', 
      icon: '⚡', 
      color: '#FF6B35',
      description: 'Fast-paced dice action'
    },
    classic: { 
      name: 'Classic Mode', 
      icon: '🎲', 
      color: '#4F46E5',
      description: 'Traditional dice gameplay'
    },
    zerohour: { 
      name: 'Zero Hour', 
      icon: '⏰', 
      color: '#10B981',
      description: 'Race against time'
    },
    lastline: { 
      name: 'Last Line', 
      icon: '💀', 
      color: '#EF4444',
      description: 'Sudden death showdown'
    },
    truegrit: { 
      name: 'True Grit', 
      icon: '🏴', 
      color: '#F59E0B',
      description: 'One turn, one chance'
    },
    tagteam: { 
      name: 'Tag Team', 
      icon: '👥', 
      color: '#8B5CF6',
      description: '2v2 team battles'
    }
  };

  const currentGameMode = gameModeConfig[gameMode] || gameModeConfig.classic;

  // Animated searching text
  useEffect(() => {
    if (actionType === 'live' && isWaiting) {
      const texts = [
        'Searching for opponents...',
        'Finding the perfect match...',
        'Looking for worthy challengers...',
        'Scanning the arena...'
      ];
      let currentIndex = 0;
      
      const interval = setInterval(() => {
        currentIndex = (currentIndex + 1) % texts.length;
        setSearchingText(texts[currentIndex]);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [actionType, isWaiting]);

  // Create game session when component mounts
  useEffect(() => {
    const createOrJoinGameSession = async () => {
      try {
        setError('');
        if (!currentUser?.uid) {
        console.error('GameWaitingRoom: setError called (not signed in):', 'You must be signed in to create a game');
        setError('You must be signed in to create a game');
          return;
        }

        // Prepare user data for Firestore entry
        const userBackground = equippedPlayerBackground || currentUserPlayerBackground || {};
        const userStats = playerStats || {};
        const userEntry = {
          userId: currentUser.uid,
          displayName: getDisplayName(),
          stats: userStats,
          playerBackground: userBackground,
          gameMode,
          roomType: actionType === 'custom' ? 'private' : 'public',
          gameType: 'BO3',
          betAmount: gameConfig.betAmount,
          hostId: currentUser.uid,
          playersNeeded: 1
        };

        if (actionType === 'live') {
          // Search for available gameLobby entry with matching gameMode and playersNeeded === 1
          const availableGame = await multiplayerGameService.findAvailableGameLobby(gameMode, gameConfig.betAmount, currentUser.uid);
          if (availableGame) {
            // Join as guest, add user data to Firestore entry
            const joinResult = await multiplayerGameService.joinGameLobby(
              availableGame.id,
              {
                userId: currentUser.uid,
                displayName: getDisplayName(),
                stats: userStats,
                playerBackground: userBackground
              }
            );
            if (joinResult.success) {
              setGameSession(joinResult.gameSession);
              setIsHost(false);
              setIsWaiting(false);
              if (onGameSessionUpdate) {
                onGameSessionUpdate(joinResult.gameSession.id, joinResult.gameSession);
              }
              return;
            }
          }
        }

        // Create new gameLobby entry as host
        const session = await multiplayerGameService.createGameLobbyEntry(userEntry);
        if (session && session.id) {
          setGameSession(session);
          setRoomCode(session.roomCode || '');
          setIsHost(true);
          if (onGameSessionUpdate) {
            onGameSessionUpdate(session.id, session);
          }
          if (actionType === 'live') {
            setIsWaiting(true);
          }
        } else {
        console.error('GameWaitingRoom: setError called (failed to create game session):', 'Failed to create game session');
        setError('Failed to create game session');
        }
      } catch (err) {
        console.error('GameWaitingRoom: setError called (exception):', err, err?.message);
        setError(err?.message || 'Failed to create game session');
      }
    };
    createOrJoinGameSession();
  }, [currentUser, gameMode, actionType, gameConfig]);

  // Subscribe to game session updates
  useEffect(() => {
    if (!gameSession?.id) return;

    console.log('GameWaitingRoom: Subscribing to game session:', gameSession.id);

    const unsubscribe = multiplayerGameService.subscribeToGame(
      gameSession.id,
      (updatedSession) => {
        console.log('GameWaitingRoom: Game session updated:', updatedSession);
        
        // Check if session was deleted/cancelled
        if (!updatedSession) {
          console.log('GameWaitingRoom: Session was deleted, returning to lobby');
          setGameSession(null);
          setPlayers([]);
          return;
        }
        
        setGameSession(updatedSession);
        
        // Update players list
        const playersList = [];
        if (updatedSession.host) {
          playersList.push({
            uid: updatedSession.host.userId,  // Changed from 'id' to 'uid' for consistency
            name: updatedSession.host.displayName,
            isHost: true,
            isReady: true
          });
        }
        if (updatedSession.guest) {
          playersList.push({
            uid: updatedSession.guest.userId,  // Changed from 'id' to 'uid' for consistency
            name: updatedSession.guest.displayName,
            isHost: false,
            isReady: true
          });
        }
        setPlayers(playersList);
        
        // Check if game is ready to start
        console.log('GameWaitingRoom: Checking if ready to start:', {
          status: updatedSession.status,
          statusLower: updatedSession.status?.toLowerCase(),
          hasHost: !!updatedSession.host,
          hasGuest: !!updatedSession.guest,
          hostUserId: updatedSession.host?.userId,
          guestUserId: updatedSession.guest?.userId
        });
        
        if ((updatedSession.status?.toLowerCase() === 'waiting') && updatedSession.host && updatedSession.guest) {
          console.log('GameWaitingRoom: Both players joined, starting countdown');
          console.log('GameWaitingRoom: Session details:', updatedSession);
          console.log('GameWaitingRoom: Host:', updatedSession.host);
          console.log('GameWaitingRoom: Guest:', updatedSession.guest);
          setIsWaiting(false);
          startCountdown();
        }
      }
    );

    return () => {
      console.log('GameWaitingRoom: Unsubscribing from game session');
      if (unsubscribe) unsubscribe();
    };
  }, [gameSession?.id]);

  // Start countdown when both players are ready
  const startCountdown = useCallback(() => {
    console.log('GameWaitingRoom: Starting 5-second preview countdown');
    let timeLeft = 5; // 5 seconds to preview opponent stats and backgrounds
    setCountdown(timeLeft);
    console.log('GameWaitingRoom: Countdown set to:', timeLeft);
    
    const interval = setInterval(() => {
      timeLeft--;
      console.log('GameWaitingRoom: Countdown tick:', timeLeft);
      setCountdown(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(interval);
        console.log('GameWaitingRoom: Countdown finished, starting game with session:', gameSession?.id);
        console.log('GameWaitingRoom: Game session object:', gameSession);
        
        // Start the game by updating the game status in Firestore first
        if (gameSession?.id) {
          multiplayerGameService.startGameAfterCountdown(gameSession.id)
            .then(() => {
              console.log('GameWaitingRoom: Game status updated, calling onGameStart');
              console.log('GameWaitingRoom: Current game session:', gameSession);
              
              // Also notify parent of session update so it can subscribe properly
              if (onGameSessionUpdate) {
                // Get the updated session after status change
                multiplayerGameService.getGameSession(gameSession.id)
                  .then(updatedSession => {
                    console.log('GameWaitingRoom: Updated session after start:', updatedSession);
                    onGameSessionUpdate(gameSession.id, updatedSession);
                  })
                  .catch(error => {
                    console.error('GameWaitingRoom: Error getting updated session:', error);
                  });
              }
              
              if (onGameStart) {
                onGameStart(gameSession.id); // Fixed: only pass gameId as expected
              } else {
                console.error('GameWaitingRoom: onGameStart function not available!');
              }
            })
            .catch(error => {
              console.error('GameWaitingRoom: Error starting game after countdown:', error);
            });
        } else {
          console.error('GameWaitingRoom: No game session ID available!');
        }
      }
    }, 1000);
  }, [gameSession, onGameStart]);

  // Handle leaving the game
  const handleLeave = async () => {
    try {
      if (gameSession?.id) {
        await multiplayerGameService.leaveGame(gameSession.id, currentUser.uid);
      }
      
      if (onBack) {
        onBack();
      } else if (onBackToDashboard) {
        onBackToDashboard();
          }
    } catch (err) {
      console.error('GameWaitingRoom: Error leaving game:', err);
      // Still navigate back even if there's an error
      if (onBack) {
        onBack();
      } else if (onBackToDashboard) {
        onBackToDashboard();
          }
        }
  };

  // Copy room code to clipboard
  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  };

  // Load opponent's player background when they join
  useEffect(() => {
    // Only run when both players are present and gameSession is available
    if (players.length > 1 && gameSession) {
      const opponent = players.find(p => p.uid !== currentUser?.uid);
      if (opponent?.uid) {
        // Determine which field in gameSession is the opponent
        let opponentData = null;
        if (gameSession.host?.userId === opponent.uid) {
          opponentData = gameSession.host;
        } else if (gameSession.guest?.userId === opponent.uid) {
          opponentData = gameSession.guest;
        }
        if (opponentData && opponentData.playerBackground) {
          setOpponentPlayerBackground(opponentData.playerBackground);
        } else {
          // fallback if not found
          setOpponentPlayerBackground({ url: '/backgrounds/Long Road Ahead.jpg', isGradient: false, isVideo: false, rarity: 'Epic' });
        }
        // Also set opponent stats if available
        if (opponentData && opponentData.stats) {
          setOpponentStats({
            matchWins: opponentData.stats.matchWins ?? getDeterministicStat(opponent.uid, 'matchWins', 50, 200),
            leagueWins: opponentData.stats.leagueWins ?? getDeterministicStat(opponent.uid, 'leagueWins', 20, 100),
            masterpieces: opponentData.stats.masterpieces ?? getDeterministicStat(opponent.uid, 'masterpieces', 5, 20),
            abilities: opponentData.stats.abilities ?? getDeterministicStat(opponent.uid, 'abilities', 10, 30)
          });
        } else {
          setOpponentStats({
            matchWins: getDeterministicStat(opponent.uid, 'matchWins', 50, 200),
            leagueWins: getDeterministicStat(opponent.uid, 'leagueWins', 20, 100),
            masterpieces: getDeterministicStat(opponent.uid, 'masterpieces', 5, 20),
            abilities: getDeterministicStat(opponent.uid, 'abilities', 10, 30)
          });
        }
      }
    }
  }, [players, currentUser?.uid, gameSession]);

  // Load user stats when current user changes
  useEffect(() => {
    if (currentUser?.uid) {
      // Get player stats with deterministic fallbacks
      const getPlayerStats = (userId) => {
        try {
          loadUserDataFirestore(userId);
          const userKey = `dashdice_user_${userId}`;
          const userData = localStorage.getItem(userKey);
          
          if (userData) {
            const parsedData = JSON.parse(userData);
            return {
              matchWins: parsedData.stats?.matchWins || getDeterministicStat(userId, 'matchWins', 50, 200),
              leagueWins: parsedData.stats?.leagueWins || getDeterministicStat(userId, 'leagueWins', 20, 100),
              masterpieces: parsedData.stats?.masterpieces || getDeterministicStat(userId, 'masterpieces', 5, 20),
              abilities: parsedData.stats?.abilities || getDeterministicStat(userId, 'abilities', 10, 30)
            };
          }
          
          return {
            matchWins: getDeterministicStat(userId, 'matchWins', 50, 200),
            leagueWins: getDeterministicStat(userId, 'leagueWins', 20, 100),
            masterpieces: getDeterministicStat(userId, 'masterpieces', 5, 20),
            abilities: getDeterministicStat(userId, 'abilities', 10, 30)
          };
        } catch (error) {
          console.error('Error getting player stats:', error);
          return { 
            matchWins: getDeterministicStat(userId, 'matchWins', 50, 200),
            leagueWins: getDeterministicStat(userId, 'leagueWins', 20, 100),
            masterpieces: getDeterministicStat(userId, 'masterpieces', 5, 20),
            abilities: getDeterministicStat(userId, 'abilities', 10, 30)
          };
        }
      };
      
      const stats = getPlayerStats(currentUser.uid);
      setPlayerStats(stats);
    }
  }, [currentUser?.uid]);

  // Load current user's player background
  useEffect(() => {
    if (currentUser?.uid) {
      const loadCurrentUserBackground = async () => {
        try {
          console.log('GameWaitingRoom: Loading current user player background for:', currentUser.uid);
          console.log('GameWaitingRoom: Current equippedPlayerBackground from context:', equippedPlayerBackground);
          
          // Try both local storage and Firestore methods
          await loadUserDataFirestore(currentUser.uid);
          const userBackgroundFirestore = await getUserEquippedPlayerBackgroundFirestore(currentUser.uid);
          console.log('GameWaitingRoom: Current user player background from Firestore:', userBackgroundFirestore);
          
          // Also check local storage version
          const userBackgroundLocal = getUserEquippedPlayerBackground(currentUser.uid);
          console.log('GameWaitingRoom: Current user player background from localStorage:', userBackgroundLocal);
          
          // Use the first available background (prefer context, then Firestore, then localStorage)
          const backgroundToUse = equippedPlayerBackground || userBackgroundFirestore || userBackgroundLocal;
          console.log('GameWaitingRoom: Using background:', backgroundToUse);
          setCurrentUserPlayerBackground(backgroundToUse);
          
        } catch (error) {
          console.error('GameWaitingRoom: Error loading current user background:', error);
        }
      };
      
      loadCurrentUserBackground();
    }
  }, [currentUser?.uid, equippedPlayerBackground]);

  // Background for the main container
  const backgroundStyle = equippedBackground?.isVideo
    ? {}
    : equippedBackground?.isGradient
    ? { background: equippedBackground.url }
    : equippedBackground?.url
    ? { 
        background: `url('${equippedBackground.url}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    : { 
        background: 'radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #3533CD 0%, #7209B7 100%)'
      };

  if (error) {
    console.error('GameWaitingRoom: Rendering error UI with error:', error);
    return (
      <div className="h-full w-full flex items-center justify-center" style={backgroundStyle}>
        <div className="text-center text-white">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Audiowide' }}>
            Error Creating Game
          </h2>
          <p className="text-lg mb-6">{error}</p>
          <button
            onClick={handleLeave}
            className="px-6 py-3 rounded-lg transition-all duration-300 hover:scale-105"
            style={{
              background: '#FF0080',
              fontFamily: 'Audiowide',
              fontSize: '16px',
              fontWeight: 400,
              textTransform: 'uppercase',
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-8 min-h-0">
      {/* CSS Styles for animations */}
      <style jsx>{`
        @keyframes pulse {
          0% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.1);
            opacity: 0.8;
          }
          100% { 
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>

      {/* Main Content Container */}
      <div
        style={{
          display: 'flex',
          width: '1600px',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '40px'
        }}
      >
        {/* Game Mode Title and Description */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px'
          }}
        >
          <h1
            style={{
              color: '#E2E2E2',
              fontFamily: 'Audiowide',
              fontSize: '48px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: '56px',
              textTransform: 'uppercase',
              margin: 0
            }}
          >
            {currentGameMode.name}
          </h1>
          <p
            style={{
              color: '#E19E23',
              fontFamily: 'Audiowide',
              fontSize: '24px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: '56px',
              textTransform: 'uppercase',
              margin: 0
            }}
          >
            {currentGameMode.description}
          </p>
        </div>

        {/* Profile VS Information */}
        <div
          style={{
            display: 'flex',
            height: '410px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '30px',
            alignSelf: 'stretch'
          }}
        >
          {/* User Profile and Stats Side-by-Side */}
          <div
            style={{
              display: 'flex',
              height: '410px',
              padding: '20px',
              alignItems: 'flex-start',
              gap: '20px',
              flex: '1 0 0',
              borderRadius: '20px',
              border: '1px solid #FFF'
            }}
          >
            {/* User Display Background */}
            {/* User Display Background */}
            <div
              style={{
                display: 'flex',
                padding: '20px',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flex: '0 0 50%',
                alignSelf: 'stretch',
                borderRadius: '15px',
                position: 'relative',
                overflow: 'hidden',
                // Robust background logic for all sources
                ...(matchBackground?.type === 'video' ? {} :
                  matchBackground?.type === 'gradient' ? { background: matchBackground.file || matchBackground.url } :
                  matchBackground?.file ? { background: `url('${matchBackground.file}') center/cover no-repeat` } :
                  matchBackground?.url ? { background: `url('${matchBackground.url}') center/cover no-repeat` } :
                  currentUserPlayerBackground?.type === 'video' ? {} :
                  currentUserPlayerBackground?.type === 'gradient' ? { background: currentUserPlayerBackground.file || currentUserPlayerBackground.url } :
                  currentUserPlayerBackground?.file ? { background: `url('${currentUserPlayerBackground.file}') center/cover no-repeat` } :
                  currentUserPlayerBackground?.url ? { background: `url('${currentUserPlayerBackground.url}') center/cover no-repeat` } :
                  equippedPlayerBackground?.type === 'video' ? {} :
                  equippedPlayerBackground?.type === 'gradient' ? { background: equippedPlayerBackground.file || equippedPlayerBackground.url } :
                  equippedPlayerBackground?.file ? { background: `url('${equippedPlayerBackground.file}') center/cover no-repeat` } :
                  equippedPlayerBackground?.url ? { background: `url('${equippedPlayerBackground.url}') center/cover no-repeat` } :
                  { background: '#332A63' })
              }}
            >
              {/* If matchBackground or equippedPlayerBackground is a video, render video element as background */}
              {(matchBackground?.type === 'video' && (matchBackground?.file || matchBackground?.url)) && (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 0
                  }}
                >
                  <source src={matchBackground.file || matchBackground.url} type="video/mp4" />
                </video>
              )}
              {(currentUserPlayerBackground?.type === 'video' && (currentUserPlayerBackground?.file || currentUserPlayerBackground?.url)) && !matchBackground && (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 0
                  }}
                >
                  <source src={currentUserPlayerBackground.file || currentUserPlayerBackground.url} type="video/mp4" />
                </video>
              )}
              {(equippedPlayerBackground?.type === 'video' && (equippedPlayerBackground?.file || equippedPlayerBackground?.url)) && !matchBackground && !currentUserPlayerBackground && (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 0
                  }}
                >
                  <source src={equippedPlayerBackground.file || equippedPlayerBackground.url} type="video/mp4" />
                </video>
              )}
              {/* Player Name in top right */}
              <div
                style={{
                  color: '#FFF',
                  fontFamily: 'Audiowide',
                  fontSize: '20px',
                  fontWeight: 400,
                  textTransform: 'uppercase',
                  selfAlign: 'flex-start',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                  alignSelf: 'flex-end',
                  zIndex: 1
                }}
              >
                {getDisplayName()}
              </div>
            </div>

            {/* User Stats */}
            <div
              style={{
                display: 'grid',
                rowGap: '10px',
                columnGap: '10px',
                maxWidth: '500px',
                flex: '1 0 0',
                alignSelf: 'stretch',
                gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
              }}
            >
              {/* ...existing code for user stats... */}
              <div style={{ display: 'flex', padding: '4px 20px', justifyContent: 'center', alignItems: 'center', gap: '10px', flex: '1 0 0', alignSelf: 'stretch', gridRow: '1 / span 1', gridColumn: '1 / span 1', borderRadius: '18px', background: 'linear-gradient(318deg, #574E78 0.08%, rgba(89, 89, 89, 0.02) 50.25%)', backdropFilter: 'blur(20px)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#E2E2E2', textAlign: 'center', fontFamily: 'Audiowide', fontSize: '13px', fontStyle: 'normal', fontWeight: 400, lineHeight: '56px', textTransform: 'uppercase' }}>Match Wins</div>
                  <div style={{ color: '#E2E2E2', textAlign: 'center', fontFamily: 'Audiowide', fontSize: '70px', fontStyle: 'normal', fontWeight: 400, lineHeight: '56px', textTransform: 'uppercase' }}>{playerStats.matchWins}</div>
                </div>
              </div>
              <div style={{ display: 'flex', padding: '4px 20px', justifyContent: 'center', alignItems: 'center', gap: '10px', flex: '1 0 0', alignSelf: 'stretch', gridRow: '1 / span 1', gridColumn: '2 / span 1', borderRadius: '18px', background: 'linear-gradient(41deg, #6497C8 0.22%, rgba(89, 89, 89, 0.00) 50.11%)', backdropFilter: 'blur(20px)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#E2E2E2', textAlign: 'center', fontFamily: 'Audiowide', fontSize: '13px', fontStyle: 'normal', fontWeight: 400, lineHeight: '56px', textTransform: 'uppercase' }}>League Wins</div>
                  <div style={{ color: '#E2E2E2', textAlign: 'center', fontFamily: 'Audiowide', fontSize: '70px', fontStyle: 'normal', fontWeight: 400, lineHeight: '56px', textTransform: 'uppercase' }}>{playerStats.leagueWins}</div>
                </div>
              </div>
              <div style={{ display: 'flex', padding: '4px 20px', justifyContent: 'center', alignItems: 'center', gap: '10px', flex: '1 0 0', alignSelf: 'stretch', gridRow: '2 / span 1', gridColumn: '1 / span 1', borderRadius: '18px', background: 'linear-gradient(222deg, #3A57A5 -0.22%, rgba(89, 89, 89, 0.02) 49.96%)', backdropFilter: 'blur(20px)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#E2E2E2', textAlign: 'center', fontFamily: 'Audiowide', fontSize: '13px', fontStyle: 'normal', fontWeight: 400, lineHeight: '56px', textTransform: 'uppercase' }}>Masterpieces</div>
                  <div style={{ color: '#E2E2E2', textAlign: 'center', fontFamily: 'Audiowide', fontSize: '70px', fontStyle: 'normal', fontWeight: 400, lineHeight: '56px', textTransform: 'uppercase' }}>{playerStats.masterpieces}</div>
                </div>
              </div>
              <div style={{ display: 'flex', padding: '4px 20px', justifyContent: 'center', alignItems: 'center', gap: '10px', flex: '1 0 0', alignSelf: 'stretch', gridRow: '2 / span 1', gridColumn: '2 / span 1', borderRadius: '18px', background: 'linear-gradient(139deg, #AB7076 -0.08%, rgba(123, 123, 123, 0.02) 49.82%)', backdropFilter: 'blur(20px)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#E2E2E2', textAlign: 'center', fontFamily: 'Audiowide', fontSize: '13px', fontStyle: 'normal', fontWeight: 400, lineHeight: '56px', textTransform: 'uppercase' }}>Abilities</div>
                  <div style={{ color: '#E2E2E2', textAlign: 'center', fontFamily: 'Audiowide', fontSize: '70px', fontStyle: 'normal', fontWeight: 400, lineHeight: '56px', textTransform: 'uppercase' }}>{playerStats.abilities}</div>
                </div>
              </div>
            </div>
          </div>

          {/* VS Section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '20px'
            }}
          >
            <div
              style={{
                color: '#E2E2E2',
                fontFamily: 'Audiowide',
                fontSize: '48px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '56px',
                textTransform: 'uppercase'
              }}
            >
              VS
            </div>
          </div>

          {/* Opponent Profile */}
          {players.length > 1 ? (
            // Show opponent stats when found
            <div
              style={{
                display: 'flex',
                height: '410px',
                padding: '20px',
                alignItems: 'flex-start',
                gap: '20px',
                flex: '1 0 0',
                borderRadius: '20px',
                border: '1px solid #FFF'
              }}
            >
              {/* Opponent Display Background - same layout and styling as user */}
              <div
                style={{
                  display: 'flex',
                  padding: '20px',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flex: '0 0 50%',
                  alignSelf: 'stretch',
                  borderRadius: '15px',
                  position: 'relative',
                  overflow: 'hidden',
                  ...(opponentPlayerBackground?.type === 'video' ? {} :
                    opponentPlayerBackground?.type === 'gradient' ? { background: opponentPlayerBackground.file } :
                    opponentPlayerBackground?.file ? { background: `url('${opponentPlayerBackground.file}') center/cover no-repeat` } :
                    opponentPlayerBackground?.isVideo ? {} :
                    opponentPlayerBackground?.isGradient ? { background: opponentPlayerBackground.url } :
                    opponentPlayerBackground?.url ? { background: `url('${opponentPlayerBackground.url}') center/cover no-repeat` } :
                    { background: '#332A63' })
                }}
              >
                {/* If opponent background is a video, render video element as background */}
                {opponentPlayerBackground?.type === 'video' && opponentPlayerBackground?.file && (
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      zIndex: 0
                    }}
                  >
                    <source src={opponentPlayerBackground.file} type="video/mp4" />
                  </video>
                )}
                {/* Opponent Name in top right */}
                <div
                  style={{
                    color: '#FFF',
                    fontFamily: 'Audiowide',
                    fontSize: '20px',
                    fontWeight: 400,
                    textTransform: 'uppercase',
                    selfAlign: 'flex-start',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    alignSelf: 'flex-end',
                    zIndex: 1
                  }}
                >
                  {players.length > 1 ? (players.find(p => p.uid !== currentUser?.uid)?.name || 'Opponent') : ''}
                </div>
              </div>

              {/* Opponent Stats - same layout and styling as user */}
              <div
                style={{
                  display: 'grid',
                  rowGap: '10px',
                  columnGap: '10px',
                  maxWidth: '500px',
                  flex: '1 0 0',
                  alignSelf: 'stretch',
                  gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
                }}
              >
                <div style={{ display: 'flex', padding: '4px 20px', justifyContent: 'center', alignItems: 'center', gap: '10px', flex: '1 0 0', alignSelf: 'stretch', gridRow: '1 / span 1', gridColumn: '1 / span 1', borderRadius: '18px', background: 'linear-gradient(318deg, #574E78 0.08%, rgba(89, 89, 89, 0.02) 50.25%)', backdropFilter: 'blur(20px)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#E2E2E2', textAlign: 'center', fontFamily: 'Audiowide', fontSize: '13px', fontStyle: 'normal', fontWeight: 400, lineHeight: '56px', textTransform: 'uppercase' }}>Match Wins</div>
                    <div style={{ color: '#E2E2E2', textAlign: 'center', fontFamily: 'Audiowide', fontSize: '70px', fontStyle: 'normal', fontWeight: 400, lineHeight: '56px', textTransform: 'uppercase' }}>{opponentStats.matchWins}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', padding: '4px 20px', justifyContent: 'center', alignItems: 'center', gap: '10px', flex: '1 0 0', alignSelf: 'stretch', gridRow: '1 / span 1', gridColumn: '2 / span 1', borderRadius: '18px', background: 'linear-gradient(41deg, #6497C8 0.22%, rgba(89, 89, 89, 0.00) 50.11%)', backdropFilter: 'blur(20px)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#E2E2E2', textAlign: 'center', fontFamily: 'Audiowide', fontSize: '13px', fontStyle: 'normal', fontWeight: 400, lineHeight: '56px', textTransform: 'uppercase' }}>League Wins</div>
                    <div style={{ color: '#E2E2E2', textAlign: 'center', fontFamily: 'Audiowide', fontSize: '70px', fontStyle: 'normal', fontWeight: 400, lineHeight: '56px', textTransform: 'uppercase' }}>{opponentStats.leagueWins}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', padding: '4px 20px', justifyContent: 'center', alignItems: 'center', gap: '10px', flex: '1 0 0', alignSelf: 'stretch', gridRow: '2 / span 1', gridColumn: '1 / span 1', borderRadius: '18px', background: 'linear-gradient(222deg, #3A57A5 -0.22%, rgba(89, 89, 89, 0.02) 49.96%)', backdropFilter: 'blur(20px)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#E2E2E2', textAlign: 'center', fontFamily: 'Audiowide', fontSize: '13px', fontStyle: 'normal', fontWeight: 400, lineHeight: '56px', textTransform: 'uppercase' }}>Masterpieces</div>
                    <div style={{ color: '#E2E2E2', textAlign: 'center', fontFamily: 'Audiowide', fontSize: '70px', fontStyle: 'normal', fontWeight: 400, lineHeight: '56px', textTransform: 'uppercase' }}>{opponentStats.masterpieces}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', padding: '4px 20px', justifyContent: 'center', alignItems: 'center', gap: '10px', flex: '1 0 0', alignSelf: 'stretch', gridRow: '2 / span 1', gridColumn: '2 / span 1', borderRadius: '18px', background: 'linear-gradient(139deg, #AB7076 -0.08%, rgba(123, 123, 123, 0.02) 49.82%)', backdropFilter: 'blur(20px)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#E2E2E2', textAlign: 'center', fontFamily: 'Audiowide', fontSize: '13px', fontStyle: 'normal', fontWeight: 400, lineHeight: '56px', textTransform: 'uppercase' }}>Abilities</div>
                    <div style={{ color: '#E2E2E2', textAlign: 'center', fontFamily: 'Audiowide', fontSize: '70px', fontStyle: 'normal', fontWeight: 400, lineHeight: '56px', textTransform: 'uppercase' }}>{opponentStats.abilities}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Show countdown, room code, or searching text based on state
            <div
              style={{
                color: '#E2E2E2',
                textAlign: 'center',
                fontFamily: 'Audiowide',
                fontSize: '48px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '56px',
                textTransform: 'uppercase',
                flex: '1 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {countdown !== null ? (
                // Show countdown when game is about to start (highest priority)
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '20px',
                  textAlign: 'center',
                  position: 'relative',
                  zIndex: 1000
                }}>
                  <div style={{ 
                    fontSize: '32px', 
                    color: '#E19E23',
                    fontFamily: 'Audiowide',
                    textTransform: 'uppercase',
                    letterSpacing: '2px'
                  }}>
                    Game Starting In
                  </div>
                  <div style={{ 
                    fontSize: countdown > 0 ? '120px' : '100px', 
                    color: countdown > 0 ? '#FF0080' : '#00FF00',
                    fontFamily: 'Audiowide',
                    fontWeight: 'bold',
                    textShadow: '0 0 20px rgba(255, 0, 128, 0.5)',
                    animation: countdown > 0 ? 'pulse 1s infinite' : 'none',
                    textTransform: 'uppercase'
                  }}>
                    {countdown > 0 ? countdown : 'GO!'}
                  </div>
                </div>
              ) : actionType === 'custom' ? (
                // Show room code for custom games
                <>
                  <div style={{ fontSize: '24px', color: '#E19E23' }}>Room Code</div>
                  <div style={{ fontSize: '48px', color: '#E2E2E2', letterSpacing: '8px' }}>
                    {roomCode || 'Loading...'}
                  </div>
                </>
              ) : (
                // Show searching text for live games
                searchingText
              )}
            </div>
          )}
        </div>

        {/* Leave Button */}
        <button
          onClick={handleLeave}
          disabled={players.length > 1 || countdown !== null} // Disable when opponent joins or countdown started
          style={{
            display: 'flex',
            padding: '20px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            borderRadius: '18px',
            background: (players.length > 1 || countdown !== null) ? '#666666' : '#FF0080',
            backdropFilter: 'blur(20px)',
            color: '#FFF',
            leadingTrim: 'both',
            textEdge: 'cap',
            fontFamily: 'Audiowide',
            fontSize: '40px',
            fontStyle: 'normal',
            fontWeight: 400,
            lineHeight: '30px',
            border: 'none',
            cursor: (players.length > 1 || countdown !== null) ? 'not-allowed' : 'pointer',
            opacity: (players.length > 1 || countdown !== null) ? 0.5 : 1,
            textTransform: 'uppercase'
          }}
        >
          {countdown !== null ? 'Starting Game...' : 
           players.length > 1 ? 'Match Found!' : 'Leave Game'}
        </button>
      </div>
    </div>
  );
}
