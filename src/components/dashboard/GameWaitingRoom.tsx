'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBackground } from '@/context/BackgroundContext';
import { UserService } from '@/services/userService';
import { useNavigation } from '@/context/NavigationContext';
import { useWaitingRoomCleanup } from '@/hooks/useWaitingRoomCleanup';
import { db } from '@/services/firebase';
import { collection, addDoc, doc, onSnapshot, updateDoc, deleteDoc, query, where, getDocs, getDoc, serverTimestamp } from 'firebase/firestore';
import { GameType } from '@/types/ranked';
import { RankedMatchmakingService } from '@/services/rankedMatchmakingService';
import { NewMatchmakingService } from '@/services/newMatchmakingService';
import { OptimisticMatchmakingService } from '@/services/optimisticMatchmakingService';

interface GameWaitingRoomProps {
  gameMode: string;
  actionType: 'live' | 'custom';
  gameType?: GameType; // Add gameType support
  onBack: () => void;
  roomId?: string; // Optional roomId for existing rooms
  isOptimistic?: boolean; // Add flag for optimistic UI
}

interface WaitingRoomEntry {
  id?: string;
  createdAt: any;
  gameMode: string;
  gameType: string;
  rankedGame?: boolean; // Add ranked game flag
  competitiveType?: GameType; // Add competitive type
  playersRequired: number;
  friendInvitation?: boolean; // Add flag to indicate friend invitation room
  readyPlayers?: string[]; // Track which players are ready
  sessionProxy?: string; // Reference to gameSessions collection for unified system
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
  gameType = 'quick', // Default to quick game
  onBack,
  roomId,
  isOptimistic = false // Default to non-optimistic
}) => {
  const { user } = useAuth();
  const { DisplayBackgroundEquip, MatchBackgroundEquip } = useBackground();
  
  // Remove performance-impacting logs
  // console.log('🎮 GameWaitingRoom: Received gameMode:', gameMode);
  
  // Add logging to see what backgrounds we're getting from context
  useEffect(() => {
    // Remove performance-impacting logs
    // console.log('GameWaitingRoom: Background context updated', {
    //   DisplayBackgroundEquip,
    //   MatchBackgroundEquip,
    //   DisplayBackgroundType: DisplayBackgroundEquip?.type,
    //   MatchBackgroundType: MatchBackgroundEquip?.type
    // });
  }, [DisplayBackgroundEquip, MatchBackgroundEquip]);
  const { setCurrentSection } = useNavigation();
  
  const [waitingRoomEntry, setWaitingRoomEntry] = useState<WaitingRoomEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchingText, setSearchingText] = useState('Searching for opponents...');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [opponentJoined, setOpponentJoined] = useState(false);
  
  // Add body class for mobile scrolling control
  useEffect(() => {
    document.body.classList.add('waiting-room-active');
    return () => {
      document.body.classList.remove('waiting-room-active');
    };
  }, []);
  const [vsCountdown, setVsCountdown] = useState<number | null>(null);
  const [isLeaving, setIsLeaving] = useState(false); // Add flag to prevent multiple leave operations
  const [isReady, setIsReady] = useState(false); // Track if current player is ready
  const [isMarkingReady, setIsMarkingReady] = useState(false); // Track ready button state
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
      name: 'Quickfire', 
      description: 'Fast-paced dice action'
    },
    classic: { 
      name: 'Classic Mode', 
      description: 'Traditional dice gameplay'
    },
    'zero-hour': { 
      name: 'Zero Hour', 
      description: 'Race against time'
    },
    zerohour: { 
      name: 'Zero Hour', 
      description: 'Race against time'
    },
    'last-line': { 
      name: 'Last Line', 
      description: 'Sudden death showdown'
    },
    lastline: { 
      name: 'Last Line', 
      description: 'Sudden death showdown'
    },
    'true-grit': { 
      name: 'True Grit', 
      description: 'One turn, one chance'
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

  // Current game mode configuration - use waiting room data if available, fallback to prop
  const currentGameMode = useMemo(() => {
    // PRIORITY: Use the gameMode prop over waitingRoomEntry for friend invitations
    // This ensures the correct game mode is used when accepting friend invitations
    const actualGameMode = gameMode || waitingRoomEntry?.gameMode;
    const config = gameModeConfig[actualGameMode as keyof typeof gameModeConfig] || gameModeConfig.classic;
    
    // Only log on actual changes, not every render
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 GameWaitingRoom: Game mode resolved:', {
        propGameMode: gameMode,
        waitingRoomGameMode: waitingRoomEntry?.gameMode,
        resolvedGameMode: actualGameMode,
        configUsed: config.name
      });
    }
    
    return config;
  }, [gameMode, waitingRoomEntry?.gameMode]);
  
  // Game mode logging moved to useMemo to prevent infinite renders

  // Get user data from profile
  const getUserData = async () => {
    try {
      // Remove performance-impacting logs
      // console.log('🔍 GameWaitingRoom: Fetching user profile for UID:', user!.uid);
      const userProfile = await UserService.getUserProfile(user!.uid);
      // Remove performance-impacting logs
      // console.log('📊 GameWaitingRoom: User profile fetched:', userProfile);
      
      if (userProfile) {
        const userData = {
          displayName: userProfile.displayName || user?.email?.split('@')[0] || 'Anonymous',
          stats: userProfile.stats,
          displayBackgroundEquipped: userProfile.inventory.displayBackgroundEquipped,
          matchBackgroundEquipped: userProfile.inventory.matchBackgroundEquipped
        };
        // Remove performance-impacting logs
        // console.log('✅ GameWaitingRoom: Processed user data:', userData);
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
    // Remove performance-impacting logs
    // console.log('⚠️ GameWaitingRoom: Using fallback data:', fallbackData);
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

  // Monitor optimistic room status changes for real-time updates
  useEffect(() => {
    if (!isOptimistic || !roomId || !OptimisticMatchmakingService.isOptimisticRoom(roomId)) {
      return;
    }

    const interval = setInterval(() => {
      const optimisticRoom = OptimisticMatchmakingService.getOptimisticRoom(roomId);
      if (optimisticRoom) {
        // Update search text based on current optimistic room status
        setSearchingText(optimisticRoom.searchText);
        
        // Log status changes for debugging
        console.log(`🔄 GameWaitingRoom: Optimistic room status: ${optimisticRoom.status} - ${optimisticRoom.searchText}`);
        
        // Check if we have a real room ID and should transition
        if (optimisticRoom.realRoomId && optimisticRoom.status === 'transitioning') {
          console.log(`🔄 GameWaitingRoom: Real room ready, transitioning to ${optimisticRoom.realRoomId}`);
          
          // The parent component (DashboardSection) will handle the navigation update
          // We just need to update our local state to show the transition
          setSearchingText('Connected! Loading match...');
        }
      }
    }, 500); // Check every 500ms for smooth updates

    return () => clearInterval(interval);
  }, [isOptimistic, roomId]);

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

        // STEP 1: Handle optimistic rooms first
        if (isOptimistic && roomId && OptimisticMatchmakingService.isOptimisticRoom(roomId)) {
          console.log('✨ GameWaitingRoom: Loading optimistic room data for:', roomId);
          
          const optimisticRoom = OptimisticMatchmakingService.getOptimisticRoom(roomId);
          
          if (optimisticRoom) {
            // Create waiting room entry from optimistic data
            const optimisticWaitingRoomEntry: WaitingRoomEntry = {
              id: optimisticRoom.id,
              gameMode: optimisticRoom.gameMode,
              gameType: optimisticRoom.gameType,
              playersRequired: 2,
              hostData: optimisticRoom.playerData,
              createdAt: new Date(),
              rankedGame: optimisticRoom.gameType === 'ranked'
            };
            
            setWaitingRoomEntry(optimisticWaitingRoomEntry);
            setSearchingText(optimisticRoom.searchText);
            setIsLoading(false);
            
            console.log('✅ GameWaitingRoom: Optimistic room loaded successfully');
            return; // Don't proceed with normal room loading
          } else {
            console.warn('⚠️ GameWaitingRoom: Optimistic room data not found, falling back to normal loading');
          }
        }

        const userData = await getUserData();

        // Add ranked validation if this is a ranked game
        if (gameType === 'ranked') {
          const validation = await RankedMatchmakingService.validateRankedEligibility(user.uid);
          if (!validation.valid) {
            setError(validation.reason || 'Cannot play ranked matches at this time');
            setIsLoading(false);
            return;
          }
        }

        // If roomId is provided, listen to that specific room
        if (roomId) {
          console.log('🎯 GameWaitingRoom: Using existing room ID:', roomId);
          
          // STEP 3: Bridge Entry System - Check for immediate room data availability
          const bridgeRoomData = OptimisticMatchmakingService.getBridgeRoomData(roomId);
          if (bridgeRoomData) {
            console.log('🌉 GameWaitingRoom: Using bridge room data for immediate access');
            
            // Set room data immediately from bridge to prevent race conditions
            setWaitingRoomEntry(bridgeRoomData as WaitingRoomEntry);
            setError(''); // Clear any previous errors
            
            // Update ready state for current user if needed
            if (bridgeRoomData.friendInvitation && bridgeRoomData.readyPlayers && user?.uid) {
              setIsReady(bridgeRoomData.readyPlayers.includes(user.uid));
              
              // Check if both players are ready
              if (bridgeRoomData.hostData && bridgeRoomData.opponentData && bridgeRoomData.readyPlayers.length === 2) {
                startVsCountdown();
              }
            }
            
            // Check for opponent
            if (bridgeRoomData.opponentData && !opponentJoined) {
              console.log('🎯 GameWaitingRoom: Opponent detected in bridge data');
              setOpponentJoined(true);
              
              // Only auto-start countdown for non-friend invitations
              if (!bridgeRoomData.friendInvitation && vsCountdown === null) {
                console.log('🚀 GameWaitingRoom: Starting countdown for matched players');
                startVsCountdown();
              }
            }
          }
          
          // Set up listener for the existing room (this will override bridge data with real-time updates)
          const unsubscribe = onSnapshot(
            doc(db, 'waitingroom', roomId), 
            (doc) => {
              if (doc.exists()) {
                const data = doc.data() as WaitingRoomEntry;
                console.log('🔄 GameWaitingRoom: Received room update for existing room', data);
                setWaitingRoomEntry({ ...data, id: doc.id });
                setError(''); // Clear any previous errors
                
                // Clear bridge data now that we have real-time data
                OptimisticMatchmakingService.clearBridgeRoomData(roomId);
                
                // Update ready state for current user
                if (data.friendInvitation && data.readyPlayers && user?.uid) {
                  setIsReady(data.readyPlayers.includes(user.uid));
                  
                  // Check if both players are ready
                  if (data.hostData && data.opponentData && data.readyPlayers.length === 2) {
                    startVsCountdown();
                  }
                }
                
                // Check if opponent joined - improved detection for initial load
                if (data.opponentData) {
                  if (!opponentJoined) {
                    console.log('🎯 GameWaitingRoom: Opponent detected, updating state');
                    setOpponentJoined(true);
                  }
                  
                  // Only auto-start countdown for non-friend invitations
                  if (!data.friendInvitation && vsCountdown === null) {
                    console.log('🚀 GameWaitingRoom: Starting countdown for matched players');
                    startVsCountdown();
                  }
                } else {
                  // Reset opponent joined state if opponent is no longer present
                  if (opponentJoined) {
                    console.log('⚠️ GameWaitingRoom: Opponent no longer present, resetting state');
                    setOpponentJoined(false);
                  }
                }
              } else {
                console.log('🔄 GameWaitingRoom: Room no longer exists in waitingroom (likely moved to matches or in gameSessions)');
                
                // STEP 3: Bridge Entry System - Check if room data still exists in bridge before showing error
                const bridgeRoomData = OptimisticMatchmakingService.getBridgeRoomData(roomId);
                if (bridgeRoomData) {
                  console.log('🌉 GameWaitingRoom: Room not in waitingroom but found in bridge, using bridge data');
                  
                  // Use bridge data since the room might be in gameSessions instead of waitingroom
                  setWaitingRoomEntry(bridgeRoomData as WaitingRoomEntry);
                  setError(''); // Clear any previous errors
                  setIsLoading(false);
                  
                  console.log('✅ GameWaitingRoom: Successfully using bridge data instead of database lookup');
                  return; // Don't proceed with match checking - bridge data is sufficient
                }
                
                // For friend invitations, immediately check if room was moved to matches
                console.log('🔍 GameWaitingRoom: Room not found, checking for existing matches...');
                
                // Check if this room was moved to matches collection
                const checkForExistingMatch = async () => {
                  try {
                    console.log('🔍 DEBUG: Starting match search for roomId:', roomId);
                    
                    // Check for match by originalRoomId
                    const matchQuery = query(
                      collection(db, 'matches'), 
                      where('originalRoomId', '==', roomId)
                    );
                    const matchSnapshot = await getDocs(matchQuery);
                    
                    console.log('🔍 DEBUG: originalRoomId query results:', {
                      roomId,
                      matchCount: matchSnapshot.docs.length,
                      matches: matchSnapshot.docs.map(doc => ({
                        id: doc.id,
                        originalRoomId: doc.data().originalRoomId,
                        gameMode: doc.data().gameMode,
                        status: doc.data().status
                      }))
                    });
                    
                    if (!matchSnapshot.empty) {
                      const existingMatch = matchSnapshot.docs[0];
                      const matchData = existingMatch.data();
                      
                      console.log('✅ GameWaitingRoom: Found existing match by originalRoomId, navigating...');
                      setCurrentSection('match', {
                        gameMode: matchData.gameMode || gameMode,
                        matchId: existingMatch.id,
                        roomId: existingMatch.id
                      });
                      return;
                    }
                    
                    // If no match found by originalRoomId, check by player ID
                    console.log('🔍 DEBUG: No match found by originalRoomId, checking by player ID...');
                    const [hostMatches, opponentMatches] = await Promise.all([
                      getDocs(query(collection(db, 'matches'), where('hostData.playerId', '==', user.uid))),
                      getDocs(query(collection(db, 'matches'), where('opponentData.playerId', '==', user.uid)))
                    ]);
                    
                    const allUserMatches = [...hostMatches.docs, ...opponentMatches.docs];
                    console.log('🔍 DEBUG: Player ID query results:', {
                      userUid: user.uid,
                      hostMatches: hostMatches.docs.length,
                      opponentMatches: opponentMatches.docs.length,
                      totalMatches: allUserMatches.length,
                      matches: allUserMatches.map(doc => ({
                        id: doc.id,
                        gameMode: doc.data().gameMode,
                        status: doc.data().status,
                        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || 'unknown',
                        hostPlayerId: doc.data().hostData?.playerId,
                        opponentPlayerId: doc.data().opponentData?.playerId
                      }))
                    });
                    
                    const recentMatch = allUserMatches.find(doc => {
                      const data = doc.data();
                      const matchTime = data.createdAt?.toDate?.() || new Date(0);
                      const timeDiff = new Date().getTime() - matchTime.getTime();
                      return data.status === 'active' && timeDiff < 30000; // 30 seconds
                    });
                    
                    if (recentMatch) {
                      const matchData = recentMatch.data();
                      console.log('✅ GameWaitingRoom: Found recent match by player ID, navigating...');
                      setCurrentSection('match', {
                        gameMode: matchData.gameMode || gameMode,
                        matchId: recentMatch.id,
                        roomId: recentMatch.id
                      });
                      return;
                    }
                    
                    // If no matches found, implement enhanced error prevention
                    console.log('❌ GameWaitingRoom: No existing matches found for room');
                    
                    // STEP 3: Enhanced Error Prevention - Final check before showing error
                    const finalBridgeCheck = OptimisticMatchmakingService.getBridgeRoomData(roomId);
                    if (finalBridgeCheck) {
                      console.log('🌉 GameWaitingRoom: Final bridge check found room data, using it');
                      setWaitingRoomEntry(finalBridgeCheck as WaitingRoomEntry);
                      setError(''); // Clear any previous errors
                      return;
                    }
                    
                    // Check if this is an optimistic room that might still be creating
                    if (OptimisticMatchmakingService.isOptimisticRoom(roomId)) {
                      const optimisticRoom = OptimisticMatchmakingService.getOptimisticRoom(roomId);
                      if (optimisticRoom && (optimisticRoom.status === 'creating' || optimisticRoom.status === 'searching')) {
                        console.log('🔄 GameWaitingRoom: Optimistic room still creating, waiting...');
                        setError(''); // Clear errors
                        setSearchingText('Still creating room...');
                        
                        // Wait longer for room creation
                        setTimeout(() => {
                          console.log('🔄 GameWaitingRoom: Retrying after optimistic room creation delay');
                        }, 2000);
                        return;
                      }
                    }
                    
                    // Show error only as last resort
                    setError('Game room no longer exists');
                    setTimeout(() => onBack(), 2000);
                    
                  } catch (error) {
                    console.error('❌ GameWaitingRoom: Error checking for existing matches:', error);
                    setError('Failed to find game room');
                    setTimeout(() => onBack(), 2000);
                  }
                };
                
                checkForExistingMatch();
              }
            },
            (error) => {
              console.error('❌ GameWaitingRoom: Error listening to room:', error);
              
              // STEP 3: Bridge Entry System - Check bridge before showing connection error
              const bridgeRoomData = OptimisticMatchmakingService.getBridgeRoomData(roomId);
              if (bridgeRoomData) {
                console.log('🌉 GameWaitingRoom: Connection error but bridge data available, using it');
                setWaitingRoomEntry(bridgeRoomData as WaitingRoomEntry);
                setError(''); // Clear any previous errors
                
                // Try to reconnect after using bridge data
                setTimeout(() => {
                  console.log('🔄 GameWaitingRoom: Attempting to reconnect after bridge fallback');
                }, 1000);
                return;
              }
              
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
                
                // Update ready state for current user
                if (data.friendInvitation && data.readyPlayers && user?.uid) {
                  setIsReady(data.readyPlayers.includes(user.uid));
                  
                  // Check if both players are ready
                  if (data.hostData && data.opponentData && data.readyPlayers.length === 2) {
                    startVsCountdown();
                  }
                }
                
                // Check if opponent joined - but don't auto-start countdown for friend invitations
                if (data.opponentData && !opponentJoined) {
                  setOpponentJoined(true);
                  
                  // Only auto-start countdown for non-friend invitations
                  if (!data.friendInvitation) {
                    startVsCountdown();
                  }
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
                
                // Update ready state for current user
                if (data.friendInvitation && data.readyPlayers && user?.uid) {
                  setIsReady(data.readyPlayers.includes(user.uid));
                  
                  // Check if both players are ready
                  if (data.hostData && data.opponentData && data.readyPlayers.length === 2) {
                    startVsCountdown();
                  }
                }
                
                // Check if opponent joined (we are the opponent in this case)
                if (data.opponentData) {
                  setOpponentJoined(true);
                  
                  // Only auto-start countdown for non-friend invitations
                  if (!data.friendInvitation) {
                    startVsCountdown();
                  }
                }
              }
            });

            setIsLoading(false);
            return () => unsubscribe();
          }
        } else {
          // No existing game found - create new one
          // Remove performance-impacting logs
          // console.log('GameWaitingRoom: Creating new waiting room entry', {
          //   DisplayBackgroundEquip,
          //   MatchBackgroundEquip,
          //   DisplayBackgroundType: DisplayBackgroundEquip?.type,
          //   MatchBackgroundType: MatchBackgroundEquip?.type
          // });
          
          const entry: WaitingRoomEntry = {
            createdAt: serverTimestamp(),
            gameMode: gameMode,
            gameType: "Open Server",
            rankedGame: gameType === 'ranked', // Add ranked game flag
            competitiveType: gameType, // Track competitive type
            playersRequired: 0, // Set to 0 as requested
            hostData: {
              playerDisplayName: userData.displayName,
              playerId: user.uid,
              displayBackgroundEquipped: userData.displayBackgroundEquipped || null,
              matchBackgroundEquipped: userData.matchBackgroundEquipped || null,
              playerStats: userData.stats
            }
          };

          // Remove performance-impacting logs
          // console.log('GameWaitingRoom: Final entry to be saved', entry);

          const docRef = await addDoc(collection(db, 'waitingroom'), entry);
          const gameId = docRef.id;
          
          // Set up listener for when opponent joins
          const unsubscribe = onSnapshot(doc(db, 'waitingroom', gameId), (doc) => {
            if (doc.exists()) {
              const data = doc.data() as WaitingRoomEntry;
              // Remove performance-impacting logs
              // console.log('GameWaitingRoom: Received waiting room data from Firebase', {
              //   data,
              //   hostData: data.hostData,
              //   matchBackgroundEquipped: data.hostData?.matchBackgroundEquipped
              // });
              
              setWaitingRoomEntry({ ...data, id: doc.id });
              
              // Update ready state for current user
              if (data.friendInvitation && data.readyPlayers && user?.uid) {
                setIsReady(data.readyPlayers.includes(user.uid));
                
                // Check if both players are ready
                if (data.hostData && data.opponentData && data.readyPlayers.length === 2) {
                  startVsCountdown();
                }
              }
              
              // Check if opponent joined - but don't auto-start countdown for friend invitations
              if (data.opponentData && !opponentJoined) {
                setOpponentJoined(true);
                
                // Only auto-start countdown for non-friend invitations
                if (!data.friendInvitation) {
                  startVsCountdown();
                }
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
    console.log('🕐 Starting VS countdown...');
    
    setVsCountdown(5);
    const timer = setInterval(() => {
      setVsCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          console.log('� Countdown finished! Starting match...');
          
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

  // Handle marking player as ready for friend invitations
  const handlePlayerReady = async () => {
    if (!user?.uid || !waitingRoomEntry?.id || !waitingRoomEntry?.friendInvitation) {
      return;
    }

    setIsMarkingReady(true);

    try {
      // Use the GameInvitationService to mark player as ready
      const result = await import('@/services/gameInvitationService').then(module => 
        module.GameInvitationService.markPlayerReady(waitingRoomEntry.id!, user.uid)
      );

      if (result.success) {
        setIsReady(true);
      } else {
        console.error('Failed to mark player ready:', result.error);
      }
    } catch (error) {
      console.error('Error marking player ready:', error);
    } finally {
      setIsMarkingReady(false);
    }
  };

  // Function to move game to matches collection
  const moveToMatchesAndNavigate = async () => {
    try {
      // Add small random delay to prevent race conditions (0-500ms)
      const delay = Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Remove performance-impacting logs
      // console.log('🎮 GameWaitingRoom: moveToMatchesAndNavigate called!');
      console.log('🔍 DEBUG: ENTRY POINT - moveToMatchesAndNavigate:', {
        timestamp: new Date().toISOString(),
        delay: `${delay.toFixed(0)}ms`,
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

      // OPTIMIZED: Check if room was already moved to matches collection with parallel queries
      try {
        console.log('🔍 DEBUG: Checking for existing match...');
        
        // Use Promise.all for parallel queries instead of sequential
        const [originalRoomMatches, hostMatches, opponentMatches] = await Promise.all([
          getDocs(query(collection(db, 'matches'), where('originalRoomId', '==', roomIdToUse))),
          getDocs(query(collection(db, 'matches'), where('hostData.playerId', '==', user.uid))),
          getDocs(query(collection(db, 'matches'), where('opponentData.playerId', '==', user.uid)))
        ]);
        
        // Check originalRoomId matches first
        if (!originalRoomMatches.empty) {
          const existingMatch = originalRoomMatches.docs[0];
          const matchData = existingMatch.data();
          
          console.log('🎮 GameWaitingRoom: Found existing match by originalRoomId, navigating...');
          setCurrentSection('match', {
            gameMode: matchData.gameMode || gameMode,
            matchId: existingMatch.id,
            roomId: existingMatch.id
          });
          return;
        }
        
        // Find most recent active match by player ID (within last 30 seconds)
        const allUserMatches = [...hostMatches.docs, ...opponentMatches.docs];
        const activeMatch = allUserMatches.find(doc => {
          const data = doc.data();
          const matchTime = data.createdAt?.toDate?.() || new Date(0);
          const timeDiff = new Date().getTime() - matchTime.getTime();
          return data.status === 'active' && timeDiff < 30000; // 30 seconds
        });
        
        if (activeMatch) {
          const matchData = activeMatch.data();
          
          // SECURITY CHECK: Ensure user is part of the match
          const userInMatch = matchData.hostData?.playerId === user.uid || 
                             matchData.opponentData?.playerId === user.uid;
          
          if (!userInMatch) {
            console.error('❌ SECURITY: User not authorized for existing match');
            setError('Unauthorized access to match');
            setTimeout(() => onBack(), 2000);
            return;
          }
          
          console.log('� GameWaitingRoom: Found recent active match, navigating...');
          setCurrentSection('match', {
            gameMode: matchData.gameMode || gameMode,
            matchId: activeMatch.id,
            roomId: activeMatch.id
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
            // Room not found - we already checked matches above, so just redirect
            console.log('🎮 GameWaitingRoom: Room not found in waitingroom and no active matches found');
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

      // Get round objective and starting score based on game mode
      const getRoundObjective = (mode: string): number => {
        switch (mode.toLowerCase()) {
          case 'quickfire': return 50;
          case 'classic': return 100;
          case 'zero-hour':
          case 'zerohour': return 0;    // Zero Hour targets 0
          case 'last-line':
          case 'lastline': return 100;  // Highest roll comparison
          case 'true-grit':
          case 'truegrit': return 100;  // Highest single turn
          default: return 100;
        }
      };

      const getStartingScore = (mode: string): number => {
        switch (mode.toLowerCase()) {
          case 'quickfire': return 0;
          case 'classic': return 0;
          case 'zero-hour':
          case 'zerohour': return 100;  // Zero Hour starts at 100
          case 'last-line':
          case 'lastline': return 0;   // Last Line starts at 0
          case 'true-grit':
          case 'truegrit': return 0;   // True Grit starts at 0
          default: return 0;
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
          playerScore: getStartingScore(roomData.gameMode),
          roundScore: 0
        },
        
        // Initialize opponent data with game-specific fields
        opponentData: roomData.opponentData ? {
          ...roomData.opponentData,
          turnActive: false, // Will be set by turn decider
          playerScore: getStartingScore(roomData.gameMode),
          roundScore: 0
        } : undefined,
        
        gameData: {
          // Use existing gameData if available, otherwise create new
          type: roomData.gameData?.type || 'dice',
          settings: roomData.gameData?.settings || {},
          turnDecider: roomData.gameData?.turnDecider || Math.floor(Math.random() * 2) + 1, // Random 1 or 2
          chooserPlayerIndex: Math.floor(Math.random() * 2) + 1, // Random 1 or 2 (same as turnDecider)
          turnScore: 0,
          diceOne: 0,
          diceTwo: 0,
          roundObjective: roomData.gameData?.roundObjective || getRoundObjective(roomData.gameMode),
          startingScore: roomData.gameData?.startingScore || getStartingScore(roomData.gameMode),
          status: 'active' as const,
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
      console.log('🚪 GameWaitingRoom: Leaving game', {
        waitingRoomId: waitingRoomEntry?.id,
        roomId: roomId,
        userId: user?.uid
      });
      
      if (user?.uid) {
        // Use the enhanced leave session method that cleans up both documents
        const sessionId = roomId || waitingRoomEntry?.id;
        if (sessionId) {
          console.log('🧹 GameWaitingRoom: Using NewMatchmakingService to leave session:', sessionId);
          await NewMatchmakingService.leaveSession(user.uid, sessionId);
        } else {
          console.log('⚠️ GameWaitingRoom: No session ID found, cleaning up waiting room only');
          // Fallback to manual cleanup if no session ID
          if (waitingRoomEntry?.id) {
            await deleteDoc(doc(db, 'waitingroom', waitingRoomEntry.id));
            console.log('✅ GameWaitingRoom: Waiting room document deleted successfully');
          }
        }
      } else {
        console.log('⚠️ GameWaitingRoom: No user ID available for leave cleanup');
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
    const background = waitingRoomEntry?.hostData?.matchBackgroundEquipped;
    
    // Validate background object structure
    if (!background || typeof background !== 'object') {
      return null;
    }
    
    // Handle complete background object
    if (background.type === 'video' && background.file) {
      return (
        <video
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          webkit-playsinline="true"
          x5-playsinline="true"
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
    const background = waitingRoomEntry?.hostData?.matchBackgroundEquipped;
    
    // Validate background object structure
    if (!background) {
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
    <div className="waiting-room-container" style={{ 
      width: '100%', 
      height: '100vh', 
      maxHeight: '100vh',
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
          
          {/* Game Type Badge */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '10px'
          }}>
            <div style={{
              backgroundColor: gameType === 'ranked' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 150, 255, 0.2)',
              border: `2px solid ${gameType === 'ranked' ? '#FFD700' : '#0096FF'}`,
              borderRadius: '20px',
              padding: '8px 16px',
              color: gameType === 'ranked' ? '#FFD700' : '#0096FF',
              fontFamily: 'Audiowide',
              fontSize: '14px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {gameType === 'ranked' ? '🏆' : '⚡'} 
              {gameType === 'ranked' ? 'Ranked Match' : 'Quick Game'}
            </div>
          </div>
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
                {waitingRoomEntry?.hostData?.playerDisplayName || 'Unknown Player'}
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
                    {waitingRoomEntry?.hostData?.playerStats?.matchWins || 0}
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
                    {waitingRoomEntry?.hostData?.playerStats?.gamesPlayed || 0}
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
                    {waitingRoomEntry?.hostData?.playerStats?.bestStreak || 0}
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
                    {waitingRoomEntry?.hostData?.playerStats?.currentStreak || 0}
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
                      {waitingRoomEntry.opponentData?.playerStats?.matchWins || 0}
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
                      {waitingRoomEntry.opponentData?.playerStats?.gamesPlayed || 0}
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
                      {waitingRoomEntry.opponentData?.playerStats?.bestStreak || 0}
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
                      {waitingRoomEntry.opponentData?.playerStats?.currentStreak || 0}
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
                  background: waitingRoomEntry.opponentData?.matchBackgroundEquipped?.type !== 'video' && waitingRoomEntry.opponentData?.matchBackgroundEquipped?.file 
                    ? `url('${waitingRoomEntry.opponentData.matchBackgroundEquipped.file}') center/cover no-repeat` 
                    : '#332A63'
                }}
              >
                {/* Render opponent video background if it's a video */}
                {waitingRoomEntry.opponentData?.matchBackgroundEquipped?.type === 'video' && (
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
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      zIndex: 0
                    }}
                  >
                    <source src={waitingRoomEntry.opponentData?.matchBackgroundEquipped?.file} type="video/mp4" />
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
                  {waitingRoomEntry.opponentData?.playerDisplayName || 'Unknown Player'}
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
              
              {/* Friend Invitation Auto-Ready Status */}
              {waitingRoomEntry?.friendInvitation && waitingRoomEntry?.opponentData && (
                <div
                  style={{
                    color: '#00FF80',
                    fontFamily: 'Audiowide',
                    fontSize: window.innerWidth < 768 ? '14px' : '24px',
                    fontWeight: 400,
                    textAlign: 'center',
                    marginTop: '10px',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    background: 'rgba(0, 255, 128, 0.1)',
                    border: '1px solid rgba(0, 255, 128, 0.3)',
                    textTransform: 'uppercase',
                    animation: 'glow 2s ease-in-out infinite alternate'
                  }}
                >
                  Both Players Ready - Starting Soon!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ready Button for Friend Invitations - REMOVED: Auto-ready implemented */}
        {/* For friend invitations, both players are automatically ready and countdown starts immediately */}
        {waitingRoomEntry?.friendInvitation && waitingRoomEntry?.opponentData && vsCountdown === null && false && (
          <button
            onClick={handlePlayerReady}
            disabled={isMarkingReady || isReady}
            style={{
              display: 'flex',
              padding: window.innerWidth < 768 ? '15px 20px' : '20px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '18px',
              background: isReady ? '#00FF80' : isMarkingReady ? '#666666' : '#0080FF',
              backdropFilter: 'blur(20px)',
              color: '#FFF',
              fontFamily: 'Audiowide',
              fontSize: window.innerWidth < 768 ? '18px' : '36px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: '30px',
              border: 'none',
              cursor: isMarkingReady || isReady ? 'not-allowed' : 'pointer',
              opacity: isMarkingReady || isReady ? 0.7 : 1,
              textTransform: 'uppercase',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              margin: window.innerWidth < 768 ? '10px 20px' : '20px auto',
              width: window.innerWidth < 768 ? 'calc(100vw - 40px)' : 'auto',
              boxShadow: isReady ? 
                '0 4px 15px rgba(0, 255, 128, 0.4)' : 
                '0 4px 15px rgba(0, 128, 255, 0.3)'
            }}
            onMouseEnter={(e) => {
              if (!isMarkingReady && !isReady) {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 128, 255, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isMarkingReady && !isReady) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 128, 255, 0.3)';
              }
            }}
          >
            {isMarkingReady ? 'Marking Ready...' : 
             isReady ? 'Ready!' : 'Mark Ready'}
          </button>
        )}

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
