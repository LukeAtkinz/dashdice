import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MatchData } from '@/types/match';
import { SlotMachineDice } from './SlotMachineDice';

// Simple Pulse Dice Component
const PulseDice: React.FC<{ finalNumber: number | null; onComplete?: () => void }> = ({ finalNumber, onComplete }) => {
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [animationPhase, setAnimationPhase] = useState<'final' | 'complete'>('final');

  useEffect(() => {
    if (finalNumber !== null) {
      const sequence = async () => {
        // Show final number immediately - no random pulses
        setCurrentNumber(finalNumber);
        setAnimationPhase('final');
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setAnimationPhase('complete');
        onComplete?.();
      };
      
      sequence();
    }
  }, [finalNumber, onComplete]);

  if (currentNumber === null) return null;

  return (
    <motion.span
      className="text-6xl md:text-7xl font-bold"
      style={{ fontFamily: 'Audiowide' }}
      animate={{
        scale: 1,
        color: '#FFD700',
        textShadow: '0 0 40px rgba(255, 215, 0, 1), 0 0 80px rgba(255, 215, 0, 0.8)'
      }}
      transition={{
        duration: 0.3
      }}
    >
      {currentNumber}
    </motion.span>
  );
};

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
    animationKey?: number;
  };
  onChoiceSelect: (choice: 'odd' | 'even') => void;
  onForceGameplay?: () => void; // Debug function to force gameplay
  topVideo?: string; // Video URL from GameWaitingRoom
  bottomVideo?: string; // Video URL from GameWaitingRoom
}

