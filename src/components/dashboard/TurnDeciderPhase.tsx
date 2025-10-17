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

  // Handle dice result display timing
  useEffect(() => {
    if (hasDice && !diceAnimation.isSpinning) {
      // First show the dice number prominently for users to see clearly
      setShowDiceNumber(true);
      
      // Show the result after giving time to see the final number
      const timer = setTimeout(() => {
        setShowResult(true);
      }, 1500); // Longer delay to let users clearly see the final number
      
      return () => clearTimeout(timer);
    } else {
      // Reset states when dice starts spinning or no dice yet
      setShowDiceNumber(false);
      setShowResult(false);
    }
  }, [hasDice, diceAnimation.isSpinning]);

  // Handle choice with processing state
  const handleChoice = async (choice: 'odd' | 'even') => {
    // Remove performance-impacting logs
    // console.log('🎯 TurnDeciderPhase.handleChoice called with:', choice);
    // console.log('🔍 Button validation check:', {
    //   isInTurnDeciderPhase,
    //   isProcessing,
    //   hasChoice,
    //   gamePhase: matchData.gameData.gamePhase
    // });
    
    // Block if not in turn decider phase, already processing, or choice already made
    if (!isInTurnDeciderPhase || isProcessing || hasChoice) {
      // Remove performance-impacting logs
      // console.log('🚫 Choice blocked:', {
      //   isInTurnDeciderPhase,
      //   isProcessing,
      //   hasChoice,
      //   gamePhase: matchData.gameData.gamePhase
      // });
      return;
    }

    // Mobile haptic feedback for choice selection
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(75); // Short vibration feedback
    }

    // Remove performance-impacting logs
    // console.log('✅ Validation passed, setting processing state and calling onChoiceSelect');
    setIsProcessing(true);
    try {
      // Remove performance-impacting logs
      // console.log('🔄 Calling onChoiceSelect with choice:', choice);
      await onChoiceSelect(choice);
      // console.log('✅ onChoiceSelect completed successfully');
    } catch (error) {
      console.error('❌ Error in handleChoice:', error);
      // Reset processing on error
      setIsProcessing(false);
    }
    // Note: Don't reset processing here - let the phase change handle it
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Old dice display removed to prevent layout switching */}

      {/* Choice Selection - Full-Screen Mobile Layout */}
      {!hasChoice && isMyTurnToDecide && isInTurnDeciderPhase && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed inset-0 w-full h-full flex flex-col"
        >
          {/* ODD Button - Top Half */}
          <motion.button
            onClick={() => handleChoice('odd')}
            disabled={isProcessing || hasChoice || !isInTurnDeciderPhase}
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
            className={`relative flex-1 w-full flex flex-col items-center justify-center overflow-hidden transition-all duration-200 ${
              isProcessing || hasChoice || !isInTurnDeciderPhase
                ? 'bg-black/90 cursor-not-allowed' 
                : 'bg-black/95 hover:bg-black/98 active:bg-black'
            }`}
            style={{ 
              fontFamily: "Audiowide",
              backdropFilter: 'blur(10px)'
            }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20"></div>
            
            {/* Background Text Shadow */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center z-5 md:translate-y-0 translate-y-8"
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: hasChoice && matchData.gameData.turnDeciderChoice === 'odd' ? 1 : 0.15 
              }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <span 
                className="text-[25vw] md:text-[20rem] text-white font-bold tracking-wider leading-none select-none"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: hasChoice && matchData.gameData.turnDeciderChoice === 'odd' 
                    ? '0 0 60px rgba(255, 215, 0, 1), 0 0 120px rgba(255, 215, 0, 0.8)' 
                    : 'none',
                  color: hasChoice && matchData.gameData.turnDeciderChoice === 'odd' 
                    ? '#FFD700' 
                    : 'white'
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
                  filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.7))',
                  imageRendering: 'auto',
                  WebkitFontSmoothing: 'antialiased'
                }}
                initial={{ scale: 0 }}
                animate={{ 
                  scale: hasChoice && matchData.gameData.turnDeciderChoice === 'odd' ? 1.3 : 1,
                  y: hasChoice && matchData.gameData.turnDeciderChoice === 'odd' ? -40 : 0
                }}
                transition={{ delay: 0.4, duration: 0.5, type: "spring", stiffness: 100 }}
              />
            </div>

            {/* Subtle shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </motion.button>

          {/* VS Element or Dice - Centered */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
            {hasDice && diceAnimation.isSpinning ? (
              // Show reel dice animation
              <div className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
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
            ) : !hasChoice ? (
              // Show VS when no choice made yet
              <span 
                className="text-[15vw] md:text-8xl text-white font-bold tracking-wider"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.4)',
                  WebkitFontSmoothing: 'antialiased'
                }}
              >
                VS
              </span>
            ) : null}
          </div>

          {/* EVEN Button - Bottom Half */}
          <motion.button
            onClick={() => handleChoice('even')}
            disabled={isProcessing || hasChoice || !isInTurnDeciderPhase}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
            className={`relative flex-1 w-full flex flex-col items-center justify-center overflow-hidden transition-all duration-200 ${
              isProcessing || hasChoice || !isInTurnDeciderPhase
                ? 'bg-black/90 cursor-not-allowed' 
                : 'bg-black/95 hover:bg-black/98 active:bg-black'
            }`}
            style={{ 
              fontFamily: "Audiowide",
              backdropFilter: 'blur(10px)'
            }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-tl from-white/5 via-transparent to-black/20"></div>
            
            {/* Background Text Shadow */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center z-5 md:translate-y-0 translate-y-8"
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: hasChoice && matchData.gameData.turnDeciderChoice === 'even' ? 1 : 0.15 
              }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <span 
                className="text-[25vw] md:text-[20rem] text-white font-bold tracking-wider leading-none select-none"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: hasChoice && matchData.gameData.turnDeciderChoice === 'even' 
                    ? '0 0 60px rgba(255, 215, 0, 1), 0 0 120px rgba(255, 215, 0, 0.8)' 
                    : 'none',
                  color: hasChoice && matchData.gameData.turnDeciderChoice === 'even' 
                    ? '#FFD700' 
                    : 'white'
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
                  filter: 'drop-shadow(0 0 20px rgba(147, 51, 234, 0.7))',
                  imageRendering: 'auto',
                  WebkitFontSmoothing: 'antialiased'
                }}
                initial={{ scale: 0 }}
                animate={{ 
                  scale: hasChoice && matchData.gameData.turnDeciderChoice === 'even' ? 1.3 : 1,
                  y: hasChoice && matchData.gameData.turnDeciderChoice === 'even' ? -40 : 0
                }}
                transition={{ delay: 0.4, duration: 0.5, type: "spring", stiffness: 100 }}
              />
            </div>

            {/* Subtle shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
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

      {/* Unified Choice Display - Shows choices after user has made selection */}
      {hasChoice && isInTurnDeciderPhase && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed inset-0 w-full h-full flex flex-col"
        >
          {/* User's Choice - Top Half */}
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="relative flex-1 w-full flex flex-col items-center justify-center overflow-hidden transition-all duration-200 bg-black/95"
            style={{ 
              backdropFilter: 'blur(10px)'
            }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20"></div>
            
            {/* Background Text Shadow - Always highlighted since this is user's choice */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center z-5 md:translate-y-0 translate-y-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <span 
                className="text-[25vw] md:text-[20rem] text-white font-bold tracking-wider leading-none select-none"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.6)',
                  color: '#FFD700',
                  WebkitFontSmoothing: 'antialiased'
                }}
              >
                {matchData.gameData.turnDeciderChoice?.toUpperCase()}
              </span>
            </motion.div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center md:translate-y-0 -translate-y-8">
              <motion.img 
                src={`/Design Elements/Match/Turn Decider/${matchData.gameData.turnDeciderChoice === 'odd' ? 'Odd' : 'Even'}.webp`}
                alt={matchData.gameData.turnDeciderChoice === 'odd' ? 'Odd' : 'Even'}
                className="w-[45vw] md:w-[35vw] h-[45vw] md:h-[35vw] max-w-80 max-h-80 object-contain"
                style={{
                  filter: matchData.gameData.turnDeciderChoice === 'odd' 
                    ? 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.7))'
                    : 'drop-shadow(0 0 20px rgba(147, 51, 234, 0.7))',
                  imageRendering: 'auto',
                  WebkitFontSmoothing: 'antialiased'
                }}
                initial={{ scale: 1, y: 0 }}
                animate={{ scale: 1.3, y: -40 }}
                transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
              />
            </div>

            {/* Subtle shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full transition-transform duration-1000"></div>
          </motion.div>

          {/* Opponent Status/Choice - Bottom Half */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="relative flex-1 w-full flex flex-col items-center justify-center overflow-hidden bg-black/95"
            style={{ 
              backdropFilter: 'blur(10px)'
            }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-tl from-white/5 via-transparent to-black/20"></div>
            
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-4 md:translate-y-0 -translate-y-8">
              <motion.h2 
                className="text-3xl md:text-5xl text-white leading-tight font-bold"
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
                className="text-lg md:text-xl text-gray-200 leading-relaxed font-medium"
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
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full transition-transform duration-1000"></div>
          </motion.div>

          {/* Dice Animation - Centered */}
          {(hasDice && diceAnimation.isSpinning) && (
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
              <div className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
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
            </div>
          )}
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
            className="relative flex-1 w-full flex flex-col items-center justify-center overflow-hidden bg-black/95"
            style={{ 
              backdropFilter: 'blur(10px)'
            }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20"></div>
            
            {/* Background Pattern - No text */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20"></div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center md:translate-y-0 translate-y-4">
              <motion.img 
                src="/Design Elements/Match/Turn Decider/Waiting.webp" 
                alt="Waiting" 
                className="w-[55vw] md:w-[35vw] h-[55vw] md:h-[35vw] max-w-80 max-h-80 object-contain filter drop-shadow-2xl"
                style={{
                  filter: 'drop-shadow(0 0 40px rgba(255, 165, 0, 0.9))'
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, duration: 0.5, type: "spring", stiffness: 100 }}
              />
            </div>

            {/* Subtle shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full transition-transform duration-1000"></div>
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
            className="relative flex-1 w-full flex flex-col items-center justify-center overflow-hidden bg-black/95"
            style={{ 
              backdropFilter: 'blur(10px)'
            }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-tl from-white/5 via-transparent to-black/20"></div>
            
            {/* Background Pattern - No text */}
            <div className="absolute inset-0 bg-gradient-to-tl from-white/5 via-transparent to-black/20"></div>

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
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full transition-transform duration-1000"></div>
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
