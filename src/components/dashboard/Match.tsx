'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { MatchService } from '@/services/matchService';
import { MatchData } from '@/types/match';
import { useNavigation } from '@/context/NavigationContext';
import { TurnDeciderPhase } from './TurnDeciderPhase';
import { GameplayPhase } from './GameplayPhase';
import { GameOverWrapper } from './GameOverWrapper';
import { useGameAchievements } from '@/hooks/useGameAchievements';
import { useMatchAchievements } from '@/hooks/useMatchAchievements';
import { db } from '@/services/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface MatchProps {
  gameMode?: string;
  roomId?: string;
}

export const Match: React.FC<MatchProps> = ({ gameMode, roomId }) => {
  // Remove performance-impacting debug logs
  // console.log('🎮 Match: Component rendered with props:', { gameMode, roomId });
  // console.log('🔍 DEBUG: Match component entry point:', {
  //   timestamp: new Date().toISOString(),
  //   gameMode,
  //   roomId,
  //   component: 'Match'
  // });
  
  const { user } = useAuth();
  const { setCurrentSection, isGameOver, setIsGameOver } = useNavigation();
  // Legacy achievement system - temporarily disabled to prevent concurrent updates
  // const { recordGameCompletion } = useGameAchievements();
  
  // Fast batched achievement tracking for performance
  const { 
    recordDiceRoll, 
    recordTurn, 
    recordStreak, 
    recordMatchEnd, 
    resetBatch 
  } = useMatchAchievements();
  
  // Track match start time for duration calculation
  const matchStartTime = React.useRef<number>(Date.now());
  
  // Remove performance-impacting debug logs
  // console.log('🔍 DEBUG: Match component context:', {
  //   userUid: user?.uid,
  //   hasSetCurrentSection: typeof setCurrentSection === 'function'
  // });
  
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGameOverScreen, setShowGameOverScreen] = useState(false);
  
  // Turn announcement state
  const [showTurnAnnouncement, setShowTurnAnnouncement] = useState(false);
  const [turnAnnouncementData, setTurnAnnouncementData] = useState<{
    winner: string;
    isCurrentPlayerFirst: boolean;
  } | null>(null);
  const [turnAnnouncementShown, setTurnAnnouncementShown] = useState(false);
  const [previousGamePhase, setPreviousGamePhase] = useState<string | null>(null);
  
  // Set game over state for navbar visibility
  useEffect(() => {
    if (matchData?.gameData) {
      const isGameOverNow = matchData.gameData.gamePhase === 'gameOver';
      setIsGameOver(isGameOverNow);
      
      // Track achievement when game ends
      if (isGameOverNow && matchData.gameData.winner && user?.uid) {
        const isHost = matchData.hostData.playerId === user.uid;
        const playerWon = matchData.gameData.winner === (isHost ? 'host' : 'opponent');
        
        // Flush all batched achievements to database (single write)
        const matchDuration = Date.now() - matchStartTime.current;
        recordMatchEnd(playerWon, {
          duration: matchDuration,
          finalScore: isHost ? matchData.hostData.playerScore : matchData.opponentData?.playerScore || 0,
          opponentScore: isHost ? matchData.opponentData?.playerScore || 0 : matchData.hostData.playerScore,
          gameMode: 'classic',
          wasCloseGame: Math.abs((matchData.hostData.playerScore) - (matchData.opponentData?.playerScore || 0)) <= 2
        }).catch(error => {
          console.error('Error flushing batched achievements:', error);
        });
        
        // NOTE: Legacy recordGameCompletion() removed to prevent concurrent achievement updates
        // All achievements are now handled by the batched system above
      }
    }
  }, [matchData?.gameData?.gamePhase, matchData?.gameData?.winner, setIsGameOver, recordMatchEnd, user?.uid, matchData?.hostData, matchData?.opponentData]);

  // Handle game over delay
  useEffect(() => {
    if (matchData?.gameData?.gamePhase === 'gameOver') {
      const timer = setTimeout(() => {
        setShowGameOverScreen(true);
      }, 1000); // 1 second delay

      return () => clearTimeout(timer);
    } else {
      setShowGameOverScreen(false);
    }
  }, [matchData?.gameData?.gamePhase]);
  
  // Turn announcement logic - detect when turn decider completes
  useEffect(() => {
    const currentPhase = matchData?.gameData?.gamePhase;
    
    // Track phase transitions and only show announcement when transitioning from turnDecider to gameplay
    if (currentPhase && currentPhase !== previousGamePhase) {
      setPreviousGamePhase(currentPhase);
      
      // Only trigger announcement when transitioning from turnDecider to gameplay
      if (previousGamePhase === 'turnDecider' && currentPhase === 'gameplay' && 
          matchData?.gameData?.turnDeciderDice && matchData?.gameData?.turnDeciderChoice &&
          !turnAnnouncementShown) {
        
        // Determine who goes first based on turn decider result
        const diceValue = matchData.gameData.turnDeciderDice;
        const choice = matchData.gameData.turnDeciderChoice;
        const isEven = diceValue % 2 === 0;
        const choiceMatches = (choice === 'even' && isEven) || (choice === 'odd' && !isEven);
        
        // Find who made the choice and who goes first
        const playerNumber = matchData.gameData.turnDecider;
        const isHost = matchData.hostData.playerId === user?.uid;
        const currentPlayerNumber = isHost ? 1 : 2;
        
        let winner: string;
        let isCurrentPlayerFirst: boolean;
        
        if (choiceMatches) {
          // The player who made the choice goes first
          winner = playerNumber === 1 ? 
            (matchData.hostData?.playerDisplayName || 'Player 1') : 
            (matchData.opponentData?.playerDisplayName || 'Player 2');
          isCurrentPlayerFirst = playerNumber === currentPlayerNumber;
        } else {
          // The other player goes first
          const otherPlayerNumber = playerNumber === 1 ? 2 : 1;
          winner = otherPlayerNumber === 1 ? 
            (matchData.hostData?.playerDisplayName || 'Player 1') : 
            (matchData.opponentData?.playerDisplayName || 'Player 2');
          isCurrentPlayerFirst = otherPlayerNumber === currentPlayerNumber;
        }
        
        setTurnAnnouncementData({ winner, isCurrentPlayerFirst });
        setShowTurnAnnouncement(true);
        setTurnAnnouncementShown(true); // Mark as shown so it doesn't repeat
        
        // Hide announcement after 3 seconds
        setTimeout(() => {
          setShowTurnAnnouncement(false);
        }, 3000);
      }
    }
  }, [matchData?.gameData?.gamePhase, matchData?.gameData?.turnDeciderDice, 
      matchData?.gameData?.turnDeciderChoice, matchData?.hostData, matchData?.opponentData, 
      user, previousGamePhase, turnAnnouncementShown]);
  
  // Dice animation states for slot machine effect
  const [dice1Animation, setDice1Animation] = useState<{
    isSpinning: boolean;
    currentNumber: number;
    finalNumber: number | null;
    reelSpeed?: number;
    animationKey?: number;
  }>({ isSpinning: false, currentNumber: 1, finalNumber: null, reelSpeed: 0.1 });
  
  const [dice2Animation, setDice2Animation] = useState<{
    isSpinning: boolean;
    currentNumber: number;
    finalNumber: number | null;
    reelSpeed?: number;
    animationKey?: number;
  }>({ isSpinning: false, currentNumber: 1, finalNumber: null, reelSpeed: 0.1 });

  // Turn decider dice animation
  const [turnDeciderDiceAnimation, setTurnDeciderDiceAnimation] = useState<{
    isSpinning: boolean;
    currentNumber: number;
    finalNumber: number | null;
    reelSpeed?: number;
    animationKey?: number;
  }>({ isSpinning: false, currentNumber: 1, finalNumber: null, reelSpeed: 0.1 });

  // All useCallback hooks must be declared before any conditional logic
  const handleRollDice = useCallback(async () => {
    if (!matchData) return;
    
    try {
      const playerId = user?.uid;
      
      if (!playerId) {
        console.error('❌ No authenticated user found');
        return;
      }
      
      await MatchService.rollDice(matchData.id!, playerId);
    } catch (error) {
      console.error('❌ Error rolling dice:', error);
    }
  }, [matchData, user?.uid]);

  const handleBankScore = useCallback(async () => {
    if (!matchData) return;
    
    try {
      const playerId = user?.uid;
      
      if (!playerId) {
        console.error('❌ No authenticated user found');
        return;
      }
      
      await MatchService.bankScore(matchData.id!, playerId);
    } catch (error) {
      console.error('❌ Error banking score:', error);
    }
  }, [matchData, user?.uid]);

  const getValidBackgroundObject = useCallback((background: any) => {
    if (!background) {
      return { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' };
    }
    
    if (typeof background === 'object' && background.name && background.file && background.type) {
      return background;
    }
    
    if (typeof background === 'string') {
      return { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' };
    }
    
    return { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' };
  }, []);

  const VideoBackground = useCallback(({ background, className }: { background: any; className: string }) => (
    <video
      autoPlay
      loop
      muted
      playsInline
      controls={false}
      webkit-playsinline="true"
      x5-playsinline="true"
      preload="metadata"
      disablePictureInPicture
      controlsList="nodownload noplaybackrate"
      className={className}
      style={{ pointerEvents: 'none' }}
    >
      <source src={background.file} type="video/mp4" />
    </video>
  ), []);

  const ImageBackground = useCallback(({ background, className }: { background: any; className: string }) => (
    <img
      src={background.file}
      alt={background.name}
      className={className}
    />
  ), []);

  // Memoized background objects - computed before early returns to comply with hooks rules
  const currentPlayerBackground = useMemo(() => {
    if (!matchData || !user) return null;
    const isHost = matchData.hostData.playerId === user.uid;
    const currentPlayer = isHost ? matchData.hostData : matchData.opponentData;
    return getValidBackgroundObject(currentPlayer.matchBackgroundEquipped);
  }, [matchData, user, getValidBackgroundObject]);
  
  const opponentBackground = useMemo(() => {
    if (!matchData || !user) return null;
    const isHost = matchData.hostData.playerId === user.uid;
    const opponent = isHost ? matchData.opponentData : matchData.hostData;
    return getValidBackgroundObject(opponent.matchBackgroundEquipped);
  }, [matchData, user, getValidBackgroundObject]);

  // Subscribe to match updates
  useEffect(() => {
    // Remove performance-impacting logs
    // console.log('🎮 Match: useEffect triggered with roomId:', roomId, 'user:', user?.uid);
    if (!roomId || !user) {
      // Remove performance-impacting logs
      // console.log('🎮 Match: Early return - missing roomId or user');
      return;
    }

    // Remove performance-impacting logs
    // console.log('🎮 Match: Subscribing to match:', roomId);
    setLoading(true);
    setError(null);
    setMatchData(null); // Clear previous match data
    
    // Reset all game state when switching matches
    setShowGameOverScreen(false);
    setTurnAnnouncementShown(false);
    setDice1Animation({ isSpinning: false, currentNumber: 1, finalNumber: null, reelSpeed: 0.1 });
    setDice2Animation({ isSpinning: false, currentNumber: 1, finalNumber: null, reelSpeed: 0.1 });
    setTurnDeciderDiceAnimation({ isSpinning: false, currentNumber: 1, finalNumber: null, reelSpeed: 0.1 });

    const unsubscribe = MatchService.subscribeToMatch(roomId, (data) => {
      if (data) {
        // Remove performance-impacting logs
        // console.log('🎮 Match: Received match data:', data);
        setMatchData(data);
        
        // Initialize game phase if needed
        if (!data.gameData.gamePhase) {
          MatchService.initializeGamePhase(roomId);
        }
        
        // Reset achievement batch for new match
        if (data.gameData.gamePhase === 'turnDecider') {
          resetBatch();
          matchStartTime.current = Date.now();
        }
        
        // Clear any previous errors when we receive valid data
        setError(null);
      } else {
        // Don't immediately show error - match might be transitioning
        console.log('⚠️ Match: No match data received - match may be ending or transitioning');
        
        // Only set error after a brief delay to handle transitions
        setTimeout(() => {
          setMatchData(prev => {
            if (!prev) {
              setError('Match not found');
            }
            return prev;
          });
        }, 2000);
      }
      setLoading(false);
    });

    return () => {
      // Remove performance-impacting logs
      // console.log('🎮 Match: Unsubscribing from match:', roomId);
      unsubscribe();
    };
  }, [roomId, user]);

  // Slot machine animation function
  /*
   * 🎰 DICE REEL ANIMATION SYSTEM
   * 
   * Animation Durations:
   * - Dice 1 & 2: 1200ms (1.2 seconds)
   * - Turn Decider: 1500ms (1.5 seconds)
   * 
   * 3-Phase Speed Progression:
   * 
   * Phase 1 (0-70%): Fast Spinning
   * - Speed: 60ms → 88ms intervals
   * - Background Reel: 0.1s (very fast)
   * 
   * Phase 2 (70-90%): Deceleration  
   * - Speed: 88ms → 200ms intervals
   * - Background Reel: 0.1s → 0.5s (slowing)
   * 
   * Phase 3 (90-100%): Final Slow
   * - Speed: 200ms → 500ms intervals  
   * - Background Reel: 0.5s → 2.0s (very slow)
   * 
   * Special Effects:
   * - Near Miss: Triggered at 60% duration
   * - Overshoot: Shows wrong number briefly
   * - Tick-Back: 300ms pause before final result
   */
  const startSlotMachineAnimation = (
    diceNumber: 1 | 2 | 'turnDecider', 
    finalValue: number,
    animationDuration: number = 1200 // Default to 1200ms for dice 1 & 2
  ) => {
    const setDiceState = diceNumber === 1 ? setDice1Animation : 
                        diceNumber === 2 ? setDice2Animation : 
                        setTurnDeciderDiceAnimation;
    
    // Start spinning
    setDiceState({
      isSpinning: true,
      currentNumber: Math.floor(Math.random() * 6) + 1,
      finalNumber: null,
      reelSpeed: 0.1,
      animationKey: Date.now() // Force refresh for same values
    });

    // 🎰 3-Phase Progressive Deceleration System
    let currentSpeed = 60; // Initial speed: 60ms intervals
    let intervalId: NodeJS.Timeout;
    let elapsedTime = 0;
    let reelAnimationSpeed = 0.1; // Background reel speed: very fast

    const animateReel = () => {
      setDiceState((prev: any) => ({
        ...prev,
        currentNumber: Math.floor(Math.random() * 6) + 1
      }));
      
      elapsedTime += currentSpeed;
      const progress = elapsedTime / animationDuration;
      
      // 🎰 Phase 1 - Fast Spinning (0-70% of duration)
      if (progress < 0.7) {
        // Speed: 60ms → 88ms intervals
        currentSpeed = 60 + (progress / 0.7) * 28; // Linear interpolation: 60ms to 88ms
        reelAnimationSpeed = 0.1; // Background reel: 0.1s (very fast)
      } 
      // 🎰 Phase 2 - Deceleration (70-90% of duration)
      else if (progress < 0.9) {
        const decelProgress = (progress - 0.7) / 0.2; // 0-1 over 20% of duration
        // Speed: 88ms → 200ms intervals
        currentSpeed = 88 + (decelProgress * 112);
        // Background reel: 0.1s → 0.5s (slowing down)
        reelAnimationSpeed = 0.1 + (decelProgress * 0.4);
      } 
      // 🎰 Phase 3 - Final Slow (90-100% of duration)
      else {
        const finalProgress = (progress - 0.9) / 0.1; // 0-1 over last 10% of duration
        // Speed: 200ms → 500ms intervals
        currentSpeed = 200 + (finalProgress * 300);
        // Background reel: 0.5s → 2.0s (very slow)
        reelAnimationSpeed = 0.5 + (finalProgress * 1.5);
      }
      
      // Update the animation speed for the reel background
      setDiceState((prev: any) => ({
        ...prev,
        currentNumber: Math.floor(Math.random() * 6) + 1,
        reelSpeed: reelAnimationSpeed, // Synchronized background reel speed
        animationKey: Date.now()
      }));
      
      if (elapsedTime < animationDuration) {
        intervalId = setTimeout(animateReel, currentSpeed);
      }
    };

    animateReel();

    // 🎰 Near Miss Timing - Triggered at 60% of animation duration
    const nearMissTimeout = setTimeout(() => {
      if (Math.random() < 0.7) { // 70% chance of near miss
        setDiceState((prev: any) => ({
          ...prev,
          currentNumber: 6 // Briefly show a 6 for excitement
        }));
      }
    }, animationDuration * 0.6); // Exactly 60% of duration

    // 🎰 Overshoot Effect - Shows wrong number briefly before final value
    setTimeout(() => {
      clearTimeout(intervalId);
      clearTimeout(nearMissTimeout);
      
      // Show wrong number briefly (overshoot effect)
      const overshoot = finalValue < 6 ? finalValue + 1 : finalValue - 1;
      setDiceState({
        isSpinning: false,
        currentNumber: overshoot,
        finalNumber: finalValue,
        reelSpeed: 0.1, // Reset reel speed
        animationKey: Date.now()
      });

      // 🎰 Tick-Back Delay - 150ms pause before showing final result
      setTimeout(() => {
        setDiceState({
          isSpinning: false,
          currentNumber: finalValue,
          finalNumber: finalValue,
          reelSpeed: 0.1, // Reset reel speed
          animationKey: Date.now()
        });
      }, 150); // Reduced from 300ms to 150ms for smoother transition
      
    }, animationDuration);
  };

  // Handle turn decider choice
  const handleTurnDeciderChoice = async (choice: 'odd' | 'even') => {
    // Remove performance-impacting logs
    // console.log('🎯 handleTurnDeciderChoice called with choice:', choice);
    
    if (!matchData) {
      // Remove performance-impacting logs
      // console.log('❌ No match data available');
      return;
    }
    
    try {
      // Use the actual authenticated user ID
      const playerId = user?.uid;
      
      if (!playerId) {
        console.error('❌ No authenticated user found');
        return;
      }
      
      // Remove performance-impacting logs
      // console.log('🔄 Calling MatchService.makeTurnDeciderChoice with:', { matchId: matchData.id, playerId, choice });
      await MatchService.makeTurnDeciderChoice(matchData.id!, playerId, choice);
      // console.log('✅ MatchService.makeTurnDeciderChoice completed');
    } catch (error) {
      console.error('❌ Error making turn decider choice:', error);
    }
  };

  // Debug: Force gameplay function
  const handleForceGameplay = async () => {
    if (!matchData) return;
    
    try {
      const matchRef = doc(db, 'matches', matchData.id!);
      
      // Force transition to gameplay with random assignment of who goes first
      const hostGoesFirst = Math.random() > 0.5;
      
      await updateDoc(matchRef, {
        'gameData.gamePhase': 'gameplay',
        'gameData.isRolling': false,
        'gameData.turnScore': 0,
        'gameData.turnDeciderDice': Math.floor(Math.random() * 6) + 1, // Set a random dice if missing
        'hostData.turnActive': hostGoesFirst,
        'opponentData.turnActive': !hostGoesFirst,
      });
      
      // Remove performance-impacting logs
      // console.log(`🚀 Debug: Forced gameplay - ${hostGoesFirst ? 'Host' : 'Opponent'} goes first`);
    } catch (error) {
      console.error('❌ Error forcing gameplay:', error);
    }
  };

  // Trigger dice animations based on match data
  useEffect(() => {
    if (!matchData) return;

    // Turn decider dice animation - trigger when isRolling becomes true
    if (matchData.gameData.gamePhase === 'turnDecider' && 
        matchData.gameData.turnDeciderChoice && 
        matchData.gameData.isRolling &&
        matchData.gameData.turnDeciderDice && 
        !turnDeciderDiceAnimation.isSpinning) {
      // Remove performance-impacting logs
      // console.log('🎰 Starting turn decider dice animation for result:', matchData.gameData.turnDeciderDice);
      // 🎰 Animation Durations per specification:
      // Turn Decider Dice: 1500ms (1.5 seconds)
      startSlotMachineAnimation('turnDecider', matchData.gameData.turnDeciderDice, 1500);
    }

    // Gameplay dice animations - Always animate even for same values
    if (matchData.gameData.isRolling && matchData.gameData.rollPhase === 'dice1' && 
        matchData.gameData.diceOne > 0 && !dice1Animation.isSpinning) {
      // 🎰 Animation Durations per specification:
      // Both Dice 1 & 2: 1200ms (1.2 seconds)
      startSlotMachineAnimation(1, matchData.gameData.diceOne, 1200);
      
      // Record dice roll for achievements (batched - no DB write)
      recordDiceRoll(matchData.gameData.diceOne);
    }

    if (matchData.gameData.isRolling && matchData.gameData.rollPhase === 'dice2' && 
        matchData.gameData.diceTwo > 0 && !dice2Animation.isSpinning) {
      // 🎰 Animation Durations per specification:
      // Both Dice 1 & 2: 1200ms (1.2 seconds)
      // Removed final number check to force animation even for same values
      console.log('🎲 Starting Dice 2 animation with value:', matchData.gameData.diceTwo);
      startSlotMachineAnimation(2, matchData.gameData.diceTwo, 1200);
      
      // Record dice roll for achievements (batched - no DB write)
      recordDiceRoll(matchData.gameData.diceTwo);
      
      // Also record the turn completion
      recordTurn();
    }
  }, [
    matchData?.gameData.turnDeciderChoice, 
    matchData?.gameData.turnDeciderDice,
    matchData?.gameData.rollPhase,
    matchData?.gameData.diceOne,
    matchData?.gameData.diceTwo,
    matchData?.gameData.isRolling,
    dice1Animation.isSpinning,
    dice2Animation.isSpinning,
    turnDeciderDiceAnimation.isSpinning
  ]);

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900"
      >
        <div className="text-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"
          />
          <motion.h2 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-white mb-2" 
            style={{ fontFamily: "Audiowide" }}
          >
            Entering Arena...
          </motion.h2>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-300"
          >
            Preparing your match
          </motion.p>
        </div>
      </motion.div>
    );
  }

  if (error || !matchData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-indigo-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "Audiowide" }}>
            Match Error
          </h2>
          <p className="text-red-300 mb-6">{error || 'Match not found'}</p>
          <button
            onClick={() => setCurrentSection('dashboard')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            style={{ fontFamily: "Audiowide" }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Now we know matchData exists, compute player data  
  const isHost = matchData.hostData.playerId === user?.uid;
  const currentPlayer = isHost ? matchData.hostData : matchData.opponentData;
  const opponent = isHost ? matchData.opponentData : matchData.hostData;

  return (
    <>
      {/* Game Over Screen - Full Screen Overlay */}
      {matchData.gameData.gamePhase === 'gameOver' && showGameOverScreen && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed inset-0 z-40 flex items-center justify-center"
          style={{ 
            flexDirection: 'column',
            top: '60px', // Leave space for desktop navbar
            bottom: '0' // Use full height on mobile since navbar is hidden
          }}
        >
          <div className="w-full max-w-6xl mx-auto px-4 h-full flex items-center justify-center">
            <GameOverWrapper
              matchId={matchData.id || ''}
              onLeaveMatch={() => setCurrentSection('dashboard')}
              onRematch={(rematchRoomId) => {
                console.log('🎮 Match: Navigating to rematch waiting room:', rematchRoomId);
                
                // Navigate to waiting room instead of directly to match
                setCurrentSection('waiting-room', { 
                  gameMode: matchData.gameMode || 'classic',
                  roomId: rematchRoomId,
                  actionType: 'live'
                });
              }}
            />
          </div>
        </motion.div>
      )}

      {/* Normal Match UI - Hidden when game over */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`w-full h-full ${matchData.gameData.gamePhase === 'gameOver' ? 'hidden' : 'flex'} flex-col items-center gap-[1rem] p-2 md:p-4 justify-start md:justify-center overflow-hidden`} 
        style={{ 
          minHeight: '100vh', 
          maxHeight: '100vh',
          paddingTop: '0.5rem'
        }}
      >
      {/* Game Arena */}
      <div className="flex items-center justify-center p-2 md:p-4" style={{ width: '90vw' }}>
          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between gap-16" style={{ width: '100%' }}>
            
            {/* Player 1 (Current User - Left Side) */}
            <div className="flex-1">
              {/* Player Name Above Container - Left Aligned */}
              <h2 
                className="text-3xl font-bold text-white mb-4 text-left"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                }}
              >
                {currentPlayer.playerDisplayName}
              </h2>
              
              <div
                className="relative rounded-3xl overflow-hidden shadow-2xl border-4 z-20"
                style={{ 
                  borderColor: currentPlayer.turnActive ? '#00ff00' : '#ffffff',
                  height: '500px'
                }}
              >
                {/* Player Background */}
                {currentPlayerBackground ? (
                  currentPlayerBackground.type === 'video' ? (
                    <VideoBackground 
                      background={currentPlayerBackground}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <ImageBackground
                      background={currentPlayerBackground}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )
                ) : (
                  /* Default gradient background */
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: "radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #3533CD 0%, #7209B7 100%)"
                    }}
                  />
                )}
                {/* Player Info Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Match Score - Large and Centered */}
                  <div 
                    className="text-9xl font-bold text-white"
                    style={{ 
                      fontFamily: 'Audiowide',
                      textShadow: '4px 4px 8px rgba(0,0,0,0.8)'
                    }}
                  >
                    {currentPlayer.playerScore}
                  </div>
                </div>

                {/* Turn Decider Indicator */}
                {matchData.gameData.gamePhase === 'turnDecider' && (
                  <div className="absolute top-4 left-4">
                    {(() => {
                      const playerNumber = isHost ? 1 : 2;
                      const isPlayerTurn = matchData.gameData.turnDecider === playerNumber;
                      
                      if (isPlayerTurn && !matchData.gameData.turnDeciderChoice) {
                        return (
                          <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                            CHOOSE
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
              
              {/* Background Rarity Display - Below Container, Left Aligned */}
              <div 
                className="mt-4 text-left"
                style={{
                  display: 'flex',
                  width: '190px',
                  height: '45px',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.09)',
                  backdropFilter: 'blur(5.5px)'
                }}
              >
                <span style={{
                  alignSelf: 'stretch',
                  color: '#FFF',
                  textAlign: 'center',
                  fontFamily: 'Orbitron',
                  fontSize: '20px',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '42px',
                  textTransform: 'uppercase'
                }}>
                  {currentPlayerBackground?.rarity || 'COMMON'}
                </span>
              </div>
            </div>

            {/* Center Dice Area */}
            <div className="flex flex-col items-center justify-center relative z-10" style={{ alignSelf: 'center', minWidth: '600px', width: '600px', height: '60vh', overflow: 'visible' }}>
              {/* Phase-specific content with transitions */}
              <AnimatePresence mode="wait">
                {matchData.gameData.gamePhase === 'turnDecider' && (
                  <motion.div
                    key="turnDecider"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  >
                    <TurnDeciderPhase
                      matchData={matchData}
                      currentPlayer={currentPlayer}
                      opponent={opponent}
                      isHost={isHost}
                      diceAnimation={turnDeciderDiceAnimation}
                      onChoiceSelect={handleTurnDeciderChoice}
                      onForceGameplay={handleForceGameplay}
                    />
                  </motion.div>
                )}

                {/* Turn Announcement - Shows who goes first */}
                {showTurnAnnouncement && turnAnnouncementData && (
                  <motion.div
                    key="turnAnnouncement"
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="text-center py-12"
                  >
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="text-4xl md:text-6xl font-bold mb-4"
                      style={{ 
                        fontFamily: "Audiowide",
                        color: turnAnnouncementData.isCurrentPlayerFirst ? "#FFD700" : "#FF6B6B"
                      }}
                    >
                      {turnAnnouncementData.isCurrentPlayerFirst ? "YOU GO FIRST!" : `${turnAnnouncementData.winner.toUpperCase()} GOES FIRST!`}
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                      className="text-xl md:text-2xl text-gray-300"
                      style={{ fontFamily: "Audiowide" }}
                    >
                      GET READY!
                    </motion.p>
                  </motion.div>
                )}

                {matchData.gameData.gamePhase === 'gameplay' && !showTurnAnnouncement && (
                  <motion.div
                    key="gameplay"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  >
                    <GameplayPhase
                      matchData={matchData}
                      currentPlayer={currentPlayer}
                      opponent={opponent}
                      isHost={isHost}
                      dice1Animation={dice1Animation}
                      dice2Animation={dice2Animation}
                      onRollDice={handleRollDice}
                      onBankScore={handleBankScore}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Player 2 (Opponent - Right Side) */}
            <div className="flex-1">
              {/* Player Name Above Container - Right Aligned */}
              <h2 
                className="text-3xl font-bold text-white mb-4 text-right"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                }}
              >
                {opponent.playerDisplayName}
              </h2>
              
              <div
                className="relative rounded-3xl overflow-hidden shadow-2xl border-4 z-20"
                style={{ 
                  borderColor: opponent.turnActive ? '#00ff00' : '#ffffff',
                  height: '500px'
                }}
              >
                {/* Player Background */}
                {opponentBackground ? (
                  opponentBackground.type === 'video' ? (
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      controls={false}
                      webkit-playsinline="true"
                      x5-playsinline="true"
                      preload="metadata"
                      disablePictureInPicture
                      controlsList="nodownload noplaybackrate"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ 
                        pointerEvents: 'none'
                      }}
                    >
                      <source src={opponentBackground.file} type="video/mp4" />
                    </video>
                  ) : (
                    <img
                      src={opponentBackground.file}
                      alt={opponentBackground.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )
                ) : (
                  /* Default gradient background */
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: "radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #3533CD 0%, #7209B7 100%)"
                    }}
                  />
                )}
                {/* Player Info Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Match Score - Large and Centered */}
                  <div 
                    className="text-9xl font-bold text-white"
                    style={{ 
                      fontFamily: 'Audiowide',
                      textShadow: '4px 4px 8px rgba(0,0,0,0.8)'
                    }}
                  >
                    {opponent.playerScore}
                  </div>
                </div>
              </div>
              
              {/* Background Rarity Display - Below Container, Right Aligned */}
              <div 
                className="mt-4 text-right ml-auto"
                style={{
                  display: 'flex',
                  width: '190px',
                  height: '45px',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.09)',
                  backdropFilter: 'blur(5.5px)'
                }}
              >
                <span style={{
                  alignSelf: 'stretch',
                  color: '#FFF',
                  textAlign: 'center',
                  fontFamily: 'Orbitron',
                  fontSize: '20px',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '42px',
                  textTransform: 'uppercase'
                }}>
                  {opponentBackground?.rarity || 'COMMON'}
                </span>
              </div>
            </div>

          </div>

          {/* Mobile Layout - Stacked */}
          <div className="md:hidden flex flex-col items-center w-full" style={{ width: '100vw', paddingTop: '0px' }}>
            
            {/* User Profiles Section - Top */}
            <div className="w-full flex justify-between mb-3" style={{ paddingLeft: '10px', paddingRight: '10px', gap: '10px' }}>
              {/* Current Player Profile - Left */}
              <div style={{ width: 'calc(50vw - 15px)' }}>
                <h3 
                  className="font-bold text-white mb-2 text-center px-1"
                  style={{ 
                    fontFamily: 'Audiowide',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    fontSize: 'clamp(12px, 3.5vw, 16px)',
                    lineHeight: '1.2',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {currentPlayer.playerDisplayName}
                </h3>
                
                <div
                  className="relative rounded-xl overflow-hidden shadow-lg border-2"
                  style={{ 
                    borderColor: currentPlayer.turnActive ? '#00ff00' : '#ffffff',
                    height: '120px',
                    width: '100%'
                  }}
                >
                  {/* Player Background */}
                  {currentPlayerBackground ? (
                    currentPlayerBackground.type === 'video' ? (
                      <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls={false}
                        webkit-playsinline="true"
                        x5-playsinline="true"
                        preload="metadata"
                        disablePictureInPicture
                        controlsList="nodownload noplaybackrate"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ 
                          pointerEvents: 'none',
                          objectPosition: 'center center'
                        }}
                      >
                        <source src={currentPlayerBackground.file} type="video/mp4" />
                      </video>
                    ) : (
                      <img
                        src={currentPlayerBackground.file}
                        alt={currentPlayerBackground.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{
                          objectPosition: 'center center'
                        }}
                      />
                    )
                  ) : (
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: "radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #3533CD 0%, #7209B7 100%)"
                      }}
                    />
                  )}
                  
                  {/* Score Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="text-4xl font-bold text-white"
                      style={{ 
                        fontFamily: 'Audiowide',
                        textShadow: '4px 4px 8px rgba(0,0,0,0.8)'
                      }}
                    >
                      {currentPlayer.playerScore}
                    </div>
                  </div>

                  {/* Turn Indicators - Removed per user request */}
                  {/* {matchData.gameData.gamePhase === 'gameplay' && currentPlayer.turnActive && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                      YOU
                    </div>
                  )} */}
                </div>
              </div>

              {/* Opponent Profile - Right */}
              <div style={{ width: 'calc(50vw - 15px)' }}>
                <h3 
                  className="font-bold text-white mb-2 text-center px-1"
                  style={{ 
                    fontFamily: 'Audiowide',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    fontSize: 'clamp(12px, 3.5vw, 16px)',
                    lineHeight: '1.2',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {opponent.playerDisplayName}
                </h3>
                
                <div
                  className="relative rounded-xl overflow-hidden shadow-lg border-2"
                  style={{ 
                    borderColor: opponent.turnActive ? '#00ff00' : '#ffffff',
                    height: '120px',
                    width: '100%'
                  }}
                >
                  {/* Player Background */}
                  {opponentBackground ? (
                    opponentBackground.type === 'video' ? (
                      <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls={false}
                        webkit-playsinline="true"
                        x5-playsinline="true"
                        preload="metadata"
                        disablePictureInPicture
                        controlsList="nodownload noplaybackrate"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ 
                          pointerEvents: 'none',
                          objectPosition: 'center center'
                        }}
                      >
                        <source src={opponentBackground.file} type="video/mp4" />
                      </video>
                    ) : (
                      <img
                        src={opponentBackground.file}
                        alt={opponentBackground.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{
                          objectPosition: 'center center'
                        }}
                      />
                    )
                  ) : (
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: "radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #3533CD 0%, #7209B7 100%)"
                      }}
                    />
                  )}
                  
                  {/* Score Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="text-4xl font-bold text-white"
                      style={{ 
                        fontFamily: 'Audiowide',
                        textShadow: '4px 4px 8px rgba(0,0,0,0.8)'
                      }}
                    >
                      {opponent.playerScore}
                    </div>
                  </div>

                  {/* Turn Indicators - Removed per user request */}
                  {/* {matchData.gameData.gamePhase === 'gameplay' && opponent.turnActive && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                      THEM
                    </div>
                  )} */}
                </div>
              </div>
            </div>

            {/* Center Dice Area - Middle */}
            <div className="w-full flex flex-col items-center justify-center mb-3" style={{ paddingBottom: '120px', paddingTop: '120px', height: '60vh', overflow: 'visible' }}>
              {/* Phase-specific content with mobile modifications and transitions */}
              <AnimatePresence mode="wait">
                {matchData.gameData.gamePhase === 'turnDecider' && (
                  <motion.div
                    key="turnDecider-mobile"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="w-full"
                  >
                    <TurnDeciderPhase
                      matchData={matchData}
                      currentPlayer={currentPlayer}
                      opponent={opponent}
                      isHost={isHost}
                      diceAnimation={turnDeciderDiceAnimation}
                      onChoiceSelect={handleTurnDeciderChoice}
                      onForceGameplay={handleForceGameplay}
                    />
                  </motion.div>
                )}

                {/* Turn Announcement - Mobile */}
                {showTurnAnnouncement && turnAnnouncementData && (
                  <motion.div
                    key="turnAnnouncement-mobile"
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="text-center py-8 w-full"
                  >
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.2 }}
                      className="text-2xl md:text-4xl font-bold mb-4"
                      style={{ 
                        fontFamily: "Audiowide",
                        color: turnAnnouncementData.isCurrentPlayerFirst ? "#FFD700" : "#FF6B6B"
                      }}
                    >
                      {turnAnnouncementData.isCurrentPlayerFirst ? "YOU GO FIRST!" : `${turnAnnouncementData.winner.toUpperCase()} GOES FIRST!`}
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                      className="text-lg md:text-xl text-gray-300"
                      style={{ fontFamily: "Audiowide" }}
                    >
                      GET READY!
                    </motion.p>
                  </motion.div>
                )}

                {matchData.gameData.gamePhase === 'gameplay' && !showTurnAnnouncement && (
                  <motion.div
                    key="gameplay-mobile"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="w-full"
                  >
                    <GameplayPhase
                      matchData={matchData}
                      currentPlayer={currentPlayer}
                      opponent={opponent}
                      isHost={isHost}
                      dice1Animation={dice1Animation}
                      dice2Animation={dice2Animation}
                      onRollDice={handleRollDice}
                      onBankScore={handleBankScore}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </motion.div>
    </>
  );
};
