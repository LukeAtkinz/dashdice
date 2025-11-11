'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
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
import { BotMatchingService } from '@/services/botMatchingService';
import MatchAbandonmentNotification from '@/components/notifications/MatchAbandonmentNotification';
import { MatchTransition } from '@/components/match/MatchTransition';
import { MatchLifecycleService } from '@/services/matchLifecycleService';
import { analyticsService } from '@/services/analyticsService';
import { useWaitingRoomBackground } from '@/hooks/useOptimizedBackground';

interface GameWaitingRoomProps {
  gameMode: string;
  actionType: 'live' | 'custom';
  gameType?: GameType; // Add gameType support
  onBack: () => void;
  roomId?: string; // Optional roomId for existing rooms
  isOptimistic?: boolean; // Add flag for optimistic UI
  matchBackground?: any; // Add matchBackground prop for consistency
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
  isOptimistic = false, // Default to non-optimistic
  matchBackground // Add matchBackground prop
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
  
  // Bot system integration
  const [botCountdown, setBotCountdown] = useState<number | null>(null);
  const [botFallbackActive, setBotFallbackActive] = useState(false);
  const [botOpponent, setBotOpponent] = useState<any>(null);
  
  const [vsCountdown, setVsCountdown] = useState<number | null>(null);
  const [isLeaving, setIsLeaving] = useState(false); // Add flag to prevent multiple leave operations
  const [isReady, setIsReady] = useState(false); // Track if current player is ready
  const [isMarkingReady, setIsMarkingReady] = useState(false); // Track ready button state
  const [isScrolled, setIsScrolled] = useState(false); // Track scroll position for mobile button animation
  const [goBackendOpponentData, setGoBackendOpponentData] = useState<any>(null); // Store opponent data from Go backend
  
