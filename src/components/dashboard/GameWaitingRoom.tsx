'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBackground } from '@/context/BackgroundContext';
import { UserService } from '@/services/userService';
import { useNavigation } from '@/context/NavigationContext';
import { useWaitingRoomCleanup } from '@/hooks/useWaitingRoomCleanup';
import { db } from '@/services/firebase';
import { collection, addDoc, doc, onSnapshot, updateDoc, deleteDoc, query, where, getDocs, getDoc, serverTimestamp } from 'firebase/firestore';

interface GameWaitingRoomProps {
  gameMode: string;
  actionType: 'live' | 'custom';
  onBack: () => void;
  roomId?: string; // Optional roomId for existing rooms
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
  onBack,
  roomId
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
  const [isScrolled, setIsScrolled] = useState(false); // Track scroll position for mobile button animation

  // Waiting room cleanup functionality
  const { leaveWaitingRoom } = useWaitingRoomCleanup(waitingRoomEntry?.id || roomId);

  // Mobile scroll detection for button animation
  useEffect(() => {
    if (window.innerWidth >= 768) return; // Only on mobile
    
    let timeoutId: NodeJS.Timeout;
    
    const handleScroll = () => {
      setIsScrolled(true);
      
      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Hide button after 3 seconds of no scrolling
      timeoutId = setTimeout(() => {
        setIsScrolled(false);
      }, 3000);
    };
    
    // Check for scroll events on the main container and window
    const handleGlobalScroll = () => {
      handleScroll();
    };
    
    window.addEventListener('scroll', handleGlobalScroll);
    document.addEventListener('scroll', handleGlobalScroll, true); // Capture phase for nested scrolling
    document.addEventListener('touchmove', handleGlobalScroll); // Touch scrolling
    document.addEventListener('wheel', handleGlobalScroll); // Wheel scrolling
    
    return () => {
      window.removeEventListener('scroll', handleGlobalScroll);
      document.removeEventListener('scroll', handleGlobalScroll, true);
      document.removeEventListener('touchmove', handleGlobalScroll);
      document.removeEventListener('wheel', handleGlobalScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

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

        // If roomId is provided, listen to that specific room
        if (roomId) {
          console.log('🎯 GameWaitingRoom: Using existing room ID:', roomId);
          
          // Set up listener for the existing room
          const unsubscribe = onSnapshot(
            doc(db, 'waitingroom', roomId), 
            (doc) => {
              if (doc.exists()) {
                const data = doc.data() as WaitingRoomEntry;
                console.log('🔄 GameWaitingRoom: Received room update for existing room', data);
                setWaitingRoomEntry({ ...data, id: doc.id });
                setError(''); // Clear any previous errors
                
                // Check if opponent joined
                if (data.opponentData && !opponentJoined) {
                  setOpponentJoined(true);
                  startVsCountdown();
                }
              } else {
                console.log('🔄 GameWaitingRoom: Room no longer exists in waitingroom (likely moved to matches)');
                // Don't set error here - room might have been moved to matches by other player
                // The moveToMatchesAndNavigate function will handle navigation
              }
            },
            (error) => {
              console.error('❌ GameWaitingRoom: Error listening to room:', error);
              setError('Connection error - please try again');
            }
          );

          setIsLoading(false);
          return () => unsubscribe();
        }

        // Original logic for when no roomId is provided (custom games)
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
  }, [user, gameMode, actionType, roomId || '']);

  // Function to start 5-second countdown for VS section
  const startVsCountdown = () => {
    console.log('🕐 GameWaitingRoom: Starting VS countdown...');
    console.log('🔍 DEBUG: startVsCountdown called with:', {
      waitingRoomEntry: waitingRoomEntry?.id,
      opponentJoined,
      user: user?.uid,
      gameMode,
      actionType
    });
    
    setVsCountdown(5);
    const timer = setInterval(() => {
      setVsCountdown((prev) => {
        console.log('🕐 GameWaitingRoom: Countdown tick:', prev);
        console.log('🔍 DEBUG: Countdown state:', {
          prev,
          waitingRoomEntryId: waitingRoomEntry?.id,
          hostPlayerId: waitingRoomEntry?.hostData?.playerId,
          opponentPlayerId: waitingRoomEntry?.opponentData?.playerId,
          currentUserId: user?.uid
        });
        
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          console.log('🕐 GameWaitingRoom: Countdown finished! Showing GO!');
          console.log('🔍 DEBUG: About to call moveToMatchesAndNavigate with data:', {
            waitingRoomEntry,
            roomId,
            gameMode,
            actionType,
            userUid: user?.uid
          });
          
          // Move to matches collection and navigate to match
          setTimeout(() => {
            console.log('🕐 GameWaitingRoom: Starting navigation after 1 second delay...');
            console.log('🔍 DEBUG: Final navigation call with:', {
              component: 'GameWaitingRoom',
              function: 'moveToMatchesAndNavigate',
              timestamp: new Date().toISOString(),
              waitingRoomData: waitingRoomEntry,
              userContext: user?.uid
            });
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
      console.log('🎮 GameWaitingRoom: moveToMatchesAndNavigate called!');
      console.log('🔍 DEBUG: ENTRY POINT - moveToMatchesAndNavigate:', {
        timestamp: new Date().toISOString(),
        waitingRoomEntry: waitingRoomEntry?.id,
        roomIdProp: roomId,
        gameMode,
        actionType,
        userUid: user?.uid,
        hostPlayerId: waitingRoomEntry?.hostData?.playerId,
        opponentPlayerId: waitingRoomEntry?.opponentData?.playerId
      });
      
      // SECURITY CHECK: Ensure user is part of this room
      if (!user?.uid) {
        console.error('❌ SECURITY: No authenticated user found');
        console.log('🔙 SECURITY: Redirecting to dashboard due to no auth');
        onBack();
        return;
      }
      
      // Use roomId if waitingRoomEntry is null (room was already moved by other player)
      const roomIdToUse = waitingRoomEntry?.id || roomId;
      
      if (!roomIdToUse) {
        console.error('❌ GameWaitingRoom: No room ID available (neither waitingRoomEntry.id nor roomId prop)!');
        console.log('🔍 DEBUG: Missing room ID data:', {
          waitingRoomEntry,
          roomId,
          waitingRoomEntryId: waitingRoomEntry?.id
        });
        console.log('🔙 ERROR: Redirecting to dashboard due to missing room ID');
        onBack();
        return;
      }

      console.log('🎮 GameWaitingRoom: Using room ID:', roomIdToUse);
      console.log('🔍 DEBUG: Room validation passed, proceeding with match creation');

      // SECURITY CHECK: Verify user is authorized for this room
      if (waitingRoomEntry) {
        const isHost = waitingRoomEntry.hostData?.playerId === user.uid;
        const isOpponent = waitingRoomEntry.opponentData?.playerId === user.uid;
        
        console.log('🔍 SECURITY CHECK: User authorization:', {
          userUid: user.uid,
          hostPlayerId: waitingRoomEntry.hostData?.playerId,
          opponentPlayerId: waitingRoomEntry.opponentData?.playerId,
          isHost,
          isOpponent,
          isAuthorized: isHost || isOpponent
        });
        
        if (!isHost && !isOpponent) {
          console.error('❌ SECURITY: User not authorized for this room');
          console.log('🔙 SECURITY: Redirecting unauthorized user to dashboard');
          setError('Unauthorized access to game room');
          setTimeout(() => onBack(), 2000);
          return;
        }
      }

      // Check if room was already moved to matches collection
      try {
        console.log('🔍 DEBUG: Checking for existing match...');
        const existingMatchQuery = query(
          collection(db, 'matches'), 
          where('originalRoomId', '==', roomIdToUse)
        );
        const matchDoc = await getDocs(existingMatchQuery);
        
        if (!matchDoc.empty) {
          const existingMatch = matchDoc.docs[0];
          const matchData = existingMatch.data();
          
          console.log('🎮 GameWaitingRoom: Room already moved to matches, navigating to existing match...');
          console.log('🔍 DEBUG: Found existing match:', {
            matchId: existingMatch.id,
            originalRoomId: matchData.originalRoomId,
            gameMode: matchData.gameMode,
            hostPlayerId: matchData.hostData?.playerId,
            opponentPlayerId: matchData.opponentData?.playerId
          });
          
          // SECURITY CHECK: Ensure user is part of the existing match
          const userInMatch = matchData.hostData?.playerId === user.uid || 
                             matchData.opponentData?.playerId === user.uid;
          
          if (!userInMatch) {
            console.error('❌ SECURITY: User not authorized for existing match');
            console.log('🔙 SECURITY: Redirecting unauthorized user from existing match');
            setError('Unauthorized access to match');
            setTimeout(() => onBack(), 2000);
            return;
          }
          
          console.log('🎯 NAVIGATION: Calling setCurrentSection for existing match');
          setCurrentSection('match', {
            gameMode: matchData.gameMode || gameMode,
            matchId: existingMatch.id
          });
          return;
        }
        
        console.log('🔍 DEBUG: No existing match found, proceeding with creation');
      } catch (error) {
        console.log('🎮 GameWaitingRoom: Could not check for existing match, proceeding with creation...', error);
      }

      // Get room data - either from waitingRoomEntry or fetch from database
      let roomData = waitingRoomEntry;
      
      console.log('🔍 DEBUG: Getting room data:', {
        hasWaitingRoomEntry: !!waitingRoomEntry,
        waitingRoomEntryId: waitingRoomEntry?.id,
        roomIdToUse
      });
      
      if (!roomData) {
        console.log('🎮 GameWaitingRoom: waitingRoomEntry is null, fetching from database...');
        try {
          // Use correct Firestore v9 syntax for getting a document
          const roomDocRef = doc(db, 'waitingroom', roomIdToUse);
          const roomDocSnap = await getDoc(roomDocRef);
          
          if (roomDocSnap.exists()) {
            roomData = { ...roomDocSnap.data(), id: roomDocSnap.id } as WaitingRoomEntry;
            console.log('🎮 GameWaitingRoom: Room data fetched from database:', roomData);
            console.log('🔍 DEBUG: Fetched room data details:', {
              id: roomData.id,
              gameMode: roomData.gameMode,
              hostPlayerId: roomData.hostData?.playerId,
              opponentPlayerId: roomData.opponentData?.playerId
            });
            
            // SECURITY CHECK: Verify user authorization for fetched room
            const isHostInFetchedRoom = roomData.hostData?.playerId === user.uid;
            const isOpponentInFetchedRoom = roomData.opponentData?.playerId === user.uid;
            
            console.log('🔍 SECURITY CHECK: Fetched room authorization:', {
              userUid: user.uid,
              hostPlayerId: roomData.hostData?.playerId,
              opponentPlayerId: roomData.opponentData?.playerId,
              isHost: isHostInFetchedRoom,
              isOpponent: isOpponentInFetchedRoom,
              isAuthorized: isHostInFetchedRoom || isOpponentInFetchedRoom
            });
            
            if (!isHostInFetchedRoom && !isOpponentInFetchedRoom) {
              console.error('❌ SECURITY: User not authorized for fetched room');
              console.log('🔙 SECURITY: Redirecting unauthorized user');
              setError('Unauthorized access to game room');
              setTimeout(() => onBack(), 2000);
              return;
            }
          } else {
            console.log('🎮 GameWaitingRoom: Room not found in waitingroom, might already be moved. Checking matches...');
            console.log('🔍 DEBUG: Room document does not exist, checking for existing matches');
            
            // Check if already in matches with more specific query
            const matchesQuery = query(
              collection(db, 'matches'),
              where('hostData.playerId', '==', user.uid)
            );
            const opponentMatchesQuery = query(
              collection(db, 'matches'),
              where('opponentData.playerId', '==', user.uid)
            );
            
            const [hostMatches, opponentMatches] = await Promise.all([
              getDocs(matchesQuery),
              getDocs(opponentMatchesQuery)
            ]);
            
            const allUserMatches = [...hostMatches.docs, ...opponentMatches.docs];
            const activeMatch = allUserMatches.find(doc => {
              const data = doc.data();
              return data.status === 'active';
            });
            
            if (activeMatch) {
              const matchData = activeMatch.data();
              console.log('🎮 GameWaitingRoom: Found existing active match, navigating...');
              console.log('🔍 DEBUG: Found active match details:', {
                matchId: activeMatch.id,
                gameMode: matchData.gameMode,
                status: matchData.status,
                hostPlayerId: matchData.hostData?.playerId,
                opponentPlayerId: matchData.opponentData?.playerId
              });
              
              console.log('🎯 NAVIGATION: Calling setCurrentSection for found active match');
              setCurrentSection('match', {
                gameMode: matchData.gameMode || gameMode,
                matchId: activeMatch.id
              });
              return;
            }
            
            console.error('❌ GameWaitingRoom: Room not found in any collection');
            console.log('🔙 ERROR: No room or match found, redirecting to dashboard');
            setError('Game room no longer exists');
            setTimeout(() => onBack(), 2000);
            return;
          }
        } catch (error) {
          console.error('❌ GameWaitingRoom: Error fetching room data:', error);
          console.log('🔙 ERROR: Database error, redirecting to dashboard');
          setError('Failed to access game room');
          setTimeout(() => onBack(), 2000);
          return;
        }
      }

      console.log('🎮 GameWaitingRoom: Creating match document...');
      console.log('🔍 DEBUG: Match creation starting with room data:', {
        roomDataId: roomData.id,
        gameMode: roomData.gameMode,
        gameType: roomData.gameType,
        hostPlayerId: roomData.hostData?.playerId,
        opponentPlayerId: roomData.opponentData?.playerId,
        userUid: user.uid
      });

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

      // Create enhanced match document with proper match data structure
      const matchData = {
        createdAt: serverTimestamp(),
        originalRoomId: roomIdToUse, // Track original room ID
        gameMode: roomData.gameMode,
        gameType: roomData.gameType,
        status: 'active',
        startedAt: serverTimestamp(),
        
        // Security: Ensure only authorized players are in match
        authorizedPlayers: [
          roomData.hostData?.playerId,
          roomData.opponentData?.playerId
        ].filter(Boolean), // Remove any null/undefined values
        
        // Initialize host data with game-specific fields
        hostData: {
          ...roomData.hostData,
          turnActive: false, // Will be set by turn decider
          playerScore: 0,
          roundScore: 0
        },
        
        // Initialize opponent data with game-specific fields
        opponentData: roomData.opponentData ? {
          ...roomData.opponentData,
          turnActive: false, // Will be set by turn decider
          playerScore: 0,
          roundScore: 0
        } : undefined,
        
        gameData: {
          // Use existing gameData if available, otherwise create new
          type: roomData.gameData?.type || 'dice',
          settings: roomData.gameData?.settings || {},
          turnDecider: roomData.gameData?.turnDecider || Math.floor(Math.random() * 2) + 1, // Random 1 or 2
          currentTurn: 1, // Initialize current turn
          turnScore: 0,
          diceOne: 0,
          diceTwo: 0,
          roundObjective: roomData.gameData?.roundObjective || getRoundObjective(roomData.gameMode),
          startingScore: roomData.gameData?.startingScore || 0,
          status: 'active',
          startedAt: serverTimestamp(),
          // Start with turn decider phase so players can choose who goes first
          gamePhase: 'turnDecider' as const,
          isRolling: false
          // Don't include undefined optional fields
        }
      };

      // Don't pre-assign turns when using turnDecider phase
      // The turns will be assigned after the turn decider choice is made
      console.log('🎮 GameWaitingRoom: Starting in turnDecider phase, turns will be assigned after choice');
      console.log('🔍 DEBUG: Final match data before creation:', {
        matchData,
        authorizedPlayers: matchData.authorizedPlayers,
        gameMode: matchData.gameMode,
        status: matchData.status
      });

      console.log('🎮 GameWaitingRoom: Match data prepared:', matchData);

      const matchDocRef = await addDoc(collection(db, 'matches'), matchData);
      console.log('✅ GameWaitingRoom: Match document created with ID:', matchDocRef.id);
      console.log('🔍 DEBUG: Match created successfully:', {
        matchId: matchDocRef.id,
        originalRoomId: roomIdToUse,
        authorizedPlayers: matchData.authorizedPlayers,
        timestamp: new Date().toISOString()
      });
      
      // Remove from waiting room (only if we have the room data)
      try {
        await deleteDoc(doc(db, 'waitingroom', roomIdToUse));
        console.log('✅ GameWaitingRoom: Waiting room document deleted');
        console.log('🔍 DEBUG: Cleanup completed:', {
          deletedRoomId: roomIdToUse,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.log('🎮 GameWaitingRoom: Could not delete waiting room (might already be deleted):', error);
      }
      
      // Navigate to Match component with match ID
      console.log('🎮 GameWaitingRoom: Calling setCurrentSection with match data...');
      console.log('🎮 GameWaitingRoom: setCurrentSection function:', typeof setCurrentSection);
      console.log('🎮 GameWaitingRoom: Navigation params:', {
        gameMode: roomData.gameMode,
        matchId: matchDocRef.id
      });
      console.log('🔍 DEBUG: FINAL NAVIGATION CALL:', {
        component: 'GameWaitingRoom',
        function: 'setCurrentSection',
        section: 'match',
        params: {
          gameMode: roomData.gameMode,
          matchId: matchDocRef.id
        },
        userUid: user.uid,
        timestamp: new Date().toISOString(),
        callStack: 'moveToMatchesAndNavigate -> setCurrentSection'
      });
      
      setCurrentSection('match', {
        gameMode: roomData.gameMode,
        matchId: matchDocRef.id
      });
      console.log('✅ GameWaitingRoom: Navigation called successfully!');
      console.log('🔍 DEBUG: Navigation completed - should now be in match section');
      
    } catch (err) {
      console.error('❌ GameWaitingRoom: Error moving to matches:', err);
      console.log('🔍 DEBUG: CRITICAL ERROR in moveToMatchesAndNavigate:', {
        error: err,
        errorMessage: (err as Error)?.message,
        errorStack: (err as Error)?.stack,
        waitingRoomEntry: waitingRoomEntry?.id,
        roomId,
        gameMode,
        userUid: user?.uid,
        timestamp: new Date().toISOString()
      });
      
      // If match creation failed, try to navigate users back to dashboard with error
      // But first, try a simple navigation to match section in case it's just a Firebase write issue
      try {
        console.log('🔄 GameWaitingRoom: Attempting fallback navigation to match...');
        console.log('🔍 DEBUG: Starting fallback recovery process');
        
        // Try to find existing match in case it was created but navigation failed
        const existingMatchQuery = await getDocs(query(collection(db, 'matches')));
        const userMatch = existingMatchQuery.docs.find(doc => {
          const data = doc.data();
          return data.hostData?.playerId === user?.uid || data.opponentData?.playerId === user?.uid;
        });
        
        if (userMatch) {
          console.log('🎯 GameWaitingRoom: Found existing match, navigating...');
          console.log('🔍 DEBUG: Fallback found existing match:', {
            matchId: userMatch.id,
            gameMode: userMatch.data().gameMode
          });
          
          setCurrentSection('match', {
            gameMode: userMatch.data().gameMode || gameMode || 'classic',
            matchId: userMatch.id
          });
          return;
        }
        
        // If no existing match found, create a minimal test match for navigation
        console.log('🧪 GameWaitingRoom: Creating minimal fallback match...');
        console.log('🔍 DEBUG: No existing match found, creating fallback');
        
        // Use waitingRoomEntry or fallback data
        const fallbackGameMode = waitingRoomEntry?.gameMode || gameMode || 'classic';
        const fallbackHostData = waitingRoomEntry?.hostData || {
          playerDisplayName: user?.email?.split('@')[0] || 'Player',
          playerId: user?.uid || 'unknown',
          displayBackgroundEquipped: null,
          matchBackgroundEquipped: null,
          playerStats: {
            bestStreak: 0,
            currentStreak: 0,
            gamesPlayed: 0,
            matchWins: 0
          }
        };
        
        const fallbackMatchData = {
          createdAt: serverTimestamp(),
          gameMode: fallbackGameMode,
          status: 'active',
          authorizedPlayers: [user?.uid].filter(Boolean),
          hostData: {
            ...fallbackHostData,
            playerScore: 0
          },
          opponentData: waitingRoomEntry?.opponentData ? {
            ...waitingRoomEntry.opponentData,
            playerScore: 0
          } : undefined,
          gameData: {
            type: 'dice',
            roundObjective: 100,
            turnDecider: 1,
            diceOne: 0,
            diceTwo: 0,
            status: 'active',
            gamePhase: 'turnDecider' as const
          }
        };
        
        console.log('🔍 DEBUG: Creating fallback match with data:', fallbackMatchData);
        
        const fallbackMatch = await addDoc(collection(db, 'matches'), fallbackMatchData);
        console.log('🔍 DEBUG: Fallback match created:', fallbackMatch.id);
        
        setCurrentSection('match', {
          gameMode: fallbackGameMode,
          matchId: fallbackMatch.id
        });
        console.log('✅ GameWaitingRoom: Fallback match created successfully!');
        
      } catch (fallbackErr) {
        console.error('❌ GameWaitingRoom: Fallback navigation also failed:', fallbackErr);
        console.log('🔍 DEBUG: FALLBACK FAILED:', {
          fallbackError: fallbackErr,
          fallbackErrorMessage: (fallbackErr as Error)?.message,
          timestamp: new Date().toISOString()
        });
        
        // Only now return to dashboard if everything failed
        console.log('🔙 GameWaitingRoom: All navigation attempts failed, returning to dashboard');
        console.log('🔍 DEBUG: FINAL FALLBACK - returning to dashboard');
        
        setError('Failed to start match - returning to dashboard');
        setTimeout(() => {
          console.log('🔙 GameWaitingRoom: Executing onBack() after timeout');
          onBack();
        }, 2000);
      }
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
        
        @keyframes slideUpButton {
          from {
            transform: translateY(calc(100% + 120px));
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes slideDownButton {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(calc(100% + 120px));
            opacity: 0;
          }
        }
        
        @keyframes buttonPulse {
          0% { 
            transform: translateY(0) scale(1);
            box-shadow: 0 4px 15px rgba(255, 0, 128, 0.3);
          }
          50% { 
            transform: translateY(0) scale(1.02);
            box-shadow: 0 6px 20px rgba(255, 0, 128, 0.5);
          }
          100% { 
            transform: translateY(0) scale(1);
            box-shadow: 0 4px 15px rgba(255, 0, 128, 0.3);
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
          gap: window.innerWidth < 768 ? '30px' : '50px',
          background: 'transparent',
          padding: window.innerWidth < 768 ? '15px' : '20px',
          paddingBottom: window.innerWidth < 768 ? '100px' : '20px', // Extra space for mobile button
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
            className="text-center"
            style={{
              color: '#E2E2E2',
              fontFamily: 'Audiowide',
              fontSize: window.innerWidth < 768 ? '32px' : '64px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: window.innerWidth < 768 ? '36px' : '72px',
              textTransform: 'uppercase',
              margin: 0,
              textShadow: "0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.4), 0 0 60px rgba(255, 215, 0, 0.2)",
              whiteSpace: window.innerWidth < 768 ? 'nowrap' : 'normal'
            }}
          >
            {currentGameMode.name}
          </h1>
        </div>

        {/* Profile VS Information */}
        <div
          style={{
            display: 'flex',
            height: window.innerWidth < 768 ? 'auto' : '410px',
            flexDirection: window.innerWidth < 768 ? 'column' : 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: window.innerWidth < 768 ? '20px' : '30px',
            alignSelf: 'stretch'
          }}
        >
          {/* Host Profile and Stats */}
          <div
            style={{
              display: 'flex',
              height: window.innerWidth < 768 ? '200px' : '410px',
              padding: window.innerWidth < 768 ? '15px' : '20px',
              alignItems: 'flex-start',
              gap: window.innerWidth < 768 ? '15px' : '20px',
              flex: window.innerWidth < 768 ? 'none' : '1 0 0',
              width: window.innerWidth < 768 ? '100%' : 'auto',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'transparent'
            }}
          >
            {/* Host Display Background */}
            <div
              style={{
                display: 'flex',
                padding: window.innerWidth < 768 ? '15px' : '20px',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flex: window.innerWidth < 768 ? '0 0 55%' : '0 0 60%',
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
                  fontSize: window.innerWidth < 768 ? '18px' : '28px',
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
                rowGap: window.innerWidth < 768 ? '8px' : '10px',
                columnGap: window.innerWidth < 768 ? '8px' : '10px',
                maxWidth: window.innerWidth < 768 ? '95vw' : '500px',
                flex: '1 0 0',
                alignSelf: 'stretch',
                gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
              }}
            >
              {/* Match Wins */}
              <div style={{ 
                display: 'flex', 
                padding: window.innerWidth < 768 ? '2px 10px' : '4px 20px', 
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
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: window.innerWidth < 768 ? '4px' : '8px' }}>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: window.innerWidth < 768 ? '24px' : '48px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: window.innerWidth < 768 ? '24px' : '48px', 
                    textTransform: 'uppercase' 
                  }}>
                    {waitingRoomEntry?.hostData.playerStats.matchWins}
                  </div>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: window.innerWidth < 768 ? '8px' : '11px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: window.innerWidth < 768 ? '12px' : '16px', 
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
                padding: window.innerWidth < 768 ? '2px 10px' : '4px 20px', 
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
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: window.innerWidth < 768 ? '4px' : '8px' }}>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: window.innerWidth < 768 ? '24px' : '48px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: window.innerWidth < 768 ? '24px' : '48px', 
                    textTransform: 'uppercase' 
                  }}>
                    {waitingRoomEntry?.hostData.playerStats.gamesPlayed}
                  </div>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: window.innerWidth < 768 ? '8px' : '11px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: window.innerWidth < 768 ? '12px' : '16px', 
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
                padding: window.innerWidth < 768 ? '2px 10px' : '4px 20px', 
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
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: window.innerWidth < 768 ? '4px' : '8px' }}>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: window.innerWidth < 768 ? '24px' : '48px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: window.innerWidth < 768 ? '24px' : '48px', 
                    textTransform: 'uppercase' 
                  }}>
                    {waitingRoomEntry?.hostData.playerStats.bestStreak}
                  </div>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: window.innerWidth < 768 ? '8px' : '11px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: window.innerWidth < 768 ? '12px' : '16px', 
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
                padding: window.innerWidth < 768 ? '2px 10px' : '4px 20px', 
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
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: window.innerWidth < 768 ? '4px' : '8px' }}>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: window.innerWidth < 768 ? '24px' : '48px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: window.innerWidth < 768 ? '24px' : '48px', 
                    textTransform: 'uppercase' 
                  }}>
                    {waitingRoomEntry?.hostData.playerStats.currentStreak}
                  </div>
                  <div style={{ 
                    color: '#E2E2E2', 
                    textAlign: 'center', 
                    fontFamily: 'Audiowide', 
                    fontSize: window.innerWidth < 768 ? '8px' : '11px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
                    lineHeight: window.innerWidth < 768 ? '12px' : '16px', 
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
              gap: '20px',
              order: window.innerWidth < 768 ? 1 : 0, // Place VS in middle for mobile
              padding: window.innerWidth < 768 ? '10px 0' : '0'
            }}
          >
            {vsCountdown !== null ? (
              <div
                style={{
                  color: vsCountdown === 0 ? '#00FF00' : '#E2E2E2',
                  fontFamily: 'Audiowide',
                  fontSize: window.innerWidth < 768 ? (vsCountdown === 0 ? '48px' : '40px') : (vsCountdown === 0 ? '72px' : '64px'),
                  fontStyle: 'normal',
                  fontWeight: 400,
                  lineHeight: window.innerWidth < 768 ? (vsCountdown === 0 ? '52px' : '44px') : (vsCountdown === 0 ? '80px' : '72px'),
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
                  fontSize: window.innerWidth < 768 ? '32px' : '48px',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  lineHeight: window.innerWidth < 768 ? '36px' : '56px',
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
                height: window.innerWidth < 768 ? '200px' : '410px',
                padding: window.innerWidth < 768 ? '15px' : '20px',
                alignItems: 'flex-start',
                gap: window.innerWidth < 768 ? '15px' : '20px',
                flex: window.innerWidth < 768 ? 'none' : '1 0 0',
                width: window.innerWidth < 768 ? '100%' : 'auto',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'transparent',
                order: window.innerWidth < 768 ? 2 : 0 // Place opponent last for mobile
              }}
            >
              {/* Opponent Stats - on the left (inside) */}
              <div
                style={{
                  display: 'grid',
                  rowGap: window.innerWidth < 768 ? '8px' : '10px',
                  columnGap: window.innerWidth < 768 ? '8px' : '10px',
                  maxWidth: window.innerWidth < 768 ? '95vw' : '500px',
                  flex: '1 0 0',
                  alignSelf: 'stretch',
                  gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
                }}
              >
                {/* Match Wins */}
                <div style={{ 
                  display: 'flex', 
                  padding: window.innerWidth < 768 ? '2px 10px' : '4px 20px', 
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
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: window.innerWidth < 768 ? '4px' : '8px' }}>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: window.innerWidth < 768 ? '24px' : '48px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: window.innerWidth < 768 ? '24px' : '48px', 
                      textTransform: 'uppercase' 
                    }}>
                      {waitingRoomEntry.opponentData.playerStats.matchWins}
                    </div>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: window.innerWidth < 768 ? '8px' : '11px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: window.innerWidth < 768 ? '12px' : '16px', 
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
                  padding: window.innerWidth < 768 ? '2px 10px' : '4px 20px', 
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
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: window.innerWidth < 768 ? '4px' : '8px' }}>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: window.innerWidth < 768 ? '24px' : '48px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: window.innerWidth < 768 ? '24px' : '48px', 
                      textTransform: 'uppercase' 
                    }}>
                      {waitingRoomEntry.opponentData.playerStats.gamesPlayed}
                    </div>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: window.innerWidth < 768 ? '8px' : '11px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: window.innerWidth < 768 ? '12px' : '16px', 
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
                  padding: window.innerWidth < 768 ? '2px 10px' : '4px 20px', 
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
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: window.innerWidth < 768 ? '4px' : '8px' }}>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: window.innerWidth < 768 ? '24px' : '48px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: window.innerWidth < 768 ? '24px' : '48px', 
                      textTransform: 'uppercase' 
                    }}>
                      {waitingRoomEntry.opponentData.playerStats.bestStreak}
                    </div>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: window.innerWidth < 768 ? '8px' : '11px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: window.innerWidth < 768 ? '12px' : '16px', 
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
                  padding: window.innerWidth < 768 ? '2px 10px' : '4px 20px', 
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
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: window.innerWidth < 768 ? '4px' : '8px' }}>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: window.innerWidth < 768 ? '24px' : '48px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: window.innerWidth < 768 ? '24px' : '48px', 
                      textTransform: 'uppercase' 
                    }}>
                      {waitingRoomEntry.opponentData.playerStats.currentStreak}
                    </div>
                    <div style={{ 
                      color: '#E2E2E2', 
                      textAlign: 'center', 
                      fontFamily: 'Audiowide', 
                      fontSize: window.innerWidth < 768 ? '8px' : '11px', 
                      fontStyle: 'normal', 
                      fontWeight: 400, 
                      lineHeight: window.innerWidth < 768 ? '12px' : '16px', 
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
                  padding: window.innerWidth < 768 ? '15px' : '20px',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flex: window.innerWidth < 768 ? '0 0 55%' : '0 0 60%',
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
                    fontSize: window.innerWidth < 768 ? '18px' : '28px',
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
                fontSize: window.innerWidth < 768 ? '20px' : '48px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: window.innerWidth < 768 ? '24px' : '56px',
                textTransform: 'uppercase',
                flex: window.innerWidth < 768 ? 'none' : '1 0 0',
                width: window.innerWidth < 768 ? '100%' : 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '10px',
                order: window.innerWidth < 768 ? 2 : 0, // Place after VS on mobile
                padding: window.innerWidth < 768 ? '20px' : '0',
                borderRadius: window.innerWidth < 768 ? '20px' : '0',
                border: window.innerWidth < 768 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                background: window.innerWidth < 768 ? 'transparent' : 'transparent'
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
            padding: window.innerWidth < 768 ? '15px 20px' : '20px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            borderRadius: '18px',
            background: (vsCountdown !== null || opponentJoined || isLeaving) ? '#666666' : '#FF0080',
            backdropFilter: 'blur(20px)',
            color: '#FFF',
            fontFamily: 'Audiowide',
            fontSize: window.innerWidth < 768 ? '18px' : '40px',
            fontStyle: 'normal',
            fontWeight: 400,
            lineHeight: '30px',
            border: 'none',
            cursor: (vsCountdown !== null || opponentJoined || isLeaving) ? 'not-allowed' : 'pointer',
            opacity: (vsCountdown !== null || opponentJoined || isLeaving) ? 0.5 : 1,
            textTransform: 'uppercase',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            // Mobile positioning and animation
            position: window.innerWidth < 768 ? 'fixed' : 'static',
            bottom: window.innerWidth < 768 ? (isScrolled ? '140px' : '0px') : 'auto', // Higher position
            left: window.innerWidth < 768 ? '20px' : 'auto',
            right: window.innerWidth < 768 ? '20px' : 'auto',
            zIndex: window.innerWidth < 768 ? 45 : 'auto',
            transform: window.innerWidth < 768 ? 
              (isScrolled ? 'translateY(0) scale(1)' : 'translateY(calc(100% + 140px)) scale(0.95)') : 
              'none',
            margin: window.innerWidth < 768 ? '0' : 'auto',
            width: window.innerWidth < 768 ? 'calc(100vw - 40px)' : 'auto',
            animation: window.innerWidth < 768 && isScrolled ? 'buttonPulse 2s infinite' : 'none',
            boxShadow: window.innerWidth < 768 && isScrolled ? 
              '0 8px 25px rgba(255, 0, 128, 0.4), 0 0 40px rgba(255, 0, 128, 0.2)' : 
              '0 4px 15px rgba(0, 0, 0, 0.3)'
          }}
          onMouseEnter={(e) => {
            if (vsCountdown === null && !opponentJoined && !isLeaving) {
              e.currentTarget.style.transform = window.innerWidth < 768 ? 
                (isScrolled ? 'translateY(0) scale(1.03)' : 'translateY(calc(100% + 140px))') :
                'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(255, 0, 128, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (vsCountdown === null && !opponentJoined && !isLeaving) {
              e.currentTarget.style.transform = window.innerWidth < 768 ? 
                (isScrolled ? 'translateY(0) scale(1)' : 'translateY(calc(100% + 140px))') :
                'scale(1)';
              e.currentTarget.style.boxShadow = window.innerWidth < 768 && isScrolled ? 
                '0 8px 25px rgba(255, 0, 128, 0.4)' : 
                '0 4px 15px rgba(0, 0, 0, 0.3)';
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
