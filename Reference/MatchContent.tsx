'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
// Reference file - imports commented out for standalone use
// import { useAuth } from '@/context/AuthContext';
// import { useBackground } from '@/context/BackgroundContext';  
// import { MatchService, MatchData } from '@/services/matchService';
// import { useDashboardNavigation } from '@/context/DashboardNavigationContext';

// Mock types for standalone reference file
interface MatchData {
  id: string;
  players: any[];
  currentTurn?: number;
  gameState?: string;
  [key: string]: any;
}

// Mock hooks for standalone reference file
const useAuth = () => ({ user: { uid: 'mock-user', displayName: 'Mock User' } });
const useBackground = () => ({ displayBackground: 'default-bg' });
const useDashboardNavigation = () => ({ navigateToSection: (section: string) => console.log('Navigate to:', section) });

// Mock MatchService for standalone reference file
const MatchService = {
  subscribeToMatch: (matchId: string, callback: (data: MatchData | null) => void) => {
    // Mock subscription - return empty unsubscribe function
    return () => {};
  },
  rollDice: async (matchId: string, playerId: string) => {
    console.log('Mock dice roll for:', matchId, playerId);
  },
  endTurn: async (matchId: string, playerId: string) => {
    console.log('Mock end turn for:', matchId, playerId);
  },
  forfeitMatch: async (matchId: string, playerId: string) => {
    console.log('Mock forfeit for:', matchId, playerId);
  },
  bankScore: async (matchId: string, playerId: string) => {
    console.log('Mock bank score for:', matchId, playerId);
  },
  makeTurnDeciderChoice: async (matchId: string, playerId: string, choice: string) => {
    console.log('Mock turn decider choice for:', matchId, playerId, choice);
  }
};

