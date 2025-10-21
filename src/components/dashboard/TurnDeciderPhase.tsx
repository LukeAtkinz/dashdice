import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MatchData } from '@/types/match';
import { SlotMachineDice } from './SlotMachineDice';

interface TurnDeciderPhaseProps {
  matchData: MatchData;
  currentPlayer: any;
  opponent: any;
  isHost: boolean;
  diceAnimation: {
    isSpinning: boolean;
    currentNumber: number;
    finalNumber: number | null;
    reelSpeed?: number;
  };
  onChoiceSelect: (choice: 'odd' | 'even') => void;
  onForceGameplay?: () => void; // Debug function to force gameplay
}

export const TurnDeciderPhase: React.FC<TurnDeciderPhaseProps> = ({
  matchData,
  currentPlayer,
  opponent,
  isHost,
  diceAnimation,
  onChoiceSelect,
  onForceGameplay
}) => {
  const isMyTurnToDecide = (isHost && matchData.gameData.chooserPlayerIndex === 1) || 
                          (!isHost && matchData.gameData.chooserPlayerIndex === 2);
  
  const hasChoice = !!matchData.gameData.turnDeciderChoice;
  const hasDice = !!matchData.gameData.turnDeciderDice;
  const isInTurnDeciderPhase = matchData.gameData.gamePhase === 'turnDecider';
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDiceNumber, setShowDiceNumber] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<'choosing' | 'transitioning' | 'rolling' | 'result-display' | 'winner-announcement' | 'transitioning-to-match'>('choosing');

  // Helper function to determine who goes first based on the turn decider result
  const getWinnerInfo = () => {
    if (!hasDice || !matchData.gameData.turnDeciderChoice || !matchData.gameData.turnDeciderDice) {
      return null;
    }

    const dice = matchData.gameData.turnDeciderDice;
    const choice = matchData.gameData.turnDeciderChoice;
    const isOdd = dice % 2 === 1;
    const choiceCorrect = (choice === 'odd' && isOdd) || (choice === 'even' && !isOdd);
    
    // Determine who made the choice
    const choicePlayer = isMyTurnToDecide ? currentPlayer : opponent;
    const otherPlayer = isMyTurnToDecide ? opponent : currentPlayer;
    
    return {
      dice,
      isOdd,
      choice,
      choiceCorrect,
      winner: choiceCorrect ? choicePlayer : otherPlayer,
      winnerName: choiceCorrect ? choicePlayer.playerDisplayName : otherPlayer.playerDisplayName
    };
  };

  // Game mode information for display
  const getGameModeInfo = () => {
    const gameMode = matchData.gameMode || 'classic';
    const gameModeMap: Record<string, { name: string; description: string }> = {
      'quickfire': { name: 'QUICK FIRE', description: 'Race to 50, Double 6 resets your score' },
      'classic': { name: 'CLASSIC MODE', description: 'Race to 100, Double 6 resets your score' },
      'zero-hour': { name: 'ZERO HOUR', description: 'Start at 100, race to 0' },
      'zerohour': { name: 'ZERO HOUR', description: 'Start at 100, race to 0' },
      'last-line': { name: 'LAST LINE', description: 'Tug-of-war, eliminate your opponent' },
      'lastline': { name: 'LAST LINE', description: 'Tug-of-war, eliminate your opponent' }
    };
    return gameModeMap[gameMode.toLowerCase()] || gameModeMap.classic;
  };

  const gameModeInfo = getGameModeInfo();

  // Remove performance-impacting debug logs
  // console.log('🔍 TurnDeciderPhase Debug:', {
  //   isHost,
  //   chooserPlayerIndex: matchData.gameData.chooserPlayerIndex,
  //   isMyTurnToDecide,
  //   hasChoice,
  //   hasDice,
  //   isProcessing,
  //   gamePhase: matchData.gameData.gamePhase,
  //   isInTurnDeciderPhase,
  //   currentPlayerName: currentPlayer?.playerDisplayName,
  //   turnDeciderChoice: matchData.gameData.turnDeciderChoice,
  //   turnDeciderDice: matchData.gameData.turnDeciderDice,
  //   isRolling: matchData.gameData.isRolling
  // });

  // Reset processing state when phase changes away from turn decider
  useEffect(() => {
    if (!isInTurnDeciderPhase && isProcessing) {
      // Remove performance-impacting logs
      // console.log('🔄 Phase changed away from turn decider, resetting processing state');
      setIsProcessing(false);
    }
  }, [isInTurnDeciderPhase, isProcessing]);

  // Handle dice result display timing and enhanced transition phases
  useEffect(() => {
    if (hasDice && diceAnimation.isSpinning) {
      // When dice starts spinning, move to rolling phase for the final animation
      setTransitionPhase('rolling');
      setShowDiceNumber(false);
      setShowResult(false);
    } else if (hasDice && !diceAnimation.isSpinning && transitionPhase !== 'result-display' && transitionPhase !== 'winner-announcement' && transitionPhase !== 'transitioning-to-match') {
      // Only trigger the sequence once when dice stops spinning
      // Step 1: Hide choice and game mode elements, show dice number
      setTransitionPhase('result-display');
      setShowDiceNumber(true);
      
      // Step 2: After showing dice number, show winner announcement
      const winnerTimer = setTimeout(() => {
        setTransitionPhase('winner-announcement');
        setShowResult(true);
      }, 3000); // Reduced back to 3 seconds for better pacing
      
      // Step 3: After winner announcement, transition to match
      const matchTimer = setTimeout(() => {
        setTransitionPhase('transitioning-to-match');
      }, 6000); // Reduced back to 6 seconds total
      
      return () => {
        clearTimeout(winnerTimer);
        clearTimeout(matchTimer);
      };
    } else if (!hasDice && transitionPhase !== 'choosing') {
      // Reset states when no dice yet
      setTransitionPhase('choosing');
      setShowDiceNumber(false);
      setShowResult(false);
    }
  }, [hasDice, diceAnimation.isSpinning, transitionPhase]);

  // Reset transition phase when phase changes away from turn decider
  useEffect(() => {
    if (!isInTurnDeciderPhase && transitionPhase !== 'choosing') {
      setTransitionPhase('choosing');
    }
  }, [isInTurnDeciderPhase, transitionPhase]);

  // Handle choice with stunning slide transitions
  const handleChoice = async (choice: 'odd' | 'even') => {
    // Block if not in turn decider phase, already processing, or choice already made
    if (!isInTurnDeciderPhase || isProcessing || hasChoice) {
      return;
    }

    // Mobile haptic feedback for choice selection
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(75); // Short vibration feedback
    }

    setIsProcessing(true);
    
    // Start the stunning transition sequence
    setTransitionPhase('transitioning');
    
    try {
      await onChoiceSelect(choice);
    } catch (error) {
      console.error('❌ Error in handleChoice:', error);
      // Reset processing on error
      setIsProcessing(false);
      setTransitionPhase('choosing');
    }
    // Note: Don't reset processing here - let the phase change handle it
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Old dice display removed to prevent layout switching */}

      {/* Choice Selection with Stunning Slide Transitions */}
      {!hasChoice && isMyTurnToDecide && isInTurnDeciderPhase && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed inset-0 w-full h-full flex flex-col"
        >
          {/* ODD Button - Top Half with Flying Animation */}
          <motion.button
            onClick={() => handleChoice('odd')}
            disabled={isProcessing || hasChoice || !isInTurnDeciderPhase}
            initial={{ 
              opacity: 0, 
              y: '50vh', // Start from absolute center
              scale: 0.3
            }}
            animate={{ 
              opacity: transitionPhase === 'choosing' ? 1 : 0,
              y: transitionPhase === 'choosing' ? 0 : 
                 transitionPhase === 'result-display' || transitionPhase === 'winner-announcement' || transitionPhase === 'transitioning-to-match' ? -300 :
                 (transitionPhase === 'transitioning' && matchData.gameData.turnDeciderChoice !== 'odd') ? -200 : '50vh',
              scale: transitionPhase === 'choosing' ? 1 : 0.3
            }}
            transition={{ 
              delay: transitionPhase === 'choosing' ? 1.0 : 
                     transitionPhase === 'result-display' ? 0 : 0, // Immediate exit for result display
              duration: transitionPhase === 'choosing' ? 1.5 : 
                       transitionPhase === 'result-display' ? 0.5 : // Quick exit
                       transitionPhase === 'transitioning' ? 0.8 : 0.6, 
              ease: transitionPhase === 'choosing' ? "backOut" : 
                    transitionPhase === 'result-display' ? "easeIn" : // Fast exit
                    transitionPhase === 'transitioning' ? [0.4, 0, 0.2, 1] : "easeOut",
              type: transitionPhase === 'choosing' ? "spring" : "tween",
              stiffness: transitionPhase === 'choosing' ? 120 : undefined,
              damping: transitionPhase === 'choosing' ? 15 : undefined
            }}
            whileHover={transitionPhase === 'choosing' ? { scale: 1.02 } : {}}
            whileTap={transitionPhase === 'choosing' ? { scale: 0.96, transition: { duration: 0.1 } } : {}}
            className="relative flex-1 w-full flex flex-col items-center justify-center bg-transparent transition-all duration-200"
            style={{ fontFamily: "Audiowide" }}
          >
            {/* Background Text Shadow */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center z-5 md:translate-y-0 translate-y-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <span 
                className="text-[25vw] md:text-[20rem] text-white font-bold tracking-wider leading-none select-none"
                style={{ 
                  fontFamily: 'Audiowide',
                  WebkitFontSmoothing: 'antialiased'
                }}
              >
                {isProcessing ? 'PROCESSING' : 'ODD'}
              </span>
            </motion.div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center md:translate-y-0 -translate-y-8">
              <motion.img 
                src="/Design Elements/Match/Turn Decider/Odd.webp" 
                alt="Odd" 
                className="w-[45vw] md:w-[35vw] h-[45vw] md:h-[35vw] max-w-80 max-h-80 object-contain"
                style={{
                  filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))',
                  imageRendering: 'auto',
                  WebkitFontSmoothing: 'antialiased'
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: transitionPhase === 'choosing' ? 1 : 0.3,
                  opacity: transitionPhase === 'choosing' ? 1 : 0
                }}
                transition={{ 
                  delay: transitionPhase === 'choosing' ? 1.0 : 0, // Same as button timing
                  duration: transitionPhase === 'choosing' ? 1.5 : 0.5, // Same as button timing
                  ease: transitionPhase === 'choosing' ? "backOut" : "easeIn",
                  type: transitionPhase === 'choosing' ? "spring" : "tween",
                  stiffness: transitionPhase === 'choosing' ? 120 : undefined,
                  damping: transitionPhase === 'choosing' ? 15 : undefined
                }}
              />
            </div>
          </motion.button>

          {/* VS Element or Dice - Centered */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
            {hasDice && diceAnimation.isSpinning ? (
              // Show reel dice animation - bigger and more prominent
              <div className="w-48 h-48 md:w-60 md:h-60 flex items-center justify-center">
                <div className="w-full h-full flex items-center justify-center">
                  <SlotMachineDice
                    diceNumber={'turnDecider' as any}
                    animationState={diceAnimation}
                    matchRollPhase={matchData.gameData.isRolling ? 'turnDecider' : undefined}
                    actualValue={matchData.gameData.turnDeciderDice || null}
                    isGameRolling={matchData.gameData.isRolling || false}
                    isTurnDecider={true}
                    matchData={matchData}
                  />
                </div>
              </div>
            ) : transitionPhase === 'choosing' ? (
              // Show VS with morphing capability - starts as GO! from waiting room
              <motion.span 
                layoutId="vs-morph-text" // Same layoutId for morphing from GameWaitingRoom
                className="text-[20vw] md:text-[10rem] text-white font-bold tracking-wider"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '0 0 30px rgba(255,255,255,0.9), 0 0 60px rgba(255,255,255,0.6), 0 0 100px rgba(255,255,255,0.3)',
                  WebkitFontSmoothing: 'antialiased'
                }}
                animate={{
                  // Scale animation sequence: first morph, then grow dramatically
                  scale: [0.8, 1.3, 1], // Bigger bounce effect
                  textShadow: [
                    '0 0 30px rgba(255,255,255,0.9), 0 0 60px rgba(255,255,255,0.6), 0 0 100px rgba(255,255,255,0.3)',
                    '0 0 40px rgba(255,255,255,1.0), 0 0 80px rgba(255,255,255,0.8), 0 0 120px rgba(255,255,255,0.5)',
                    '0 0 30px rgba(255,255,255,0.9), 0 0 60px rgba(255,255,255,0.6), 0 0 100px rgba(255,255,255,0.3)'
                  ]
                }}
                transition={{
                  scale: {
                    delay: 0.5, // Wait for initial morph to complete
                    duration: 1.0, // Slightly longer for more impact
                    times: [0, 0.6, 1],
                    type: "spring",
                    stiffness: 120,
                    damping: 18
                  },
                  textShadow: {
                    delay: 0.5,
                    duration: 1.0,
                    times: [0, 0.5, 1]
                  },
                  // Default transition for morph - smoother transition
                  type: "tween",
                  ease: "easeInOut",
                  duration: 0.5
                }}
              >
                VS
              </motion.span>
            ) : null}
          </div>

          {/* EVEN Button - Bottom Half with Flying Animation */}
          <motion.button
            onClick={() => handleChoice('even')}
            disabled={isProcessing || hasChoice || !isInTurnDeciderPhase}
            initial={{ 
              opacity: 0, 
              y: '-50vh', // Start from absolute center
              scale: 0.3
            }}
            animate={{ 
              opacity: transitionPhase === 'choosing' ? 1 : 0,
              y: transitionPhase === 'choosing' ? 0 : 
                 transitionPhase === 'result-display' || transitionPhase === 'winner-announcement' || transitionPhase === 'transitioning-to-match' ? 300 : '-50vh',
              scale: transitionPhase === 'choosing' ? 1 : 0.3
            }}
            transition={{ 
              delay: transitionPhase === 'choosing' ? 1.0 : 
                     transitionPhase === 'result-display' ? 0 : 0, // Same timing as ODD
              duration: transitionPhase === 'choosing' ? 1.5 : 
                       transitionPhase === 'result-display' ? 0.5 : 0.6, // Same duration as ODD
              ease: transitionPhase === 'choosing' ? "backOut" : 
                    transitionPhase === 'result-display' ? "easeIn" : "easeOut", // Fast exit
              type: transitionPhase === 'choosing' ? "spring" : "tween",
              stiffness: transitionPhase === 'choosing' ? 120 : undefined,
              damping: transitionPhase === 'choosing' ? 15 : undefined
            }}
            whileHover={transitionPhase === 'choosing' ? { scale: 1.02 } : {}}
            whileTap={transitionPhase === 'choosing' ? { scale: 0.96, transition: { duration: 0.1 } } : {}}
            className="relative flex-1 w-full flex flex-col items-center justify-center bg-transparent transition-all duration-200"
            style={{ fontFamily: "Audiowide" }}
          >
            {/* Background Text Shadow */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center z-5 md:translate-y-0 translate-y-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <span 
                className="text-[25vw] md:text-[20rem] text-white font-bold tracking-wider leading-none select-none"
                style={{ 
                  fontFamily: 'Audiowide',
                  WebkitFontSmoothing: 'antialiased'
                }}
              >
                {isProcessing ? 'PROCESSING' : 'EVEN'}
              </span>
            </motion.div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center md:translate-y-0 -translate-y-8">
              <motion.img 
                src="/Design Elements/Match/Turn Decider/Even.webp" 
                alt="Even" 
                className="w-[45vw] md:w-[35vw] h-[45vw] md:h-[35vw] max-w-80 max-h-80 object-contain"
                style={{
                  filter: 'drop-shadow(0 0 10px rgba(147, 51, 234, 0.5))',
                  imageRendering: 'auto',
                  WebkitFontSmoothing: 'antialiased'
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: transitionPhase === 'choosing' ? 1 : 0.3,
                  opacity: transitionPhase === 'choosing' ? 1 : 0
                }}
                transition={{ 
                  delay: transitionPhase === 'choosing' ? 1.0 : 0, // Same as button timing
                  duration: transitionPhase === 'choosing' ? 1.5 : 0.5, // Same as button timing
                  ease: transitionPhase === 'choosing' ? "backOut" : "easeIn",
                  type: transitionPhase === 'choosing' ? "spring" : "tween",
                  stiffness: transitionPhase === 'choosing' ? 120 : undefined,
                  damping: transitionPhase === 'choosing' ? 15 : undefined
                }}
              />
            </div>
          </motion.button>
        </motion.div>
      )}

      {/* Debug: Force gameplay button - Only show when not in unified display */}
      {onForceGameplay && hasChoice && !isInTurnDeciderPhase && (
        <div className="mt-4 text-center">
          <button
            onClick={onForceGameplay}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold transition-all transform hover:scale-105 border border-orange-400"
            style={{ fontFamily: "Audiowide" }}
            title="Development: Force skip to gameplay"
          >
            🚀 FORCE GAMEPLAY (DEV)
          </button>
        </div>
      )}

      {/* Stunning Transition Display - Shows after choice with cinematic slide animations */}
      {hasChoice && isInTurnDeciderPhase && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed inset-0 w-full h-full flex flex-col bg-transparent"
        >
          {/* User's Choice Section - Top Half (slides in from top during rolling) */}
          <motion.div
            initial={{ opacity: 0, y: transitionPhase === 'rolling' ? -200 : 0 }}
            animate={{ 
              opacity: transitionPhase === 'rolling' ? 1 : 0,
              y: transitionPhase === 'rolling' ? 0 : -200
            }}
            transition={{ 
              delay: transitionPhase === 'rolling' ? 0.3 : 0,
              duration: 0.8, 
              ease: [0.4, 0, 0.2, 1]
            }}
            className="relative flex-1 w-full flex flex-col items-center justify-center bg-transparent"
          >
            {/* Background Text Shadow - Stunning golden glow */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center z-5 md:translate-y-0 translate-y-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: transitionPhase === 'rolling' ? 1 : 0 }}
              transition={{ delay: transitionPhase === 'rolling' ? 0.5 : 0, duration: 0.5 }}
            >
              <span 
                className="text-[25vw] md:text-[20rem] text-white font-bold tracking-wider leading-none select-none"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '0 0 40px rgba(255, 215, 0, 1), 0 0 80px rgba(255, 215, 0, 0.8), 0 0 120px rgba(255, 215, 0, 0.6)',
                  color: '#FFD700',
                  WebkitFontSmoothing: 'antialiased'
                }}
              >
                {matchData.gameData.turnDeciderChoice?.toUpperCase()}
              </span>
            </motion.div>

            {/* Content - Slides in with the text */}
            <motion.div 
              className="relative z-10 flex flex-col items-center justify-center md:translate-y-0 -translate-y-8"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: transitionPhase === 'rolling' ? 1.3 : 0,
                opacity: transitionPhase === 'rolling' ? 1 : 0,
                y: transitionPhase === 'rolling' ? -40 : 0
              }}
              transition={{ 
                delay: transitionPhase === 'rolling' ? 0.6 : 0,
                duration: 0.8, 
                type: "spring", 
                stiffness: 100 
              }}
            >
              <img 
                src={`/Design Elements/Match/Turn Decider/${matchData.gameData.turnDeciderChoice === 'odd' ? 'Odd' : 'Even'}.webp`}
                alt={matchData.gameData.turnDeciderChoice === 'odd' ? 'Odd' : 'Even'}
                className="w-[45vw] md:w-[35vw] h-[45vw] md:h-[35vw] max-w-80 max-h-80 object-contain"
                style={{
                  filter: matchData.gameData.turnDeciderChoice === 'odd' 
                    ? 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.8))'
                    : 'drop-shadow(0 0 20px rgba(147, 51, 234, 0.8))',
                  imageRendering: 'auto',
                  WebkitFontSmoothing: 'antialiased'
                }}
              />
            </motion.div>
          </motion.div>

          {/* Game Mode Content - Bottom Half (slides up for ODD choice) */}
          <motion.div
            initial={{ opacity: 0, y: matchData.gameData.turnDeciderChoice === 'odd' ? 200 : 100 }}
            animate={{ 
              opacity: (transitionPhase === 'transitioning' && matchData.gameData.turnDeciderChoice === 'odd') || 
                       transitionPhase === 'rolling' ? 1 : 0,
              y: (transitionPhase === 'transitioning' && matchData.gameData.turnDeciderChoice === 'odd') || 
                 transitionPhase === 'rolling' ? 0 : 
                 transitionPhase === 'result-display' || transitionPhase === 'winner-announcement' || transitionPhase === 'transitioning-to-match' ? 200 : 100
            }}
            transition={{ 
              delay: matchData.gameData.turnDeciderChoice === 'odd' ? 0.4 : 0.2,
              duration: 0.8, 
              ease: [0.4, 0, 0.2, 1]
            }}
            className="relative flex-1 w-full flex flex-col items-center justify-center bg-transparent"
          >
            {/* Game Mode Content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-4 md:translate-y-0 -translate-y-8">
              <motion.h2 
                className="text-3xl md:text-5xl text-white leading-tight font-bold"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '0 0 30px rgba(255,215,0,0.9), 2px 2px 8px rgba(0,0,0,0.8)',
                  WebkitFontSmoothing: 'antialiased'
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ 
                  opacity: (transitionPhase === 'transitioning' && matchData.gameData.turnDeciderChoice === 'odd') || 
                           transitionPhase === 'rolling' ? 1 : 0,
                  scale: (transitionPhase === 'transitioning' && matchData.gameData.turnDeciderChoice === 'odd') || 
                         transitionPhase === 'rolling' ? 1 : 0.5
                }}
                transition={{ 
                  delay: matchData.gameData.turnDeciderChoice === 'odd' ? 0.8 : 0.6,
                  duration: 0.6 
                }}
              >
                {gameModeInfo.name}
              </motion.h2>
              
              <motion.p 
                className="text-lg md:text-xl text-gray-200 leading-relaxed font-medium"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '0 0 15px rgba(255,255,255,0.5), 2px 2px 6px rgba(0,0,0,0.8)',
                  WebkitFontSmoothing: 'antialiased'
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ 
                  opacity: (transitionPhase === 'transitioning' && matchData.gameData.turnDeciderChoice === 'odd') || 
                           transitionPhase === 'rolling' ? 1 : 0,
                  scale: (transitionPhase === 'transitioning' && matchData.gameData.turnDeciderChoice === 'odd') || 
                         transitionPhase === 'rolling' ? 1 : 0.5
                }}
                transition={{ 
                  delay: matchData.gameData.turnDeciderChoice === 'odd' ? 1.0 : 0.8,
                  duration: 0.6 
                }}
              >
                {gameModeInfo.description}
              </motion.p>
            </div>
          </motion.div>

          {/* Dice Animation - Centered (appears during rolling phase) */}
          {(hasDice && diceAnimation.isSpinning) && (
            <motion.div 
              className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6, type: "spring", stiffness: 100, damping: 15 }}
            >
              <div className="w-48 h-48 md:w-60 md:h-60 flex items-center justify-center">
                <div className="w-full h-full flex items-center justify-center">
                  <SlotMachineDice
                    diceNumber={'turnDecider' as any}
                    animationState={diceAnimation}
                    matchRollPhase={matchData.gameData.isRolling ? 'turnDecider' : undefined}
                    actualValue={matchData.gameData.turnDeciderDice || null}
                    isGameRolling={matchData.gameData.isRolling || false}
                    isTurnDecider={true}
                    matchData={matchData}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Dice Result Display - Shows the number prominently */}
          {(transitionPhase === 'result-display' && hasDice) && (
            <motion.div 
              className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30"
              initial={{ scale: 0, opacity: 0, rotateY: 180 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ 
                delay: 0.3, 
                duration: 0.8, 
                type: "spring", 
                stiffness: 100,
                damping: 20
              }}
            >
              <div className="flex flex-col items-center justify-center">
                <motion.div
                  className="text-[20vw] md:text-[15rem] font-bold text-white"
                  style={{ 
                    fontFamily: 'Audiowide',
                    textShadow: '0 0 40px rgba(255,255,255,0.9), 0 0 80px rgba(255,255,255,0.6), 0 0 120px rgba(255,255,255,0.3)',
                    WebkitFontSmoothing: 'antialiased'
                  }}
                  animate={{
                    textShadow: [
                      '0 0 40px rgba(255,255,255,0.9), 0 0 80px rgba(255,255,255,0.6), 0 0 120px rgba(255,255,255,0.3)',
                      '0 0 50px rgba(255,255,255,1.0), 0 0 100px rgba(255,255,255,0.8), 0 0 150px rgba(255,255,255,0.5)',
                      '0 0 40px rgba(255,255,255,0.9), 0 0 80px rgba(255,255,255,0.6), 0 0 120px rgba(255,255,255,0.3)'
                    ]
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  {matchData.gameData.turnDeciderDice}
                </motion.div>
                <motion.p
                  className="text-3xl md:text-5xl text-gray-300 mt-6"
                  style={{ fontFamily: 'Audiowide' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  {(matchData.gameData.turnDeciderDice || 0) % 2 === 1 ? 'ODD' : 'EVEN'}
                </motion.p>
              </div>
            </motion.div>
          )}

          {/* Winner Announcement */}
          {(transitionPhase === 'winner-announcement' && hasDice) && (() => {
            const winnerInfo = getWinnerInfo();
            if (!winnerInfo) return null;
            
            return (
              <motion.div 
                className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30"
                initial={{ scale: 0, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0, y: -50 }}
                transition={{ 
                  delay: 0.2, 
                  duration: 0.8, 
                  type: "spring", 
                  stiffness: 120,
                  damping: 20
                }}
              >
                <div className="flex flex-col items-center justify-center text-center">
                  <motion.h1
                    className="text-[10vw] md:text-[8rem] font-bold text-yellow-400 mb-6"
                    style={{ 
                      fontFamily: 'Audiowide',
                      textShadow: '0 0 40px rgba(255, 215, 0, 0.9), 0 0 80px rgba(255, 215, 0, 0.6), 0 0 120px rgba(255, 215, 0, 0.3)',
                      WebkitFontSmoothing: 'antialiased'
                    }}
                    initial={{ scale: 0.8 }}
                    animate={{
                      scale: 1,
                      textShadow: [
                        '0 0 40px rgba(255, 215, 0, 0.9), 0 0 80px rgba(255, 215, 0, 0.6), 0 0 120px rgba(255, 215, 0, 0.3)',
                        '0 0 50px rgba(255, 215, 0, 1.0), 0 0 100px rgba(255, 215, 0, 0.8), 0 0 150px rgba(255, 215, 0, 0.5)',
                        '0 0 40px rgba(255, 215, 0, 0.9), 0 0 80px rgba(255, 215, 0, 0.6), 0 0 120px rgba(255, 215, 0, 0.3)'
                      ]
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  >
                    {winnerInfo.winnerName}
                  </motion.h1>
                  <motion.p
                    className="text-4xl md:text-6xl text-white"
                    style={{ 
                      fontFamily: 'Audiowide',
                      textShadow: '0 0 20px rgba(255,255,255,0.6), 2px 2px 8px rgba(0,0,0,0.8)'
                    }}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                  >
                    GOES FIRST!
                  </motion.p>
                </div>
              </motion.div>
            );
          })()}
        </motion.div>
      )}

      {/* Waiting for opponent choice - Split Screen Design */}
      {!hasChoice && !isMyTurnToDecide && isInTurnDeciderPhase && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed inset-0 w-full h-full flex flex-col"
        >
          {/* Waiting Icon - Top Half */}
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="relative flex-1 w-full flex flex-col items-center justify-center bg-transparent"
            style={{ 
              
            }}
          >
            {/* Background Pattern */}
            
            
            {/* Background Pattern - No text */}
            

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center md:translate-y-0 translate-y-4">
              <motion.img 
                src="/Design Elements/Match/Turn Decider/Waiting.webp" 
                alt="Waiting" 
                className="w-[55vw] md:w-[35vw] h-[55vw] md:h-[35vw] max-w-80 max-h-80 object-contain filter drop-shadow-2xl"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, duration: 0.5, type: "spring", stiffness: 100 }}
              />
            </div>

            {/* Subtle shine effect */}
            
          </motion.div>

          {/* Opponent Username - Centered like VS */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.5, type: "spring", stiffness: 120 }}
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30"
          >
            <motion.h3 
              className="text-[12vw] md:text-7xl text-white font-bold tracking-wide text-center"
              style={{ 
                fontFamily: 'Audiowide',
                textShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.4)',
                WebkitFontSmoothing: 'antialiased'
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {opponent.playerDisplayName}
            </motion.h3>
          </motion.div>

          {/* Opponent Info - Bottom Half */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="relative flex-1 w-full flex flex-col items-center justify-center bg-transparent"
            style={{ 
              
            }}
          >
            {/* Background Pattern */}
            
            
            {/* Background Pattern - No text */}
            

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-4 md:translate-y-0 -translate-y-8">
              <motion.h2 
                className="text-[6vw] md:text-4xl text-white leading-tight font-bold mb-2"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '0 0 20px rgba(255,215,0,0.8), 2px 2px 8px rgba(0,0,0,0.8)',
                  WebkitFontSmoothing: 'antialiased'
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                {gameModeInfo.name}
              </motion.h2>
              <motion.p 
                className="text-[4vw] md:text-2xl text-gray-200 leading-relaxed font-medium"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '0 0 10px rgba(255,255,255,0.4), 2px 2px 6px rgba(0,0,0,0.8)',
                  WebkitFontSmoothing: 'antialiased'
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                {gameModeInfo.description}
              </motion.p>
            </div>

            {/* Subtle shine effect */}
            
          </motion.div>
        </motion.div>
      )}

      {/* Old result displays removed - using unified display system */}

      {/* Old result display removed - now using center screen overlay */}
      
      {/* Show when not in turn decider phase */}
      {!isInTurnDeciderPhase && (
        <div className="mt-8 p-4 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm">
          <p className="text-white text-sm mb-2" style={{ fontFamily: 'Audiowide' }}>Turn Decider Complete - Game Phase: {matchData.gameData.gamePhase}</p>
          <div className="text-xs text-gray-300">
            Phase has moved to: {matchData.gameData.gamePhase} | Choice: {matchData.gameData.turnDeciderChoice} | Dice: {matchData.gameData.turnDeciderDice}
          </div>
        </div>
      )}
    </div>
  );
};
