'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBackground } from '@/context/BackgroundContext';
import { UserService } from '@/services/userService';
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
  gameData?: {
    type: string;
    settings: any;
    turnDecider: number;
    turnScore: number;
    diceOne: number;
    diceTwo: number;
    roundObjective: number;
    startingScore: number;
  };
}

export const GameWaitingRoom: React.FC<GameWaitingRoomProps> = ({
  gameMode,
  actionType,
  onBack
}) => {
  const { user } = useAuth();
  const { DisplayBackgroundEquip, MatchBackgroundEquip } = useBackground();
  
  // Add logging to see what backgrounds we're getting from context
  useEffect(() => {
    console.log('GameWaitingRoom: Background context updated', {
      DisplayBackgroundEquip,
      MatchBackgroundEquip,
      DisplayBackgroundType: DisplayBackgroundEquip?.type,
      MatchBackgroundType: MatchBackgroundEquip?.type
    });
  }, [DisplayBackgroundEquip, MatchBackgroundEquip]);
  const { setCurrentSection } = useNavigation();
  
  const [waitingRoomEntry, setWaitingRoomEntry] = useState<WaitingRoomEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchingText, setSearchingText] = useState('Searching for opponents...');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [vsCountdown, setVsCountdown] = useState<number | null>(null);
  const [isLeaving, setIsLeaving] = useState(false); // Add flag to prevent multiple leave operations

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

  // Get user data from profile
  const getUserData = async () => {
    try {
      console.log('🔍 GameWaitingRoom: Fetching user profile for UID:', user!.uid);
      const userProfile = await UserService.getUserProfile(user!.uid);
      console.log('📊 GameWaitingRoom: User profile fetched:', userProfile);
      
      if (userProfile) {
        const userData = {
          displayName: userProfile.displayName || user?.email?.split('@')[0] || 'Anonymous',
          stats: userProfile.stats,
          displayBackgroundEquipped: userProfile.inventory.displayBackgroundEquipped,
          matchBackgroundEquipped: userProfile.inventory.matchBackgroundEquipped
        };
        console.log('✅ GameWaitingRoom: Processed user data:', userData);
        return userData;
      }
    } catch (error) {
      console.error('❌ GameWaitingRoom: Error fetching user profile:', error);
    }
    
    // Fallback to context data
    const fallbackData = {
      displayName: user?.email?.split('@')[0] || 'Anonymous',
      stats: {
        bestStreak: 0,
        currentStreak: 0,
        gamesPlayed: 0,
        matchWins: 0
      },
      displayBackgroundEquipped: DisplayBackgroundEquip,
      matchBackgroundEquipped: MatchBackgroundEquip
    };
    console.log('⚠️ GameWaitingRoom: Using fallback data:', fallbackData);
    return fallbackData;
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

        const userData = await getUserData();

        // First, check for existing games with same gameMode and gameType
        const q = query(
          collection(db, 'waitingroom'),
          where('gameMode', '==', gameMode),
          where('gameType', '==', 'Open Server')
        );

        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Found an existing game - check if we're the host before joining as opponent
          const existingGameDoc = querySnapshot.docs[0];
          const existingGame = existingGameDoc.data() as WaitingRoomEntry;
          
          // Check if current user is already the host of this room
          if (existingGame.hostData?.playerId === user.uid) {
            console.log('GameWaitingRoom: Current user is already host of this room, just listening for updates');
            
            // Set up listener for the room we're hosting
            const unsubscribe = onSnapshot(doc(db, 'waitingroom', existingGameDoc.id), (doc) => {
              if (doc.exists()) {
                const data = doc.data() as WaitingRoomEntry;
                console.log('GameWaitingRoom: Received room update as host', data);
                setWaitingRoomEntry({ ...data, id: doc.id });
                
                // Check if opponent joined
                if (data.opponentData && !opponentJoined) {
                  setOpponentJoined(true);
                  startVsCountdown();
                }
              }
            });

            setIsLoading(false);
            return () => unsubscribe();
          } else {
            // Different user is host - join as opponent
            console.log('GameWaitingRoom: Joining existing room as opponent');
            
            const opponentData = {
              playerDisplayName: userData.displayName,
              playerId: user.uid,
              displayBackgroundEquipped: userData.displayBackgroundEquipped || null,
              matchBackgroundEquipped: userData.matchBackgroundEquipped || null,
              playerStats: userData.stats
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
                  startVsCountdown();
                }
              }
            });

            setIsLoading(false);
            return () => unsubscribe();
          }
        } else {
          // No existing game found - create new one
          console.log('GameWaitingRoom: Creating new waiting room entry', {
            DisplayBackgroundEquip,
            MatchBackgroundEquip,
            DisplayBackgroundType: DisplayBackgroundEquip?.type,
            MatchBackgroundType: MatchBackgroundEquip?.type
          });
          
          const entry: WaitingRoomEntry = {
            createdAt: serverTimestamp(),
            gameMode: gameMode,
            gameType: "Open Server",
            playersRequired: 0, // Set to 0 as requested
            hostData: {
              playerDisplayName: userData.displayName,
              playerId: user.uid,
              displayBackgroundEquipped: userData.displayBackgroundEquipped || null,
              matchBackgroundEquipped: userData.matchBackgroundEquipped || null,
              playerStats: userData.stats
            }
          };

          console.log('GameWaitingRoom: Final entry to be saved', entry);

          const docRef = await addDoc(collection(db, 'waitingroom'), entry);
          const gameId = docRef.id;
          
          // Set up listener for when opponent joins
          const unsubscribe = onSnapshot(doc(db, 'waitingroom', gameId), (doc) => {
            if (doc.exists()) {
              const data = doc.data() as WaitingRoomEntry;
              console.log('GameWaitingRoom: Received waiting room data from Firebase', {
                data,
                hostData: data.hostData,
                matchBackgroundEquipped: data.hostData?.matchBackgroundEquipped
              });
              
              setWaitingRoomEntry({ ...data, id: doc.id });
              
              // Check if opponent joined
              if (data.opponentData && !opponentJoined) {
                setOpponentJoined(true);
                startVsCountdown();
              }
            }
          });

          setWaitingRoomEntry({ ...entry, id: gameId });
          
          // Removed automatic test computer player for production
          // Real players can now join the waiting room

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

  // Function to start 5-second countdown for VS section
  const startVsCountdown = () => {
    setVsCountdown(5);
    const timer = setInterval(() => {
      setVsCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // Move to matches collection and navigate to match
          setTimeout(() => {
            moveToMatchesAndNavigate();
          }, 1000); // Wait 1 second after showing "GO!"
          return 0; // Show "GO!"
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

      // Get round objective based on game mode
      const getRoundObjective = (mode: string): number => {
        switch (mode.toLowerCase()) {
          case 'quickfire': return 50;
          case 'classic': return 100;
          case 'zerohour': return 150;
          case 'lastline': return 200;
          default: return 100;
        }
      };

      // Create enhanced match document with game phase
      const matchData = {
        ...waitingRoomEntry,
        status: 'active',
        createdAt: serverTimestamp(),
        startedAt: serverTimestamp(),
        gameData: {
          // Use existing gameData if available, otherwise create new
          type: waitingRoomEntry.gameData?.type || 'dice',
          settings: waitingRoomEntry.gameData?.settings || {},
          turnDecider: waitingRoomEntry.gameData?.turnDecider || Math.floor(Math.random() * 2) + 1, // Random 1 or 2
          turnScore: 0,
          diceOne: 0,
          diceTwo: 0,
          roundObjective: waitingRoomEntry.gameData?.roundObjective || getRoundObjective(waitingRoomEntry.gameMode),
          startingScore: waitingRoomEntry.gameData?.startingScore || 0,
          status: 'active',
          startedAt: serverTimestamp(),
          // Initialize game phase for new match system
          gamePhase: 'turnDecider',
          isRolling: false
          // Don't include undefined optional fields
        }
      };

      const matchDocRef = await addDoc(collection(db, 'matches'), matchData);
      
      // Remove from waiting room
      await deleteDoc(doc(db, 'waitingroom', waitingRoomEntry.id));
      
      // Navigate to Match component with match ID
      console.log('🎮 Navigating to Match component with ID:', matchDocRef.id);
      setCurrentSection('match', {
        gameMode: waitingRoomEntry.gameMode,
        matchId: matchDocRef.id
      });
      
    } catch (err) {
      console.error('Error moving to matches:', err);
    }
  };

  // Handle leaving the game
  const handleLeave = async () => {
    if (isLeaving) {
      console.log('⏸️ GameWaitingRoom: Already leaving, ignoring additional leave request');
      return; // Prevent multiple leave attempts
    }
    
    try {
      setIsLeaving(true);
      console.log('🚪 GameWaitingRoom: Leaving game, waiting room entry:', waitingRoomEntry?.id);
      
      if (waitingRoomEntry?.id) {
        console.log('🗑️ GameWaitingRoom: Deleting waiting room document:', waitingRoomEntry.id);
        await deleteDoc(doc(db, 'waitingroom', waitingRoomEntry.id));
        console.log('✅ GameWaitingRoom: Waiting room document deleted successfully');
      } else {
        console.log('⚠️ GameWaitingRoom: No waiting room entry to delete');
      }
    } catch (err) {
      console.error('❌ GameWaitingRoom: Error leaving game:', err);
    } finally {
      console.log('🔙 GameWaitingRoom: Calling onBack to return to dashboard');
      onBack();
    }
  };

  // Render background based on equipped match background
  const renderPlayerBackground = () => {
    const background = waitingRoomEntry?.hostData.matchBackgroundEquipped;
    
    console.log('🎨 GameWaitingRoom: renderPlayerBackground called', {
      background,
      backgroundType: typeof background,
      backgroundKeys: background && typeof background === 'object' ? Object.keys(background) : [],
      backgroundName: background?.name,
      backgroundFile: background?.file,
      backgroundType_prop: background?.type,
      hasWaitingRoomEntry: !!waitingRoomEntry,
      hostData: waitingRoomEntry?.hostData,
      fullWaitingRoomEntry: waitingRoomEntry
    });
    
    // Validate background object structure
    if (!background || typeof background !== 'object') {
      console.log('GameWaitingRoom: No valid background object, using default');
      return null;
    }
    
    // Handle complete background object
    if (background.type === 'video' && background.file) {
      console.log('GameWaitingRoom: Rendering video background:', background.file);
      return (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onLoadStart={() => console.log('Video: Load started')}
          onCanPlay={() => console.log('Video: Can play')}
          onError={(e) => console.error('Video: Error loading', e)}
          onLoadedData={() => console.log('Video: Data loaded')}
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
          Your browser does not support the video tag.
        </video>
      );
    } else if (background.type === 'image' && background.file) {
      console.log('GameWaitingRoom: Using CSS background for image:', background.file);
      return null; // CSS background will handle image
    }
    
    console.log('GameWaitingRoom: Invalid background format, using default');
    return null;
  };

  const getBackgroundStyle = () => {
    const background = waitingRoomEntry?.hostData.matchBackgroundEquipped;
    
    console.log('🎨 GameWaitingRoom: getBackgroundStyle called', {
      background,
      backgroundType: typeof background,
      backgroundKeys: background && typeof background === 'object' ? Object.keys(background) : [],
      backgroundName: background?.name,
      backgroundFile: background?.file,
      backgroundType_prop: background?.type,
      fullHostData: waitingRoomEntry?.hostData
    });
    
    // Validate background object structure
    if (!background) {
      console.log('GameWaitingRoom: No background - returning default style');
      return { background: '#332A63' };
    }
    
    // Handle legacy string format (just in case)
    if (typeof background === 'string') {
      console.log('GameWaitingRoom: Legacy string background, returning default');
      return { background: '#332A63' };
    }
    
    // Handle complete background object
    if (typeof background === 'object' && background.type && background.file) {
      if (background.type === 'video') {
        console.log('GameWaitingRoom: Video background - returning empty style');
        return {};
      } else if (background.type === 'image') {
        const style = { 
          background: `url('${background.file}') center/cover no-repeat` 
        };
        console.log('GameWaitingRoom: Image background - returning style:', style);
        return style;
      }
    }
    
    console.log('GameWaitingRoom: Invalid background format - returning default style');
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
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '0',
      margin: '0',
      background: 'transparent',
      overflow: 'hidden'
    }}>
      {/* CSS Styles for animations */}
      <style jsx>{`
        @keyframes subtleGlow {
          0% { 
            transform: scale(1);
            filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
            opacity: 0.9;
          }
          50% { 
            transform: scale(1.05);
            filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.6));
            opacity: 1;
          }
          100% { 
            transform: scale(1);
            filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
            opacity: 0.9;
          }
        }
        
        @keyframes goGlow {
          0% { 
            transform: scale(1);
            filter: drop-shadow(0 0 15px rgba(0, 255, 0, 0.8));
          }
          50% { 
            transform: scale(1.1);
            filter: drop-shadow(0 0 30px rgba(0, 255, 0, 1));
          }
          100% { 
            transform: scale(1);
            filter: drop-shadow(0 0 15px rgba(0, 255, 0, 0.8));
          }
        }
      `}</style>

      {/* Main Content Container */}
      <div
        style={{
          display: 'flex',
          width: '100vw',
          maxWidth: '100vw',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '50px',
          background: 'transparent',
          padding: '20px',
          boxSizing: 'border-box'
        }}
      >
        {/* Game Mode Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <h1
            style={{
              color: '#E2E2E2',
              fontFamily: 'Audiowide',
              fontSize: '64px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: '72px',
              textTransform: 'uppercase',
              margin: 0,
              textShadow: "0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.4), 0 0 60px rgba(255, 215, 0, 0.2)"
            }}
          >
            {currentGameMode.name}
          </h1>
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
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'transparent'
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
                background: 'rgba(87, 78, 120, 0.3)', 
                backdropFilter: 'blur(20px)' 
              }}>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: '48px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: '48px', 
                    textTransform: 'uppercase' 
                  }}>
                    {waitingRoomEntry?.hostData.playerStats.matchWins}
                  </div>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: '11px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: '16px', 
                    textTransform: 'uppercase',
                    opacity: 0.8
                  }}>
                    Match Wins
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
                background: 'rgba(100, 151, 200, 0.3)', 
                backdropFilter: 'blur(20px)' 
              }}>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: '48px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: '48px', 
                    textTransform: 'uppercase' 
                  }}>
                    {waitingRoomEntry?.hostData.playerStats.gamesPlayed}
                  </div>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: '11px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: '16px', 
                    textTransform: 'uppercase',
                    opacity: 0.8
                  }}>
                    Games Played
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
                background: 'rgba(58, 87, 165, 0.3)', 
                backdropFilter: 'blur(20px)' 
              }}>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: '48px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: '48px', 
                    textTransform: 'uppercase' 
                  }}>
                    {waitingRoomEntry?.hostData.playerStats.bestStreak}
                  </div>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: '11px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: '16px', 
                    textTransform: 'uppercase',
                    opacity: 0.8
                  }}>
                    Best Streak
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
                background: 'rgba(171, 112, 118, 0.3)', 
                backdropFilter: 'blur(20px)' 
              }}>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: '48px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: '48px', 
                    textTransform: 'uppercase' 
                  }}>
                    {waitingRoomEntry?.hostData.playerStats.currentStreak}
                  </div>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: '11px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: '16px', 
                    textTransform: 'uppercase',
                    opacity: 0.8
                  }}>
                    Current Streak
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* VS Section with Countdown */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '20px'
            }}
          >
            {vsCountdown !== null ? (
              <div
                style={{
                  color: vsCountdown === 0 ? '#00FF00' : '#E2E2E2',
                  fontFamily: 'Audiowide',
                  fontSize: vsCountdown === 0 ? '72px' : '64px',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  lineHeight: vsCountdown === 0 ? '80px' : '72px',
                  textTransform: 'uppercase',
                  textShadow: vsCountdown === 0 
                    ? '0 0 20px rgba(0, 255, 0, 0.8), 0 0 40px rgba(0, 255, 0, 0.4)' 
                    : '0 0 15px rgba(255, 255, 255, 0.4)',
                  animation: vsCountdown === 0 ? 'goGlow 1s infinite' : 'subtleGlow 1.5s infinite'
                }}
              >
                {vsCountdown === 0 ? 'GO!' : vsCountdown}
              </div>
            ) : (
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
            )}
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
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'transparent'
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
                  background: 'rgba(87, 78, 120, 0.3)', 
                  backdropFilter: 'blur(20px)' 
                }}>
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: '48px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: '48px', 
                      textTransform: 'uppercase' 
                    }}>
                      {waitingRoomEntry.opponentData.playerStats.matchWins}
                    </div>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: '11px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: '16px', 
                      textTransform: 'uppercase',
                      opacity: 0.8
                    }}>
                      Match Wins
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
                  background: 'rgba(100, 151, 200, 0.3)', 
                  backdropFilter: 'blur(20px)' 
                }}>
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: '48px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: '48px', 
                      textTransform: 'uppercase' 
                    }}>
                      {waitingRoomEntry.opponentData.playerStats.gamesPlayed}
                    </div>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: '11px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: '16px', 
                      textTransform: 'uppercase',
                      opacity: 0.8
                    }}>
                      Games Played
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
                  background: 'rgba(58, 87, 165, 0.3)', 
                  backdropFilter: 'blur(20px)' 
                }}>
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: '48px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: '48px', 
                      textTransform: 'uppercase' 
                    }}>
                      {waitingRoomEntry.opponentData.playerStats.bestStreak}
                    </div>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: '11px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: '16px', 
                      textTransform: 'uppercase',
                      opacity: 0.8
                    }}>
                      Best Streak
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
                  background: 'rgba(171, 112, 118, 0.3)', 
                  backdropFilter: 'blur(20px)' 
                }}>
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: '48px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: '48px', 
                      textTransform: 'uppercase' 
                    }}>
                      {waitingRoomEntry.opponentData.playerStats.currentStreak}
                    </div>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: '11px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: '16px', 
                      textTransform: 'uppercase',
                      opacity: 0.8
                    }}>
                      Current Streak
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
                  background: waitingRoomEntry.opponentData.matchBackgroundEquipped?.type !== 'video' && waitingRoomEntry.opponentData.matchBackgroundEquipped?.file 
                    ? `url('${waitingRoomEntry.opponentData.matchBackgroundEquipped.file}') center/cover no-repeat` 
                    : '#332A63'
                }}
              >
                {/* Render opponent video background if it's a video */}
                {waitingRoomEntry.opponentData.matchBackgroundEquipped?.type === 'video' && (
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
                    <source src={waitingRoomEntry.opponentData.matchBackgroundEquipped.file} type="video/mp4" />
                  </video>
                )}
                
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

        {/* Leave Button */}
        <button
          onClick={handleLeave}
          disabled={vsCountdown !== null || opponentJoined || isLeaving}
          style={{
            display: 'flex',
            padding: '20px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            borderRadius: '18px',
            background: (vsCountdown !== null || opponentJoined || isLeaving) ? '#666666' : '#FF0080',
            backdropFilter: 'blur(20px)',
            color: '#FFF',
            fontFamily: 'Audiowide',
            fontSize: '40px',
            fontStyle: 'normal',
            fontWeight: 400,
            lineHeight: '30px',
            border: 'none',
            cursor: (vsCountdown !== null || opponentJoined || isLeaving) ? 'not-allowed' : 'pointer',
            opacity: (vsCountdown !== null || opponentJoined || isLeaving) ? 0.5 : 1,
            textTransform: 'uppercase',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            if (vsCountdown === null && !opponentJoined && !isLeaving) {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 0, 128, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (vsCountdown === null && !opponentJoined && !isLeaving) {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          {vsCountdown !== null ? 'Starting Game...' : 
           opponentJoined ? 'Match Found!' : 
           isLeaving ? 'Leaving...' : 'Leave Game'}
        </button>
      </div>
    </div>
  );
};