  // Abandonment notification state
  const [showAbandonmentNotification, setShowAbandonmentNotification] = useState(false);
  const [abandonmentTimer, setAbandonmentTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Timer state for countdown management
  const [vsCountdownTimer, setVsCountdownTimer] = useState<NodeJS.Timeout | null>(null);
  const [botCountdownTimer, setBotCountdownTimer] = useState<NodeJS.Timeout | null>(null);
  const [opponentLastSeen, setOpponentLastSeen] = useState<Date | null>(null);
  const [gameHasStarted, setGameHasStarted] = useState(false); // Track if the game has actually started
  const [pendingMatchData, setPendingMatchData] = useState<any>(null); // Store match data during countdown
  
  // Opponent display readiness states
  const [opponentDisplayReady, setOpponentDisplayReady] = useState(false); // Track if opponent background has loaded
  const [opponentDisplayLoading, setOpponentDisplayLoading] = useState(false); // Track loading state
  const [readyToStartCountdown, setReadyToStartCountdown] = useState(false); // Track overall readiness
  
  // Match transition state
  const [showMatchTransition, setShowMatchTransition] = useState(false);
  const [transitionMatchData, setTransitionMatchData] = useState<any>(null);
  
  // Get optimized background for opponent
  const opponentData = waitingRoomEntry?.opponentData || goBackendOpponentData;
  const opponentBackground = opponentData?.matchBackgroundEquipped || opponentData?.displayBackgroundEquipped;
  const { backgroundPath: opponentBgPath, isVideo: opponentBgIsVideo } = useWaitingRoomBackground(opponentBackground as any);
  
  // Handle transition completion
  const handleTransitionComplete = () => {
    console.log('🎬 GameWaitingRoom: Transition completed, navigating to match...');
    setShowMatchTransition(false);
    setTransitionMatchData(null);
    moveToMatchesAndNavigate();
  };

  // Emergency escape from transition (fallback safety)
  useEffect(() => {
    if (showMatchTransition) {
      console.log('🎬 GameWaitingRoom: Match transition started');
      // Safety timeout to ensure transition doesn't get stuck
      const safetyTimeout = setTimeout(() => {
        console.log('⚠️ GameWaitingRoom: Transition safety timeout - forcing completion');
        handleTransitionComplete();
      }, 8000); // 8 seconds max

      return () => clearTimeout(safetyTimeout);
    }
  }, [showMatchTransition]);

  // Add body class for mobile scrolling control and cleanup timers on unmount
  useEffect(() => {
    document.body.classList.add('waiting-room-active');
    return () => {
      document.body.classList.remove('waiting-room-active');
      
      // Cleanup all timers on unmount
      if (vsCountdownTimer) {
        clearInterval(vsCountdownTimer);
      }
      if (botCountdownTimer) {
        clearInterval(botCountdownTimer);
      }
      if (abandonmentTimer) {
        clearInterval(abandonmentTimer);
      }
    };
  }, [vsCountdownTimer, botCountdownTimer, abandonmentTimer]);

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
          displayBackgroundEquipped: userProfile.inventory?.displayBackgroundEquipped || null,
          matchBackgroundEquipped: userProfile.inventory?.matchBackgroundEquipped || null
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

  // Helper function to get opponent data from multiple sources
  const getOpponentData = () => {
    // Priority 1: Waiting room entry opponent data (Firebase)
    if (waitingRoomEntry?.opponentData) {
      return waitingRoomEntry.opponentData;
    }
    
    // Priority 2: Go backend opponent data (stored during polling)
    if (goBackendOpponentData) {
      return goBackendOpponentData;
    }
    
    // Priority 3: No opponent data available
    return null;
  };

  // Function to verify opponent display assets are fully loaded
  const checkOpponentDisplayReady = (opponentData: any) => {
    if (!opponentData) {
      console.log('🔍 Display Check: No opponent data available');
      setOpponentDisplayReady(false);
      setOpponentDisplayLoading(false);
      return false;
    }

    // Skip loading check on mobile for faster UX
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      console.log('📱 Display Check: Mobile detected - skipping background loading check for faster UX');
      setOpponentDisplayReady(true);
      setOpponentDisplayLoading(false);
      return true;
    }

    console.log('🔍 Display Check: Starting opponent display readiness check', {
      opponentName: opponentData.playerDisplayName,
      hasDisplayBackground: !!opponentData.displayBackgroundEquipped,
      hasMatchBackground: !!opponentData.matchBackgroundEquipped
    });

    // Set loading state to true
    setOpponentDisplayLoading(true);
    setOpponentDisplayReady(false);

    const background = opponentData.matchBackgroundEquipped || opponentData.displayBackgroundEquipped;
    
    if (!opponentBgPath) {
      console.log('✅ Display Check: No background to load, opponent ready');
      setOpponentDisplayReady(true);
      setOpponentDisplayLoading(false);
      return true;
    }

    // Check if it's a video or image
    if (opponentBgIsVideo) {
      console.log('🎥 Display Check: Checking video background readiness');
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      
      const handleVideoReady = () => {
        console.log('✅ Display Check: Video background loaded successfully');
        setOpponentDisplayReady(true);
        setOpponentDisplayLoading(false);
        video.removeEventListener('loadeddata', handleVideoReady);
        video.removeEventListener('error', handleVideoError);
      };
      
      const handleVideoError = () => {
        console.log('⚠️ Display Check: Video background failed to load, proceeding anyway');
        setOpponentDisplayReady(true);
        setOpponentDisplayLoading(false);
        video.removeEventListener('loadeddata', handleVideoReady);
        video.removeEventListener('error', handleVideoError);
      };
      
      video.addEventListener('loadeddata', handleVideoReady);
      video.addEventListener('error', handleVideoError);
      video.src = opponentBgPath;
      
      // Timeout fallback after 2 seconds (reduced from 5)
      setTimeout(() => {
        if (!opponentDisplayReady) {
          console.log('⏰ Display Check: Video loading timeout, proceeding anyway');
          setOpponentDisplayReady(true);
          setOpponentDisplayLoading(false);
        }
      }, 2000);
      
    } else {
      console.log('🖼️ Display Check: Checking image background readiness');
      const img = new Image();
      
      const handleImageReady = () => {
        console.log('✅ Display Check: Image background loaded successfully');
        setOpponentDisplayReady(true);
        setOpponentDisplayLoading(false);
        img.removeEventListener('load', handleImageReady);
        img.removeEventListener('error', handleImageError);
      };
      
      const handleImageError = () => {
        console.log('⚠️ Display Check: Image background failed to load, proceeding anyway');
        setOpponentDisplayReady(true);
        setOpponentDisplayLoading(false);
        img.removeEventListener('load', handleImageReady);
        img.removeEventListener('error', handleImageError);
      };
      
      img.addEventListener('load', handleImageReady);
      img.addEventListener('error', handleImageError);
      img.src = opponentBgPath;
      
      // Timeout fallback after 2 seconds (reduced from 5)
      setTimeout(() => {
        if (!opponentDisplayReady) {
          console.log('⏰ Display Check: Image loading timeout, proceeding anyway');
          setOpponentDisplayReady(true);
          setOpponentDisplayLoading(false);
        }
      }, 2000);
    }

    return false; // Not ready yet, will be set to true via callbacks
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
        // Optimistic room status updated
        
        // Check if we have a real room ID and should transition
        if (optimisticRoom.realRoomId && optimisticRoom.status === 'transitioning') {
          // Real room ready, transitioning
          
          // The parent component (DashboardSection) will handle the navigation update
          // We just need to update our local state to show the transition
          setSearchingText('Connected! Loading match...');
        }
      }
    }, 500); // Check every 500ms for smooth updates

    return () => clearInterval(interval);
  }, [isOptimistic, roomId]);

  // 🎯 NEW: Go Backend Match Status Polling
  useEffect(() => {
    // Check if this is a Go backend room by looking at bridge data
    if (!roomId) return;
    
    const bridgeData = OptimisticMatchmakingService.getBridgeRoomData(roomId);
    if (!bridgeData?.isGoBackendRoom) {
      return;
    }

    // Starting Go backend match status polling

    // Start extended waiting period for real players first (15 seconds)
    // Only start bot countdown if no real players join
    // Start extended waiting period for real players first (15 seconds)
    // Only start bot countdown if no real players join
    startRealPlayerWaitingPeriod(roomId);

    const pollInterval = setInterval(async () => {
      try {
        // Import DashDiceAPI to check match status
        const { default: DashDiceAPI } = await import('@/services/apiClientNew');
        
        // Get specific match details
        const response = await DashDiceAPI.listMatches({ 
          status: 'ready',
          limit: 10 
        });

        if (response.success && response.data?.matches) {
          // Look for our match by ID - Go backend returns different format than TypeScript Match interface
          const ourMatch = response.data.matches.find((match: any) => match.matchId === roomId) as any;
          
          // Handle Go backend's "ready" status (not in TypeScript Match interface)
          if (ourMatch && ourMatch.status === 'ready' && ourMatch.players?.length >= 2) {
            console.log('🎉 GameWaitingRoom: Go backend match is ready!', ourMatch);
            
            // 🤖 Cancel bot countdown since match is already ready
            cancelBotCountdown();
            
            // Clear polling
            clearInterval(pollInterval);
            
            // Start countdown and transition to match
            setOpponentJoined(true);
            
            // 🔥 CREATE FIREBASE MATCH for compatibility with existing Match component
            try {
              const bridgeData = OptimisticMatchmakingService.getBridgeRoomData(roomId);
              const userProfile = await UserService.getUserProfile(user!.uid);
              
              // Get opponent player data (second player in Go backend match)
              const opponentPlayerId = ourMatch.players.find((p: string) => p !== user!.uid);
              let opponentProfile = null;
              
              if (opponentPlayerId) {
                // First try to get as a regular user
                opponentProfile = await UserService.getUserProfile(opponentPlayerId);
                
                // If not found, it might be a bot - try the bots collection
                if (!opponentProfile && opponentPlayerId.includes('bot')) {
                  try {
                    const { doc, getDoc } = await import('firebase/firestore');
                    const { db } = await import('@/services/firebase');
                    const botDoc = await getDoc(doc(db, 'bots', opponentPlayerId));
                    
                    if (botDoc.exists()) {
                      const botData = botDoc.data();
                      opponentProfile = {
                        uid: opponentPlayerId,
                        displayName: botData.displayName,
                        stats: botData.stats,
                        inventory: botData.inventory
                      };
                      // Found bot opponent profile
                    }
                  } catch (botError) {
                    console.warn('⚠️ Failed to fetch bot profile:', botError);
                  }
                }
              }
              
              if (opponentProfile && bridgeData && userProfile) {
                // Creating Firebase match from Go backend match
                // Opponent profile details processed
                
                // 🎯 STORE OPPONENT DATA for immediate UI display
                const opponentDisplayData = {
                  playerId: opponentPlayerId,
                  playerDisplayName: opponentProfile?.displayName || 'Player 2',
                  playerStats: opponentProfile?.stats || {},
                  displayBackgroundEquipped: opponentProfile?.inventory?.displayBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
                  matchBackgroundEquipped: opponentProfile?.inventory?.matchBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
                };
                setGoBackendOpponentData(opponentDisplayData);
                // Stored Go backend opponent data
                
                // Cancel bot countdown since a real player joined
                if (!opponentPlayerId.startsWith('bot_')) {
                  cancelBotCountdown();
                }
                
                // Set opponent joined state and start countdown if not already started
                if (!opponentJoined) {
                  setOpponentJoined(true);
                  if (vsCountdown === null) {
                    // Starting countdown for Go backend match (with readiness check)
                    startVsCountdownWhenReady();
                  }
                }
                
                // Continue with Firebase match creation...
              } else {
                console.warn('⚠️ GameWaitingRoom: Missing data for Firebase match creation:', {
                  opponentProfile: !!opponentProfile,
                  bridgeData: !!bridgeData,
                  userProfile: !!userProfile,
                  opponentPlayerId
                });
                
                // Even if opponent profile is missing, still try to create a basic Firebase match
                if (bridgeData && userProfile) {
                  // Creating fallback Firebase match
                  const fallbackOpponentData = {
                    playerId: opponentPlayerId,
                    playerDisplayName: goBackendOpponentData?.playerDisplayName || (opponentPlayerId.includes('bot') ? 'AI Player' : 'Player 2'),
                    playerStats: goBackendOpponentData?.playerStats || { gamesPlayed: 0, matchWins: 0, bestStreak: 0, currentStreak: 0 },
                    displayBackgroundEquipped: goBackendOpponentData?.displayBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
                    matchBackgroundEquipped: goBackendOpponentData?.matchBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
                  };
                  setGoBackendOpponentData(fallbackOpponentData);
                }
              }
              
              // Create Firebase match regardless (with fallback data if needed)
              if (bridgeData && userProfile) {
                
                // 🎯 FIXED: Use proper game mode initialization with inline logic
                const actualGameMode = ourMatch.gameMode || gameMode;
                
                // Get round objective based on game mode
                const getRoundObjective = (mode: string): number => {
                  switch (mode.toLowerCase()) {
                    case 'quickfire': return 50;
                    case 'classic': return 100;
                    case 'zero-hour':
                    case 'zerohour': return 0;    // Zero Hour targets 0
                    case 'last-line':
                    case 'lastline': return 0;   // Last Line targets 0 (opponent elimination)
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
                    case 'lastline': return 50;  // Last Line starts at 50 (tug-of-war)
                    case 'true-grit':
                    case 'truegrit': return 0;   // True Grit starts at 0
                    default: return 0;
                  }
                };
                
                const roundObjective = getRoundObjective(actualGameMode);
                const startingScore = getStartingScore(actualGameMode);
                
                // Using proper game mode settings
                
                // 🔮 Load power loadouts for both players
                console.log('🔮 Loading power loadouts for Go backend match...');
                let hostPowerLoadout = null;
                let opponentPowerLoadout = null;
                
                try {
                  // Map gameMode to the correct key format for UserPowerLoadouts
                  let gameModeKey: any = actualGameMode;
                  if (actualGameMode === 'quickfire') {
                    gameModeKey = 'quick-fire';
                  }
                  
                  // Load host power loadout
                  hostPowerLoadout = await UserService.getPowerLoadoutForGameMode(user!.uid, gameModeKey);
                  console.log('🔮 Host power loadout loaded:', hostPowerLoadout);
                  
                  // 🔍 ENHANCED DEBUG: Check for siphon specifically
                  if (hostPowerLoadout && Object.values(hostPowerLoadout).includes('siphon')) {
                    console.log('🧛 MATCH CREATION SIPHON DEBUG: Siphon found in host loadout!', {
                      gameModeKey,
                      hostPowerLoadout,
                      siphonCategory: Object.entries(hostPowerLoadout).find(([_, abilityId]) => abilityId === 'siphon')?.[0]
                    });
                  } else {
                    console.log('❌ MATCH CREATION SIPHON DEBUG: Siphon NOT in host loadout', { gameModeKey, hostPowerLoadout });
                  }
                  
                  // Load opponent power loadout (only for real users, not bots)
                  if (opponentPlayerId && !opponentPlayerId.includes('bot')) {
                    opponentPowerLoadout = await UserService.getPowerLoadoutForGameMode(opponentPlayerId, gameModeKey);
                    console.log('🔮 Opponent power loadout loaded:', opponentPowerLoadout);
                  }
                } catch (error) {
                  console.error('❌ Error loading power loadouts:', error);
                }

                const matchData = {
                  originalRoomId: roomId,
                  gameMode: actualGameMode,
                  gameType: bridgeData.gameType || 'quick',
                  status: 'active',
                  createdAt: serverTimestamp(),
                  startedAt: serverTimestamp(),
                  authorizedPlayers: [user!.uid, opponentPlayerId],
                  
                  hostData: {
                    playerId: user!.uid,
                    playerDisplayName: userProfile.displayName || 'Player 1',
                    playerStats: userProfile.stats || { gamesPlayed: 0, matchWins: 0, bestStreak: 0, currentStreak: 0 },
                    displayBackgroundEquipped: userProfile.inventory?.displayBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
                    matchBackgroundEquipped: userProfile.inventory?.matchBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
                    playerScore: startingScore, // Use proper starting score
                    turnActive: false, // Will be set by turn decider
                    powerLoadout: hostPowerLoadout // Add power loadout for abilities
                  },
                  
                  opponentData: {
                    playerId: opponentPlayerId,
                    playerDisplayName: goBackendOpponentData?.playerDisplayName || opponentProfile?.displayName || (opponentPlayerId.includes('bot') ? 'AI Player' : 'Player 2'),
                    playerStats: goBackendOpponentData?.playerStats || opponentProfile?.stats || { gamesPlayed: 0, matchWins: 0, bestStreak: 0, currentStreak: 0 },
                    displayBackgroundEquipped: goBackendOpponentData?.displayBackgroundEquipped || opponentProfile?.inventory?.displayBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
                    matchBackgroundEquipped: goBackendOpponentData?.matchBackgroundEquipped || opponentProfile?.inventory?.matchBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
                    playerScore: startingScore, // Use proper starting score
                    turnActive: false, // Will be set by turn decider
                    powerLoadout: opponentPowerLoadout // Add power loadout for abilities
                  },
                  
                  gameData: {
                    type: actualGameMode,
                    gamePhase: 'turnDecider',
                    turnDecider: 1, // Host decides
                    chooserPlayerIndex: 1, // Host chooses first (required for TurnDeciderPhase)
                    turnScore: 0,
                    diceOne: 0,
                    diceTwo: 0,
                    roundObjective: roundObjective, // Use proper objective
                    startingScore: startingScore, // Use proper starting score
                    isRolling: false,
                    // Add power loadouts for easy access during gameplay
                    powerLoadouts: {
                      [user!.uid]: hostPowerLoadout,
                      [opponentPlayerId]: opponentPowerLoadout
                    }
                  }
                };
                
                // Create Firebase match document with same ID as Go backend match
                // Creating Firebase match with data
                
                await import('firebase/firestore').then(({ doc, setDoc }) => {
                  return setDoc(doc(db, 'matches', roomId), matchData);
                });
                
                // Firebase match created successfully
                
                // Verify the match was created by reading it back
                const verifyMatch = await import('firebase/firestore').then(async ({ doc, getDoc }) => {
                  const matchDoc = await getDoc(doc(db, 'matches', roomId));
                  return matchDoc.exists();
                });
                
                if (verifyMatch) {
                  // Firebase match creation verified
                } else {
                  console.error('❌ GameWaitingRoom: Firebase match verification failed');
                }
                
                // 🎯 UPDATE WAITING ROOM ENTRY with opponent data for immediate UI display
                if (waitingRoomEntry) {
                  const updatedWaitingRoom = {
                    ...waitingRoomEntry,
                    opponentData: {
                      playerId: opponentPlayerId,
                      playerDisplayName: opponentProfile?.displayName || 'Player 2',
                      playerStats: opponentProfile?.stats || {},
                      displayBackgroundEquipped: opponentProfile?.inventory?.displayBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
                      matchBackgroundEquipped: opponentProfile?.inventory?.matchBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
                    }
                  };
                  setWaitingRoomEntry(updatedWaitingRoom);
                  console.log('🎮 GameWaitingRoom: Updated waiting room with opponent data');
                }
              }
            } catch (error) {
              console.error('❌ GameWaitingRoom: Failed to create Firebase match:', error);
              // Continue anyway - the Go backend match still exists
            }
            
            // Start vs countdown instead of direct navigation (with readiness check)
            startVsCountdownWhenReady();
            
            return;
          }
        }
      } catch (error) {
        console.warn('⚠️ GameWaitingRoom: Go backend polling error:', error);
        // Don't clear interval on error, keep polling
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup polling on unmount
    return () => {
      console.log('🛑 GameWaitingRoom: Stopping Go backend polling');
      clearInterval(pollInterval);
    };
  }, [roomId, gameMode, setCurrentSection]);

  // Monitor opponent data changes and check display readiness
  useEffect(() => {
    const opponentData = getOpponentData();
    
    if (opponentData && !opponentDisplayReady && !opponentDisplayLoading) {
      console.log('🔍 New opponent data detected, checking display readiness');
      checkOpponentDisplayReady(opponentData);
    } else if (!opponentData) {
      // Reset states when opponent leaves
      setOpponentDisplayReady(false);
      setOpponentDisplayLoading(false);
      setReadyToStartCountdown(false);
    }
  }, [waitingRoomEntry?.opponentData, goBackendOpponentData, opponentDisplayReady, opponentDisplayLoading]);

  // Monitor overall readiness to start countdown
  useEffect(() => {
    const opponentData = getOpponentData();
    const shouldBeReady = opponentData && opponentDisplayReady && !vsCountdown;
    
    if (shouldBeReady && !readyToStartCountdown) {
      console.log('✅ All conditions met, ready to start countdown');
      setReadyToStartCountdown(true);
    } else if (!shouldBeReady && readyToStartCountdown) {
      console.log('⏸️ Conditions no longer met, not ready for countdown');
      setReadyToStartCountdown(false);
    }
  }, [opponentDisplayReady, vsCountdown, waitingRoomEntry?.opponentData, goBackendOpponentData, readyToStartCountdown]);

  // Start countdown automatically when ready
  useEffect(() => {
    if (readyToStartCountdown && vsCountdown === null) {
      console.log('🚀 Auto-starting countdown now that opponent display is ready');
      startVsCountdown();
    }
  }, [readyToStartCountdown, vsCountdown]);

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

        // STEP 0: Clean up any existing matches for this user to prevent conflicts
        console.log('🧹 Cleaning up existing matches before creating new one...');
        try {
          const cleanedCount = await MatchLifecycleService.cleanupUserMatches(user.uid, 'new_match_created');
          if (cleanedCount > 0) {
            console.log(`✅ Cleaned up ${cleanedCount} existing matches for user`);
          }
        } catch (cleanupError) {
          console.error('⚠️ Error during match cleanup (continuing anyway):', cleanupError);
          // Continue with match creation even if cleanup fails
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
            
            // Optimistic room loaded successfully
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
                startVsCountdownWhenReady();
              }
            }
            
            // Check for opponent
            if (bridgeRoomData.opponentData && !opponentJoined) {
              console.log('🎯 GameWaitingRoom: Opponent detected in bridge data');
              setOpponentJoined(true);
              
              // 🤖 Check if opponent is a bot
              const isBot = bridgeRoomData.opponentData.playerId?.startsWith('bot_');
              if (isBot) {
                console.log('🤖 Bot opponent detected in bridge data:', bridgeRoomData.opponentData.playerDisplayName);
                setBotOpponent(bridgeRoomData.opponentData);
                setBotFallbackActive(false);
                setBotCountdown(null);
              } else {
                cancelBotCountdown();
              }
              
              // Only auto-start countdown for non-friend invitations
              if (!bridgeRoomData.friendInvitation && vsCountdown === null) {
                console.log('🚀 GameWaitingRoom: Starting countdown for matched players');
                startVsCountdownWhenReady();
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
                    startVsCountdownWhenReady();
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
                    startVsCountdownWhenReady();
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
                  
                  // Successfully using bridge data instead of database lookup
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
                      
                      console.log('✅ GameWaitingRoom: Found existing match by originalRoomId, starting countdown...');
                      // Store match data for navigation after countdown
                      setPendingMatchData({
                        gameMode: matchData.gameMode || gameMode,
                        matchId: existingMatch.id,
                        roomId: existingMatch.id
                      });
                      startVsCountdownWhenReady();
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
                      console.log('✅ GameWaitingRoom: Found recent match by player ID, starting countdown...');
                      // Store match data for navigation after countdown
                      setPendingMatchData({
                        gameMode: matchData.gameMode || gameMode,
                        matchId: recentMatch.id,
                        roomId: recentMatch.id
                      });
                      startVsCountdownWhenReady();
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
                  
                  // 🤖 Check if opponent is a bot
                  const isBot = data.opponentData.playerId?.startsWith('bot_');
                  if (isBot) {
                    console.log('🤖 Bot opponent joined:', data.opponentData.playerDisplayName);
                    setBotOpponent(data.opponentData);
                    setBotFallbackActive(false);
                    setBotCountdown(null);
                  } else {
                    console.log('👤 Real player joined:', data.opponentData.playerDisplayName);
                    cancelBotCountdown();
                  }
                  
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
          
          // Track matchmaking start analytics
          analyticsService.trackMatchmakingStart(gameMode, gameType || 'quick');
          
          // Start extended waiting period for real players first (15 seconds)
          // Only start bot countdown if no real players join
          if (actionType === 'live' && !entry.friendInvitation) {
            startRealPlayerWaitingPeriod(gameId);
          }
          
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
                
                // 🤖 Check if opponent is a bot
                const isBot = data.opponentData.playerId?.startsWith('bot_');
                if (isBot) {
                  console.log('🤖 Bot opponent joined:', data.opponentData.playerDisplayName);
                  setBotOpponent(data.opponentData);
                  setBotFallbackActive(false);
                  setBotCountdown(null);
                  
                  // Track bot match found
                  analyticsService.trackMatchFound(gameMode, 'bot', Date.now() - new Date().getTime());
                } else {
                  console.log('👤 Real player joined:', data.opponentData.playerDisplayName);
                  cancelBotCountdown();
                  
                  // Track human match found
                  analyticsService.trackMatchFound(gameMode, 'human', Date.now() - new Date().getTime());
                }
                
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

  // Monitor for game start - check if match with status 'active' exists
  useEffect(() => {
    if (!roomId || gameHasStarted) return;

    const checkForActiveMatch = async () => {
      try {
        const matchDoc = await getDoc(doc(db, 'matches', roomId));
        if (matchDoc.exists()) {
          const matchData = matchDoc.data();
          if (matchData.status === 'active') {
            console.log('🎮 Game has started - enabling abandonment detection');
            setGameHasStarted(true);
          }
        }
      } catch (error) {
        console.error('Error checking for active match:', error);
      }
    };

    // Check immediately
    checkForActiveMatch();

    // Set up listener for match creation/updates
    const unsubscribe = onSnapshot(
      doc(db, 'matches', roomId),
      (doc) => {
        if (doc.exists()) {
          const matchData = doc.data();
          if (matchData.status === 'active' && !gameHasStarted) {
            console.log('🎮 Game has started - enabling abandonment detection');
            setGameHasStarted(true);
          }
        }
      },
      (error) => {
        console.error('Error listening to match updates:', error);
      }
    );

    return () => unsubscribe();
  }, [roomId, gameHasStarted]);

  // Abandonment detection - monitor when opponent leaves (ONLY after game starts)
  useEffect(() => {
    if (!waitingRoomEntry || !opponentJoined || !gameHasStarted) return;

    // Update last seen time when opponent is present
    if (waitingRoomEntry.opponentData || goBackendOpponentData) {
      setOpponentLastSeen(new Date());
      
      // Clear any existing abandonment notification if opponent is back
      if (showAbandonmentNotification) {
        setShowAbandonmentNotification(false);
        setAbandonmentTimer(null);
      }
      return;
    }

    // Opponent data is missing - start abandonment timer if not already started
    if (!abandonmentTimer && opponentLastSeen) {
      const checkInterval = setInterval(() => {
        const now = new Date();
        const timeSinceLastSeen = now.getTime() - (opponentLastSeen?.getTime() || 0);
        
        // Show notification after 15 seconds
        if (timeSinceLastSeen >= 15000) {
          setShowAbandonmentNotification(true);
          setAbandonmentTimer(null);
          clearInterval(checkInterval);
        }
      }, 1000);
      
      setAbandonmentTimer(checkInterval);
    }

    return () => {
      if (abandonmentTimer) {
        clearInterval(abandonmentTimer);
        setAbandonmentTimer(null);
      }
    };
  }, [waitingRoomEntry, goBackendOpponentData, opponentJoined, opponentLastSeen, abandonmentTimer, showAbandonmentNotification, gameHasStarted]);

  // Safe function to start countdown only after opponent display is ready
  const startVsCountdownWhenReady = () => {
    const opponentData = getOpponentData();
    
    if (!opponentData) {
      console.log('🔍 Cannot start countdown: No opponent data available');
      return;
    }

    if (vsCountdown !== null) {
      console.log('🔍 Cannot start countdown: Countdown already in progress');
      return;
    }

    if (opponentDisplayLoading) {
      console.log('🔍 Cannot start countdown: Opponent display still loading, will start when ready');
      return;
    }

    if (!opponentDisplayReady) {
      console.log('🔍 Starting opponent display check before countdown');
      checkOpponentDisplayReady(opponentData);
      return;
    }

    console.log('✅ All checks passed, starting countdown now');
    startVsCountdown();
  };

  // Function to start 5-second countdown for VS section
  const startVsCountdown = () => {
    console.log('🕐 Starting VS countdown...');
    
    // Clear any existing timer to prevent multiple countdowns
    if (vsCountdownTimer) {
      clearInterval(vsCountdownTimer);
      setVsCountdownTimer(null);
    }
    
    setVsCountdown(3);
    const timer = setInterval(() => {
      setVsCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setVsCountdownTimer(null);
          console.log('🏁 Countdown finished! Starting match...');
          
          // Wait 1 second after showing "GO!" then navigate directly to match
          setTimeout(() => {
            moveToMatchesAndNavigate();
          }, 1000); // Wait 1 second after showing "GO!" before match loads
          return 0; // Show "GO!"
        }
        return prev - 1;
      });
    }, 1000); // Exactly 1 second intervals
    
    setVsCountdownTimer(timer);
  };

  // � Function to cancel bot countdown when real player joins
  const cancelBotCountdown = () => {
    if (botCountdownTimer) {
      console.log('🚫 Real player joined! Canceling bot countdown.');
      clearInterval(botCountdownTimer);
      clearTimeout(botCountdownTimer); // Handle both interval and timeout
      setBotCountdownTimer(null);
      setBotFallbackActive(false);
      setBotCountdown(null);
    }
  };

  // �🔍 Function to start real player waiting period before allowing bots
  const startRealPlayerWaitingPeriod = (sessionId: string) => {
    console.log('⏳ Starting real player waiting period (3 seconds) before considering bots...');
    
    // Clear any existing timer
    if (botCountdownTimer) {
      clearInterval(botCountdownTimer);
      setBotCountdownTimer(null);
    }
    
    // Set a 3-second waiting period for real players
    const realPlayerWaitTimer = setTimeout(() => {
      console.log('⏳ Real player waiting period finished. Checking if opponent joined...');
      
      // Only start bot countdown if no real opponent has joined
      const currentWaitingRoom = waitingRoomEntry;
      const hasRealOpponent = currentWaitingRoom?.opponentData?.playerId && 
                             !currentWaitingRoom.opponentData.playerId.startsWith('bot_');
      
      if (!hasRealOpponent) {
        console.log('🤖 No real players joined in 3 seconds. Starting bot fallback...');
        startBotCountdown(sessionId);
      } else {
        console.log('✅ Real player joined! Canceling bot fallback.');
      }
    }, 3000); // 3 seconds for real players
    
    // Store timer reference for cleanup
    setBotCountdownTimer(realPlayerWaitTimer);
  };

  // 🤖 Function to start bot fallback countdown (immediate)
  const startBotCountdown = (sessionId: string) => {
    console.log('🤖 Starting bot fallback countdown (immediate)...');
    
    // Clear any existing timer to prevent multiple countdowns
    if (botCountdownTimer) {
      clearInterval(botCountdownTimer);
      setBotCountdownTimer(null);
    }
    
    setBotFallbackActive(true);
    setBotCountdown(1);
    
    const timer = setInterval(() => {
      setBotCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setBotCountdownTimer(null);
          console.log('🤖 Bot countdown finished! Attempting bot match...');
          
          // Trigger bot matching
          setTimeout(() => {
            attemptBotMatch(sessionId);
          }, 500);
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000); // Exactly 1 second intervals
    
    setBotCountdownTimer(timer);
  };

  // 🤖 Function to attempt bot matching
  const attemptBotMatch = async (sessionId: string) => {
    try {
      console.log('🤖 Attempting to add bot to session:', sessionId);
      console.log('🔐 Current user auth state:', user ? 'Authenticated' : 'Not authenticated');
      
      // CRITICAL: Check if a real player has already joined
      // Don't add bots if real players are available or already connected
      const currentWaitingRoom = waitingRoomEntry;
      if (currentWaitingRoom?.opponentData?.playerId && 
          !currentWaitingRoom.opponentData.playerId.startsWith('bot_')) {
        console.log('🚫 Real player already joined! Canceling bot addition.');
        setBotFallbackActive(false);
        return;
      }
      
      // Check for other waiting players in the queue who might join
      const isGoBackendMatchCheck = sessionId.startsWith('match_') || sessionId.startsWith('match-');
      if (!isGoBackendMatchCheck) {
        // For Firebase matches, check if there are other real players waiting
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/services/firebase');
        
        const waitingPlayersQuery = query(
          collection(db, 'waitingroom'),
          where('gameMode', '==', currentWaitingRoom?.gameMode || 'classic'),
          where('playersRequired', '==', 1)
        );
        
        const waitingPlayersSnapshot = await getDocs(waitingPlayersQuery);
        const otherWaitingPlayers = waitingPlayersSnapshot.docs.filter(doc => 
          doc.id !== sessionId && 
          doc.data().hostData?.playerId !== user?.uid &&
          !doc.data().hostData?.playerId?.startsWith('bot_')
        );
        
        if (otherWaitingPlayers.length > 0) {
          console.log('🚫 Other real players are waiting! Canceling bot addition to prioritize real player matching.');
          setBotFallbackActive(false);
          return;
        }
      }
      
      setBotFallbackActive(false);
      
      // Determine if this is a Go backend match or Firebase match
      const isGoBackendMatchType = sessionId.startsWith('match_') || sessionId.startsWith('match-');
      console.log('🔍 Match type detected:', isGoBackendMatchType ? 'Go Backend' : 'Firebase');
      
      if (isGoBackendMatchType) {
        // Handle Go backend match - get actual game mode from bridge data
        const bridgeData = OptimisticMatchmakingService.getBridgeRoomData(sessionId);
        const gameMode = bridgeData?.gameMode || 'classic'; // Use actual game mode from bridge data
        console.log('🎯 Using game mode from Go backend:', gameMode);
        
        const sessionType = 'quick' as 'quick' | 'ranked';
        
        const criteria = {
          gameMode,
          sessionType,
          userSkillLevel: 1200,
          preferredDifficulty: 'medium' as 'easy' | 'medium' | 'hard' | 'adaptive',
          excludeBotIds: []
        };
        
        console.log('🔍 Finding suitable bot for Go backend match...');
        let botResult = await BotMatchingService.findSuitableBot(criteria);
        
        // If no bots found for specific game mode, try with 'classic' as fallback
        if (!botResult.success && gameMode !== 'classic') {
          console.log('🔄 No bots found for', gameMode, '- trying with classic mode as fallback');
          const fallbackCriteria = { ...criteria, gameMode: 'classic' };
          botResult = await BotMatchingService.findSuitableBot(fallbackCriteria);
        }
        
        // If still no bots found, try to get any available bot (emergency fallback)
        if (!botResult.success) {
          console.log('🚨 Emergency fallback: Getting any available bot...');
          try {
            const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
            const { db } = await import('@/services/firebase');
            
            const anyBotQuery = query(
              collection(db, 'bots'),
              where('isActive', '==', true),
              where('isBot', '==', true),
              limit(1)
            );
            
            const snapshot = await getDocs(anyBotQuery);
            if (!snapshot.empty) {
              const botData = snapshot.docs[0].data();
              botResult = {
                success: true,
                bot: { ...botData, uid: snapshot.docs[0].id } as any,
                matchingReason: 'emergency fallback'
              };
              console.log('🎯 Emergency bot selected:', botData.displayName);
            }
          } catch (error) {
            console.error('❌ Emergency bot selection failed:', error);
          }
        }
        
        if (botResult.success && botResult.bot) {
          console.log('🎯 Selected bot for Go backend:', botResult.bot.displayName);
          
          try {
            // Actually add the bot to the Go backend match
            console.log('🔗 About to call BotMatchingService.addBotToSession for Go backend');
            await BotMatchingService.addBotToSession(sessionId, botResult.bot);
            console.log('✅ Successfully added bot to Go backend match');
            
            // Set bot opponent data for UI display
            const botOpponentData = {
              playerDisplayName: botResult.bot.displayName,
              playerId: botResult.bot.uid,
              displayBackgroundEquipped: botResult.bot.inventory?.displayBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
              matchBackgroundEquipped: botResult.bot.inventory?.matchBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
              playerStats: {
                bestStreak: botResult.bot.stats?.bestStreak || 0,
                currentStreak: botResult.bot.stats?.currentStreak || 0,
                gamesPlayed: botResult.bot.stats?.gamesPlayed || 0,
                matchWins: botResult.bot.stats?.matchWins || 0
              }
            };
            
            console.log('🤖 Setting bot opponent data in UI:', botOpponentData);
            setGoBackendOpponentData(botOpponentData);
            setBotOpponent(botResult.bot);
          } catch (addBotError) {
            console.error('❌ Failed to add bot to Go backend match:', addBotError);
            setSearchingText('Failed to add AI opponent.');
          }
        } else {
          console.error('❌ No suitable bot found for Go backend match');
          setSearchingText('No AI opponents available.');
        }
      } else {
        // Handle Firebase match - use original BotMatchingService approach
        const gameMode = waitingRoomEntry?.gameMode || 'classic';
        const sessionType = waitingRoomEntry?.rankedGame ? 'ranked' : 'quick';
        
        BotMatchingService.setupBotFallback(
          sessionId,
          user!.uid,
          gameMode,
          sessionType
        );
      }
      
    } catch (error) {
      console.error('❌ Failed to setup bot match:', error);
      setBotFallbackActive(false);
      setBotCountdown(null);
    }
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
      // Use pending match data if available (from countdown sequence)
      if (pendingMatchData) {
        console.log('🎮 GameWaitingRoom: Using pending match data for navigation');
        // Track game start analytics
        analyticsService.trackGameStart(pendingMatchData.gameMode, 'pending_match');
        setCurrentSection('match', pendingMatchData);
        setPendingMatchData(null); // Clear pending data
        return;
      }
      
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
          case 'lastline': return 0;   // Last Line targets 0 (opponent elimination)
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
          case 'lastline': return 50;  // Last Line starts at 50 (tug-of-war)
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
        authorizedPlayers: (() => {
          const opponentData = getOpponentData();
          return [
            roomData.hostData?.playerId,
            opponentData?.playerId
          ].filter(Boolean); // Remove any null/undefined values
        })(),
        
        // Initialize host data with game-specific fields
        hostData: {
          ...roomData.hostData,
          turnActive: false, // Will be set by turn decider
          playerScore: getStartingScore(roomData.gameMode),
          roundScore: 0,
          // Include power loadout for abilities
          powerLoadout: (roomData.hostData as any)?.powerLoadout || null
        },
        
        // Initialize opponent data with game-specific fields
        opponentData: (() => {
          const opponentData = getOpponentData();
          console.log('🔍 DEBUG: Retrieved opponent data for match creation:', {
            opponentData,
            hasOpponentData: !!opponentData,
            opponentPlayerId: opponentData?.playerId,
            opponentDisplayName: opponentData?.playerDisplayName,
            fromWaitingRoom: !!roomData.opponentData,
            fromGoBackend: !!goBackendOpponentData
          });
          if (!opponentData) {
            console.error('❌ GameWaitingRoom: No opponent data available for match creation');
            return undefined;
          }
          return {
            ...opponentData,
            turnActive: false, // Will be set by turn decider
            playerScore: getStartingScore(roomData.gameMode),
            roundScore: 0,
            // Include power loadout for abilities
            powerLoadout: (opponentData as any)?.powerLoadout || null
          };
        })(),
        
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
          isRolling: false,
          // Add power loadouts for easy access during gameplay
          powerLoadouts: (() => {
            const loadouts: Record<string, any> = {};
            const opponentData = getOpponentData();
            if (roomData.hostData?.playerId) {
              loadouts[roomData.hostData.playerId] = (roomData.hostData as any)?.powerLoadout || null;
            }
            if (opponentData?.playerId) {
              loadouts[opponentData.playerId] = (opponentData as any)?.powerLoadout || null;
            }
            return loadouts;
          })()
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
      
      // Track game start analytics
      analyticsService.trackGameStart(roomData.gameMode, 'matchmaking');
      
      setCurrentSection('match', {
        gameMode: roomData.gameMode,
        matchId: matchDocRef.id
      });
      console.log('✅ GameWaitingRoom: Navigation called successfully!');
      console.log('🔍 DEBUG: Navigation completed - should now be in match section');
      console.log('🔍 DEBUG: Match document ID passed to navigation:', matchDocRef.id);
      
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
            chooserPlayerIndex: 1, // Host chooses first (required for TurnDeciderPhase)
            turnScore: 0,
            diceOne: 0,
            diceTwo: 0,
            status: 'active',
            gamePhase: 'turnDecider' as const,
            isRolling: false
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

  // Handle claiming victory when opponent abandons
  const handleClaimVictory = async () => {
    if (!user?.uid || !waitingRoomEntry) return;
    
    try {
      console.log('🏆 Claiming victory due to opponent abandonment');
      
      // Update current user's stats (win)
      await UserService.updateMatchWin(user.uid);
      console.log('✅ Updated claiming player stats with victory');
      
      // Update opponent's stats (loss) if we have their ID
      const opponentId = waitingRoomEntry.hostData?.playerId === user.uid 
        ? waitingRoomEntry.opponentData?.playerId 
        : waitingRoomEntry.hostData?.playerId;
        
      if (opponentId) {
        await UserService.updateMatchLoss(opponentId);
        console.log('✅ Updated opponent stats with loss');
      }
      
      // Clean up waiting room
      if (waitingRoomEntry.id) {
        await deleteDoc(doc(db, 'waitingroom', waitingRoomEntry.id));
        console.log('✅ Cleaned up waiting room');
      }
      
      setShowAbandonmentNotification(false);
      onBack();
    } catch (error) {
      console.error('❌ Error claiming victory:', error);
    }
  };

  // Handle waiting for opponent to return
  const handleWaitForOpponent = () => {
    console.log('⏰ Continuing to wait for opponent');
    setShowAbandonmentNotification(false);
    // Reset the abandonment detection timer
    setOpponentLastSeen(new Date());
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
          webkit-playsinline="true"
          x5-playsinline="true"
          controls={false}
          preload="metadata"
          disablePictureInPicture
          disableRemotePlayback
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
            zIndex: 0,
            pointerEvents: 'none',
            outline: 'none'
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
    return null; // Don't show loading text, let the game waiting room appear with animation
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
    <motion.div 
      className="waiting-room-container" 
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        mass: 0.8
      }}
      style={{ 
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
      {/* Match Transition Animation */}
      {showMatchTransition && transitionMatchData && (
        <MatchTransition
          hostData={transitionMatchData.hostData}
          opponentData={transitionMatchData.opponentData}
          gameMode={transitionMatchData.gameMode}
          onTransitionComplete={handleTransitionComplete}
          isVisible={showMatchTransition}
        />
      )}

      {/* Match Abandonment Notification */}
      {showAbandonmentNotification && (
        <MatchAbandonmentNotification
          onClaim={handleClaimVictory}
          onWait={handleWaitForOpponent}
          opponentName={getOpponentData()?.playerDisplayName}
        />
      )}
      
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

        /* Mobile-specific subtle glow effects */
        @media (max-width: 768px) {
          @keyframes subtleGlow {
            0% { 
              transform: scale(1);
              filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.1));
              opacity: 0.95;
            }
            50% { 
              transform: scale(1.02);
              filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.2));
              opacity: 1;
            }
            100% { 
              transform: scale(1);
              filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.1));
              opacity: 0.95;
            }
          }
          
          @keyframes goGlow {
            0% { 
              transform: scale(1);
              filter: drop-shadow(0 0 5px rgba(0, 255, 0, 0.3));
            }
            50% { 
              transform: scale(1.03);
              filter: drop-shadow(0 0 8px rgba(0, 255, 0, 0.4));
            }
            100% { 
              transform: scale(1);
              filter: drop-shadow(0 0 5px rgba(0, 255, 0, 0.3));
            }
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
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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
              {(() => {
                // Determine the game type display based on various flags
                if (waitingRoomEntry?.friendInvitation) {
                  return (
                    <>
                      👥 Private Match
                    </>
                  );
                } else if (waitingRoomEntry?.gameType === 'Private Rematch') {
                  return (
                    <>
                      🔄 Rematch
                    </>
                  );
                } else if (gameType === 'ranked') {
                  return (
                    <>
                      🏆 Ranked Match
                    </>
                  );
                } else {
                  return (
                    <>
                      ⚡ Quick Game
                    </>
                  );
                }
              })()}
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
                justifyContent: 'center', 
                alignItems: 'center', 
                flex: '1 0 0', 
                alignSelf: 'stretch', 
                gridRow: '1 / span 1', 
                gridColumn: '1 / span 1'
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
                    Match<br />Wins
                  </div>
                </div>
              </div>

              {/* Games Played */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                flex: '1 0 0', 
                alignSelf: 'stretch', 
                gridRow: '1 / span 1', 
                gridColumn: '2 / span 1'
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
                    Games<br />Played
                  </div>
                </div>
              </div>

              {/* Best Streak */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                flex: '1 0 0', 
                alignSelf: 'stretch', 
                gridRow: '2 / span 1', 
                gridColumn: '1 / span 1'
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
                    Best<br />Streak
                  </div>
                </div>
              </div>

              {/* Current Streak */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                flex: '1 0 0', 
                alignSelf: 'stretch', 
                gridRow: '2 / span 1', 
                gridColumn: '2 / span 1'
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
                    Current<br />Streak
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
              // Use motion for morphing transition - layoutId connects to TurnDeciderPhase
              <motion.div
                layoutId="vs-morph-text" // This creates the morphing connection to turn decider
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
                  animation: vsCountdown === 0 ? 'goGlow 1s ease-in-out' : 'subtleGlow 1.5s infinite'
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  duration: 0.8
                }}
              >
                {vsCountdown === 0 ? 'GO!' : vsCountdown}
              </motion.div>
            ) : opponentDisplayLoading ? (
              <div
                style={{
                  color: '#FFB347',
                  fontFamily: 'Audiowide',
                  fontSize: window.innerWidth < 768 ? '20px' : '32px',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  lineHeight: window.innerWidth < 768 ? '24px' : '36px',
                  textTransform: 'uppercase',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div>PREPARING MATCH</div>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    border: '2px solid rgba(255, 179, 71, 0.3)',
                    borderTop: '2px solid #FFB347',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}
                />
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
          {getOpponentData() ? (
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
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  flex: '1 0 0', 
                  alignSelf: 'stretch', 
                  gridRow: '1 / span 1', 
                  gridColumn: '1 / span 1'
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
                      {getOpponentData()?.playerStats?.matchWins || 0}
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
                      Match<br />Wins
                    </div>
                  </div>
                </div>

                {/* Games Played */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  flex: '1 0 0', 
                  alignSelf: 'stretch', 
                  gridRow: '1 / span 1', 
                  gridColumn: '2 / span 1'
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
                      {getOpponentData()?.playerStats?.gamesPlayed || 0}
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
                      Games<br />Played
                    </div>
                  </div>
                </div>

                {/* Best Streak */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  flex: '1 0 0', 
                  alignSelf: 'stretch', 
                  gridRow: '2 / span 1', 
                  gridColumn: '1 / span 1'
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
                      {getOpponentData()?.playerStats?.bestStreak || 0}
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
                      Best<br />Streak
                    </div>
                  </div>
                </div>

                {/* Current Streak */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  flex: '1 0 0', 
                  alignSelf: 'stretch', 
                  gridRow: '2 / span 1', 
                  gridColumn: '2 / span 1'
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
                      {getOpponentData()?.playerStats?.currentStreak || 0}
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
                      Current<br />Streak
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
                  background: !opponentBgIsVideo && opponentBgPath 
                    ? `url('${opponentBgPath}') center/cover no-repeat` 
                    : '#332A63'
                }}
              >
                {/* Loading overlay while opponent display is loading */}
                {opponentDisplayLoading && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      zIndex: 10,
                      backdropFilter: 'blur(4px)'
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '3px solid #00ff66',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginBottom: '15px'
                      }}
                    />
                    <div
                      style={{
                        color: '#E2E2E2',
                        fontFamily: 'Audiowide',
                        fontSize: '14px',
                        textAlign: 'center',
                        textTransform: 'uppercase'
                      }}
                    >
                      Loading Display...
                    </div>
                  </div>
                )}
                {/* Render opponent video background if it's a video */}
                {opponentBgIsVideo && opponentBgPath && (
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    webkit-playsinline="true"
                    x5-playsinline="true"
                    controls={false}
                    preload="metadata"
                    disablePictureInPicture
                    disableRemotePlayback
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      zIndex: 0,
                      pointerEvents: 'none',
                      outline: 'none'
                    }}
                  >
                    <source src={opponentBgPath} type="video/mp4" />
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
                  {getOpponentData()?.playerDisplayName || 'Unknown Player'}
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
              
              {/* Bot Countdown Timer - Hidden from UI but logic preserved */}
              {false && botFallbackActive && botCountdown !== null && (
                <div
                  style={{
                    color: '#FFB347',
                    fontFamily: 'Audiowide',
                    fontSize: window.innerWidth < 768 ? '16px' : '20px',
                    fontWeight: 400,
                    textAlign: 'center',
                    marginTop: '15px',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    background: 'rgba(255, 179, 71, 0.1)',
                    border: '1px solid rgba(255, 179, 71, 0.3)',
                    textTransform: 'uppercase',
                    animation: 'pulse 1s ease-in-out infinite'
                  }}
                >
                  AI Opponent in {botCountdown}s
                </div>
              )}
              
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
           isLeaving ? 'Leaving...' : 'Leave Game'}
        </button>
      </div>
    </motion.div>
  );
};
