'use client';

// CACHE BUST: v2.1.0 - Performance Optimizations Applied
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from '@/utils/performance';
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
import { doc, updateDoc, Timestamp, arrayUnion, deleteField } from 'firebase/firestore';
import MatchAbandonmentNotification from '@/components/notifications/MatchAbandonmentNotification';
import { useToast } from '@/context/ToastContext';
import { useMatchBackground } from '@/hooks/useOptimizedBackground';
import { MatchChatFeed } from '@/components/match/MatchChatFeed';
import { MatchVoiceButton } from '@/components/match/MatchVoiceButton';
import { useMatchChat } from '@/context/MatchChatContext';
import { getBackgroundById, resolveBackgroundPath } from '@/config/backgrounds';
import { useBackground } from '@/context/BackgroundContext';
import AuraCounter from '@/components/ui/AuraCounter';
import { AbilityToast } from '@/components/abilities/AbilityToast';

interface MatchProps {
  gameMode?: string;
  roomId?: string;
}

export const Match: React.FC<MatchProps> = ({ gameMode, roomId }) => {
  const DEBUG_LOGS = process.env.NEXT_PUBLIC_DEBUG_LOGS === '1';
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
  const { DisplayBackgroundEquip } = useBackground(); // Get user's Vibin background
  const { initializeChat, endChat, clearChat, sendMessage, muteState, session } = useMatchChat();
  
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
  const matchStartTime = useRef<number | null>(null);
  
  // Remove performance-impacting debug logs
  // console.log('🔍 DEBUG: Match component context:', {
  //   userUid: user?.uid,
  //   hasSetCurrentSection: typeof setCurrentSection === 'function'
  // });
  
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGameOverScreen, setShowGameOverScreen] = useState(false);
  
  // 🚀 PERFORMANCE: Memoize frequently accessed match data properties
  const gamePhase = useMemo(() => matchData?.gameData?.gamePhase, [matchData?.gameData?.gamePhase]);
  const memoizedIsRolling = useMemo(() => matchData?.gameData?.isRolling ?? false, [matchData?.gameData?.isRolling]);
  const memoizedTurnScore = useMemo(() => matchData?.gameData?.turnScore ?? 0, [matchData?.gameData?.turnScore]);
  const winner = useMemo(() => matchData?.gameData?.winner, [matchData?.gameData?.winner]);
  
  // 🚀 PERFORMANCE: Memoize player identity to avoid recalculation
  const memoizedIsHost = useMemo(() => {
    return matchData?.hostData?.playerId === user?.uid;
  }, [matchData?.hostData?.playerId, user?.uid]);
  
  // 🧢 Hard Hat animation states
  const [showHardHatInitialCurrent, setShowHardHatInitialCurrent] = useState(false);
  const [showHardHatInitialOpponent, setShowHardHatInitialOpponent] = useState(false);
  const [hardHatWhiteBorderCurrent, setHardHatWhiteBorderCurrent] = useState(false);
  const [hardHatWhiteBorderOpponent, setHardHatWhiteBorderOpponent] = useState(false);
  const [showHardHatUsedCurrent, setShowHardHatUsedCurrent] = useState(false);
  const [showHardHatUsedOpponent, setShowHardHatUsedOpponent] = useState(false);
  const previousHardHatStateRef = useRef<{current: boolean, opponent: boolean}>({current: false, opponent: false});
  
  // 🪓 Aura Axe animation state
  const [auraAxeRedPulseOpponent, setAuraAxeRedPulseOpponent] = useState(false);
  
  // Ability toast notification state
  const [activeAbilityToast, setActiveAbilityToast] = useState<string | null>(null);
  
  // Video playback management - keep videos mounted, control visibility
  const [userInteracted, setUserInteracted] = useState(false);
  const topVideoRef = useRef<HTMLVideoElement | null>(null);
  const bottomVideoRef = useRef<HTMLVideoElement | null>(null);
  
  // Turn Decider Transition States
  const [showTurnDeciderTransition, setShowTurnDeciderTransition] = useState(false);
  const [showWinnerAnnouncement, setShowWinnerAnnouncement] = useState(false);
  const [winnerAnnouncementText, setWinnerAnnouncementText] = useState('');
  const [gameplayContentReady, setGameplayContentReady] = useState(false);
  
  // Player card video autoplay detection
  const [currentPlayerVideoAutoplay, setCurrentPlayerVideoAutoplay] = useState(true);
  const [opponentVideoAutoplay, setOpponentVideoAutoplay] = useState(true);
  
  // Initialize match start time when match data first loads
  useEffect(() => {
    if (matchData && !matchStartTime.current) {
      const gameStartTime = matchData.gameData?.startedAt?.toMillis?.() || 
                           matchData.startedAt?.toMillis?.() || 
                           matchData.createdAt?.toMillis?.();
      matchStartTime.current = gameStartTime || Date.now();
    }
  }, [matchData]);
  
  // Initialize match chat when match data is available
  useEffect(() => {
    if (matchData && matchData.id && user) {
      const isBot = matchData.hostData.playerId.includes('bot_') || matchData.opponentData?.playerId?.includes('bot_');
      
      // Only initialize chat for non-bot matches
      if (!isBot) {
        initializeChat(
          matchData.id,
          matchData.hostData.playerId,
          matchData.opponentData?.playerId || 'unknown',
          matchData.hostData.playerDisplayName || 'Player 1',
          matchData.opponentData?.playerDisplayName || 'Player 2',
          'en', // Default to English for both players
          'en'
        ).catch((error) => {
          console.error('❌ Failed to initialize match chat:', error);
        });
      }
    }
    
    // Cleanup chat on unmount or when match ends
    return () => {
      if (matchData?.gameData?.gamePhase === 'gameOver') {
        endChat().catch((error) => {
          console.error('❌ Failed to end match chat:', error);
        });
      } else {
        clearChat();
      }
    };
  }, [matchData?.id, user?.uid]);
  
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
  
  // Play videos when user interacts (grants autoplay permission)
  useEffect(() => {
    if (userInteracted && topVideoRef.current && bottomVideoRef.current) {
      const playVideo = (video: HTMLVideoElement) => {
        video.muted = true;
        const playPromise = video.play();
        if (playPromise) {
          playPromise.catch((err) => {
            console.warn('Video autoplay prevented:', err);
          });
        }
      };
      
      playVideo(topVideoRef.current);
      playVideo(bottomVideoRef.current);
    }
  }, [userInteracted]);
  
  // Register with global video playback manager
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    import('@/utils/videoPlaybackManager').then(({ videoPlaybackManager }) => {
      const unregister = videoPlaybackManager.registerCallback(() => {
        if (DEBUG_LOGS) {
          console.log('🎬 Match: Received playback trigger from manager');
        }
        setUserInteracted(true);
        
        // Also play videos immediately
        if (topVideoRef.current) {
          videoPlaybackManager.playVideo(topVideoRef.current);
        }
        if (bottomVideoRef.current) {
          videoPlaybackManager.playVideo(bottomVideoRef.current);
        }
      });
      
      return unregister;
    });
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
  
  // 🍀 REMOVE LUCK TURNER EFFECT WHEN ROLL COMPLETES
  // Track isRolling state and clear luck_turner effect when roll finishes
  const previousRollingState = useRef<boolean | null>(null);
  
  // Track previous turn decider dice value to trigger animation only once
  const previousTurnDeciderDice = useRef<number | null>(null);
  
  useEffect(() => {
    if (!matchData || !user?.uid) return;
    
    const currentIsRolling = matchData.gameData.isRolling;
    
    // If rolling just changed from true to false, the roll has completed
    if (previousRollingState.current === true && currentIsRolling === false) {
      // Check both players for luck_turner effects to remove
      const hostId = matchData.hostData.playerId;
      const opponentId = matchData.opponentData.playerId;
      const matchRef = doc(db, 'matches', matchData.id!);
      
      // Remove luck_turner effect from host if present
      if (matchData.gameData.activeEffects?.[hostId]) {
        const hostEffects = matchData.gameData.activeEffects[hostId];
        const hasLuckTurner = hostEffects.some((effect: any) => 
          effect.abilityId === 'luck_turner' || effect.effectId?.includes('luck_turner')
        );
        
        if (hasLuckTurner) {
          const remainingEffects = hostEffects.filter((effect: any) => 
            effect.abilityId !== 'luck_turner' && !effect.effectId?.includes('luck_turner')
          );
          updateDoc(matchRef, {
            [`gameData.activeEffects.${hostId}`]: remainingEffects
          }).catch((err) => {
            console.error('❌ Failed to remove Luck Turner effect:', err);
          });
        }
      }
      
      // Remove luck_turner effect from opponent if present
      if (matchData.gameData.activeEffects?.[opponentId]) {
        const opponentEffects = matchData.gameData.activeEffects[opponentId];
        const hasLuckTurner = opponentEffects.some((effect: any) => 
          effect.abilityId === 'luck_turner' || effect.effectId?.includes('luck_turner')
        );
        
        if (hasLuckTurner) {
          const remainingEffects = opponentEffects.filter((effect: any) => 
            effect.abilityId !== 'luck_turner' && !effect.effectId?.includes('luck_turner')
          );
          updateDoc(matchRef, {
            [`gameData.activeEffects.${opponentId}`]: remainingEffects
          }).catch((err) => {
            console.error('❌ Failed to remove Luck Turner effect:', err);
          });
        }
      }
    }
    
    // Update previous state
    previousRollingState.current = currentIsRolling;
  }, [matchData?.gameData.isRolling, matchData?.id, user?.uid]);
  
  // 🧢 HARD HAT ANIMATION LOGIC
  // Monitor Hard Hat activation and usage
  useEffect(() => {
    if (!matchData || !user?.uid) return;
    
    const hostId = matchData.hostData.playerId;
    const opponentId = matchData.opponentData.playerId;
    const isHost = hostId === user.uid;
    const currentPlayerId = user.uid;
    const opponentPlayerId = isHost ? opponentId : hostId;
    
    // Check current player's Hard Hat status
    const currentHasHardHat = matchData.gameData.activeEffects?.[currentPlayerId]?.some((effect: any) =>
      effect.abilityId === 'hard_hat' || effect.effectId?.includes('hard_hat')
    ) || false;
    
    // Check opponent's Hard Hat status
    const opponentHasHardHat = matchData.gameData.activeEffects?.[opponentPlayerId]?.some((effect: any) =>
      effect.abilityId === 'hard_hat' || effect.effectId?.includes('hard_hat')
    ) || false;
    
    // CURRENT PLAYER: Hard Hat just activated
    if (currentHasHardHat && !previousHardHatStateRef.current.current) {
      setShowHardHatInitialCurrent(true);
    }
    
    // CURRENT PLAYER: Hard Hat was active but now deactivated (it was used)
    if (!currentHasHardHat && previousHardHatStateRef.current.current) {
      setShowHardHatUsedCurrent(true);
      setHardHatWhiteBorderCurrent(false); // Remove border immediately
      
      setTimeout(() => {
        setShowHardHatUsedCurrent(false);
      }, 2000); // Clear after animation
    }
    
    // OPPONENT: Hard Hat was active but now deactivated (it was used) - BOTH PLAYERS SEE THIS
    if (!opponentHasHardHat && previousHardHatStateRef.current.opponent) {
      setShowHardHatUsedOpponent(true);
      setHardHatWhiteBorderOpponent(false); // Remove border (only on opponent's screen)
      
      setTimeout(() => {
        setShowHardHatUsedOpponent(false);
      }, 2000);
    }
    
    // Update previous state
    previousHardHatStateRef.current = { current: currentHasHardHat, opponent: opponentHasHardHat };
  }, [matchData?.gameData.activeEffects, user?.uid, matchData?.hostData.playerId, matchData?.opponentData.playerId]);
  
  // Listen for Hard Hat usage notifications
  useEffect(() => {
    if (!matchData?.gameData?.abilityNotifications || !user?.uid) return;
    
    const notification = matchData.gameData.abilityNotifications[user.uid];
    
    if (notification?.abilityId === 'hard_hat_used') {
      // Show the notification toast
      setActiveAbilityToast('hard-hat-used');
      
      // Clear the notification from Firestore
      if (roomId) {
        const matchRef = doc(db, 'matches', roomId);
        updateDoc(matchRef, {
          [`gameData.abilityNotifications.${user.uid}`]: deleteField()
        }).catch(error => {
          console.error('Error clearing Hard Hat notification:', error);
        });
      }
    }
  }, [matchData?.gameData?.abilityNotifications, user?.uid, roomId]);
  
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
      const isGameOverNow = gamePhase === 'gameOver';
      setIsGameOver(isGameOverNow);
      
      // Track achievement when game ends
      if (isGameOverNow && winner && user?.uid) {
        const playerWon = winner === (memoizedIsHost ? 'host' : 'opponent');
        
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
    if (gamePhase === 'gameOver') {
      const timer = setTimeout(() => {
        setShowGameOverScreen(true);
      }, 1000); // 1 second delay

      return () => clearTimeout(timer);
    } else {
      setShowGameOverScreen(false);
    }
  }, [gamePhase]);
  
  // Smooth Turn Decider Transition - Keep backgrounds visible and show winner announcement
  useEffect(() => {
    const currentPhase = gamePhase;
    
    // Track phase transitions
    if (currentPhase && currentPhase !== previousGamePhase) {
      setPreviousGamePhase(currentPhase);
      
      // When transitioning from turnDecider to gameplay
      if (previousGamePhase === 'turnDecider' && currentPhase === 'gameplay' && 
          matchData?.gameData?.turnDeciderDice && matchData?.gameData?.turnDeciderChoice &&
          !turnAnnouncementShown) {
        
        // Determine who goes first
        const diceValue = matchData.gameData.turnDeciderDice;
        const choice = matchData.gameData.turnDeciderChoice;
        const isEven = diceValue % 2 === 0;
        const choiceMatches = (choice === 'even' && isEven) || (choice === 'odd' && !isEven);
        
        const playerNumber = matchData.gameData.turnDecider;
        const isHost = matchData.hostData.playerId === user?.uid;
        const currentPlayerNumber = isHost ? 1 : 2;
        
        let winner: string;
        
        if (choiceMatches) {
          winner = playerNumber === 1 ? 
            (matchData.hostData?.playerDisplayName || 'Player 1') : 
            (matchData.opponentData?.playerDisplayName || 'Player 2');
        } else {
          const otherPlayerNumber = playerNumber === 1 ? 2 : 1;
          winner = otherPlayerNumber === 1 ? 
            (matchData.hostData?.playerDisplayName || 'Player 1') : 
            (matchData.opponentData?.playerDisplayName || 'Player 2');
        }
        
        // Start transition sequence
        setTurnAnnouncementShown(true);
        setShowTurnDeciderTransition(true); // Keep turn decider backgrounds visible
        
        // Get game mode explainer text
        const gameMode = matchData.gameMode?.toLowerCase() || 'classic';
        let gameModeExplainer = 'FIRST TO 100'; // default
        if (gameMode === 'quickfire') {
          gameModeExplainer = 'FIRST TO 50';
        } else if (gameMode === 'classic') {
          gameModeExplainer = 'FIRST TO 100';
        } else if (gameMode === 'zero-hour' || gameMode === 'zerohour') {
          gameModeExplainer = 'RACE TO 0';
        } else if (gameMode === 'last-line' || gameMode === 'lastline') {
          gameModeExplainer = 'ATTACK TO 100';
        }
        
        // Show "goes first" announcement first after 500ms
        setTimeout(() => {
          setWinnerAnnouncementText(`${winner} goes first`);
          setShowWinnerAnnouncement(true);
          setGameplayContentReady(false); // Start loading gameplay content
        }, 500);
        
        // Morph to game mode explainer after 1 second (1500ms total)
        setTimeout(() => {
          setWinnerAnnouncementText(gameModeExplainer);
        }, 1500);
        
        // Mark gameplay content as ready after 2 seconds (gives time for components to mount)
        setTimeout(() => {
          setGameplayContentReady(true);
        }, 2500);
        
        // Once content is ready, animate exit after longer delay for smoother transition
        setTimeout(() => {
          setShowWinnerAnnouncement(false); // Fade out text
          
          // After text fades, slide backgrounds away
          setTimeout(() => {
            setShowTurnDeciderTransition(false);
          }, 1000); // Additional 1000ms for text fade (increased from 500ms)
        }, 5000); // Increased from 4000ms to 5000ms for longer transition delay with new explainer text
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
    if (!matchData || !user) return;
    
    try {
      // Show ability toast notification for all abilities
      if (effect.abilityId) {
        setActiveAbilityToast(effect.abilityId);
      }
      
      // Handle Luck Turner ability - Add to activeEffects
      if (effect.abilityId === 'luck_turner') {
        
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
        }).catch((err) => {
          console.error('❌ Failed to add Luck Turner to activeEffects:', err);
        });
        
        return;
      }
      
      // Handle Siphon ability specifically
      if (effect.abilityId === 'siphon') {
        // Set a flag in local state to track that Siphon is active
        // The actual stealing will happen when opponent banks
        setSiphonActive(true);
        
        // Show visual feedback that Siphon is active
        showToast('🔮 Siphon activated! Waiting for opponent to bank...', 'info', 8000);
        
        return;
      }
      
      // Handle Hard Hat ability - trigger initial animation immediately from callback
      if (effect.abilityId === 'hard_hat') {
        setShowHardHatInitialCurrent(true);
        return;
      }
      
      // Handle Aura Axe ability - trigger red pulse on opponent card (visible to activating player only)
      if (effect.abilityId === 'aura_axe') {
        console.log('🪓 Aura Axe activated - triggering red pulse on opponent card');
        setAuraAxeRedPulseOpponent(true);
        
        // Stop pulse after 2 complete cycles (2 pulses x 0.8s each = 1.6s)
        setTimeout(() => {
          setAuraAxeRedPulseOpponent(false);
        }, 1600);
        
        return;
      }
      
    } catch (error) {
      console.error('❌ Error applying ability effect:', error);
    }
  }, [matchData, user, showToast]);

  const getValidBackgroundObject = useCallback((background: any) => {
    // Use new Background System V2.0
    const defaultBackground = getBackgroundById('relax');
    
    if (!background) {
      return defaultBackground;
    }
    
    // Check if background has ID (new format)
    if (typeof background === 'object' && background.id) {
      const bg = getBackgroundById(background.id);
      if (bg) {
        return bg;
      }
    }
    
    // Legacy format: has name/file/type - migrate to new system
    if (typeof background === 'object' && background.name) {
      const bg = getBackgroundById(background.name.toLowerCase().replace(/\s+/g, '-'));
      if (bg) {
        return bg;
      }
    }
    
    // If background is a string (background ID or name)
    if (typeof background === 'string') {
      const bg = getBackgroundById(background);
      if (bg) {
        return bg;
      }
    }
    
    return defaultBackground;
  }, []);

  const VideoBackground = useCallback(({ src, className }: { src: string; className: string }) => {
    const [videoLoaded, setVideoLoaded] = useState(false);
    const videoImageSrc = src.replace('/Videos/', '/Video Images/').replace('.mp4', '.webp');

    return (
      <>
        {/* Show image placeholder until video loads */}
        {!videoLoaded && (
          <img
            src={videoImageSrc}
            alt="Loading background"
            className={className}
            style={{ position: 'absolute', inset: 0 }}
          />
        )}
        <video
          autoPlay
          loop
          muted
          playsInline
          webkit-playsinline="true"
          x5-playsinline="true"
          x5-video-player-type="h5-page"
          x5-video-player-fullscreen="false"
          controls={false}
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          className={className}
          style={{ 
            pointerEvents: 'none',
            outline: 'none',
            opacity: videoLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
          onLoadedMetadata={(e) => {
            const video = e.target as HTMLVideoElement;
            video.muted = true;
            video.play().catch(() => {});
          }}
          onCanPlay={(e) => {
            const video = e.target as HTMLVideoElement;
            video.muted = true;
            if (video.paused) video.play().catch(() => {});
          }}
          onLoadedData={(e) => {
            const video = e.target as HTMLVideoElement;
            video.muted = true;
            if (video.paused) video.play().catch(() => {});
            setVideoLoaded(true);
          }}
          onSuspend={(e) => {
            const video = e.target as HTMLVideoElement;
            if (video.paused) video.play().catch(() => {});
          }}
          onPause={(e) => {
            const video = e.target as HTMLVideoElement;
            setTimeout(() => {
              if (video.paused) video.play().catch(() => {});
            }, 100);
          }}
          onError={(e) => {
            console.error('❌ Background video failed to load:', src, e);
            setVideoLoaded(true); // Show placeholder on error
          }}
        >
          <source src={src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </>
    );
  }, []);

  const ImageBackground = useCallback(({ src, alt, className }: { src: string; alt: string; className: string }) => (
    <img
      src={src}
      alt={alt}
      className={className}
    />
  ), []);

  // Memoized background objects - computed before early returns to comply with hooks rules
  const currentPlayerBackground = useMemo(() => {
    if (!matchData || !user) return null;
    const isHost = matchData.hostData.playerId === user.uid;
    const currentPlayer = isHost ? matchData.hostData : matchData.opponentData;
    return getValidBackgroundObject(currentPlayer.matchBackgroundEquipped);
  }, [matchData, user]);
  
  const opponentBackground = useMemo(() => {
    if (!matchData || !user) return null;
    const isHost = matchData.hostData.playerId === user.uid;
    const opponent = isHost ? matchData.opponentData : matchData.hostData;
    return getValidBackgroundObject(opponent.matchBackgroundEquipped);
  }, [matchData, user]);

  // Get optimized backgrounds for both players
  const { backgroundPath: currentPlayerBgPath, isVideo: currentPlayerBgIsVideo } = useMatchBackground(currentPlayerBackground as any);
  const { backgroundPath: opponentBgPath, isVideo: opponentBgIsVideo } = useMatchBackground(opponentBackground as any);

  // Get turn decider backgrounds from player data
  // TOP = Opponent's background, BOTTOM = Current user's background
  const topVideo = useMemo(() => {
    if (!matchData || !user) return '/backgrounds/Game Backgrounds/Turn Decider/Best Quality/Crazy Cough.mp4';
    
    // Get opponent's data (opposite of current user)
    const isHost = matchData.hostData.playerId === user.uid;
    const opponentDeciderBg = isHost 
      ? matchData.opponentData?.turnDeciderBackgroundEquipped 
      : matchData.hostData.turnDeciderBackgroundEquipped;
    
    if (DEBUG_LOGS) {
      console.log('🎬 Turn Decider TOP video resolution:', {
      isHost,
      opponentDeciderBg,
      opponentData: matchData.opponentData,
      hostData: matchData.hostData,
      fullMatchData: matchData
      });
      console.log('🎬 TOP - opponentData keys:', Object.keys(matchData.opponentData || {}));
      console.log('🎬 TOP - hostData keys:', Object.keys(matchData.hostData || {}));
    }
    
    if (opponentDeciderBg && typeof opponentDeciderBg === 'object' && 'id' in opponentDeciderBg) {
      const resolved = resolveBackgroundPath(opponentDeciderBg.id, 'waiting-room');
      if (DEBUG_LOGS) {
        console.log('🎬 TOP resolved path:', resolved);
      }
      return resolved?.path || '/backgrounds/Game Backgrounds/Turn Decider/Best Quality/Crazy Cough.mp4';
    }
    return '/backgrounds/Game Backgrounds/Turn Decider/Best Quality/Crazy Cough.mp4';
  }, [matchData, user]);

  const bottomVideo = useMemo(() => {
    if (!matchData || !user) return '/backgrounds/Game Backgrounds/Turn Decider/Best Quality/Crazy Cough.mp4';
    
    // Get current user's data
    const isHost = matchData.hostData.playerId === user.uid;
    const currentUserDeciderBg = isHost 
      ? matchData.hostData.turnDeciderBackgroundEquipped 
      : matchData.opponentData?.turnDeciderBackgroundEquipped;
    
    if (DEBUG_LOGS) {
      console.log('🎬 Turn Decider BOTTOM video resolution:', {
      isHost,
      currentUserDeciderBg,
      hostTurnDecider: matchData.hostData.turnDeciderBackgroundEquipped,
      opponentTurnDecider: matchData.opponentData?.turnDeciderBackgroundEquipped,
      hostDataFull: matchData.hostData,
      opponentDataFull: matchData.opponentData
    });
      console.log('🎬 BOTTOM - Current user data keys:', Object.keys(isHost ? matchData.hostData : (matchData.opponentData || {})));
    }
    
    if (currentUserDeciderBg && typeof currentUserDeciderBg === 'object' && 'id' in currentUserDeciderBg) {
      const resolved = resolveBackgroundPath(currentUserDeciderBg.id, 'waiting-room');
      if (DEBUG_LOGS) {
        console.log('🎬 BOTTOM resolved path:', resolved);
      }
      return resolved?.path || '/backgrounds/Game Backgrounds/Turn Decider/Best Quality/Crazy Cough.mp4';
    }
    return '/backgrounds/Game Backgrounds/Turn Decider/Best Quality/Crazy Cough.mp4';
  }, [matchData, user]);

  // 🔄 SESSION RECOVERY: Store active match in localStorage for crash recovery
  useEffect(() => {
    if (roomId && matchData && matchData.gameData?.gamePhase !== 'gameOver') {
      if (DEBUG_LOGS) {
        console.log('💾 Storing active match in localStorage:', roomId);
      }
      localStorage.setItem('activeMatchId', roomId);
      localStorage.setItem('activeMatchTimestamp', Date.now().toString());
    }
  }, [roomId, matchData?.gameData?.gamePhase]);
  
  // Clear stored match when game over
  useEffect(() => {
    if (matchData?.gameData?.gamePhase === 'gameOver') {
      if (DEBUG_LOGS) {
        console.log('🗑️ Clearing stored match from localStorage (game over)');
      }
      localStorage.removeItem('activeMatchId');
      localStorage.removeItem('activeMatchTimestamp');
    }
  }, [matchData?.gameData?.gamePhase]);

  // 🚀 PERFORMANCE: Debounced match data setter to reduce re-renders
  const debouncedSetMatchData = useMemo(
    () => debounce((data: MatchData) => {
      setMatchData(data);
    }, 50), // 50ms debounce - balances responsiveness with performance
    []
  );

  // Subscribe to match updates
  useEffect(() => {
    if (!roomId || !user) {
      return;
    }
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
        debouncedSetMatchData(data);
        
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
          }
        }
        
        // Clear any previous errors when we receive valid data
        setError(null);
      } else {
        // Don't immediately show error - match might be transitioning
        // Only set error after a brief delay to handle transitions
        setTimeout(() => {
          setMatchData(prev => {
            if (!prev) {
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
    
    // ✅ USER INTERACTION: Grant autoplay permission for videos
    setUserInteracted(true);
    if (typeof window !== 'undefined') {
      const { videoPlaybackManager } = await import('@/utils/videoPlaybackManager');
      videoPlaybackManager.triggerPlayback();
    }
    
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

    // Turn decider dice animation - trigger when dice value changes
    if (matchData.gameData.gamePhase === 'turnDecider' && 
        matchData.gameData.turnDeciderDice && 
        previousTurnDeciderDice.current !== matchData.gameData.turnDeciderDice &&
        !turnDeciderDiceAnimation.isSpinning) {
      // 🎰 Animation Durations per specification:
      // Turn Decider Dice: 2000ms (2.0 seconds) - slower for dramatic effect
      startSlotMachineAnimation('turnDecider', matchData.gameData.turnDeciderDice, 2000);
      previousTurnDeciderDice.current = matchData.gameData.turnDeciderDice;
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

  // CRITICAL: Early return AFTER all hooks to prevent React hooks rule violations (#310)
  // All hooks must be called in the same order every render, so they come first
  if (error || !matchData || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "Audiowide" }}>
            Match Error
          </h2>
          <p className="text-red-300 mb-6">{error || !matchData ? (error || 'Match not found') : 'Please sign in'}</p>
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
  
  // Now we know matchData and user exist, compute player data safely
  const isHost = matchData.hostData.playerId === user.uid;
  const currentPlayer = isHost ? matchData.hostData : matchData.opponentData;
  const opponent = isHost ? matchData.opponentData : matchData.hostData;

  return (
    <div suppressHydrationWarning>
      {/* Background Layer - World videos during Turn Decider, User's Vibin background during Gameplay */}
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        width: '100%', 
        height: '100vh', 
        background: '#000000',
        zIndex: 1
      }}>
        {/* PERSISTENT TURN DECIDER VIDEOS - Always mounted, visibility controlled by CSS */}
        <div style={{ 
          position: 'absolute',
          inset: 0,
          display: (matchData.gameData.gamePhase === 'turnDecider' || showTurnDeciderTransition) ? 'block' : 'none',
          zIndex: (matchData.gameData.gamePhase === 'turnDecider' || showTurnDeciderTransition) ? 1000 : 1
        }}>
          {(() => {
            return (
              <>
                {/* Top half - host/top video */}
                <motion.div 
                  animate={{ 
                    y: (showTurnDeciderTransition && gameplayContentReady) ? '-100%' : 0 
                  }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '50%', 
                    overflow: 'hidden',
                    willChange: 'transform'
                  }}
                >
                  <video 
                    ref={topVideoRef}
                    key={`top-video-${topVideo}`}
                    src={topVideo}
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    onError={(e) => console.error('🎬 TOP VIDEO ERROR:', e, 'src:', topVideo)}
                    preload="auto"
                    controls={false}
                    disablePictureInPicture
                    disableRemotePlayback
                    {...{
                      'webkit-playsinline': 'true',
                      'x5-playsinline': 'true',
                      'x5-video-player-type': 'h5-page',
                      'x5-video-player-fullscreen': 'false'
                    } as any}
                    onLoadedMetadata={(e) => {
                      const video = e.target as HTMLVideoElement;
                      video.muted = true;
                      video.play().catch(() => {});
                    }}
                    onCanPlay={(e) => {
                      const video = e.target as HTMLVideoElement;
                      video.muted = true;
                      if (video.paused) video.play().catch(() => {});
                    }}
                    onLoadedData={(e) => {
                      const video = e.target as HTMLVideoElement;
                      video.muted = true;
                      if (video.paused) video.play().catch(() => {});
                    }}
                    onSuspend={(e) => {
                      const video = e.target as HTMLVideoElement;
                      if (video.paused) video.play().catch(() => {});
                    }}
                    onPause={(e) => {
                      const video = e.target as HTMLVideoElement;
                      setTimeout(() => {
                        if (video.paused) video.play().catch(() => {});
                      }, 100);
                    }}
                    onStalled={(e) => {
                      const video = e.target as HTMLVideoElement;
                      video.load();
                      video.play().catch(() => {});
                    }}
                    onWaiting={(e) => {
                      const video = e.target as HTMLVideoElement;
                      if (video.paused) video.play().catch(() => {});
                    }}
                    onClick={(e) => {
                      const video = e.target as HTMLVideoElement;
                      video.muted = true;
                      if (video.paused) video.play().catch(() => {});
                    }}
                    style={{ 
                      position: 'absolute', 
                      inset: 0, 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      pointerEvents: 'none'
                    }}
                  />
                </motion.div>
                {/* Bottom half - opponent/bottom video */}
                <motion.div 
                  animate={{ 
                    y: (showTurnDeciderTransition && gameplayContentReady) ? '100%' : 0 
                  }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  style={{
                  position: 'absolute', 
                  bottom: 0, 
                  left: 0, 
                  width: '100%', 
                  height: '50%', 
                  overflow: 'hidden',
                  willChange: 'transform'
                }}>
                  <video 
                    ref={bottomVideoRef}
                    key={`bottom-video-${bottomVideo}`}
                    src={bottomVideo}
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    onError={(e) => console.error('🎬 BOTTOM VIDEO ERROR:', e, 'src:', bottomVideo)}
                    preload="auto"
                    controls={false}
                    disablePictureInPicture
                    disableRemotePlayback
                    {...{
                      'webkit-playsinline': 'true',
                      'x5-playsinline': 'true',
                      'x5-video-player-type': 'h5-page',
                      'x5-video-player-fullscreen': 'false'
                    } as any}
                    onLoadedMetadata={(e) => {
                      const video = e.target as HTMLVideoElement;
                      video.muted = true;
                      video.play().catch(() => {});
                    }}
                    onCanPlay={(e) => {
                      const video = e.target as HTMLVideoElement;
                      video.muted = true;
                      if (video.paused) video.play().catch(() => {});
                    }}
                    onLoadedData={(e) => {
                      const video = e.target as HTMLVideoElement;
                      video.muted = true;
                      if (video.paused) video.play().catch(() => {});
                    }}
                    onSuspend={(e) => {
                      const video = e.target as HTMLVideoElement;
                      if (video.paused) video.play().catch(() => {});
                    }}
                    onPause={(e) => {
                      const video = e.target as HTMLVideoElement;
                      setTimeout(() => {
                        if (video.paused) video.play().catch(() => {});
                      }, 100);
                    }}
                    onStalled={(e) => {
                      const video = e.target as HTMLVideoElement;
                      video.load();
                      video.play().catch(() => {});
                    }}
                    onWaiting={(e) => {
                      const video = e.target as HTMLVideoElement;
                      if (video.paused) video.play().catch(() => {});
                    }}
                    onClick={(e) => {
                      const video = e.target as HTMLVideoElement;
                      video.muted = true;
                      if (video.paused) video.play().catch(() => {});
                    }}
                    style={{ 
                      position: 'absolute', 
                      inset: 0, 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      pointerEvents: 'none'
                    }}
                  />
                </motion.div>
              </>
            );
          })()}
        </div>
        
        {/* Winner Announcement Overlay - Shows during transition */}
        <AnimatePresence mode="wait">
          {showWinnerAnnouncement && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}
            >
              <motion.h1
                key={winnerAnnouncementText}
                initial={{ scale: 0.8, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.8, y: -20, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{
                  fontFamily: 'Audiowide',
                  fontSize: 'clamp(2rem, 8vw, 5rem)',
                  fontWeight: 'bold',
                  color: '#FFD700',
                  textAlign: 'center',
                  textShadow: '0 0 40px rgba(255, 215, 0, 0.8), 0 0 80px rgba(255, 215, 0, 0.4)',
                  textTransform: 'uppercase',
                  padding: '0 2rem'
                }}
              >
                {winnerAnnouncementText}
              </motion.h1>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* GAMEPLAY BACKGROUND - Show after turn decider */}
        {(() => {
          // After Turn Decider completes, show user's Display (Vibin) background for match arena
          if (matchData.gameData.gamePhase !== 'turnDecider' && DisplayBackgroundEquip) {
            const resolved = resolveBackgroundPath(DisplayBackgroundEquip.id, 'dashboard-display');
            if (resolved) {
              if (resolved.type === 'video') {
                return (
                  <video 
                    src={resolved.path}
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    preload="auto"
                    controls={false}
                    disablePictureInPicture
                    disableRemotePlayback
                    {...{
                      'webkit-playsinline': 'true',
                      'x5-playsinline': 'true',
                      'x5-video-player-type': 'h5-page',
                      'x5-video-player-fullscreen': 'false'
                    } as any}
                    onLoadedMetadata={(e) => {
                      const video = e.target as HTMLVideoElement;
                      video.muted = true;
                      video.play().catch(() => {});
                    }}
                    onCanPlay={(e) => {
                      const video = e.target as HTMLVideoElement;
                      video.muted = true;
                      if (video.paused) video.play().catch(() => {});
                    }}
                    onLoadedData={(e) => {
                      const video = e.target as HTMLVideoElement;
                      video.muted = true;
                      if (video.paused) video.play().catch(() => {});
                    }}
                    onSuspend={(e) => {
                      const video = e.target as HTMLVideoElement;
                      if (video.paused) video.play().catch(() => {});
                    }}
                    onPause={(e) => {
                      const video = e.target as HTMLVideoElement;
                      setTimeout(() => {
                        if (video.paused) video.play().catch(() => {});
                      }, 100);
                    }}
                    onStalled={(e) => {
                      const video = e.target as HTMLVideoElement;
                      video.load();
                      video.play().catch(() => {});
                    }}
                    onWaiting={(e) => {
                      const video = e.target as HTMLVideoElement;
                      if (video.paused) video.play().catch(() => {});
                    }}
                    onClick={(e) => {
                      const video = e.target as HTMLVideoElement;
                      video.muted = true;
                      if (video.paused) video.play().catch(() => {});
                    }}
                    style={{ 
                      position: 'absolute', 
                      inset: 0, 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      pointerEvents: 'none'
                    }}
                  />
                );
              } else {
                return (
                  <img
                    src={resolved.path}
                    alt="Match Background"
                    style={{ 
                      position: 'absolute', 
                      inset: 0, 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }}
                  />
                );
              }
            }
          }
          // Fallback gradient if no background
          return (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #3533CD 0%, #7209B7 100%)'
            }} />
          );
        })()}
      </div>

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

      {/* Normal Match UI - Hidden when game over, turn decider, or during transition */}
      <motion.div 
        initial={{ opacity: 0, x: 100 }}
        animate={matchData.gameData.gamePhase === 'gameOver' || matchData.gameData.gamePhase === 'turnDecider' || showTurnDeciderTransition ? { opacity: 0, x: 100 } : { opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`w-full h-screen match-container ${matchData.gameData.gamePhase === 'gameOver' || matchData.gameData.gamePhase === 'turnDecider' || showTurnDeciderTransition ? 'hidden' : 'flex'} flex-col items-center justify-start md:justify-center px-2 pt-8 md:pt-12`}
        style={{ position: 'relative', left: 0, top: 0, transform: 'none', zIndex: 10, pointerEvents: 'auto', display: matchData.gameData.gamePhase === 'turnDecider' || showTurnDeciderTransition ? 'none' : undefined }}
      >
        {/* Game Arena */}
        <div className="w-[90vw] mx-auto flex items-center justify-center" style={{ position: 'relative' }}>
          {/* Desktop Layout */}
          <div className="hidden md:flex items-start justify-between gap-8 w-full" style={{ marginTop: '-3vh' }}>
            
            {/* Player 1 (Current User - Left Side) */}
            <AnimatePresence>
              {(matchData.gameData.gamePhase as string) !== 'turnDecider' && !showTurnAnnouncement && (
                <div className="w-[40%] max-w-lg">
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
                className="relative overflow-hidden shadow-2xl z-20"
                style={{ 
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  borderColor: hardHatWhiteBorderCurrent ? '#FFFFFF' : '#ffffff',
                  borderRadius: '16px',
                  height: '500px'
                }}
                animate={{
                  borderColor: hardHatWhiteBorderCurrent ? '#FFFFFF' : '#ffffff',
                  boxShadow: hardHatWhiteBorderCurrent 
                    ? [
                        '0 0 15px rgba(255, 255, 255, 0.6), 0 0 30px rgba(255, 255, 255, 0.4)',
                        '0 0 25px rgba(255, 255, 255, 0.9), 0 0 50px rgba(255, 255, 255, 0.6)',
                        '0 0 15px rgba(255, 255, 255, 0.6), 0 0 30px rgba(255, 255, 255, 0.4)'
                      ]
                    : '0 0 15px rgba(255, 255, 255, 0.2)'
                }}
                transition={{ 
                  duration: hardHatWhiteBorderCurrent ? 1.5 : 0.5,
                  ease: "easeInOut",
                  repeat: hardHatWhiteBorderCurrent ? Infinity : 0,
                  repeatType: "loop"
                }}
              >
                {/* 🧢 HARD HAT INITIAL ANIMATION - Only visible to activating player */}
                {showHardHatInitialCurrent && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ zIndex: 9999 }}
                  >
                    <video
                      src="/Abilities/Animations/Hard Hat/Hard Hat Initial.webm"
                      autoPlay
                      loop={false}
                      muted
                      playsInline
                      preload="auto"
                      disablePictureInPicture
                      disableRemotePlayback
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '24px',
                        opacity: 1
                      }}
                      onLoadedData={(e) => {
                        try {
                          const video = e.currentTarget;
                          video.muted = true;
                          video.playsInline = true;
                          const playPromise = video.play();
                          if (playPromise !== undefined) {
                            playPromise.catch((err) => {
                              console.warn('🧢 Hard Hat Initial video play failed (non-critical):', err);
                            });
                          }
                        } catch (err) {
                          console.warn('🧢 Hard Hat Initial onLoadedData error (non-critical):', err);
                        }
                      }}
                      onCanPlay={(e) => {
                        try {
                          const video = e.currentTarget;
                          video.muted = true;
                          video.playsInline = true;
                          if (video.paused) {
                            const playPromise = video.play();
                            if (playPromise !== undefined) {
                              playPromise.catch(() => {});
                            }
                          }
                        } catch (err) {
                          console.warn('🧢 Hard Hat Initial onCanPlay error (non-critical):', err);
                        }
                      }}
                      onTimeUpdate={(e) => {
                        try {
                          const video = e.target as HTMLVideoElement;
                          // Show white border just before video ends (last 0.2s)
                          if (video.duration - video.currentTime < 0.2 && !hardHatWhiteBorderCurrent) {
                            setHardHatWhiteBorderCurrent(true);
                          }
                        } catch (err) {
                          console.warn('🧢 Hard Hat Initial onTimeUpdate error (non-critical):', err);
                        }
                      }}
                      onEnded={() => {
                        try {
                          setShowHardHatInitialCurrent(false);
                        } catch (err) {
                          console.warn('🧢 Hard Hat Initial onEnded error (non-critical):', err);
                        }
                      }}
                      onError={(e) => {
                        console.error('🧢 Hard Hat Initial video failed to load:', e);
                        // Hide animation on error
                        setShowHardHatInitialCurrent(false);
                      }}
                    />
                  </div>
                )}
                
                {/* 🧢 HARD HAT USED ANIMATION - Visible to both players */}
                {showHardHatUsedCurrent && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ zIndex: 9999 }}
                  >
                    <video
                      src="/Abilities/Animations/Hard Hat/Hard Hat Used.webm"
                      autoPlay
                      loop={false}
                      muted
                      playsInline
                      preload="auto"
                      disablePictureInPicture
                      disableRemotePlayback
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '24px',
                        opacity: 1
                      }}
                      onLoadedData={(e) => {
                        try {
                          const video = e.currentTarget;
                          video.muted = true;
                          video.playsInline = true;
                          const playPromise = video.play();
                          if (playPromise !== undefined) {
                            playPromise.catch((err) => {
                              console.warn('🧢 Hard Hat Used video play failed (non-critical):', err);
                            });
                          }
                        } catch (err) {
                          console.warn('🧢 Hard Hat Used onLoadedData error (non-critical):', err);
                        }
                      }}
                      onCanPlay={(e) => {
                        try {
                          const video = e.currentTarget;
                          video.muted = true;
                          video.playsInline = true;
                          if (video.paused) {
                            const playPromise = video.play();
                            if (playPromise !== undefined) {
                              playPromise.catch(() => {});
                            }
                          }
                        } catch (err) {
                          console.warn('🧢 Hard Hat Used onCanPlay error (non-critical):', err);
                        }
                      }}
                      onEnded={() => {
                        try {
                          setShowHardHatUsedCurrent(false);
                          setHardHatWhiteBorderCurrent(false);
                        } catch (err) {
                          console.warn('🧢 Hard Hat Used onEnded error (non-critical):', err);
                        }
                      }}
                      onError={(e) => {
                        console.error('🧢 Hard Hat Used video failed to load:', e);
                        // Hide animation on error
                        setShowHardHatUsedCurrent(false);
                      }}
                    />
                  </div>
                )}
                
                {/* Player Background */}
                {currentPlayerBgPath ? (
                  currentPlayerBgIsVideo && currentPlayerVideoAutoplay ? (
                    <>
                      <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        webkit-playsinline="true"
                        x5-playsinline="true"
                        controls={false}
                        preload="auto"
                        disablePictureInPicture
                        disableRemotePlayback
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ pointerEvents: 'none' }}
                        onLoadedMetadata={(e) => {
                          const video = e.target as HTMLVideoElement;
                          video.muted = true;
                          video.play().catch(() => {
                            setCurrentPlayerVideoAutoplay(false);
                          });
                        }}
                        onCanPlay={(e) => {
                          const video = e.target as HTMLVideoElement;
                          video.muted = true;
                          if (video.paused) {
                            video.play().catch(() => {
                              setCurrentPlayerVideoAutoplay(false);
                            });
                          }
                        }}
                        onError={() => {
                          setCurrentPlayerVideoAutoplay(false);
                        }}
                      >
                        <source src={currentPlayerBgPath} type="video/mp4" />
                      </video>
                    </>
                  ) : (
                    <img
                      src={currentPlayerBgIsVideo ? currentPlayerBgPath.replace('/Videos/', '/Video Images/').replace('.mp4', '.webp') : currentPlayerBgPath}
                      alt="Current Player Background"
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
              
              {/* Background Rarity Display with AURA - Below Container, Left Aligned */}
              <div 
                className="mt-4 text-left flex items-center gap-3"
                style={{
                  display: 'flex',
                  width: '100%',
                  maxWidth: '500px',
                  height: '45px',
                  flexDirection: 'row',
                  justifyContent: 'flex-start',
                  alignItems: 'center'
                }}
              >
                {/* Rarity with blurred background */}
                <div style={{
                  display: 'flex',
                  height: '45px',
                  padding: '0 12px',
                  alignItems: 'center',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.09)',
                  backdropFilter: 'blur(5.5px)'
                }}>
                  <span style={{
                    color: '#FFF',
                    textAlign: 'left',
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
                
                {/* Aura Counter - Inline with Rarity */}
                <AuraCounter 
                  auraValue={matchData.gameData.playerAura?.[currentPlayer.playerId] || 0}
                  size="extra-large"
                  className="flex items-center"
                  hasHardHat={matchData.gameData.activeEffects?.[currentPlayer.playerId]?.some((effect: any) =>
                    effect.abilityId === 'hard_hat' && effect.type === 'ability_block'
                  ) || false}
                />
              </div>
              
              {/* Desktop Voice Button - Right aligned below */}
              {/* Match chat temporarily disabled */}
              
                </div>
              )}
            </AnimatePresence>

            {/* Center Dice Area */}
            <div className="flex flex-col items-center justify-center relative z-10" style={{ alignSelf: 'center', minWidth: '600px', width: '600px', height: '60vh', overflow: 'visible' }}>
              {/* Phase-specific content with transitions */}
              <AnimatePresence>
                {matchData.gameData.gamePhase === 'turnDecider' && (
                  <>
                    <TurnDeciderPhase
                      key={`turnDecider-${topVideo}-${bottomVideo}`}
                      matchData={matchData}
                      currentPlayer={currentPlayer}
                      opponent={opponent}
                      isHost={isHost}
                      diceAnimation={turnDeciderDiceAnimation}
                      onChoiceSelect={handleTurnDeciderChoice}
                      onForceGameplay={handleForceGameplay}
                      topVideo={topVideo}
                      bottomVideo={bottomVideo}
                    />
                    {/* Preload ALL GameplayPhase content during turn decider for instant transition */}
                    <div style={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      pointerEvents: 'none',
                      zIndex: -1
                    }}>
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
                    </div>
                  </>
                )}

                {/* Turn Announcement - DISABLED per user request */}
                {false && showTurnAnnouncement && turnAnnouncementData && (
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
                          color: "#FFFFFF",
                          textShadow: "0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.5)"
                        }}
                      >
                        {(turnAnnouncementData?.isCurrentPlayerFirst) ? "YOU GO FIRST!" : `${(turnAnnouncementData?.winner ?? 'PLAYER').toUpperCase()} GOES FIRST!`}
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
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'tween', duration: 0.5, ease: 'easeInOut' }}
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
                <div className="w-[40%] max-w-lg">
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
                className="relative overflow-hidden shadow-2xl z-20"
                style={{ 
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  borderColor: hardHatWhiteBorderOpponent ? '#FFFFFF' : '#ffffff',
                  borderRadius: '16px',
                  height: '500px'
                }}
                animate={{
                  borderColor: auraAxeRedPulseOpponent ? '#FF0000' : (hardHatWhiteBorderOpponent ? '#FFFFFF' : '#ffffff'),
                  boxShadow: auraAxeRedPulseOpponent
                    ? [
                        '0 0 20px rgba(255, 0, 0, 0.7), 0 0 40px rgba(255, 0, 0, 0.5)',
                        '0 0 35px rgba(255, 0, 0, 1), 0 0 70px rgba(255, 0, 0, 0.8)',
                        '0 0 20px rgba(255, 0, 0, 0.7), 0 0 40px rgba(255, 0, 0, 0.5)'
                      ]
                    : hardHatWhiteBorderOpponent 
                    ? [
                        '0 0 25px rgba(255, 255, 255, 0.8), 0 0 50px rgba(255, 255, 255, 0.6), 0 0 75px rgba(255, 255, 255, 0.4)',
                        '0 0 40px rgba(255, 255, 255, 1), 0 0 80px rgba(255, 255, 255, 0.8), 0 0 120px rgba(255, 255, 255, 0.5)',
                        '0 0 25px rgba(255, 255, 255, 0.8), 0 0 50px rgba(255, 255, 255, 0.6), 0 0 75px rgba(255, 255, 255, 0.4)'
                      ]
                    : '0 0 15px rgba(255, 255, 255, 0.2)'
                }}
                transition={{ 
                  duration: auraAxeRedPulseOpponent ? 0.8 : (hardHatWhiteBorderOpponent ? 1.5 : 0.5),
                  ease: "easeInOut",
                  repeat: auraAxeRedPulseOpponent ? 1 : (hardHatWhiteBorderOpponent ? Infinity : 0),
                  repeatType: "loop"
                }}
              >
                {/* 🧢 HARD HAT USED ANIMATION - Visible to both players when opponent's Hard Hat triggers */}
                {showHardHatUsedOpponent && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ zIndex: 9999 }}
                  >
                    <video
                      src="/Abilities/Animations/Hard Hat/Hard Hat Used.webm"
                      autoPlay
                      loop={false}
                      muted
                      playsInline
                      preload="auto"
                      disablePictureInPicture
                      disableRemotePlayback
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '24px',
                        opacity: 1
                      }}
                      onLoadedData={(e) => {
                        try {
                          const video = e.currentTarget;
                          video.muted = true;
                          video.playsInline = true;
                          const playPromise = video.play();
                          if (playPromise !== undefined) {
                            playPromise.catch((err) => {
                              console.warn('🧢 Hard Hat Used (opponent) video play failed (non-critical):', err);
                            });
                          }
                        } catch (err) {
                          console.warn('🧢 Hard Hat Used (opponent) onLoadedData error (non-critical):', err);
                        }
                      }}
                      onCanPlay={(e) => {
                        try {
                          const video = e.currentTarget;
                          video.muted = true;
                          video.playsInline = true;
                          if (video.paused) {
                            const playPromise = video.play();
                            if (playPromise !== undefined) {
                              playPromise.catch(() => {});
                            }
                          }
                        } catch (err) {
                          console.warn('🧢 Hard Hat Used (opponent) onCanPlay error (non-critical):', err);
                        }
                      }}
                      onEnded={() => {
                        try {
                          setShowHardHatUsedOpponent(false);
                          setHardHatWhiteBorderOpponent(false);
                        } catch (err) {
                          console.warn('🧢 Hard Hat Used (opponent) onEnded error (non-critical):', err);
                        }
                      }}
                      onError={(e) => {
                        console.error('🧢 Hard Hat Used (opponent) video failed to load:', e);
                        // Hide animation on error
                        setShowHardHatUsedOpponent(false);
                      }}
                    />
                  </div>
                )}
                
                {/* Player Background */}
                {opponentBgPath ? (
                  opponentBgIsVideo && opponentVideoAutoplay ? (
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      webkit-playsinline="true"
                      x5-playsinline="true"
                      controls={false}
                      preload="auto"
                      disablePictureInPicture
                      disableRemotePlayback
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ pointerEvents: 'none' }}
                      onLoadedMetadata={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.muted = true;
                        video.play().catch(() => {
                          setOpponentVideoAutoplay(false);
                        });
                      }}
                      onCanPlay={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.muted = true;
                        if (video.paused) {
                          video.play().catch(() => {
                            setOpponentVideoAutoplay(false);
                          });
                        }
                      }}
                      onError={() => {
                        setOpponentVideoAutoplay(false);
                      }}
                    >
                      <source src={opponentBgPath} type="video/mp4" />
                    </video>
                  ) : (
                    <img
                      src={opponentBgIsVideo ? opponentBgPath.replace('/Videos/', '/Video Images/').replace('.mp4', '.webp') : opponentBgPath}
                      alt="Opponent Background"
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
                className="mt-4 text-right ml-auto flex items-center gap-3"
                style={{
                  display: 'flex',
                  width: '190px',
                  height: '45px',
                  flexDirection: 'row',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.09)',
                  backdropFilter: 'blur(5.5px)',
                  padding: '0 12px'
                }}
              >
                <span style={{
                  color: '#FFF',
                  textAlign: 'left',
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
              
              {/* Desktop Chat Box - Below Opponent Card - DISABLED */}
              {/* {matchData.gameData.gamePhase === 'gameplay' && matchData.id && !matchData.hostData.playerId.includes('bot_') && !matchData.opponentData?.playerId?.includes('bot_') && (
                <div className="hidden md:block mt-3 ml-auto" style={{ width: '100%', maxWidth: '500px' }}>
                  <MatchChatFeed matchId={matchData.id} className="desktop-player-chat" />
                </div>
              )} */}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Layout - Stacked */}
          <div className="md:hidden flex flex-col items-center w-full" style={{ maxWidth: '100vw', margin: '0 auto' }}>
            
            {/* User Profiles Section - Top Corners of Viewport - Equal spacing */}
            <AnimatePresence>
              {(matchData.gameData.gamePhase as string) !== 'turnDecider' && !showTurnAnnouncement && (
                <motion.div 
                  className="fixed top-0 left-0 right-0 flex flex-col z-20" 
                  style={{ 
                    paddingTop: 'max(env(safe-area-inset-top, 0px), 60px)',
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
                  {/* Player Cards Row */}
                  <div className="flex justify-between" style={{ gap: '0px' }}>
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
                  className="relative overflow-hidden shadow-lg"
                  style={{ 
                    height: '100%',
                    width: '100%',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: hardHatWhiteBorderCurrent ? '#FFFFFF' : 'transparent',
                    borderRadius: '16px'
                  }}
                  animate={{
                    borderColor: hardHatWhiteBorderCurrent ? '#FFFFFF' : 'transparent',
                    boxShadow: hardHatWhiteBorderCurrent 
                      ? [
                          '0 0 12px rgba(255, 255, 255, 0.6), 0 0 24px rgba(255, 255, 255, 0.3)',
                          '0 0 20px rgba(255, 255, 255, 0.9), 0 0 40px rgba(255, 255, 255, 0.5)',
                          '0 0 12px rgba(255, 255, 255, 0.6), 0 0 24px rgba(255, 255, 255, 0.3)'
                        ]
                      : '0 0 8px rgba(0, 0, 0, 0.3)'
                  }}
                  transition={{ 
                    duration: hardHatWhiteBorderCurrent ? 1.5 : 0.5,
                    ease: "easeInOut",
                    repeat: hardHatWhiteBorderCurrent ? Infinity : 0,
                    repeatType: "loop"
                  }}
                >
                  {/* Player Background */}
                  {currentPlayerBgPath ? (
                    currentPlayerBgIsVideo ? (
                      <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        webkit-playsinline="true"
                        x5-playsinline="true"
                        x5-video-player-type="h5-page"
                        x5-video-player-fullscreen="false"
                        controls={false}
                        preload="auto"
                        disablePictureInPicture
                        disableRemotePlayback
                        onLoadedMetadata={(e) => {
                          const video = e.target as HTMLVideoElement;
                          video.muted = true;
                          video.play().catch(() => {});
                        }}
                        onCanPlay={(e) => {
                          const video = e.target as HTMLVideoElement;
                          video.muted = true;
                          if (video.paused) video.play().catch(() => {});
                        }}
                        onLoadedData={(e) => {
                          const video = e.target as HTMLVideoElement;
                          video.muted = true;
                          if (video.paused) video.play().catch(() => {});
                        }}
                        onSuspend={(e) => {
                          const video = e.target as HTMLVideoElement;
                          if (video.paused) video.play().catch(() => {});
                        }}
                        onPause={(e) => {
                          const video = e.target as HTMLVideoElement;
                          setTimeout(() => {
                            if (video.paused) video.play().catch(() => {});
                          }, 100);
                        }}
                        onClick={(e) => {
                          const video = e.target as HTMLVideoElement;
                          video.muted = true;
                          if (video.paused) video.play().catch(() => {});
                        }}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ 
                          pointerEvents: 'none',
                          objectPosition: 'center center'
                        }}
                      >
                        <source src={currentPlayerBgPath} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <img
                        src={currentPlayerBgPath}
                        alt="Current Player Background"
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
                  className="relative overflow-hidden shadow-lg"
                  style={{ 
                    height: '100%',
                    width: '100%',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: hardHatWhiteBorderOpponent ? '#FFFFFF' : 'transparent',
                    borderRadius: '16px'
                  }}
                  animate={{
                    borderColor: auraAxeRedPulseOpponent ? '#FF0000' : (hardHatWhiteBorderOpponent ? '#FFFFFF' : 'transparent'),
                    boxShadow: auraAxeRedPulseOpponent
                      ? [
                          '0 0 15px rgba(255, 0, 0, 0.7), 0 0 30px rgba(255, 0, 0, 0.5)',
                          '0 0 25px rgba(255, 0, 0, 1), 0 0 50px rgba(255, 0, 0, 0.8)',
                          '0 0 15px rgba(255, 0, 0, 0.7), 0 0 30px rgba(255, 0, 0, 0.5)'
                        ]
                      : hardHatWhiteBorderOpponent 
                      ? [
                          '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.5), 0 0 60px rgba(255, 255, 255, 0.3)',
                          '0 0 35px rgba(255, 255, 255, 1), 0 0 70px rgba(255, 255, 255, 0.7), 0 0 100px rgba(255, 255, 255, 0.4)',
                          '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.5), 0 0 60px rgba(255, 255, 255, 0.3)'
                        ]
                      : '0 0 8px rgba(0, 0, 0, 0.3)'
                  }}
                  transition={{ 
                    duration: auraAxeRedPulseOpponent ? 0.8 : (hardHatWhiteBorderOpponent ? 1.5 : 0.5),
                    ease: "easeInOut",
                    repeat: auraAxeRedPulseOpponent ? 1 : (hardHatWhiteBorderOpponent ? Infinity : 0),
                    repeatType: "loop"
                  }}
                >
                  {/* Player Background */}
                  {opponentBgPath ? (
                    opponentBgIsVideo ? (
                      <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        webkit-playsinline="true"
                        x5-playsinline="true"
                        x5-video-player-type="h5-page"
                        x5-video-player-fullscreen="false"
                        controls={false}
                        preload="auto"
                        disablePictureInPicture
                        disableRemotePlayback
                        onLoadedMetadata={(e) => {
                          const video = e.target as HTMLVideoElement;
                          video.muted = true;
                          video.play().catch(() => {});
                        }}
                        onCanPlay={(e) => {
                          const video = e.target as HTMLVideoElement;
                          video.muted = true;
                          if (video.paused) video.play().catch(() => {});
                        }}
                        onLoadedData={(e) => {
                          const video = e.target as HTMLVideoElement;
                          video.muted = true;
                          if (video.paused) video.play().catch(() => {});
                        }}
                        onSuspend={(e) => {
                          const video = e.target as HTMLVideoElement;
                          if (video.paused) video.play().catch(() => {});
                        }}
                        onPause={(e) => {
                          const video = e.target as HTMLVideoElement;
                          setTimeout(() => {
                            if (video.paused) video.play().catch(() => {});
                          }, 100);
                        }}
                        onClick={(e) => {
                          const video = e.target as HTMLVideoElement;
                          video.muted = true;
                          if (video.paused) video.play().catch(() => {});
                        }}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ 
                          pointerEvents: 'none',
                          objectPosition: 'center center'
                        }}
                      >
                        <source src={opponentBgPath} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <img
                        src={opponentBgPath}
                        alt="Opponent Background"
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
                  </div>
                
                  {/* Mobile Match Chat - Below player cards - DISABLED */}
                  {/* {matchData.gameData.gamePhase === 'gameplay' && matchData.id && !matchData.hostData.playerId.includes('bot_') && !matchData.opponentData?.playerId?.includes('bot_') && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8, duration: 0.5 }}
                      className="mt-3 w-full"
                    >
                      <MatchChatFeed matchId={matchData.id} />
                    </motion.div>
                  )} */}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Match chat temporarily disabled - mobile voice button */}

            {/* Center Dice Area - Middle */}
            <div className="w-full flex flex-col items-center justify-center" style={{ paddingTop: 'calc(16vh)', paddingBottom: '20px', minHeight: '40vh', maxWidth: '100%', overflow: 'visible' }}>
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
                      key={`turnDecider-mobile-${topVideo}-${bottomVideo}`}
                      matchData={matchData}
                      currentPlayer={currentPlayer}
                      opponent={opponent}
                      isHost={isHost}
                      diceAnimation={turnDeciderDiceAnimation}
                      onChoiceSelect={handleTurnDeciderChoice}
                      onForceGameplay={handleForceGameplay}
                      topVideo={topVideo}
                      bottomVideo={bottomVideo}
                    />
                  </motion.div>
                )}

                {/* Turn Announcement - Mobile - DISABLED per user request */}
                {false && showTurnAnnouncement && turnAnnouncementData && (
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
                        color: "#FFFFFF",
                        textShadow: "0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.5)"
                      }}
                    >
                      {(turnAnnouncementData?.isCurrentPlayerFirst) ? "YOU GO FIRST!" : `${(turnAnnouncementData?.winner ?? 'PLAYER').toUpperCase()} GOES FIRST!`}
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

      {/* Turn Decider Phase - Rendered outside match-container so it's visible */}
      {matchData.gameData.gamePhase === 'turnDecider' && (
        <>
          <TurnDeciderPhase
            key={`turnDecider-${topVideo}-${bottomVideo}`}
            matchData={matchData}
            currentPlayer={currentPlayer}
            opponent={opponent}
            isHost={isHost}
            diceAnimation={turnDeciderDiceAnimation}
            onChoiceSelect={handleTurnDeciderChoice}
            onForceGameplay={handleForceGameplay}
            topVideo={topVideo}
            bottomVideo={bottomVideo}
          />
        </>
      )}

      {/* Ability Toast Notification */}
      <AbilityToast 
        abilityName={activeAbilityToast} 
        onComplete={() => setActiveAbilityToast(null)} 
      />
    </div>
  );
};

