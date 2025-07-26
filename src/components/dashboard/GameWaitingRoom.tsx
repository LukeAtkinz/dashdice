'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBackground } from '@/context/BackgroundContext';
import { useNavigation } from '@/context/NavigationContext';
import { db } from '@/services/firebase';
import { collection, addDoc, doc, onSnapshot, updateDoc, deleteDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

interface GameWaitingRoomProps {
  gameMode: string;
  actionType: 'live' | 'custom';
  onBack: () => void;
}

interface WaitingRoomEntry {
  id?: string;
  createdAt: any;
  gameMode: string;
  gameType: string;
  playersRequired: number;
  hostData: {
    playerDisplayName: string;
    playerId: string;
    displayBackgroundEquipped: any;
    matchBackgroundEquipped: any;
    playerStats: {
      bestStreak: number;
      currentStreak: number;
      gamesPlayed: number;
      matchWins: number;
    };
  };
  opponentData?: {
    playerDisplayName: string;
    playerId: string;
    displayBackgroundEquipped: any;
    matchBackgroundEquipped: any;
    playerStats: {
      bestStreak: number;
      currentStreak: number;
      gamesPlayed: number;
      matchWins: number;
    };
  };
}

export const GameWaitingRoom: React.FC<GameWaitingRoomProps> = ({
  gameMode,
  actionType,
  onBack
}) => {
  const { user } = useAuth();
  const { DisplayBackgroundEquip, MatchBackgroundEquip } = useBackground();
  const { setCurrentSection } = useNavigation();
  
  const [waitingRoomEntry, setWaitingRoomEntry] = useState<WaitingRoomEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchingText, setSearchingText] = useState('Searching for opponents...');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [opponentJoined, setOpponentJoined] = useState(false);

  // Game mode display configurations
  const gameModeConfig = {
    quickfire: { 
      name: 'Quick Fire', 
      description: 'Fast-paced dice action'
    },
    classic: { 
      name: 'Classic Mode', 
      description: 'Traditional dice gameplay'
    },
    zerohour: { 
      name: 'Zero Hour', 
      description: 'Race against time'
    },
    lastline: { 
      name: 'Last Line', 
      description: 'Sudden death showdown'
    },
    truegrit: { 
      name: 'True Grit', 
      description: 'One turn, one chance'
    },
    tagteam: { 
      name: 'Tag Team', 
      description: '2v2 team battles'
    }
  };

  const currentGameMode = gameModeConfig[gameMode as keyof typeof gameModeConfig] || gameModeConfig.classic;

  // Get display name from user email
  const getDisplayName = () => {
    return user?.email?.split('@')[0] || 'Anonymous';
  };

  // Get user stats from profile (placeholder - you'll need to implement actual profile fetching)
  const getUserStats = async () => {
    // TODO: Fetch from user profile in database
    // For now returning placeholder data
    return {
      bestStreak: 12,
      currentStreak: 3,
      gamesPlayed: 127,
      matchWins: 89
    };
  };

  // Animated searching text
  useEffect(() => {
    if (actionType === 'live') {
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
  }, [actionType]);

  // Create waiting room entry when component mounts
  useEffect(() => {
    const handleMatchmaking = async () => {
      try {
        setError('');
        setIsLoading(true);

        if (!user?.uid) {
          setError('You must be signed in to create a game');
          return;
        }

        const userStats = await getUserStats();

        // First, check for existing games with same gameMode and gameType
        const q = query(
          collection(db, 'waitingroom'),
          where('gameMode', '==', gameMode),
          where('gameType', '==', 'Open Server')
        );

        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Found an existing game - join as opponent
          const existingGameDoc = querySnapshot.docs[0];
          const existingGame = existingGameDoc.data() as WaitingRoomEntry;
          
          // Add opponent data to the existing game
          const opponentData = {
            playerDisplayName: getDisplayName(),
            playerId: user.uid,
            displayBackgroundEquipped: DisplayBackgroundEquip || null,
            matchBackgroundEquipped: MatchBackgroundEquip || null,
            playerStats: userStats
          };

          await updateDoc(doc(db, 'waitingroom', existingGameDoc.id), {
            opponentData: opponentData
          });

          // Set up listener for the joined game
          const unsubscribe = onSnapshot(doc(db, 'waitingroom', existingGameDoc.id), (doc) => {
            if (doc.exists()) {
              const data = doc.data() as WaitingRoomEntry;
              setWaitingRoomEntry({ ...data, id: doc.id });
              
              // Check if opponent joined (we are the opponent in this case)
              if (data.opponentData) {
                setOpponentJoined(true);
                // Start countdown immediately since we just joined
                startCountdown();
              }
            }
          });

          setIsLoading(false);
          return () => unsubscribe();
        } else {
          // No existing game found - create new one
          const entry: WaitingRoomEntry = {
            createdAt: serverTimestamp(),
            gameMode: gameMode,
            gameType: "Open Server",
            playersRequired: 0, // Set to 0 as requested
            hostData: {
              playerDisplayName: getDisplayName(),
              playerId: user.uid,
              displayBackgroundEquipped: DisplayBackgroundEquip || null,
              matchBackgroundEquipped: MatchBackgroundEquip || null,
              playerStats: userStats
            }
          };

          const docRef = await addDoc(collection(db, 'waitingroom'), entry);
          const gameId = docRef.id;
          
          // Set up listener for when opponent joins
          const unsubscribe = onSnapshot(doc(db, 'waitingroom', gameId), (doc) => {
            if (doc.exists()) {
              const data = doc.data() as WaitingRoomEntry;
              setWaitingRoomEntry({ ...data, id: doc.id });
              
              // Check if opponent joined
              if (data.opponentData && !opponentJoined) {
                setOpponentJoined(true);
                startCountdown();
              }
            }
          });

          setWaitingRoomEntry({ ...entry, id: gameId });
          
          // Add test computer player after 3 seconds for testing
          setTimeout(() => {
            addTestOpponent(gameId);
          }, 3000);

          setIsLoading(false);
          return () => unsubscribe();
        }

      } catch (err) {
        console.error('Error in matchmaking:', err);
        setError('Failed to create game session');
        setIsLoading(false);
      }
    };

    const matchmakingCleanup = handleMatchmaking();

    // Cleanup function to remove waiting room entry when component unmounts
    return () => {
      if (matchmakingCleanup && typeof matchmakingCleanup.then === 'function') {
        matchmakingCleanup.then((cleanup) => {
          if (cleanup && typeof cleanup === 'function') {
            cleanup();
          }
        });
      }
      if (waitingRoomEntry?.id) {
        deleteDoc(doc(db, 'waitingroom', waitingRoomEntry.id)).catch(console.error);
      }
    };
  }, [user, gameMode, actionType]);

  // Function to start 5-second countdown
  const startCountdown = () => {
    setCountdown(5);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // Move to matches collection and navigate to match
          moveToMatchesAndNavigate();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Function to add test computer opponent
  const addTestOpponent = async (gameId: string) => {
    try {
      const computerOpponentData = {
        playerDisplayName: "GKent",
        playerId: "computer_gkent",
        displayBackgroundEquipped: null, // Will use underwater theme
        matchBackgroundEquipped: { 
          type: 'image',
          file: '/backgrounds/Underwater.jpg',
          name: 'Underwater'
        },
        playerStats: {
          bestStreak: 3,
          currentStreak: 1,
          gamesPlayed: 100,
          matchWins: 69
        }
      };

      await updateDoc(doc(db, 'waitingroom', gameId), {
        opponentData: computerOpponentData
      });
    } catch (err) {
      console.error('Error adding test opponent:', err);
    }
  };

  // Function to move game to matches collection
  const moveToMatchesAndNavigate = async () => {
    try {
      if (!waitingRoomEntry?.id) return;

      // Create match document
      const matchData = {
        ...waitingRoomEntry,
        status: 'active',
        createdAt: serverTimestamp(),
        startedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'matches'), matchData);
      
      // Remove from waiting room
      await deleteDoc(doc(db, 'waitingroom', waitingRoomEntry.id));
      
      // Navigate to match (placeholder for now)
      console.log('Would navigate to Match.js with data:', matchData);
      
    } catch (err) {
      console.error('Error moving to matches:', err);
    }
  };

  // Handle leaving the game
  const handleLeave = async () => {
    try {
      if (waitingRoomEntry?.id) {
        await deleteDoc(doc(db, 'waitingroom', waitingRoomEntry.id));
      }
    } catch (err) {
      console.error('Error leaving game:', err);
    } finally {
      onBack();
    }
  };

  // Render background based on equipped match background
  const renderPlayerBackground = () => {
    const background = waitingRoomEntry?.hostData.matchBackgroundEquipped;
    
    if (background) {
      if (background.type === 'video') {
        return (
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
            <source src={background.file} type="video/mp4" />
          </video>
        );
      } else {
        return null; // CSS background will handle image
      }
    }
    return null;
  };

  const getBackgroundStyle = () => {
    const background = waitingRoomEntry?.hostData.matchBackgroundEquipped;
    
    if (background?.type === 'video') {
      return {};
    } else if (background?.file) {
      return { 
        background: `url('${background.file}') center/cover no-repeat` 
      };
    }
    return { background: '#332A63' };
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-white text-2xl" style={{ fontFamily: 'Audiowide' }}>
          Creating game session...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
        <div className="text-red-400 text-xl text-center" style={{ fontFamily: 'Audiowide' }}>
          {error}
        </div>
        <button
          onClick={handleLeave}
          className="px-6 py-3 rounded-lg transition-all duration-300 hover:scale-105"
          style={{
            background: '#FF0080',
            fontFamily: 'Audiowide',
            fontSize: '16px',
            fontWeight: 400,
            textTransform: 'uppercase',
            color: '#FFF',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center min-h-0" style={{ padding: '20px' }}>
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
        
        @keyframes epicPulse {
          0% { 
            transform: scale(1) rotate(0deg);
            filter: drop-shadow(0 0 20px rgba(255, 0, 128, 0.8));
          }
          25% { 
            transform: scale(1.15) rotate(1deg);
            filter: drop-shadow(0 0 40px rgba(255, 69, 0, 1));
          }
          50% { 
            transform: scale(1.3) rotate(0deg);
            filter: drop-shadow(0 0 60px rgba(255, 215, 0, 1));
          }
          75% { 
            transform: scale(1.15) rotate(-1deg);
            filter: drop-shadow(0 0 40px rgba(255, 0, 0, 1));
          }
          100% { 
            transform: scale(1) rotate(0deg);
            filter: drop-shadow(0 0 20px rgba(255, 0, 128, 0.8));
          }
        }
        
        @keyframes battleFlash {
          0% { 
            background: radial-gradient(circle, rgba(255,0,128,0.3) 0%, rgba(0,0,0,0.8) 70%);
            transform: scale(1);
          }
          20% { 
            background: radial-gradient(circle, rgba(255,69,0,0.4) 0%, rgba(0,0,0,0.8) 70%);
            transform: scale(1.02);
          }
          40% { 
            background: radial-gradient(circle, rgba(255,215,0,0.5) 0%, rgba(0,0,0,0.8) 70%);
            transform: scale(1.05);
          }
          60% { 
            background: radial-gradient(circle, rgba(255,0,0,0.4) 0%, rgba(0,0,0,0.8) 70%);
            transform: scale(1.02);
          }
          80% { 
            background: radial-gradient(circle, rgba(0,255,128,0.3) 0%, rgba(0,0,0,0.8) 70%);
            transform: scale(1.01);
          }
          100% { 
            background: radial-gradient(circle, rgba(255,0,128,0.3) 0%, rgba(0,0,0,0.8) 70%);
            transform: scale(1);
          }
        }
        
        @keyframes goExplosion {
          0% { 
            transform: scale(1);
            filter: drop-shadow(0 0 30px rgba(0, 255, 0, 1));
          }
          50% { 
            transform: scale(2);
            filter: drop-shadow(0 0 100px rgba(255, 255, 255, 1));
          }
          100% { 
            transform: scale(1.5);
            filter: drop-shadow(0 0 50px rgba(0, 255, 0, 0.8));
          }
        }
        
        @keyframes shakeGround {
          0%, 100% { transform: translateY(0px); }
          25% { transform: translateY(-3px); }
          75% { transform: translateY(3px); }
        }
      `}</style>

      {/* Main Content Container */}
      <div
        style={{
          display: 'flex',
          width: 'calc(100vw - 40px)',
          maxWidth: '100%',
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
              margin: 0,
              textShadow: "0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.4), 0 0 60px rgba(255, 215, 0, 0.2)"
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
          {/* Host Profile and Stats */}
          <div
            style={{
              display: 'flex',
              height: '410px',
              padding: '20px',
              alignItems: 'flex-start',
              gap: '20px',
              flex: '1 0 0',
              borderRadius: '20px',
              border: `1px solid var(--ui-waiting-room-border)`
            }}
          >
            {/* Host Display Background */}
            <div
              style={{
                display: 'flex',
                padding: '20px',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flex: '0 0 60%',
                alignSelf: 'stretch',
                borderRadius: '15px',
                position: 'relative',
                overflow: 'hidden',
                ...getBackgroundStyle()
              }}
            >
              {renderPlayerBackground()}
              
              {/* Bottom-left to transparent gradient overlay for readability */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: '40%',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
                  zIndex: 1,
                  pointerEvents: 'none'
                }}
              />
              
              {/* Player Name in bottom left with better readability */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '20px',
                  color: '#FFF',
                  fontFamily: 'Audiowide',
                  fontSize: '28px',
                  fontWeight: 400,
                  textTransform: 'uppercase',
                  textShadow: '2px 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.7)',
                  zIndex: 2
                }}
              >
                {waitingRoomEntry?.hostData.playerDisplayName}
              </div>
            </div>

            {/* Host Stats */}
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
              {/* Match Wins */}
              <div style={{ 
                display: 'flex', 
                padding: '4px 20px', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '10px', 
                flex: '1 0 0', 
                alignSelf: 'stretch', 
                gridRow: '1 / span 1', 
                gridColumn: '1 / span 1', 
                borderRadius: '18px', 
                background: 'linear-gradient(318deg, #574E78 0.08%, rgba(89, 89, 89, 0.02) 50.25%)', 
                backdropFilter: 'blur(20px)' 
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: '13px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: '56px', 
                    textTransform: 'uppercase' 
                  }}>
                    Match Wins
                  </div>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: '70px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: '56px', 
                    textTransform: 'uppercase' 
                  }}>
                    {waitingRoomEntry?.hostData.playerStats.matchWins}
                  </div>
                </div>
              </div>

              {/* Games Played */}
              <div style={{ 
                display: 'flex', 
                padding: '4px 20px', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '10px', 
                flex: '1 0 0', 
                alignSelf: 'stretch', 
                gridRow: '1 / span 1', 
                gridColumn: '2 / span 1', 
                borderRadius: '18px', 
                background: 'linear-gradient(41deg, #6497C8 0.22%, rgba(89, 89, 89, 0.00) 50.11%)', 
                backdropFilter: 'blur(20px)' 
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: '13px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: '56px', 
                    textTransform: 'uppercase' 
                  }}>
                    Games Played
                  </div>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: '70px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: '56px', 
                    textTransform: 'uppercase' 
                  }}>
                    {waitingRoomEntry?.hostData.playerStats.gamesPlayed}
                  </div>
                </div>
              </div>

              {/* Best Streak */}
              <div style={{ 
                display: 'flex', 
                padding: '4px 20px', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '10px', 
                flex: '1 0 0', 
                alignSelf: 'stretch', 
                gridRow: '2 / span 1', 
                gridColumn: '1 / span 1', 
                borderRadius: '18px', 
                background: 'linear-gradient(222deg, #3A57A5 -0.22%, rgba(89, 89, 89, 0.02) 49.96%)', 
                backdropFilter: 'blur(20px)' 
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: '13px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: '56px', 
                    textTransform: 'uppercase' 
                  }}>
                    Best Streak
                  </div>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: '70px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: '56px', 
                    textTransform: 'uppercase' 
                  }}>
                    {waitingRoomEntry?.hostData.playerStats.bestStreak}
                  </div>
                </div>
              </div>

              {/* Current Streak */}
              <div style={{ 
                display: 'flex', 
                padding: '4px 20px', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '10px', 
                flex: '1 0 0', 
                alignSelf: 'stretch', 
                gridRow: '2 / span 1', 
                gridColumn: '2 / span 1', 
                borderRadius: '18px', 
                background: 'linear-gradient(139deg, #AB7076 -0.08%, rgba(123, 123, 123, 0.02) 49.82%)', 
                backdropFilter: 'blur(20px)' 
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: '13px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: '56px', 
                    textTransform: 'uppercase' 
                  }}>
                    Current Streak
                  </div>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: '70px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: '56px', 
                    textTransform: 'uppercase' 
                  }}>
                    {waitingRoomEntry?.hostData.playerStats.currentStreak}
                  </div>
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

          {/* Opponent Section - Show opponent card or waiting */}
          {waitingRoomEntry?.opponentData ? (
            // Show opponent card when joined - Stats on left, Background on right (opposite of host)
            <div
              style={{
                display: 'flex',
                height: '410px',
                padding: '20px',
                alignItems: 'flex-start',
                gap: '20px',
                flex: '1 0 0',
                borderRadius: '20px',
                border: `1px solid var(--ui-waiting-room-border)`
              }}
            >
              {/* Opponent Stats - on the left (inside) */}
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
                {/* Match Wins */}
                <div style={{ 
                  display: 'flex', 
                  padding: '4px 20px', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: '10px', 
                  flex: '1 0 0', 
                  alignSelf: 'stretch', 
                  gridRow: '1 / span 1', 
                  gridColumn: '1 / span 1', 
                  borderRadius: '18px', 
                  background: 'linear-gradient(318deg, #574E78 0.08%, rgba(89, 89, 89, 0.02) 50.25%)', 
                  backdropFilter: 'blur(20px)' 
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: '13px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: '56px', 
                      textTransform: 'uppercase' 
                    }}>
                      Match Wins
                    </div>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: '70px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: '56px', 
                      textTransform: 'uppercase' 
                    }}>
                      {waitingRoomEntry.opponentData.playerStats.matchWins}
                    </div>
                  </div>
                </div>

                {/* Games Played */}
                <div style={{ 
                  display: 'flex', 
                  padding: '4px 20px', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: '10px', 
                  flex: '1 0 0', 
                  alignSelf: 'stretch', 
                  gridRow: '1 / span 1', 
                  gridColumn: '2 / span 1', 
                  borderRadius: '18px', 
                  background: 'linear-gradient(41deg, #6497C8 0.22%, rgba(89, 89, 89, 0.00) 50.11%)', 
                  backdropFilter: 'blur(20px)' 
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: '13px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: '56px', 
                      textTransform: 'uppercase' 
                    }}>
                      Games Played
                    </div>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: '70px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: '56px', 
                      textTransform: 'uppercase' 
                    }}>
                      {waitingRoomEntry.opponentData.playerStats.gamesPlayed}
                    </div>
                  </div>
                </div>

                {/* Best Streak */}
                <div style={{ 
                  display: 'flex', 
                  padding: '4px 20px', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: '10px', 
                  flex: '1 0 0', 
                  alignSelf: 'stretch', 
                  gridRow: '2 / span 1', 
                  gridColumn: '1 / span 1', 
                  borderRadius: '18px', 
                  background: 'linear-gradient(222deg, #3A57A5 -0.22%, rgba(89, 89, 89, 0.02) 49.96%)', 
                  backdropFilter: 'blur(20px)' 
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: '13px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: '56px', 
                      textTransform: 'uppercase' 
                    }}>
                      Best Streak
                    </div>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: '70px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: '56px', 
                      textTransform: 'uppercase' 
                    }}>
                      {waitingRoomEntry.opponentData.playerStats.bestStreak}
                    </div>
                  </div>
                </div>

                {/* Current Streak */}
                <div style={{ 
                  display: 'flex', 
                  padding: '4px 20px', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: '10px', 
                  flex: '1 0 0', 
                  alignSelf: 'stretch', 
                  gridRow: '2 / span 1', 
                  gridColumn: '2 / span 1', 
                  borderRadius: '18px', 
                  background: 'linear-gradient(139deg, #AB7076 -0.08%, rgba(123, 123, 123, 0.02) 49.82%)', 
                  backdropFilter: 'blur(20px)' 
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: '13px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: '56px', 
                      textTransform: 'uppercase' 
                    }}>
                      Current Streak
                    </div>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: '70px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: '56px', 
                      textTransform: 'uppercase' 
                    }}>
                      {waitingRoomEntry.opponentData.playerStats.currentStreak}
                    </div>
                  </div>
                </div>
              </div>

              {/* Opponent Display Background - on the right (outside) */}
              <div
                style={{
                  display: 'flex',
                  padding: '20px',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flex: '0 0 60%',
                  alignSelf: 'stretch',
                  borderRadius: '15px',
                  position: 'relative',
                  overflow: 'hidden',
                  background: waitingRoomEntry.opponentData.matchBackgroundEquipped?.file 
                    ? `url('${waitingRoomEntry.opponentData.matchBackgroundEquipped.file}') center/cover no-repeat` 
                    : '#332A63'
                }}
              >
                {/* Bottom-left to transparent gradient overlay for readability */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: '40%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
                    zIndex: 1,
                    pointerEvents: 'none'
                  }}
                />
                
                {/* Opponent Name in bottom left with better readability */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '20px',
                    color: '#FFF',
                    fontFamily: 'Audiowide',
                    fontSize: '28px',
                    fontWeight: 400,
                    textTransform: 'uppercase',
                    textShadow: '2px 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.7)',
                    zIndex: 2
                  }}
                >
                  {waitingRoomEntry.opponentData.playerDisplayName}
                </div>
              </div>
            </div>
          ) : (
            // Show waiting for opponent
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
              {searchingText}
            </div>
          )}
        </div>

        {/* Epic Battle Countdown Section */}
        {countdown !== null && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '30px',
              textAlign: 'center',
              padding: '60px',
              borderRadius: '30px',
              position: 'relative',
              overflow: 'hidden',
              animation: countdown > 0 ? 'battleFlash 0.8s infinite' : 'none',
              border: countdown > 0 ? '3px solid rgba(255, 0, 128, 0.8)' : '3px solid rgba(0, 255, 0, 0.8)',
              boxShadow: countdown > 0 
                ? '0 0 50px rgba(255, 0, 128, 0.6), inset 0 0 30px rgba(255, 69, 0, 0.3)' 
                : '0 0 80px rgba(0, 255, 0, 0.8), inset 0 0 40px rgba(0, 255, 0, 0.2)'
            }}
          >
            {/* Epic Background Effects */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: countdown > 0 
                  ? 'linear-gradient(45deg, rgba(255,0,128,0.1) 0%, rgba(255,69,0,0.2) 25%, rgba(255,215,0,0.1) 50%, rgba(255,0,0,0.2) 75%, rgba(255,0,128,0.1) 100%)'
                  : 'radial-gradient(circle, rgba(0,255,0,0.3) 0%, rgba(0,255,128,0.2) 50%, rgba(0,0,0,0.9) 100%)',
                animation: countdown > 0 ? 'shakeGround 0.3s infinite' : 'none',
                zIndex: -1
              }}
            />
            
            <div
              style={{
                color: countdown > 0 ? '#FFD700' : '#00FF00',
                fontFamily: 'Audiowide',
                fontSize: countdown > 0 ? '36px' : '42px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '4px',
                textShadow: countdown > 0 
                  ? '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 69, 0, 0.6)' 
                  : '0 0 30px rgba(0, 255, 0, 1), 0 0 60px rgba(0, 255, 128, 0.8)',
                animation: countdown > 0 ? 'epicPulse 0.6s infinite' : 'none'
              }}
            >
              {countdown > 0 ? '⚔️ BATTLE COMMENCING ⚔️' : '🔥 FIGHT! 🔥'}
            </div>
            
            <div
              style={{
                color: countdown > 0 ? '#FF0080' : '#00FF00',
                fontFamily: 'Audiowide',
                fontSize: countdown > 0 ? '180px' : '200px',
                fontWeight: 900,
                textShadow: countdown > 0 
                  ? '0 0 30px rgba(255, 0, 128, 1), 0 0 60px rgba(255, 69, 0, 0.8), 0 0 90px rgba(255, 215, 0, 0.6)'
                  : '0 0 50px rgba(0, 255, 0, 1), 0 0 100px rgba(255, 255, 255, 0.8)',
                animation: countdown > 0 ? 'epicPulse 0.4s infinite' : 'goExplosion 0.8s infinite',
                textTransform: 'uppercase',
                letterSpacing: countdown > 0 ? '10px' : '20px',
                WebkitTextStroke: countdown > 0 ? '2px #FFFFFF' : '3px #000000'
              }}
            >
              {countdown > 0 ? countdown : 'GO!'}
            </div>
            
            {countdown > 0 && (
              <div
                style={{
                  color: '#FF4500',
                  fontFamily: 'Audiowide',
                  fontSize: '24px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '3px',
                  textShadow: '0 0 15px rgba(255, 69, 0, 0.8)',
                  animation: 'epicPulse 0.8s infinite'
                }}
              >
                🗡️ PREPARE FOR COMBAT 🛡️
              </div>
            )}
            
            {countdown === 0 && (
              <div
                style={{
                  color: '#00FF00',
                  fontFamily: 'Audiowide',
                  fontSize: '32px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '4px',
                  textShadow: '0 0 25px rgba(0, 255, 0, 1)',
                  animation: 'goExplosion 0.6s infinite'
                }}
              >
                🏆 LET THE BATTLE BEGIN! 🏆
              </div>
            )}
          </div>
        )}

        {/* Leave Button */}
        <button
          onClick={handleLeave}
          disabled={countdown !== null || opponentJoined}
          style={{
            display: 'flex',
            padding: '20px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            borderRadius: '18px',
            background: (countdown !== null || opponentJoined) ? '#666666' : '#FF0080',
            backdropFilter: 'blur(20px)',
            color: '#FFF',
            fontFamily: 'Audiowide',
            fontSize: '40px',
            fontStyle: 'normal',
            fontWeight: 400,
            lineHeight: '30px',
            border: 'none',
            cursor: (countdown !== null || opponentJoined) ? 'not-allowed' : 'pointer',
            opacity: (countdown !== null || opponentJoined) ? 0.5 : 1,
            textTransform: 'uppercase',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            if (countdown === null && !opponentJoined) {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 0, 128, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (countdown === null && !opponentJoined) {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          {countdown !== null ? 'Starting Game...' : 
           opponentJoined ? 'Match Found!' : 'Leave Game'}
        </button>
      </div>
    </div>
  );
};
