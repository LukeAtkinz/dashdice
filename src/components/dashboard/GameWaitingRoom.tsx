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
    const createWaitingRoomEntry = async () => {
      try {
        setError('');
        setIsLoading(true);

        if (!user?.uid) {
          setError('You must be signed in to create a game');
          return;
        }

        const userStats = await getUserStats();

        const entry: WaitingRoomEntry = {
          createdAt: serverTimestamp(),
          gameMode: "Classic Mode", // Always set as requested
          gameType: "", // Leave blank as requested
          playersRequired: 1, // Always 1 as requested
          hostData: {
            playerDisplayName: getDisplayName(),
            playerId: user.uid,
            displayBackgroundEquipped: DisplayBackgroundEquip || null,
            matchBackgroundEquipped: MatchBackgroundEquip || null,
            playerStats: userStats
          }
        };

        const docRef = await addDoc(collection(db, 'waitingroom'), entry);
        setWaitingRoomEntry({ ...entry, id: docRef.id });
        setIsLoading(false);

      } catch (err) {
        console.error('Error creating waiting room entry:', err);
        setError('Failed to create game session');
        setIsLoading(false);
      }
    };

    createWaitingRoomEntry();

    // Cleanup function to remove waiting room entry when component unmounts
    return () => {
      if (waitingRoomEntry?.id) {
        deleteDoc(doc(db, 'waitingroom', waitingRoomEntry.id)).catch(console.error);
      }
    };
  }, [user, gameMode, actionType]);

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
                flex: '0 0 50%',
                alignSelf: 'stretch',
                borderRadius: '15px',
                position: 'relative',
                overflow: 'hidden',
                ...getBackgroundStyle()
              }}
            >
              {renderPlayerBackground()}
              
              {/* Player Name in top right */}
              <div
                style={{
                  color: '#FFF',
                  fontFamily: 'Audiowide',
                  fontSize: '20px',
                  fontWeight: 400,
                  textTransform: 'uppercase',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                  alignSelf: 'flex-end',
                  zIndex: 1
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
                background: 'var(--ui-waiting-room-bg)', 
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
                background: 'var(--ui-waiting-room-bg)', 
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
                background: 'var(--ui-waiting-room-bg)', 
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
                background: 'var(--ui-waiting-room-bg)', 
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

          {/* Waiting Area (Opponent placeholder) */}
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
        </div>

        {/* Leave Button */}
        <button
          onClick={handleLeave}
          style={{
            display: 'flex',
            padding: '20px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            borderRadius: '18px',
            background: '#FF0080',
            backdropFilter: 'blur(20px)',
            color: '#FFF',
            fontFamily: 'Audiowide',
            fontSize: '40px',
            fontStyle: 'normal',
            fontWeight: 400,
            lineHeight: '30px',
            border: 'none',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 0, 128, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Leave Game
        </button>
      </div>
    </div>
  );
};
