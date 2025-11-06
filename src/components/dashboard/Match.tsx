'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { MatchService } from '@/services/matchService';
import { BotAutomationService } from '@/services/botAutomationService';
import { MatchData } from '@/types/match';
import { useNavigation } from '@/context/NavigationContext';
import { TurnDeciderPhase } from './TurnDeciderPhase';
import { GameplayPhase } from './GameplayPhase';
import { GameOverWrapper } from './GameOverWrapper';
import { useGameAchievements } from '@/hooks/useGameAchievements';
import { useMatchAchievements } from '@/hooks/useMatchAchievements';
import { db } from '@/services/firebase';
import { doc, updateDoc, Timestamp, arrayUnion } from 'firebase/firestore';
import MatchAbandonmentNotification from '@/components/notifications/MatchAbandonmentNotification';
import { useToast } from '@/context/ToastContext';

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
  const { showToast } = useToast();
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
  const matchStartTime = React.useRef<number | null>(null);
  
  // Remove performance-impacting debug logs
  // console.log('🔍 DEBUG: Match component context:', {
  //   userUid: user?.uid,
  //   hasSetCurrentSection: typeof setCurrentSection === 'function'
  // });
  
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGameOverScreen, setShowGameOverScreen] = useState(false);
  
  // Initialize match start time when match data first loads
  useEffect(() => {
    if (matchData && !matchStartTime.current) {
      const gameStartTime = matchData.gameData?.startedAt?.toMillis?.() || 
                           matchData.startedAt?.toMillis?.() || 
                           matchData.createdAt?.toMillis?.();
      matchStartTime.current = gameStartTime || Date.now();
      console.log('⏱️ Match start time initialized:', new Date(matchStartTime.current));
    }
  }, [matchData]);
  
  // Abandonment notification states
  const [showAbandonmentNotification, setShowAbandonmentNotification] = useState(false);
  const [opponentLastSeen, setOpponentLastSeen] = useState<Date | null>(null);
  const [abandonmentTimer, setAbandonmentTimer] = useState<NodeJS.Timeout | null>(null);
  const [siphonActive, setSiphonActive] = useState(false);
  
  // Add body class for mobile scrolling control
  useEffect(() => {
    document.body.classList.add('match-active');
    return () => {
      document.body.classList.remove('match-active');
    };
  }, []);
  
  // Add game over body class when showing game over screen
  useEffect(() => {
    if (showGameOverScreen) {
      document.body.classList.add('game-over-active');
    } else {
      document.body.classList.remove('game-over-active');
    }
    return () => {
      document.body.classList.remove('game-over-active');
    };
  }, [showGameOverScreen]);
  
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
        const matchDuration = matchStartTime.current ? Date.now() - matchStartTime.current : 0;
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
            (matchData.hostData?.playerDisplayName || (matchData.hostData?.playerId?.includes('bot') ? 'AI Player' : 'Player 1')) : 
            (matchData.opponentData?.playerDisplayName || (matchData.opponentData?.playerId?.includes('bot') ? 'AI Player' : 'Player 2'));
          isCurrentPlayerFirst = playerNumber === currentPlayerNumber;
        } else {
          // The other player goes first
          const otherPlayerNumber = playerNumber === 1 ? 2 : 1;
          winner = otherPlayerNumber === 1 ? 
            (matchData.hostData?.playerDisplayName || (matchData.hostData?.playerId?.includes('bot') ? 'AI Player' : 'Player 1')) : 
            (matchData.opponentData?.playerDisplayName || (matchData.opponentData?.playerId?.includes('bot') ? 'AI Player' : 'Player 2'));
          isCurrentPlayerFirst = otherPlayerNumber === currentPlayerNumber;
        }
        
        setTurnAnnouncementData({ winner, isCurrentPlayerFirst });
        // Show turn announcement so users can see who goes first
        setShowTurnAnnouncement(true);
        setTurnAnnouncementShown(true); // Mark as shown so it doesn't repeat
      }
    }
  }, [matchData?.gameData?.gamePhase, matchData?.gameData?.turnDeciderDice, 
      matchData?.gameData?.turnDeciderChoice, matchData?.hostData, matchData?.opponentData, 
      user, previousGamePhase, turnAnnouncementShown]);
  
  // Track turn changes to reset Siphon when opponent's turn ends
  useEffect(() => {
    if (matchData && user && siphonActive) {
      const isHost = matchData.hostData.playerId === user.uid;
      const opponentPlayer = isHost ? matchData.opponentData : matchData.hostData;
      
      // If Siphon is active but it's no longer the opponent's turn, reset it
      if (!opponentPlayer.turnActive) {
        console.log('🔮 Siphon expired - opponent turn ended');
        setSiphonActive(false);
        showToast('💨 Siphon expired - opportunity missed!', 'warning', 4000);
      }
    }
  }, [matchData?.hostData?.turnActive, matchData?.opponentData?.turnActive, siphonActive, user, showToast, setSiphonActive]);
  
  // Auto-hide turn announcement after showing it for a few seconds
  useEffect(() => {
    if (showTurnAnnouncement) {
      const hideTimer = setTimeout(() => {
        setShowTurnAnnouncement(false);
      }, 4000); // Show for 4 seconds then hide
      
      return () => clearTimeout(hideTimer);
    }
  }, [showTurnAnnouncement]);
  
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

      // Check if opponent has Siphon active and this player is banking
      const isHost = matchData.hostData.playerId === playerId;
      const currentPlayer = isHost ? matchData.hostData : matchData.opponentData;
      const opponentPlayer = isHost ? matchData.opponentData : matchData.hostData;
      
      let siphonEffect: { isActive: boolean; opponentId: string } | undefined = undefined;
      
      // If Siphon is active and this player has turn points to steal
      if (siphonActive && matchData.gameData.turnScore > 0) {
        const pointsToSteal = Math.floor(matchData.gameData.turnScore / 2);
        
        // Show Siphon activation
        showToast(`🔮 Siphon triggered! Stolen ${pointsToSteal} points!`, 'success', 6000);
        
        console.log(`⚔️ Siphon activated: Stealing ${pointsToSteal} points from ${currentPlayer.playerDisplayName}`);
        
        // Prepare siphon effect for MatchService
        siphonEffect = {
          isActive: true,
          opponentId: opponentPlayer.playerId
        };
        
        // Reset Siphon state
        setSiphonActive(false);
      }

      await MatchService.bankScore(matchData.id!, playerId, siphonEffect);
    } catch (error) {
      console.error('❌ Error banking score:', error);
    }
  }, [matchData, user?.uid, siphonActive, showToast, setSiphonActive]);

  const handleAbilityUsed = useCallback((effect: any) => {
    console.log('🔮 HANDLE ABILITY USED CALLED:', { effect, hasMatchData: !!matchData, hasUser: !!user });
    
    if (!matchData || !user) return;
    
    try {
      console.log('🔮 Ability effect applied:', { effect, matchId: matchData.id });
      
      // Handle Luck Turner ability - Add to activeEffects
      if (effect.abilityId === 'luck_turner') {
        console.log('🍀 Luck Turner ability activated - adding to activeEffects');
        
        // Add to Firestore activeEffects
        const matchRef = doc(db, 'matches', matchData.id!);
        const newEffect = {
          effectId: `luck_turner_${Date.now()}`,
          abilityId: 'luck_turner',
          type: 'dice_manipulation',
          value: 1,
          expiresAt: Timestamp.fromMillis(Date.now() + 60000), // 60 seconds
          metadata: { activatedBy: user.uid }
        };
        
        updateDoc(matchRef, {
          [`gameData.activeEffects.${user.uid}`]: arrayUnion(newEffect)
        }).then(() => {
          console.log('✅ Luck Turner added to activeEffects in Firestore');
          showToast('🍀 Luck Turner activated! Watch the dice glow!', 'success', 5000);
        }).catch((err) => {
          console.error('❌ Failed to add Luck Turner to activeEffects:', err);
        });
        
        return;
      }
      
      // Handle Siphon ability specifically
      if (effect.abilityId === 'siphon') {
        console.log('⚔️ Siphon ability activated - waiting for opponent to bank...');
        
        // Set a flag in local state to track that Siphon is active
        // The actual stealing will happen when opponent banks
        setSiphonActive(true);
        
        // Show visual feedback that Siphon is active
        showToast('🔮 Siphon activated! Waiting for opponent to bank...', 'info', 8000);
        
        return;
      }
      
      // Handle other ability effects here
      console.log('Other ability effects not yet implemented');
      
    } catch (error) {
      console.error('❌ Error applying ability effect:', error);
    }
  }, [matchData, user, showToast]);

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
      controlsList="nodownload noplaybackrate nofullscreen"
      className={className}
      style={{ 
        pointerEvents: 'none',
        WebkitAppearance: 'none',
        outline: 'none'
      }}
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
    console.log('🎮 Match: useEffect triggered with roomId:', roomId, 'user:', user?.uid);
    if (!roomId || !user) {
      console.log('🎮 Match: Early return - missing roomId or user');
      return;
    }

    console.log('🎮 Match: Subscribing to match:', roomId);
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
      console.log('🎮 Match: Subscription callback called with data:', !!data);
      if (data) {
        console.log('🎮 Match: Received match data for match ID:', data.id);
        setMatchData(data);
        
        // Initialize game phase if needed
        if (!data.gameData.gamePhase) {
          MatchService.initializeGamePhase(roomId);
        }
        
        // Reset achievement batch for new match
        if (data.gameData.gamePhase === 'turnDecider') {
          resetBatch();
          // Only set match start time if not already set (prevents resetting during game)
          if (!matchStartTime.current) {
            matchStartTime.current = Date.now();
            console.log('⏱️ Match start time set for new match:', new Date(matchStartTime.current));
          }
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
              console.log('❌ Match: Setting error - match not found after timeout');
              setError('Match not found');
            }
            return prev;
          });
        }, 3000); // Increased timeout to 3 seconds to account for potential delays
      }
      setLoading(false);
    });

    // Start bot automation monitoring for this match
    BotAutomationService.startMatchMonitoring(roomId);

    return () => {
      // Remove performance-impacting logs
      // console.log('🎮 Match: Unsubscribing from match:', roomId);
      unsubscribe();
      
      // Stop bot automation monitoring
      BotAutomationService.stopMatchMonitoring(roomId);
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

    // Special handling for turn decider - slower, more dramatic animation
    if (diceNumber === 'turnDecider') {
      let currentSpeed = 100; // Slower initial speed: 100ms intervals
      let intervalId: NodeJS.Timeout;
      let elapsedTime = 0;
      let reelAnimationSpeed = 0.15; // Slower background reel speed

      const animateReel = () => {
        setDiceState((prev: any) => ({
          ...prev,
          currentNumber: Math.floor(Math.random() * 6) + 1
        }));
        
        elapsedTime += currentSpeed;
        const progress = elapsedTime / animationDuration;
        
        // 🎰 Phase 1 - Moderate Spinning (0-60% of duration)
        if (progress < 0.6) {
          // Speed: 100ms → 150ms intervals (slower than regular dice)
          currentSpeed = 100 + (progress / 0.6) * 50;
          reelAnimationSpeed = 0.15; // Background reel: 0.15s (slower)
        } 
        // 🎰 Phase 2 - Gradual Deceleration (60-85% of duration)
        else if (progress < 0.85) {
          const decelProgress = (progress - 0.6) / 0.25;
          // Speed: 150ms → 300ms intervals
          currentSpeed = 150 + (decelProgress * 150);
          // Background reel: 0.15s → 0.8s (gradual slowdown)
          reelAnimationSpeed = 0.15 + (decelProgress * 0.65);
        } 
        // 🎰 Phase 3 - Final Slow (85-100% of duration)
        else {
          const finalProgress = (progress - 0.85) / 0.15;
          // Speed: 300ms → 600ms intervals (very slow)
          currentSpeed = 300 + (finalProgress * 300);
          // Background reel: 0.8s → 2.5s (very slow)
          reelAnimationSpeed = 0.8 + (finalProgress * 1.7);
        }
        
        // Update the animation speed for the reel background
        setDiceState((prev: any) => ({
          ...prev,
          currentNumber: Math.floor(Math.random() * 6) + 1,
          reelSpeed: reelAnimationSpeed,
          animationKey: Date.now()
        }));
        
        if (elapsedTime < animationDuration) {
          intervalId = setTimeout(animateReel, currentSpeed);
        }
      };

      animateReel();

      // Finish animation with direct transition (no overshoot for turn decider)
      setTimeout(() => {
        clearTimeout(intervalId);
        
        setDiceState({
          isSpinning: false,
          currentNumber: finalValue,
          finalNumber: finalValue,
          reelSpeed: 0.15, // Reset to slower reel speed for turn decider
          animationKey: Date.now()
        });
      }, animationDuration);
      
      return; // Exit early for turn decider
    }

    // Special handling for dice 2 - simplified animation without slowdown
    if (diceNumber === 2) {
      // Simple animation for dice 2 - consistent speed throughout
      let currentSpeed = 80; // Consistent speed
      let intervalId: NodeJS.Timeout;
      let elapsedTime = 0;

      const animateReel = () => {
        setDiceState((prev: any) => ({
          ...prev,
          currentNumber: Math.floor(Math.random() * 6) + 1
        }));
        
        elapsedTime += currentSpeed;
        
        if (elapsedTime < animationDuration) {
          intervalId = setTimeout(animateReel, currentSpeed);
        }
      };

      intervalId = setTimeout(animateReel, currentSpeed);

      // Finish animation directly without overshoot or slowdown
      setTimeout(() => {
        clearTimeout(intervalId);
        
        setDiceState({
          isSpinning: false,
          currentNumber: finalValue,
          finalNumber: finalValue,
          reelSpeed: 0.1,
          animationKey: Date.now()
        });
      }, animationDuration);
      
      return; // Exit early for dice 2
    }

    // Original 3-phase animation for dice 1 and turnDecider
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

    // 🎰 Overshoot Effect - Shows wrong number briefly before final value (can be disabled if flutter persists)
    setTimeout(() => {
      clearTimeout(intervalId);
      clearTimeout(nearMissTimeout);
      
      // Option 1: Overshoot effect with minimal tick-back for excitement
      const overshoot = finalValue < 6 ? finalValue + 1 : finalValue - 1;
      setDiceState({
        isSpinning: false,
        currentNumber: overshoot,
        finalNumber: finalValue,
        reelSpeed: 0.1, // Reset reel speed
        animationKey: Date.now()
      });

      // 🎰 Tick-Back Delay - 50ms pause before showing final result (further reduced)
      setTimeout(() => {
        setDiceState({
          isSpinning: false,
          currentNumber: finalValue,
          finalNumber: finalValue,
          reelSpeed: 0.1, // Reset reel speed
          animationKey: Date.now()
        });
      }, 50); // Further reduced from 75ms to 50ms for minimal visual flutter
      
      // Option 2: Direct transition (uncomment below and comment above to eliminate flutter completely)
      // setDiceState({
      //   isSpinning: false,
      //   currentNumber: finalValue,
      //   finalNumber: finalValue,
      //   reelSpeed: 0.1,
      //   animationKey: Date.now()
      // });
      
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

  // Abandonment notification handlers
  const handleClaimVictory = async () => {
    if (!matchData || !user) return;
    
    try {
      console.log('🏆 Player claiming victory due to opponent abandonment');
      
      // End the match with current user as winner
      await MatchService.endMatch(matchData.id!, user.uid);
      
      // Hide the notification
      setShowAbandonmentNotification(false);
      if (abandonmentTimer) {
        clearInterval(abandonmentTimer);
        setAbandonmentTimer(null);
      }
    } catch (error) {
      console.error('❌ Error claiming victory:', error);
    }
  };

  const handleWaitForOpponent = () => {
    console.log('⏰ Player choosing to wait for opponent return');
    
    // Hide the notification but reset timer to check again later
    setShowAbandonmentNotification(false);
    if (abandonmentTimer) {
      clearInterval(abandonmentTimer);
      setAbandonmentTimer(null);
    }
    
    // Reset the last seen time to current time to restart the timer
    setOpponentLastSeen(new Date());
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
      // Turn Decider Dice: 2000ms (2.0 seconds) - slower for dramatic effect
      startSlotMachineAnimation('turnDecider', matchData.gameData.turnDeciderDice, 2000);
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

  // Abandonment detection - monitor when opponent leaves during match
  useEffect(() => {
    if (!matchData || !user) return;

    // Find opponent player data
    const isHost = matchData.hostData.playerId === user.uid;
    const opponentData = isHost ? matchData.opponentData : matchData.hostData;
    
    if (opponentData && opponentData.lastHeartbeat) {
      setOpponentLastSeen(opponentData.lastHeartbeat.toDate());
      
      // Clear any existing abandonment notification if opponent is active
      if (showAbandonmentNotification) {
        setShowAbandonmentNotification(false);
        if (abandonmentTimer) {
          clearInterval(abandonmentTimer);
          setAbandonmentTimer(null);
        }
      }
      return;
    }

    // Opponent data is missing or lastHeartbeat is old - start abandonment timer if not already started
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
  }, [matchData?.hostData, matchData?.opponentData, opponentLastSeen, abandonmentTimer, showAbandonmentNotification, user]);

  // Remove loading state entirely - don't show any loading animations
  // User requested no loading animations between scenes and screens
  
  if (error || !matchData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
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
      {/* Match Abandonment Notification */}
      {showAbandonmentNotification && (
        <MatchAbandonmentNotification
          onClaim={handleClaimVictory}
          onWait={handleWaitForOpponent}
          opponentName={(() => {
            const isHost = matchData.hostData.playerId === user?.uid;
            return isHost ? matchData.opponentData.playerDisplayName : matchData.hostData.playerDisplayName;
          })()}
        />
      )}

      {/* Game Over Screen - Full Screen Overlay */}
      {matchData.gameData.gamePhase === 'gameOver' && showGameOverScreen && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed inset-0 z-40 flex items-center justify-center game-over-container"
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
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`w-full h-screen match-container ${matchData.gameData.gamePhase === 'gameOver' ? 'hidden' : 'flex'} flex-col items-center justify-start md:justify-center px-2`}
        style={{ position: 'relative', left: 0, top: 0, transform: 'none' }}
      >
        {/* Game Arena */}
        <div className="w-[90vw] mx-auto flex items-center justify-center" style={{ position: 'relative' }}>
          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between gap-8 w-full">
            
            {/* Player 1 (Current User - Left Side) */}
            <AnimatePresence>
              {(matchData.gameData.gamePhase as string) !== 'turnDecider' && !showTurnAnnouncement && (
                <motion.div 
                  className="w-[40%] max-w-lg"
                  initial={{ opacity: 0, x: 80, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -50, scale: 0.9 }}
                  transition={{ 
                    duration: 0.7, 
                    ease: "easeOut",
                    delay: 0.3
                  }}
                >
              {/* Player Name Above Container - Left Aligned */}
              <motion.h2 
                className="text-3xl font-bold mb-4 text-left"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                }}
                animate={{
                  color: '#ffffff',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                }}
                transition={{ 
                  duration: 0.5,
                  ease: "easeInOut"
                }}
              >
                {currentPlayer.playerDisplayName}
              </motion.h2>
              
              <motion.div
                className="relative rounded-3xl overflow-hidden shadow-2xl border-4 z-20"
                style={{ 
                  borderColor: '#ffffff',
                  height: '500px'
                }}
                animate={{
                  borderColor: '#ffffff',
                  boxShadow: '0 0 15px rgba(255, 255, 255, 0.2)'
                }}
                transition={{ 
                  duration: 0.5,
                  ease: "easeInOut"
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
                      background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.8) 50%, rgba(30, 41, 59, 0.9) 100%)"
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
              </motion.div>
              
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
                </motion.div>
              )}
            </AnimatePresence>

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
                    <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-2xl p-8 backdrop-blur-sm border border-purple-500/30 shadow-2xl max-w-2xl mx-auto">
                      <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="text-4xl md:text-6xl font-bold mb-6"
                        style={{ 
                          fontFamily: "Audiowide",
                          background: turnAnnouncementData.isCurrentPlayerFirst 
                            ? "linear-gradient(45deg, #FFD700, #FFA500)" 
                            : "linear-gradient(45deg, #FF6B6B, #FF8E8E)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                          textShadow: turnAnnouncementData.isCurrentPlayerFirst 
                            ? "0 0 20px rgba(255, 215, 0, 0.5)" 
                            : "0 0 20px rgba(255, 107, 107, 0.5)"
                        }}
                      >
                        {turnAnnouncementData.isCurrentPlayerFirst ? "YOU GO FIRST!" : `${turnAnnouncementData.winner.toUpperCase()} GOES FIRST!`}
                      </motion.h2>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="bg-white/10 rounded-xl p-4 border border-white/20"
                      >
                        <p
                          className="text-xl md:text-2xl text-white font-bold"
                          style={{ 
                            fontFamily: "Audiowide",
                            textShadow: "2px 2px 4px rgba(0,0,0,0.8)"
                          }}
                        >
                          GET READY TO ROLL!
                        </p>
                      </motion.div>
                    </div>
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
                      onAbilityUsed={handleAbilityUsed}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Player 2 (Opponent - Right Side) */}
            <AnimatePresence>
              {(matchData.gameData.gamePhase as string) !== 'turnDecider' && !showTurnAnnouncement && (
                <motion.div 
                  className="w-[40%] max-w-lg"
                  initial={{ opacity: 0, x: 80, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 50, scale: 0.9 }}
                  transition={{ 
                    duration: 0.7, 
                    ease: "easeOut",
                    delay: 0.5
                  }}
                >
              {/* Player Name Above Container - Right Aligned */}
              <motion.h2 
                className="text-3xl font-bold mb-4 text-right"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                }}
                animate={{
                  color: '#ffffff',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                }}
                transition={{ 
                  duration: 0.5,
                  ease: "easeInOut"
                }}
              >
                {opponent.playerDisplayName}
              </motion.h2>
              
              <motion.div
                className="relative rounded-3xl overflow-hidden shadow-2xl border-4 z-20"
                style={{ 
                  borderColor: '#ffffff',
                  height: '500px'
                }}
                animate={{
                  borderColor: '#ffffff',
                  boxShadow: '0 0 15px rgba(255, 255, 255, 0.2)'
                }}
                transition={{ 
                  duration: 0.5,
                  ease: "easeInOut"
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
                      background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.8) 50%, rgba(30, 41, 59, 0.9) 100%)"
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
              </motion.div>
              
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Layout - Stacked */}
          <div className="md:hidden flex flex-col items-center w-full" style={{ maxWidth: '100vw', margin: '0 auto' }}>
            
            {/* User Profiles Section - Top Corners of Viewport - Equal spacing */}
            <AnimatePresence>
              {(matchData.gameData.gamePhase as string) !== 'turnDecider' && !showTurnAnnouncement && (
                <motion.div 
                  className="fixed top-0 left-0 right-0 flex justify-between z-20" 
                  style={{ 
                    gap: '0px', 
                    paddingTop: 'max(env(safe-area-inset-top, 0px), 80px)',
                    paddingLeft: '16px',
                    paddingRight: '16px'
                  }}
                  initial={{ opacity: 0, y: -60, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0, 
                    scale: 1,
                    transition: {
                      opacity: { duration: 0.6, ease: "easeOut" },
                      y: { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
                      scale: { duration: 0.7, ease: "backOut", delay: 0.1 }
                    }
                  }}
                  exit={{ 
                    opacity: 0, 
                    y: -80, 
                    scale: 0.7,
                    transition: {
                      duration: 0.5,
                      ease: "easeIn"
                    }
                  }}
                >
              {/* Current Player Profile - Left */}
              <motion.div 
                style={{ width: '45vw', aspectRatio: '16/9' }} // 16:9 aspect ratio, 45vw width
                initial={{ opacity: 0, x: -100, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  x: 0, 
                  scale: 1,
                  transition: {
                    duration: 0.7,
                    ease: [0.4, 0, 0.2, 1],
                    delay: 0.3
                  }
                }}
                exit={{ opacity: 0, x: -80, scale: 0.9 }}
              >
                {/* Player Name Above Display */}
                <h3 
                  className="font-bold text-white mb-2 text-center px-1"
                  style={{ 
                    fontFamily: 'Audiowide',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    fontSize: 'clamp(12px, 3.5vw, 16px)', // Slightly bigger font size
                    lineHeight: '1.1',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {currentPlayer.playerDisplayName}
                </h3>
                
                <motion.div
                  className="relative rounded-xl overflow-hidden shadow-lg"
                  style={{ 
                    height: '100%',
                    width: '100%'
                  }}
                  animate={{
                    boxShadow: '0 0 8px rgba(0, 0, 0, 0.3)'
                  }}
                  transition={{ 
                    duration: 0.5,
                    ease: "easeInOut"
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
                        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.8) 50%, rgba(30, 41, 59, 0.9) 100%)"
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
                </motion.div>
              </motion.div>

              {/* Opponent Profile - Right */}
              <motion.div 
                style={{ width: '45vw', aspectRatio: '16/9' }} // 16:9 aspect ratio, 45vw width
                initial={{ opacity: 0, x: 100, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  x: 0, 
                  scale: 1,
                  transition: {
                    duration: 0.7,
                    ease: [0.4, 0, 0.2, 1],
                    delay: 0.5
                  }
                }}
                exit={{ opacity: 0, x: 80, scale: 0.9 }}
              >
                {/* Player Name Above Display */}
                <h3 
                  className="font-bold text-white mb-2 text-center px-1"
                  style={{ 
                    fontFamily: 'Audiowide',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    fontSize: 'clamp(12px, 3.5vw, 16px)', // Slightly bigger font size
                    lineHeight: '1.1',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {opponent.playerDisplayName}
                </h3>
                
                <motion.div
                  className="relative rounded-xl overflow-hidden shadow-lg"
                  style={{ 
                    height: '100%',
                    width: '100%'
                  }}
                  animate={{
                    boxShadow: '0 0 8px rgba(0, 0, 0, 0.3)'
                  }}
                  transition={{ 
                    duration: 0.5,
                    ease: "easeInOut"
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
                        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.8) 50%, rgba(30, 41, 59, 0.9) 100%)"
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
                </motion.div>
                
              </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Center Dice Area - Middle */}
            <div className="w-full flex flex-col items-center justify-center" style={{ paddingTop: 'calc(20vh + 60px)', paddingBottom: '20px', minHeight: '40vh', maxWidth: '100%', overflow: 'visible' }}>
              {/* Phase-specific content with professional transitions */}
              <AnimatePresence mode="wait">
                {matchData.gameData.gamePhase === 'turnDecider' && (
                  <motion.div
                    key="turnDecider-mobile"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ 
                      opacity: 0, 
                      scale: 1.05,
                      transition: { 
                        duration: 0.8,
                        ease: [0.4, 0, 0.2, 1]
                      }
                    }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
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
                    initial={{ 
                      opacity: 0, 
                      scale: 0.9,
                      y: 50
                    }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      y: 0
                    }}
                    exit={{ 
                      opacity: 0, 
                      scale: 0.95,
                      y: -30,
                      transition: { 
                        duration: 0.4,
                        ease: "easeIn"
                      }
                    }}
                    transition={{ 
                      duration: 0.8, 
                      ease: [0.4, 0, 0.2, 1],
                      delay: 0.2
                    }}
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
                      onAbilityUsed={handleAbilityUsed}
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