export function MatchContent() {
  const { user } = useAuth();
  const { displayBackground } = useBackground();
  const { navigateToSection } = useDashboardNavigation();
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerBackgrounds, setPlayerBackgrounds] = useState<any[]>([null, null]);
  
  // Local slot machine animation states
  const [dice1Animation, setDice1Animation] = useState<{
    isSpinning: boolean;
    currentNumber: number;
    finalNumber: number | null;
    reelSpeed?: number;
  }>({ isSpinning: false, currentNumber: 1, finalNumber: null, reelSpeed: 0.1 });
  
  const [dice2Animation, setDice2Animation] = useState<{
    isSpinning: boolean;
    currentNumber: number;
    finalNumber: number | null;
    reelSpeed?: number;
  }>({ isSpinning: false, currentNumber: 1, finalNumber: null, reelSpeed: 0.1 });

  // Turn decider dice animation state
  const [turnDeciderDiceAnimation, setTurnDeciderDiceAnimation] = useState<{
    isSpinning: boolean;
    currentNumber: number;
    finalNumber: number | null;
    reelSpeed?: number;
  }>({ isSpinning: false, currentNumber: 1, finalNumber: null, reelSpeed: 0.1 });

  // Turn score animation state
  const [scoreAnimation, setScoreAnimation] = useState<{
    show: boolean;
    score: number;
    animationKey: number;
    randomText: string;
  }>({ show: false, score: 0, animationKey: 0, randomText: '' });

  // Turn transition animation state
  const [turnTransition, setTurnTransition] = useState<{
    show: boolean;
    message: string;
    animationKey: number;
  }>({ show: false, message: '', animationKey: 0 });

  // Track previous game phase for transition detection
  const [previousGamePhase, setPreviousGamePhase] = useState<string | null>(null);

  // Get match ID from session storage
  const matchId = typeof window !== 'undefined' ? sessionStorage.getItem('currentMatchId') : null;

  // Epic turn transition messages
  const turnTransitionMessages = [
    ", it's your time to shine!",
    ", make it count!",
    ", show us what you've got!",
    ", let it rip!",
    ", the table's yours!",
    ", bring the heat!",
    ", time to roll destiny!",
    ", light up the dice!",
    ", give us a show!",
    ", your move, legend.",
    ", roll it like a pro.",
    ", fate's waiting.",
    ", the dice are ready!",
    ", go big or go home.",
    ", unleash the chaos.",
    ", let's make history.",
    ", dice don't lie. Show 'em.",
    ", the world's watching.",
    ", this one's for glory.",
    ", blow us away!",
    ", time to get lucky.",
    ", no pressure… just greatness.",
    ", hit us with magic.",
    ", time to flex.",
    ", the gods are watching.",
    ", break the game!",
    ", tear up the board!",
    ", you were born for this.",
    ", let's see fireworks.",
    ", all eyes on you.",
    ", you're up, champ!",
    ", bend luck to your will.",
    ", roll like royalty.",
    ", bring the thunder.",
    ", hit that jackpot.",
    ", you got this. Big time.",
    ", unleash your luck.",
    ", fate's calling. Pick up.",
    ", it's your lucky moment.",
    ", you're the main event.",
    ", spin the story.",
    ", now or never.",
    ", rewrite the odds.",
    ", it's game time!",
    ", lock and roll.",
    ", your legend begins here.",
    ", let's shake the system.",
    ", the stage is yours.",
    ", bring the boom.",
    ", no looking back now.",
    ", you've got the power.",
    ", press start on greatness.",
    ", awaken the dice gods!",
    ", crush this roll.",
    ", the crowd's waiting.",
    ", summon your luck.",
    ", it's destiny o'clock.",
    ", make some noise!",
    ", dice, meet legend.",
    ", this roll could change everything.",
    ", let fate spin.",
    ", are you ready to shock us?",
    ", shake the universe.",
    ", now's your golden shot.",
    ", chase that perfect roll!",
    ", ignite the streak.",
    ", it's hero hour.",
    ", all-in time!",
    ", unlock the win.",
    ", fuel the fire.",
    ", bring the storm.",
    ", the arena's silent for you.",
    ", give us chills.",
    ", time to rule the table.",
    ", let chaos roll.",
    ", aim for the stars.",
    ", show no mercy.",
    ", dice or die.",
    ", you are the moment.",
    ", make it epic."
  ];

  // Slot machine animation functions
  const startSlotMachineAnimation = (
    diceNumber: 1 | 2 | 'turnDecider', 
    finalValue: number,
    animationDuration: number = 2000
  ) => {
    const setDiceState = diceNumber === 1 ? setDice1Animation : 
                        diceNumber === 2 ? setDice2Animation : 
                        setTurnDeciderDiceAnimation;
    
    // Start spinning
    setDiceState({
      isSpinning: true,
      currentNumber: Math.floor(Math.random() * 6) + 1,
      finalNumber: null,
      reelSpeed: 0.1
    });

    // Progressive deceleration animation with synchronized background reel
    // More dramatic deceleration for dice 2
    const isSecondDice = diceNumber === 2;
    let currentSpeed = 60; // Start fast
    let intervalId: ReturnType<typeof setTimeout>;
    let elapsedTime = 0;
    let reelAnimationSpeed = 0.1; // Background reel speed

    const animateReel = () => {
      setDiceState(prev => ({
        ...prev,
        currentNumber: Math.floor(Math.random() * 6) + 1
      }));
      
      elapsedTime += currentSpeed;
      const progress = elapsedTime / animationDuration;
      
      if (isSecondDice) {
        // Use EXACT same deceleration curve as first dice for consistency
        if (progress < 0.7) {
          // Fast spinning phase (first 70% of time)
          currentSpeed = Math.max(60, 60 + (progress * 40)); // 60ms to 88ms
          reelAnimationSpeed = 0.1; // Fast background reel
        } else if (progress < 0.9) {
          // Deceleration phase (70% to 90% of time)
          const decelProgress = (progress - 0.7) / 0.2;
          currentSpeed = 88 + (decelProgress * 112); // 88ms to 200ms
          reelAnimationSpeed = 0.1 + (decelProgress * 0.4); // 0.1s to 0.5s
        } else {
          // Final slow phase (last 10% of time)
          const finalProgress = (progress - 0.9) / 0.1;
          currentSpeed = 200 + (finalProgress * 300); // 200ms to 500ms
          reelAnimationSpeed = 0.5 + (finalProgress * 1.5); // 0.5s to 2.0s
        }
      } else {
        // Original deceleration curve for first dice
        if (progress < 0.7) {
          // Fast spinning phase (first 70% of time)
          currentSpeed = Math.max(60, 60 + (progress * 40)); // 60ms to 88ms
          reelAnimationSpeed = 0.1; // Fast background reel
        } else if (progress < 0.9) {
          // Deceleration phase (70% to 90% of time)
          const decelProgress = (progress - 0.7) / 0.2;
          currentSpeed = 88 + (decelProgress * 112); // 88ms to 200ms
          reelAnimationSpeed = 0.1 + (decelProgress * 0.4); // 0.1s to 0.5s
        } else {
          // Final slow phase (last 10% of time)
          const finalProgress = (progress - 0.9) / 0.1;
          currentSpeed = 200 + (finalProgress * 300); // 200ms to 500ms
          reelAnimationSpeed = 0.5 + (finalProgress * 1.5); // 0.5s to 2.0s
        }
      }
      
      // Update the animation speed for the reel background
      setDiceState(prev => ({
        ...prev,
        currentNumber: Math.floor(Math.random() * 6) + 1,
        reelSpeed: reelAnimationSpeed // Add reel speed to state
      }));
      
      // Continue animation if not finished
      if (elapsedTime < animationDuration) {
        intervalId = setTimeout(animateReel, currentSpeed);
      }
    };

    // Start the animation
    animateReel();

    // Create "near miss" moments - show high value briefly
    const nearMissTimeout = setTimeout(() => {
      if (Math.random() < 0.7) { // 70% chance of near miss
        setDiceState(prev => ({
          ...prev,
          currentNumber: 6 // Briefly show a 6 for excitement
        }));
      }
    }, animationDuration * 0.6);

    // Stop spinning and show final result with "tick back" effect
    setTimeout(() => {
      clearTimeout(intervalId);
      clearTimeout(nearMissTimeout);
      
      // First show a "near miss" - overshoot the target for psychological effect
      const overshoot = finalValue < 6 ? finalValue + 1 : finalValue - 1;
      setDiceState({
        isSpinning: false,
        currentNumber: overshoot,
        finalNumber: finalValue,
        reelSpeed: 0.1 // Reset reel speed
      });

      // Then "tick back" to the actual result after a brief delay
      setTimeout(() => {
        setDiceState({
          isSpinning: false,
          currentNumber: finalValue,
          finalNumber: finalValue,
          reelSpeed: 0.1 // Reset reel speed
        });
      }, 300); // Longer pause for more dramatic effect
      
    }, animationDuration);
  };

  // Reset animations when match data changes
  useEffect(() => {
    if (matchData?.gameData.isRolling === false) {
      // Reset animations when rolling stops - longer delay to avoid interfering with second dice
      setTimeout(() => {
        setDice1Animation({ isSpinning: false, currentNumber: 1, finalNumber: null, reelSpeed: 0.1 });
        setDice2Animation({ isSpinning: false, currentNumber: 1, finalNumber: null, reelSpeed: 0.1 });
      }, 2500); // Increased delay to ensure second dice fully completes its cycle
    }
    
    // Reset dice 1 animation when dice 2 starts rolling
    if (matchData?.gameData.rollPhase === 'dice2') {
      setDice1Animation({ 
        isSpinning: false, 
        currentNumber: matchData.gameData.diceOne || 1, 
        finalNumber: matchData.gameData.diceOne || null,
        reelSpeed: 0.1
      });
    }
  }, [matchData?.gameData.isRolling, matchData?.gameData.rollPhase]);

  // All available backgrounds
  const allAvailableBackgrounds = [
    {
      id: 'All For Glory',
      name: 'All For Glory',
      url: '/Backgrounds/All For Glory.jpg',
      isVideo: false,
      isGradient: false
    },
    {
      id: 'default',
      name: 'Default',
      url: '/Backgrounds/default.jpg',
      isVideo: false,
      isGradient: false
    },
    {
      id: 'Long Road Ahead',
      name: 'Long Road Ahead',
      url: '/Backgrounds/Long Road Ahead.jpg',
      isVideo: false,
      isGradient: false
    },
    {
      id: 'Relax',
      name: 'Relax',
      url: '/Backgrounds/Relax.png',
      isVideo: false,
      isGradient: false
    },
    {
      id: 'New Day',
      name: 'New Day',
      url: '/Backgrounds/New Day.mp4',
      videoUrl: '/Backgrounds/New Day.mp4',
      isVideo: true,
      isGradient: false
    },
    {
      id: 'On A Mission',
      name: 'On A Mission',
      url: '/Backgrounds/On A Mission.mp4',
      videoUrl: '/Backgrounds/On A Mission.mp4',
      isVideo: true,
      isGradient: false
    },
    {
      id: 'Underwater',
      name: 'Underwater',
      url: '/Backgrounds/Underwater.mp4',
      videoUrl: '/Backgrounds/Underwater.mp4',
      isVideo: true,
      isGradient: false
    }
  ];

  // Subscribe to match updates
  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    console.log('🎮 Setting up match subscription for:', matchId);
    
    const unsubscribe = MatchService.subscribeToMatch(matchId, (data) => {
      if (data) {
        console.log('📡 Match data updated:', data);
        setMatchData(data);
        setLoading(false);
      } else {
        console.log('❌ Match not found');
        setLoading(false);
      }
    });

    return () => {
      console.log('🔄 Cleaning up match subscription');
      unsubscribe();
    };
  }, [matchId]);

  // Trigger slot machine animations when dice roll phases change
  useEffect(() => {
    if (!matchData?.gameData.isRolling) return;

    // Dice 1 animation trigger
    if (matchData.gameData.rollPhase === 'dice1' && !dice1Animation.isSpinning) {
      console.log('🎰 Starting Dice 1 slot machine animation');
      startSlotMachineAnimation(1, matchData.gameData.diceOne || 1, 1200);
    }

    // Dice 2 animation trigger (starts after dice 1 settles)
    if (matchData.gameData.rollPhase === 'dice2' && !dice2Animation.isSpinning) {
      console.log('🎰 Starting Dice 2 slot machine animation');
      startSlotMachineAnimation(2, matchData.gameData.diceTwo || 1, 1200);
    }
  }, [matchData?.gameData.rollPhase, matchData?.gameData.isRolling, matchData?.gameData.diceOne, matchData?.gameData.diceTwo]);

  // Trigger turn decider dice animation when choice is made and dice value is available
  useEffect(() => {
    if (matchData?.gameData.gamePhase === 'turnDecider' && 
        matchData.gameData.turnDeciderChoice && 
        matchData.gameData.turnDeciderDice && 
        !turnDeciderDiceAnimation.isSpinning) {
      
      console.log('🎯 Starting Turn Decider dice animation', {
        phase: matchData.gameData.gamePhase,
        choice: matchData.gameData.turnDeciderChoice,
        dice: matchData.gameData.turnDeciderDice,
        isSpinning: turnDeciderDiceAnimation.isSpinning
      });
      startSlotMachineAnimation('turnDecider', matchData.gameData.turnDeciderDice, 1500);
    }
  }, [matchData?.gameData.turnDeciderChoice, matchData?.gameData.turnDeciderDice, matchData?.gameData.gamePhase, turnDeciderDiceAnimation.isSpinning]);

  // Trigger turn transition animation when game phase changes from turnDecider to gameplay
  useEffect(() => {
    // Check if we just transitioned from turnDecider to gameplay
    if (previousGamePhase === 'turnDecider' && 
        matchData?.gameData.gamePhase === 'gameplay' && 
        matchData.hostData.matchData.turnActive !== undefined &&
        matchData.opponentData.matchData.turnActive !== undefined) {
      
      // Determine who is going first
      const isHost = matchData.hostData.playerId === user?.uid;
      const currentPlayerData = isHost ? matchData.hostData : matchData.opponentData;
      const opponentPlayerData = isHost ? matchData.opponentData : matchData.hostData;
      
      const activePlayer = currentPlayerData.matchData.turnActive ? currentPlayerData : opponentPlayerData;
      const randomMessage = turnTransitionMessages[Math.floor(Math.random() * turnTransitionMessages.length)];
      const fullMessage = activePlayer.playerDisplayName + randomMessage;
      
      console.log('🎮 Starting turn transition animation for:', activePlayer.playerDisplayName);
      
      setTurnTransition({
        show: true,
        message: fullMessage,
        animationKey: Date.now()
      });
      
      // Hide transition after 3 seconds (longer duration)
      setTimeout(() => {
        setTurnTransition(prev => ({ ...prev, show: false }));
      }, 3000);
    }
    
    // Update previous game phase
    setPreviousGamePhase(matchData?.gameData.gamePhase || null);
  }, [matchData?.gameData.gamePhase, matchData?.hostData.matchData.turnActive, matchData?.opponentData.matchData.turnActive, user?.uid, previousGamePhase]);

  // Trigger score animation after every dice roll
  useEffect(() => {
    if (!matchData?.gameData.isRolling && matchData?.gameData.turnScore !== undefined && matchData.gameData.turnScore >= 0) {
      // Process game rules based on dice values
      const dice1 = matchData.gameData.diceOne;
      const dice2 = matchData.gameData.diceTwo;
      
      // Game Rules Processing
      if (dice1 && dice2) {
        let shouldShowScore = true;
        let scoreToShow = matchData.gameData.turnScore || 0;
        let specialMessage = '';
        
        // Rule 1: Single 1 - Turn over, no score added
        if ((dice1 === 1 && dice2 !== 1) || (dice2 === 1 && dice1 !== 1)) {
          shouldShowScore = true;
          scoreToShow = 0;
          specialMessage = 'TURN OVER!';
        }
        // Rule 2: Double 6 - Turn over, player score reset to 0
        else if (dice1 === 6 && dice2 === 6) {
          shouldShowScore = true;
          scoreToShow = 0;
          specialMessage = 'BUSTED! SCORE RESET!';
        }
        // Rule 3: Double 1 (Snake Eyes) - +20 to turn score, continue playing
        else if (dice1 === 1 && dice2 === 1) {
          shouldShowScore = true;
          scoreToShow = 20;
          specialMessage = 'SNAKE EYES! +20!';
        }
        // Normal scoring - show turn score
        else {
          shouldShowScore = true;
          scoreToShow = matchData.gameData.turnScore || 0;
        }
        
        // Show score animation if needed
        if (shouldShowScore && scoreToShow > 0) {
          setTimeout(() => {
            setScoreAnimation({
              show: true,
              score: scoreToShow,
              animationKey: Date.now(),
              randomText: specialMessage || getRandomText(scoreToShow, specialMessage)
            });
            
            setTimeout(() => {
              setScoreAnimation(prev => ({ ...prev, show: false }));
            }, getAnimationDuration(scoreToShow, specialMessage));
          }, 200);
        }
        // Show special message for negative outcomes
        else if (specialMessage) {
          setTimeout(() => {
            setScoreAnimation({
              show: true,
              score: 0,
              animationKey: Date.now(),
              randomText: specialMessage
            });
            
            setTimeout(() => {
              setScoreAnimation(prev => ({ ...prev, show: false }));
            }, getAnimationDuration(0, specialMessage));
          }, 200);
        }
      }
    }
  }, [matchData?.gameData.isRolling, matchData?.gameData.turnScore, matchData?.gameData.diceOne, matchData?.gameData.diceTwo]);

  // Get animation properties based on score - Clean and professional
  const getAnimationProperties = (score: number, specialMessage?: string) => {
    // Handle special messages
    if (specialMessage) {
      if (specialMessage.includes('BUSTED') || specialMessage.includes('TURN OVER')) {
        return {
          fontSize: '100px',
          color: '#FF0000',
          duration: 3.0,
          scale: [0.8, 1.1, 1],
          glowIntensity: '0 0 20px rgba(255, 0, 0, 0.6)',
          screenShake: true,
          randomText: [specialMessage]
        };
      } else if (specialMessage.includes('SNAKE EYES')) {
        return {
          fontSize: '110px',
          color: '#FFD700',
          duration: 2.5,
          scale: [0.8, 1.2, 1],
          glowIntensity: '0 0 25px rgba(255, 215, 0, 0.8)',
          screenShake: false,
          randomText: [specialMessage]
        };
      }
    }
    
    // Normal score-based animations
    if (score >= 40) {
      // INSANE SCORE (40+) - Quick impactful flash
      return {
        fontSize: '120px',
        color: '#FFFFFF',
        duration: 2.5,
        scale: [0.8, 1.2, 1],
        glowIntensity: '0 0 30px rgba(255, 255, 255, 0.8)',
        screenShake: true,
        randomText: ["INSANE!"]
      };
    } else if (score >= 30) {
      // EPIC SCORE (30-40) - Clean white pop
      return {
        fontSize: '110px',
        color: '#FFFFFF',
        duration: 2.3,
        scale: [0.8, 1.15, 1],
        glowIntensity: '0 0 25px rgba(255, 255, 255, 0.7)',
        screenShake: false,
        randomText: ["EPIC!"]
      };
    } else if (score >= 20) {
      // AMAZING SCORE (20-30) - Clean red pop
      return {
        fontSize: '100px',
        color: '#FF4444',
        duration: 2.1,
        scale: [0.8, 1.1, 1],
        glowIntensity: '0 0 20px rgba(255, 68, 68, 0.6)',
        screenShake: false,
        randomText: ["AMAZING!"]
      };
    } else if (score >= 10) {
      // GOOD SCORE (10-20) - Clean orange pop
      return {
        fontSize: '90px',
        color: '#FF8C00',
        duration: 1.9,
        scale: [0.8, 1.05, 1],
        glowIntensity: '0 0 15px rgba(255, 140, 0, 0.5)',
        screenShake: false,
        randomText: ["GOOD!"]
      };
    } else {
      // BASIC SCORE (0-10) - Subtle green pop
      return {
        fontSize: '80px',
        color: '#4CAF50',
        duration: 1.7,
        scale: [0.8, 1.02, 1],
        glowIntensity: '0 0 10px rgba(76, 175, 80, 0.4)',
        screenShake: false,
        randomText: ["Nice!"]
      };
    }
  };

  const getAnimationDuration = (score: number, specialMessage?: string) => {
    return getAnimationProperties(score, specialMessage).duration * 1000;
  };

  // Get random text for the score
  const getRandomText = (score: number, specialMessage?: string) => {
    const props = getAnimationProperties(score, specialMessage);
    if (props.randomText.length === 0) return '';
    return props.randomText[Math.floor(Math.random() * props.randomText.length)];
  };

  // Load player backgrounds
  useEffect(() => {
    if (!matchData) return;

    const isHost = matchData.hostData.playerId === user?.uid;
    
    // Always show current user on the left (index 0), opponent on right (index 1)
    const currentPlayerData = isHost ? matchData.hostData : matchData.opponentData;
    const opponentPlayerData = isHost ? matchData.opponentData : matchData.hostData;

    // Get background data for current player (left side)
    const currentPlayerBg = allAvailableBackgrounds.find(
      bg => bg.id === currentPlayerData.playerMatchBackgroundEquipped
    ) || allAvailableBackgrounds.find(bg => bg.id === 'default');

    // Get background data for opponent (right side)  
    const opponentPlayerBg = allAvailableBackgrounds.find(
      bg => bg.id === opponentPlayerData.playerMatchBackgroundEquipped
    ) || allAvailableBackgrounds.find(bg => bg.id === 'default');

    setPlayerBackgrounds([currentPlayerBg, opponentPlayerBg]);
  }, [matchData, user?.uid]);

  // Handle exit match
  const handleExitMatch = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('currentMatchId');
    }
    navigateToSection('dashboard');
  };

  // Handle dice roll (Development mode - can play as both players)
  const handleRollDice = async () => {
    if (!matchId || !matchData || matchData.gameData.isRolling) return;

    try {
      // In development mode, allow rolling regardless of turn
      // Roll dice using MatchService (sequential rolling handled in backend)
      await MatchService.rollDice(matchId, user?.uid || '');
      
      console.log('🎲 Sequential dice roll initiated (Development Mode)');
    } catch (error) {
      console.error('❌ Error rolling dice:', error);
    }
  };

  // Handle banking score (Development mode - can play as both players)
  const handleBankScore = async () => {
    if (!matchId || !matchData || matchData.gameData.turnScore <= 0 || matchData.gameData.isRolling) return;

    try {
      // In development mode, allow banking regardless of turn
      // Bank the turn score to player score and switch turns
      await MatchService.bankScore(matchId, user?.uid || '');
      
      console.log('💰 Score banked and turn switched (Development Mode)');
    } catch (error) {
      console.error('❌ Error banking score:', error);
    }
  };

  // Handle turn decider choice
  const handleTurnDeciderChoice = async (choice: 'odd' | 'even') => {
    if (!matchId || !matchData || matchData.gameData.gamePhase !== 'turnDecider') return;
    
    // Check if current player is the one who should choose
    const isHost = matchData.hostData.playerId === user?.uid;
    const playerNumber = isHost ? 1 : 2;
    
    if (matchData.gameData.turnDecider !== playerNumber) {
      console.log('⏳ Not your turn to choose');
      return;
    }

    try {
      await MatchService.makeTurnDeciderChoice(matchId, user?.uid || '', choice);
      console.log(`🎯 Turn decider choice made: ${choice}`);
    } catch (error) {
      console.error('❌ Error making turn decider choice:', error);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-white text-2xl" style={{ fontFamily: 'Audiowide' }}>
          Loading match...
        </div>
      </div>
    );
  }

  if (!matchId || !matchData) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-4xl mb-4" style={{ fontFamily: 'Audiowide' }}>
            NO ACTIVE MATCH
          </div>
          <button
            onClick={handleExitMatch}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
            style={{ fontFamily: 'Audiowide' }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isHost = matchData.hostData.playerId === user?.uid;
  const currentPlayerData = isHost ? matchData.hostData : matchData.opponentData;
  const opponentPlayerData = isHost ? matchData.opponentData : matchData.hostData;

  // Arena background style
  const arenaBg = displayBackground || allAvailableBackgrounds.find(bg => bg.id === 'Long Road Ahead');
  const arenaBackgroundStyle = {
    backgroundImage: arenaBg && typeof arenaBg === 'object' && !arenaBg.isVideo ? `url('${arenaBg.url}')` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  };

  // Player background styles
  const getPlayerBackgroundStyle = (backgroundData: any) => ({
    backgroundImage: backgroundData?.isVideo ? 'none' : `url('${backgroundData?.url}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  });

  // Slot Machine Dice Component
  const SlotMachineDice = ({ 
    diceNumber, 
    animationState, 
    matchRollPhase, 
    actualValue,
    isGameRolling,
    isTurnDecider = false
  }: {
    diceNumber: 1 | 2 | 'turnDecider';
    animationState: typeof dice1Animation;
    matchRollPhase: string | undefined;
    actualValue: number | null;
    isGameRolling: boolean;
    isTurnDecider?: boolean;
  }) => {
    // For turn decider, handle animation logic differently
    const isCurrentlyRolling = isTurnDecider ? 
      (matchRollPhase === 'turnDecider' && animationState.isSpinning) :
      (isGameRolling && 
        ((diceNumber === 1 && matchRollPhase === 'dice1') || 
         (diceNumber === 2 && matchRollPhase === 'dice2')));
    
    // Enhanced animation logic to prevent jumping for second dice
    const shouldShowAnimation = animationState.isSpinning && isCurrentlyRolling;
    
    // Enhanced display logic to prevent jumping during dice 2 rolling
    const getDisplayValue = () => {
      // If currently animating, always show animation number
      if (shouldShowAnimation) {
        return animationState.currentNumber;
      }
      
      // If this is dice 2 and it's in the "overshoot" phase, show the overshoot value
      if (diceNumber === 2 && animationState.finalNumber !== null && !animationState.isSpinning) {
        return animationState.currentNumber; // This handles the overshoot and tick-back phases
      }
      
      // If this is dice 1 and dice 2 is rolling, show dice 1's settled value
      if (diceNumber === 1 && isGameRolling && matchRollPhase === 'dice2') {
        return actualValue || animationState.finalNumber || 1;
      }
      
      // Normal settled state - show actual game value first, then animation final
      if (actualValue !== null && actualValue !== undefined && !isGameRolling) {
        return actualValue;
      }
      
      // Show animation final number if available
      if (animationState.finalNumber !== null) {
        return animationState.finalNumber;
      }
      
      return '?';
    };
    
    const displayValue = getDisplayValue();

    // Determine if this dice number should glow and what color
    const getDiceNumberGlow = () => {
      // Turn decider dice never glow
      if (isTurnDecider) {
        return { shouldGlow: false, color: '', intensity: '' };
      }
      
      const dice1Value = matchData?.gameData.diceOne;
      const dice2Value = matchData?.gameData.diceTwo;
      const isRolling = matchData?.gameData.isRolling;
      const rollPhase = matchData?.gameData.rollPhase;
      
      // Don't glow 2, 3, 4, 5 ever
      if (displayValue === 2 || displayValue === 3 || displayValue === 4 || displayValue === 5) {
        return { shouldGlow: false, color: '', intensity: '' };
      }
      
      // First dice logic
      if (diceNumber === 1) {
        if (dice1Value === 1) {
          // First dice is 1
          if (isRolling && rollPhase === 'dice2') {
            // Second dice still rolling, keep 1 red
            return { 
              shouldGlow: true, 
              color: '#FF0000', 
              intensity: '0 0 8px rgba(255, 0, 0, 0.6), 0 0 16px rgba(255, 0, 0, 0.4)' 
            };
          } else if (!isRolling && dice2Value) {
            // Both dice settled
            if (dice2Value === 1) {
              // Snake eyes - gold glow
              return { 
                shouldGlow: true, 
                color: '#FFD700', 
                intensity: '0 0 10px rgba(255, 215, 0, 0.7), 0 0 20px rgba(255, 215, 0, 0.5)' 
              };
            } else {
              // Second dice is not 1 - both glow red
              return { 
                shouldGlow: true, 
                color: '#FF0000', 
                intensity: '0 0 8px rgba(255, 0, 0, 0.6), 0 0 16px rgba(255, 0, 0, 0.4)' 
              };
            }
          }
        } else if (dice1Value === 6) {
          // First dice is 6
          if (isRolling && rollPhase === 'dice2') {
            // Second dice still rolling, keep 6 red
            return { 
              shouldGlow: true, 
              color: '#FF0000', 
              intensity: '0 0 8px rgba(255, 0, 0, 0.6), 0 0 16px rgba(255, 0, 0, 0.4)' 
            };
          } else if (!isRolling && dice2Value) {
            // Both dice settled
            if (dice2Value === 6) {
              // Double sixes - big red glow
              return { 
                shouldGlow: true, 
                color: '#FF0000', 
                intensity: '0 0 12px rgba(255, 0, 0, 0.8), 0 0 24px rgba(255, 0, 0, 0.6), 0 0 36px rgba(255, 0, 0, 0.4)' 
              };
            } else {
              // Second dice is not 6 - remove glow
              return { shouldGlow: false, color: '', intensity: '' };
            }
          }
        }
      }
      
      // Second dice logic
      if (diceNumber === 2) {
        if (dice1Value === 1 && dice2Value && !isRolling) {
          // First dice was 1, second dice settled
          if (dice2Value === 1) {
            // Snake eyes - gold glow
            return { 
              shouldGlow: true, 
              color: '#FFD700', 
              intensity: '0 0 10px rgba(255, 215, 0, 0.7), 0 0 20px rgba(255, 215, 0, 0.5)' 
            };
          } else {
            // Second dice is not 1 - both glow red
            return { 
              shouldGlow: true, 
              color: '#FF0000', 
              intensity: '0 0 8px rgba(255, 0, 0, 0.6), 0 0 16px rgba(255, 0, 0, 0.4)' 
            };
          }
        } else if (dice1Value === 6 && dice2Value && !isRolling) {
          // First dice was 6, second dice settled
          if (dice2Value === 6) {
            // Double sixes - big red glow
            return { 
              shouldGlow: true, 
              color: '#FF0000', 
              intensity: '0 0 12px rgba(255, 0, 0, 0.8), 0 0 24px rgba(255, 0, 0, 0.6), 0 0 36px rgba(255, 0, 0, 0.4)' 
            };
          }
          // If second dice is not 6, no glow (first dice glow also removed)
        }
      }
      
      return { shouldGlow: false, color: '', intensity: '' };
    };

    const glowInfo = getDiceNumberGlow();

    // Create multiple reel numbers for visual depth
    const createReelNumbers = () => {
      const numbers: number[] = [];
      for (let i = 0; i < 8; i++) {
        numbers.push(Math.floor(Math.random() * 6) + 1);
      }
      return numbers;
    };
    
    return (
      <div className="relative rounded-[30px] border border-white/0 overflow-hidden"
           style={{
             display: 'flex',
             height: '300px',
             width: '600px',
             padding: '0 110px',
             flexDirection: 'row',
             justifyContent: 'space-between',
             alignItems: 'center',
             alignSelf: 'stretch',
             backdropFilter: 'blur(20px)'
           }}>
        {shouldShowAnimation ? (
          // Slot machine reel effect
          <div className="absolute inset-0">
            {/* Spinning reel background */}
            <motion.div
              className="absolute inset-0 flex flex-row items-center"
              animate={{
                x: [-600, 0, -600],
              }}
              transition={{
                duration: animationState.reelSpeed || 0.1,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              {createReelNumbers().map((num, index) => (
                <div
                  key={`reel-${index}`}
                  className="h-full flex items-center justify-center text-gray-400 opacity-30"
                  style={{ 
                    minWidth: '600px',
                    backgroundColor: index % 2 === 0 ? 'rgba(0,0,0,0.05)' : 'transparent',
                    color: '#000',
                    fontFamily: 'Orbitron, monospace',
                    fontSize: '200px',
                    fontStyle: 'normal',
                    fontWeight: 500,
                    lineHeight: '42px',
                    textTransform: 'uppercase'
                  }}
                >
                  {num}
                </div>
              ))}
            </motion.div>
            
            {/* Main spinning number */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center z-10"
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 2, -2, 0]
              }}
              transition={{
                duration: 0.15,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <span style={{
                color: '#000',
                fontFamily: 'Orbitron, monospace',
                fontSize: '200px',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '42px',
                textTransform: 'uppercase',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
              }}>
                {animationState.currentNumber}
              </span>
            </motion.div>
            
            {/* Slot machine glow effect */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-t from-yellow-300/40 via-transparent to-yellow-300/40"
              animate={{
                opacity: [0.3, 0.8, 0.3]
              }}
              transition={{
                duration: 0.2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            {/* Slot machine window frame effect */}
            <div className="absolute inset-0 border-2 border-yellow-400/50 rounded-[30px] pointer-events-none" />
          </div>
        ) : (
          // Static dice display - completely still when not rolling
          <div className="w-full h-full flex items-center justify-center relative">
            {/* Dice number with conditional glow */}
            {glowInfo.shouldGlow ? (
              <motion.span
                style={{
                  color: glowInfo.color,
                  fontFamily: 'Orbitron, monospace',
                  fontSize: '200px',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '42px',
                  textTransform: 'uppercase',
                  textShadow: glowInfo.intensity
                }}
                className="relative z-10"
                animate={{
                  textShadow: [
                    glowInfo.intensity,
                    `${glowInfo.intensity}, 0 0 20px ${glowInfo.color}40`,
                    glowInfo.intensity
                  ]
                }}
                transition={{
                  duration: 2.0,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {displayValue}
              </motion.span>
            ) : (
              <span style={{
                color: '#000',
                fontFamily: 'Orbitron, monospace',
                fontSize: '200px',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '42px',
                textTransform: 'uppercase'
              }} className="relative z-10">
                {displayValue}
              </span>
            )}
          </div>
        )}
        
        {/* "Near miss" flash effect - More dramatic */}
        {animationState.finalNumber && displayValue !== animationState.finalNumber && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-orange-400/60 to-red-400/60 rounded-[30px]"
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ 
              opacity: [0, 1, 0.5, 0], 
              scale: [1.2, 1, 1, 0.95]
            }}
            transition={{ 
              duration: 0.4,
              ease: "easeOut"
            }}
          />
        )}

        {/* Winning number celebration effect */}
        {animationState.finalNumber && displayValue === 6 && (
          <motion.div
            className="absolute -inset-1 bg-gradient-to-br from-yellow-400/30 to-orange-400/30 rounded-[35px]"
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div 
      className="w-full h-full relative overflow-hidden"
      style={arenaBackgroundStyle}
    >
      {/* Arena Background Video */}
      {arenaBg && typeof arenaBg === 'object' && arenaBg.isVideo && (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover -z-10"
        >
          <source src={arenaBg.videoUrl} type="video/mp4" />
        </video>
      )}

      {/* Main Game Layout */}
      <div className="relative w-full h-full flex flex-col">
        
        {/* Top Navigation Bar */}
        <div className="absolute top-0 left-0 right-0 z-50 p-4">
          <div className="flex justify-between items-center">
            <button
              onClick={handleExitMatch}
              className="flex items-center gap-2 px-4 py-2 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm transition-colors"
              style={{ fontFamily: 'Audiowide' }}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 7v4H5.83l2.88-2.88-1.42-1.41L2 12l5.29 5.29 1.42-1.41L5.83 13H19v4l5-5-5-5z"/>
              </svg>
              Exit Match
            </button>
            
            <div className="text-center">
              <h1 className="text-6xl font-bold text-white" style={{ fontFamily: 'Audiowide' }}>
                {matchData.gameData.gameMode}
              </h1>
            </div>
            
            <div className="w-32"></div> {/* Spacer for center alignment */}
          </div>
        </div>

        {/* Game Arena */}
        <div className="flex-1 flex items-center justify-center p-8 pt-24">
          <div className="flex items-center justify-between gap-8" style={{ width: 'calc(100vw - 160px)' }}>
            
            {/* Player 1 (Current User - Left Side) */}
            <div className="flex-1 max-w-[500px]">
              {/* Player Name Above Container - Left Aligned */}
              <h2 
                className="text-3xl font-bold text-white mb-4 text-left"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                }}
              >
                {currentPlayerData.playerDisplayName}
              </h2>
              
              <div
                className="relative rounded-3xl overflow-hidden shadow-2xl border-4"
                style={{ 
                  borderColor: currentPlayerData.matchData.turnActive ? '#00ff00' : '#ffffff',
                  height: '500px'
                }}
              >
                {/* Player Background */}
                <div 
                  className="absolute inset-0"
                  style={getPlayerBackgroundStyle(playerBackgrounds[0])}
                >
                  {/* Background Video */}
                  {playerBackgrounds[0]?.isVideo && (
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 w-full h-full object-cover"
                    >
                      <source src={playerBackgrounds[0].videoUrl} type="video/mp4" />
                    </video>
                  )}
                </div>

                {/* Player Info Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Match Score - Large and Centered */}
                  <div 
                    className="text-8xl font-bold text-white"
                    style={{ 
                      fontFamily: 'Audiowide',
                      textShadow: '4px 4px 8px rgba(0,0,0,0.8)'
                    }}
                  >
                    {currentPlayerData.matchData.playerScore}
                  </div>
                </div>

                {/* Turn Indicator */}
                {matchData.gameData.gamePhase === 'gameplay' && currentPlayerData.matchData.turnActive && (
                  <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                    YOUR TURN
                  </div>
                )}

                {/* Turn Decider Indicator */}
                {matchData.gameData.gamePhase === 'turnDecider' && (
                  <div className="absolute top-4 left-4">
                    {(() => {
                      const isHost = matchData.hostData.playerId === user?.uid;
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
                  {(() => {
                    const backgroundId = currentPlayerData.playerMatchBackgroundEquipped;
                    // Determine rarity based on background type
                    if (backgroundId === 'New Day' || backgroundId === 'On A Mission' || backgroundId === 'Underwater') {
                      return 'MASTERPIECE';
                    } else if (backgroundId === 'All For Glory' || backgroundId === 'Long Road Ahead') {
                      return 'EPIC';
                    } else if (backgroundId === 'Relax') {
                      return 'RARE';
                    } else {
                      return 'COMMON';
                    }
                  })()}
                </span>
              </div>
            </div>

            {/* Center Dice Area */}
            <div className="flex flex-col items-center justify-center min-w-0" style={{ alignSelf: 'center' }}>
              {/* Dice Container */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {matchData.gameData.gamePhase === 'turnDecider' ? (
                  // Turn Decider Phase - Single Dice with Animation
                  <div className="flex justify-center">
                    <div style={{ width: '600px' }}>
                      <SlotMachineDice
                        diceNumber={'turnDecider' as any}
                        animationState={turnDeciderDiceAnimation}
                        matchRollPhase={matchData.gameData.turnDeciderChoice ? 'turnDecider' : undefined}
                        actualValue={matchData.gameData.turnDeciderDice || null}
                        isGameRolling={matchData.gameData.turnDeciderChoice !== null && matchData.gameData.turnDeciderDice !== null}
                        isTurnDecider={true}
                      />
                    </div>
                  </div>
                ) : (
                  // Normal Gameplay - Two Dice with Slot Machine Animation (Stacked Vertically)
                  <div className="flex flex-col gap-4">
                    {/* Dice 1 - Slot Machine */}
                    <div style={{ width: '600px' }}>
                      <SlotMachineDice
                        diceNumber={1}
                        animationState={dice1Animation}
                        matchRollPhase={matchData.gameData.rollPhase}
                        actualValue={matchData.gameData.diceOne}
                        isGameRolling={matchData.gameData.isRolling || false}
                      />
                    </div>
                    
                    {/* Dice 2 - Slot Machine */}
                    <div style={{ width: '600px' }}>
                      <SlotMachineDice
                        diceNumber={2}
                        animationState={dice2Animation}
                        matchRollPhase={matchData.gameData.rollPhase}
                        actualValue={matchData.gameData.diceTwo}
                        isGameRolling={matchData.gameData.isRolling || false}
                      />
                    </div>
                  </div>
                )}
                
                {/* Clean Professional Score Animation - Quick Pop */}
                {scoreAnimation.show && (
                  <>
                    {/* Screen shake effect for INSANE scores (40+) - Subtle */}
                    {getAnimationProperties(scoreAnimation.score, scoreAnimation.randomText).screenShake && (
                      <motion.div
                        className="fixed inset-0 z-40 pointer-events-none"
                        animate={{
                          x: [0, -3, 3, -2, 2, 0],
                          y: [0, 2, -2, 1, -1, 0]
                        }}
                        transition={{
                          duration: 0.4,
                          ease: "easeInOut"
                        }}
                      >
                        <div className="w-full h-full bg-white/2" />
                      </motion.div>
                    )}

                    <motion.div 
                      key={scoreAnimation.animationKey}
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-center"
                      initial={{ scale: 0.5, opacity: 0, y: 10 }}
                      animate={{ 
                        scale: getAnimationProperties(scoreAnimation.score, scoreAnimation.randomText).scale,
                        opacity: [0, 1, 1, 0],
                        y: [10, -5, -5, -15]
                      }}
                      transition={{
                        duration: getAnimationProperties(scoreAnimation.score, scoreAnimation.randomText).duration,
                        times: [0, 0.2, 0.8, 1],
                        ease: [0.4, 0, 0.2, 1]
                      }}
                    >
                      {/* Score Display */}
                      <motion.div
                        className="relative"
                        animate={{
                          textShadow: [
                            getAnimationProperties(scoreAnimation.score, scoreAnimation.randomText).glowIntensity,
                            `${getAnimationProperties(scoreAnimation.score, scoreAnimation.randomText).glowIntensity}, 0 0 40px ${getAnimationProperties(scoreAnimation.score, scoreAnimation.randomText).color}40`,
                            getAnimationProperties(scoreAnimation.score, scoreAnimation.randomText).glowIntensity
                          ]
                        }}
                        transition={{
                          duration: 0.6,
                          ease: "easeInOut"
                        }}
                      >
                        {scoreAnimation.score > 0 ? (
                          <span style={{
                            color: getAnimationProperties(scoreAnimation.score, scoreAnimation.randomText).color,
                            fontFamily: 'Orbitron, monospace',
                            fontSize: getAnimationProperties(scoreAnimation.score, scoreAnimation.randomText).fontSize,
                            fontWeight: 700,
                            textShadow: getAnimationProperties(scoreAnimation.score, scoreAnimation.randomText).glowIntensity,
                            WebkitTextStroke: '1px rgba(0, 0, 0, 0.3)',
                            display: 'block'
                          }}>
                            +{scoreAnimation.score}
                          </span>
                        ) : null}
                        
                        {/* Random text display - Clean and small */}
                        {scoreAnimation.randomText && (
                          <motion.div
                            className="mt-1"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ 
                              opacity: [0, 1, 1, 0],
                              scale: [0.8, 1, 1, 0.9]
                            }}
                            transition={{
                              duration: getAnimationProperties(scoreAnimation.score, scoreAnimation.randomText).duration * 0.9,
                              delay: 0.1,
                              ease: "easeOut"
                            }}
                          >
                            <span style={{
                              color: getAnimationProperties(scoreAnimation.score, scoreAnimation.randomText).color,
                              fontFamily: 'Audiowide, sans-serif',
                              fontSize: '28px',
                              fontWeight: 600,
                              textShadow: `0 0 10px ${getAnimationProperties(scoreAnimation.score, scoreAnimation.randomText).color}60`,
                              opacity: 0.9
                            }}>
                              {scoreAnimation.randomText}
                            </span>
                          </motion.div>
                        )}
                      </motion.div>

                      {/* Subtle background glow */}
                      <motion.div
                        className="absolute inset-0 rounded-full blur-md -z-10"
                        style={{ 
                          background: `radial-gradient(circle, ${getAnimationProperties(scoreAnimation.score, scoreAnimation.randomText).color}20, transparent)`,
                          width: '120px', 
                          height: '120px', 
                          transform: 'translate(-50%, -50%)',
                          left: '50%',
                          top: '50%'
                        }}
                        animate={{
                          scale: [0.8, 1.3, 1],
                          opacity: [0, 0.6, 0]
                        }}
                        transition={{
                          duration: getAnimationProperties(scoreAnimation.score, scoreAnimation.randomText).duration,
                          ease: "easeOut"
                        }}
                      />
                    </motion.div>
                  </>
                )}

                {/* Turn Transition Animation - Epic Message */}
                {turnTransition.show && (
                  <motion.div 
                    key={turnTransition.animationKey}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-center"
                    initial={{ scale: 0.5, opacity: 0, y: 20 }}
                    animate={{ 
                      scale: [0.5, 1.1, 1, 1, 1],
                      opacity: [0, 1, 1, 1, 0],
                      y: [20, -10, -10, -10, -30]
                    }}
                    transition={{
                      duration: 3.0,
                      times: [0, 0.2, 0.3, 0.9, 1],
                      ease: [0.4, 0, 0.2, 1]
                    }}
                  >
                    {/* Epic Turn Transition Message */}
                    <motion.div
                      className="relative"
                      animate={{
                        textShadow: [
                          '0 0 20px rgba(255, 215, 0, 0.8)',
                          '0 0 30px rgba(255, 215, 0, 1), 0 0 40px rgba(255, 215, 0, 0.8)',
                          '0 0 20px rgba(255, 215, 0, 0.8)'
                        ]
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: 3,
                        ease: "easeInOut"
                      }}
                    >
                      <div
                        style={{
                          color: '#FFD700',
                          fontFamily: 'Audiowide',
                          fontSize: '60px',
                          fontStyle: 'normal',
                          fontWeight: 700,
                          lineHeight: '1.2',
                          textTransform: 'uppercase',
                          textAlign: 'center',
                          maxWidth: '800px'
                        }}
                      >
                        {turnTransition.message}
                      </div>
                    </motion.div>

                    {/* Epic glow background */}
                    <motion.div
                      className="absolute inset-0 rounded-full blur-lg -z-10"
                      style={{ 
                        background: 'radial-gradient(circle, rgba(255, 215, 0, 0.3), transparent)',
                        width: '200px', 
                        height: '200px', 
                        transform: 'translate(-50%, -50%)',
                        left: '50%',
                        top: '50%'
                      }}
                      animate={{
                        scale: [0.8, 1.5, 1],
                        opacity: [0, 0.8, 0]
                      }}
                      transition={{
                        duration: 3.0,
                        ease: "easeOut"
                      }}
                    />

                    {/* Subtle screen flash */}
                    <motion.div
                      className="fixed inset-0 z-40 pointer-events-none"
                      animate={{
                        backgroundColor: [
                          'rgba(255, 215, 0, 0)',
                          'rgba(255, 215, 0, 0.05)',
                          'rgba(255, 215, 0, 0)'
                        ]
                      }}
                      transition={{
                        duration: 0.6,
                        times: [0, 0.3, 1],
                        ease: "easeInOut"
                      }}
                    />
                  </motion.div>
                )}

                {/* Turn Decider Info */}
                {matchData.gameData.gamePhase === 'turnDecider' && (
                  <div className="mt-4 text-center">
                    <div className="text-lg font-bold text-yellow-400 mb-2" style={{ fontFamily: 'Audiowide' }}>
                      WHO GOES FIRST?
                    </div>
                    {matchData.gameData.turnDeciderChoice && matchData.gameData.turnDeciderDice && (
                      <div className="text-sm text-white space-y-1" style={{ fontFamily: 'Audiowide' }}>
                        <div>Choice: {matchData.gameData.turnDeciderChoice.toUpperCase()}</div>
                        <div>Dice: {matchData.gameData.turnDeciderDice} ({matchData.gameData.turnDeciderDice % 2 === 1 ? 'ODD' : 'EVEN'})</div>
                        <div className="text-yellow-400 font-bold">
                          {(() => {
                            const dice = matchData.gameData.turnDeciderDice;
                            const choice = matchData.gameData.turnDeciderChoice;
                            const isOdd = dice % 2 === 1;
                            const choiceCorrect = (choice === 'odd' && isOdd) || (choice === 'even' && !isOdd);
                            return choiceCorrect ? 'CORRECT! You go first!' : 'INCORRECT! Opponent goes first!';
                          })()}
                        </div>
                      </div>
                    )}
                    {matchData.gameData.turnDeciderChoice && !matchData.gameData.turnDeciderDice && (
                      <div className="text-sm text-white" style={{ fontFamily: 'Audiowide' }}>
                        Choice: {matchData.gameData.turnDeciderChoice.toUpperCase()} - Rolling dice...
                      </div>
                    )}
                  </div>
                )}

                {/* Turn Score Display */}
                {matchData.gameData.gamePhase === 'gameplay' && (
                  <div className="mt-4 text-center">
                    <div className="text-sm text-yellow-400 mb-1" style={{ fontFamily: 'Audiowide' }}>
                      TURN SCORE
                    </div>
                    <div 
                      className="text-4xl font-bold text-white"
                      style={{ 
                        fontFamily: 'Orbitron, monospace',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                      }}
                    >
                      {matchData.gameData.turnScore || 0}
                    </div>
                  </div>
                )}

                {/* Game Over Display */}
                {matchData.gameData.gamePhase === 'gameOver' && (
                  <div className="mt-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400 mb-2" style={{ fontFamily: 'Audiowide' }}>
                      🏆 GAME OVER! 🏆
                    </div>
                    <div className="text-lg text-white mb-1" style={{ fontFamily: 'Audiowide' }}>
                      {matchData.gameData.winner} WINS!
                    </div>
                    {matchData.gameData.gameOverReason && (
                      <div className="text-sm text-gray-300" style={{ fontFamily: 'Audiowide' }}>
                        {matchData.gameData.gameOverReason}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Game Action Buttons */}
              <div className="mt-4 flex gap-4">
                {matchData.gameData.gamePhase === 'turnDecider' ? (
                  // Turn Decider Phase - ODD/EVEN Buttons
                  <>
                    {/* Check if current player should choose */}
                    {(() => {
                      const isHost = matchData.hostData.playerId === user?.uid;
                      const playerNumber = isHost ? 1 : 2;
                      const isPlayerTurn = matchData.gameData.turnDecider === playerNumber;
                      const choiceAlreadyMade = matchData.gameData.turnDeciderChoice !== null;
                      
                      if (choiceAlreadyMade) {
                        // Don't show waiting message - let the dice animation and turn decider info handle the display
                        return null;
                      }
                      
                      if (!isPlayerTurn) {
                        return (
                          <div className="text-center text-white" style={{ fontFamily: 'Audiowide' }}>
                            <div className="text-lg">Opponent's Turn</div>
                            <div className="text-sm text-yellow-400">
                              They're choosing odd or even...
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <>
                          {/* ODD Button */}
                          <button
                            onClick={() => handleTurnDeciderChoice('odd')}
                            className="px-8 py-4 rounded-xl font-bold text-xl transition-all bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl"
                            style={{ fontFamily: 'Audiowide' }}
                          >
                            ODD
                          </button>

                          {/* EVEN Button */}
                          <button
                            onClick={() => handleTurnDeciderChoice('even')}
                            className="px-8 py-4 rounded-xl font-bold text-xl transition-all bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl"
                            style={{ fontFamily: 'Audiowide' }}
                          >
                            EVEN
                          </button>
                        </>
                      );
                    })()}
                  </>
                ) : matchData.gameData.gamePhase === 'gameOver' ? (
                  // Game Over Phase - Show final results
                  <div className="text-center text-white" style={{ fontFamily: 'Audiowide' }}>
                    <button
                      onClick={handleExitMatch}
                      className="px-8 py-4 rounded-xl font-bold text-xl transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
                      style={{ fontFamily: 'Audiowide' }}
                    >
                      RETURN TO DASHBOARD
                    </button>
                  </div>
                ) : (
                  // Normal Gameplay - PLAY/SAVE Buttons
                  <>
                    {/* Check if it's the current player's turn */}
                    {(() => {
                      const isHost = matchData.hostData.playerId === user?.uid;
                      const currentPlayer = isHost ? matchData.hostData : matchData.opponentData;
                      const isPlayerTurn = currentPlayer.matchData.turnActive;
                      
                      if (!isPlayerTurn) {
                        return (
                          <div className="text-center text-white" style={{ fontFamily: 'Audiowide' }}>
                            <div className="text-lg">Opponent's Turn</div>
                            <div className="text-sm text-yellow-400">
                              Waiting for them to play...
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <>
                          {/* PLAY Button */}
                          <button
                            onClick={handleRollDice}
                            disabled={matchData.gameData.isRolling || turnTransition.show}
                            className={`px-12 py-6 rounded-xl font-bold text-2xl transition-all ${
                              !matchData.gameData.isRolling && !turnTransition.show
                                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                                : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                            }`}
                            style={{ fontFamily: 'Audiowide' }}
                          >
                            {matchData.gameData.isRolling ? 'ROLLING...' : turnTransition.show ? 'GET READY...' : 'PLAY'}
                          </button>

                          {/* SAVE Button */}
                          <button
                            onClick={handleBankScore}
                            disabled={matchData.gameData.turnScore <= 0 || matchData.gameData.isRolling || turnTransition.show}
                            className={`px-12 py-6 rounded-xl font-bold text-2xl transition-all ${
                              matchData.gameData.turnScore > 0 && !matchData.gameData.isRolling && !turnTransition.show
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                                : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                            }`}
                            style={{ fontFamily: 'Audiowide' }}
                          >
                            SAVE ({matchData.gameData.turnScore || 0})
                          </button>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>

            {/* Player 2 (Opponent - Right Side) */}
            <div className="flex-1 max-w-[500px]">
              {/* Player Name Above Container - Right Aligned */}
              <h2 
                className="text-3xl font-bold text-white mb-4 text-right"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                }}
              >
                {opponentPlayerData.playerDisplayName}
              </h2>
              
              <div
                className="relative rounded-3xl overflow-hidden shadow-2xl border-4"
                style={{ 
                  borderColor: opponentPlayerData.matchData.turnActive ? '#00ff00' : '#ffffff',
                  height: '500px'
                }}
              >
                {/* Player Background */}
                <div 
                  className="absolute inset-0"
                  style={getPlayerBackgroundStyle(playerBackgrounds[1])}
                >
                  {/* Background Video */}
                  {playerBackgrounds[1]?.isVideo && (
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 w-full h-full object-cover"
                    >
                      <source src={playerBackgrounds[1].videoUrl} type="video/mp4" />
                    </video>
                  )}
                </div>

                {/* Player Info Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Match Score - Large and Centered */}
                  <div 
                    className="text-8xl font-bold text-white"
                    style={{ 
                      fontFamily: 'Audiowide',
                      textShadow: '4px 4px 8px rgba(0,0,0,0.8)'
                    }}
                  >
                    {opponentPlayerData.matchData.playerScore}
                  </div>
                </div>

                {/* Turn Indicator */}
                {matchData.gameData.gamePhase === 'gameplay' && opponentPlayerData.matchData.turnActive && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                    THEIR TURN
                  </div>
                )}

                {/* Turn Decider Indicator */}
                {matchData.gameData.gamePhase === 'turnDecider' && (
                  <div className="absolute top-4 right-4">
                    {(() => {
                      const isHost = matchData.hostData.playerId === user?.uid;
                      const playerNumber = isHost ? 2 : 1; // Opponent's number
                      const isOpponentTurn = matchData.gameData.turnDecider === playerNumber;
                      
                      if (isOpponentTurn && !matchData.gameData.turnDeciderChoice) {
                        return (
                          <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                            CHOOSING
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
              
              {/* Background Rarity Display - Below Container, Right Aligned */}
              <div 
                className="mt-4 text-right flex justify-end"
              >
                <div 
                  style={{
                    display: 'flex',
                    width: '190px',
                    height: '45px',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
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
                    {(() => {
                      const backgroundId = opponentPlayerData.playerMatchBackgroundEquipped;
                      // Determine rarity based on background type
                      if (backgroundId === 'New Day' || backgroundId === 'On A Mission' || backgroundId === 'Underwater') {
                        return 'MASTERPIECE';
                      } else if (backgroundId === 'All For Glory' || backgroundId === 'Long Road Ahead') {
                        return 'EPIC';
                      } else if (backgroundId === 'Relax') {
                        return 'RARE';
                      } else {
                        return 'COMMON';
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