export const TurnDeciderPhase: React.FC<TurnDeciderPhaseProps> = ({
  matchData,
  currentPlayer,
  opponent,
  isHost,
  diceAnimation,
  onChoiceSelect,
  onForceGameplay,
  topVideo: propTopVideo,
  bottomVideo: propBottomVideo
}) => {
  // Use videos from props if available, otherwise fallback to defaults
  const topVideo = propTopVideo || '/World/Awaken/Awakened.mp4';
  const bottomVideo = propBottomVideo || '/World/Lead the way/Lead the way.mp4';
  
  const isMyTurnToDecide = (isHost && matchData.gameData.turnDecider === 1) || 
                          (!isHost && matchData.gameData.turnDecider === 2);
  
  const hasChoice = !!matchData.gameData.turnDeciderChoice;
  const hasDice = !!matchData.gameData.turnDeciderDice;
  const isInTurnDeciderPhase = matchData.gameData.gamePhase === 'turnDecider';
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDiceNumber, setShowDiceNumber] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<'choosing' | 'choice-returning' | 'transitioning' | 'rolling' | 'result-display' | 'winner-announcement' | 'transitioning-to-match'>('choosing');

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
      
      // Step 2: After showing dice number, show winner announcement (faster)
      const winnerTimer = setTimeout(() => {
        setTransitionPhase('winner-announcement');
        setShowResult(true);
      }, 1500); // Reduced from 3 seconds to 1.5 seconds
      
      // Step 3: After winner announcement, transition to match (faster)
      const matchTimer = setTimeout(() => {
        setTransitionPhase('transitioning-to-match');
      }, 3000); // Reduced from 6 seconds to 3 seconds total
      
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
    
    // Start the stunning transition sequence - animate choice back to center
    setTransitionPhase('choice-returning');
    
    // After icon returns to center, shrink it out and proceed with dice
    setTimeout(() => {
      setTransitionPhase('transitioning');
    }, 800); // Let the return animation complete
    
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
    <>
      {/* Background Video Layers - Player Backgrounds */}
      {/* Top Half - Current Player Background */}
      <div className="absolute top-0 left-0 right-0" style={{ height: '50%', zIndex: 1, overflow: 'hidden' }}>
        <video
          src={topVideo}
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          className="absolute inset-0 w-full h-full object-cover"
          style={{ pointerEvents: 'none' }}
        />
      </div>

      {/* Bottom Half - Opponent Background */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: '50%', zIndex: 1, overflow: 'hidden' }}>
        <video
          src={bottomVideo}
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          className="absolute inset-0 w-full h-full object-cover"
          style={{ pointerEvents: 'none' }}
        />
      </div>

      {/* Animated Content Layer - Swipes over static backgrounds */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'tween', duration: 0.5, ease: 'easeInOut' }}
        className="absolute inset-0"
        style={{ zIndex: 10 }}
      >
        <div className="flex flex-col items-center justify-center h-full">
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
              opacity: transitionPhase === 'choosing' ? 1 : 
                       transitionPhase === 'choice-returning' && matchData.gameData.turnDeciderChoice === 'odd' ? 1 : 0,
              y: transitionPhase === 'choosing' ? 0 : 
                 transitionPhase === 'choice-returning' && matchData.gameData.turnDeciderChoice === 'odd' ? '0vh' : // Return to center
                 transitionPhase === 'result-display' || transitionPhase === 'winner-announcement' || transitionPhase === 'transitioning-to-match' ? -300 :
                 (transitionPhase === 'transitioning' && matchData.gameData.turnDeciderChoice !== 'odd') ? -200 : '50vh',
              scale: transitionPhase === 'choosing' ? 1 : 
                     transitionPhase === 'choice-returning' && matchData.gameData.turnDeciderChoice === 'odd' ? 1.1 : 0.3
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
            className="relative flex-1 w-full flex flex-col items-center justify-center bg-transparent transition-all duration-200 overflow-hidden"
            style={{ fontFamily: "Audiowide" }}
          >
            {/* Background Text Shadow */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center z-5 md:translate-y-0 -translate-y-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <span 
                className="text-[30vw] md:text-[22rem] text-white font-bold tracking-wider leading-none select-none"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '0 0 60px rgba(255, 215, 0, 0.8), 0 0 120px rgba(255, 215, 0, 0.5)',
                  WebkitFontSmoothing: 'antialiased'
                }}
              >
                ODD
              </span>
            </motion.div>

          </motion.button>

          {/* VS Element - Centered */}
          <div className="fixed left-0 right-0 top-1/2 transform -translate-y-1/2 z-30 flex items-center justify-center">
            {transitionPhase === 'choosing' || transitionPhase === 'choice-returning' ? (
              // Show VS with morphing capability - starts as GO! from waiting room
              <motion.span 
                layoutId="vs-morph-text" // Same layoutId for morphing from GameWaitingRoom
                className="text-[20vw] md:text-[10rem] text-white font-bold tracking-wider"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '0 0 40px rgba(255,255,255,1), 0 0 80px rgba(255,255,255,0.9), 0 0 120px rgba(255,255,255,0.7), 0 0 160px rgba(255,255,255,0.5)',
                  WebkitFontSmoothing: 'antialiased'
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  // Scale animation sequence: grow from center dramatically, then shrink when choice returns
                  scale: transitionPhase === 'choice-returning' ? 0 : [0, 1.3, 1], // Shrink to nothing during choice-returning
                  opacity: transitionPhase === 'choice-returning' ? 0 : 1,
                  textShadow: transitionPhase === 'choice-returning' ? 
                    '0 0 0px rgba(255,255,255,0), 0 0 0px rgba(255,255,255,0), 0 0 0px rgba(255,255,255,0)' : 
                    [
                      '0 0 40px rgba(255,255,255,1), 0 0 80px rgba(255,255,255,0.9), 0 0 120px rgba(255,255,255,0.7), 0 0 160px rgba(255,255,255,0.5)',
                      '0 0 50px rgba(255,255,255,1.0), 0 0 100px rgba(255,255,255,1.0), 0 0 150px rgba(255,255,255,0.8), 0 0 200px rgba(255,255,255,0.6)',
                      '0 0 40px rgba(255,255,255,1), 0 0 80px rgba(255,255,255,0.9), 0 0 120px rgba(255,255,255,0.7), 0 0 160px rgba(255,255,255,0.5)'
                    ]
                }}
                transition={
                  transitionPhase === 'choice-returning' ? 
                  // Fast shrink animation
                  {
                    scale: { duration: 0.6, ease: "easeIn" },
                    opacity: { duration: 0.4, ease: "easeIn" },
                    textShadow: { duration: 0.4 }
                  } :
                  // Original grow animation
                  {
                    scale: {
                      delay: 0.5,
                      duration: 1.0,
                      times: [0, 0.6, 1],
                      type: "spring",
                      stiffness: 120,
                      damping: 18
                    },
                    opacity: {
                      delay: 0.5,
                      duration: 0.3
                    },
                    textShadow: {
                      delay: 0.5,
                      duration: 1.0,
                      times: [0, 0.5, 1]
                    },
                    type: "tween",
                    ease: "easeInOut",
                    duration: 0.5
                  }
                }
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
              opacity: transitionPhase === 'choosing' ? 1 : 
                       transitionPhase === 'choice-returning' && matchData.gameData.turnDeciderChoice === 'even' ? 1 : 0,
              y: transitionPhase === 'choosing' ? 0 : 
                 transitionPhase === 'choice-returning' && matchData.gameData.turnDeciderChoice === 'even' ? '0vh' : // Return to center
                 transitionPhase === 'result-display' || transitionPhase === 'winner-announcement' || transitionPhase === 'transitioning-to-match' ? 300 : '-50vh',
              scale: transitionPhase === 'choosing' ? 1 : 
                     transitionPhase === 'choice-returning' && matchData.gameData.turnDeciderChoice === 'even' ? 1.1 : 0.3
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
            className="relative flex-1 w-full flex flex-col items-center justify-center bg-transparent transition-all duration-200 overflow-hidden"
            style={{ fontFamily: "Audiowide" }}
          >
            {/* Background Text Shadow */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center z-5 md:translate-y-0 translate-y-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <span 
                className="text-[30vw] md:text-[22rem] text-white font-bold tracking-wider leading-none select-none"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '0 0 60px rgba(100, 149, 237, 0.8), 0 0 120px rgba(100, 149, 237, 0.5)',
                  WebkitFontSmoothing: 'antialiased'
                }}
              >
                EVEN
              </span>
            </motion.div>
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

      {/* FULL SCREEN Dice Animation - DEAD CENTER OF VIEWPORT */}
      {(transitionPhase === 'transitioning' || transitionPhase === 'rolling' || diceAnimation.isSpinning || hasDice) && (
        <motion.div
          key="turn-decider-dice-fullscreen"
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            pointerEvents: 'none',
            paddingTop: '10vh' // Move the entire container down
          }}
        >
          <div style={{
            width: 'min(95vw, 1000px)',
            height: 'clamp(350px, 55vh, 600px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
            {/* Giant Vertical Reel Dice Container */}
            <SlotMachineDice
              diceNumber={'turnDecider' as any}
              animationState={{
                isSpinning: diceAnimation.isSpinning,
                currentNumber: diceAnimation.currentNumber,
                finalNumber: diceAnimation.finalNumber,
                reelSpeed: diceAnimation.reelSpeed,
                animationKey: diceAnimation.animationKey
              }}
              matchRollPhase="turnDecider"
              actualValue={diceAnimation.finalNumber || diceAnimation.currentNumber}
              isGameRolling={diceAnimation.isSpinning}
              isTurnDecider={true}
              matchData={matchData}
            />
          </div>
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
          {/* Waiting Text - Top Half */}
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="relative flex-1 w-full flex flex-col items-center justify-center bg-transparent"
            style={{ 
              
            }}
          >
            {/* Content - Just Text */}
            <div className="relative z-10 flex flex-col items-center justify-center md:translate-y-0 translate-y-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                style={{
                  color: '#FFF',
                  fontFamily: 'Audiowide',
                  fontSize: 'clamp(32px, 8vw, 64px)',
                  textShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.5)'
                }}
              >
                WAITING
              </motion.div>
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
      </motion.div>
    </>
  );
};
