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
      {/* Turn Decider Phase - Single Dice with Animation (only show during rolling) */}
      {(diceAnimation.isSpinning || hasDice) && (
        <motion.div 
          className="flex justify-center mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="w-full max-w-[900px] md:w-[900px]" style={{ width: 'min(90vw, 900px)' }}>
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
        </motion.div>
      )}

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
                ? 'bg-gradient-to-b from-gray-800/90 to-gray-600/90 cursor-not-allowed' 
                : 'bg-gradient-to-b from-blue-600/95 to-blue-800/95 hover:from-blue-500/95 hover:to-blue-700/95 active:from-blue-700/95 active:to-blue-900/95'
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
              animate={{ opacity: 0.15 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <span 
                className="text-[25vw] md:text-[20rem] text-white font-bold tracking-wider leading-none select-none"
                style={{ 
                  fontFamily: 'Audiowide',
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
                className="w-[45vw] md:w-[35vw] h-[45vw] md:h-[35vw] max-w-80 max-h-80 object-contain filter drop-shadow-2xl"
                style={{
                  filter: 'drop-shadow(0 0 40px rgba(59, 130, 246, 0.9))'
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, duration: 0.5, type: "spring", stiffness: 100 }}
              />
            </div>

            {/* Subtle shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </motion.button>

          {/* VS Element - Centered */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.5, type: "spring", stiffness: 120 }}
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30"
          >
            <span 
              className="text-[15vw] md:text-8xl text-white font-bold tracking-wider"
              style={{ 
                fontFamily: 'Audiowide',
                textShadow: '0 0 40px rgba(255,255,255,1), 0 0 80px rgba(255,255,255,0.5)'
              }}
            >
              VS
            </span>
          </motion.div>

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
                ? 'bg-gradient-to-t from-gray-800/90 to-gray-600/90 cursor-not-allowed' 
                : 'bg-gradient-to-t from-purple-600/95 to-purple-800/95 hover:from-purple-500/95 hover:to-purple-700/95 active:from-purple-700/95 active:to-purple-900/95'
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
              animate={{ opacity: 0.15 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <span 
                className="text-[25vw] md:text-[20rem] text-white font-bold tracking-wider leading-none select-none"
                style={{ 
                  fontFamily: 'Audiowide',
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
                className="w-[45vw] md:w-[35vw] h-[45vw] md:h-[35vw] max-w-80 max-h-80 object-contain filter drop-shadow-2xl"
                style={{
                  filter: 'drop-shadow(0 0 40px rgba(147, 51, 234, 0.9))'
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, duration: 0.5, type: "spring", stiffness: 100 }}
              />
            </div>

            {/* Subtle shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </motion.button>
        </motion.div>
      )}

      {/* Show Choice if Made */}
      {hasChoice && !hasDice && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mt-8 max-w-2xl mx-auto"
        >
          {/* Premium Choice Confirmation Card */}
          <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-3xl p-8 backdrop-blur-lg border border-purple-400/40 shadow-2xl relative overflow-hidden">
            {/* Animated background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 animate-pulse"></div>
            
            {/* Content */}
            <div className="relative z-10">
              {/* Status Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
                className="mb-4"
              >
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-3xl">✓</span>
                </div>
              </motion.div>

              {/* Choice Display */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <p 
                  className="text-lg text-gray-300 mb-4"
                  style={{ fontFamily: 'Audiowide' }}
                >
                  Your Prediction:
                </p>
                <div className="inline-flex items-center gap-4 px-8 py-4 bg-gradient-to-r from-purple-600/40 to-blue-600/40 border-2 border-purple-400/60 rounded-2xl mb-6 shadow-lg">
                  <img 
                    src={matchData.gameData.turnDeciderChoice === 'odd' ? '/Design Elements/Match/Turn Decider/Odd.webp' : '/Design Elements/Match/Turn Decider/Even.webp'} 
                    alt={matchData.gameData.turnDeciderChoice === 'odd' ? 'Odd' : 'Even'} 
                    className="w-8 h-8" 
                  />
                  <p className="text-3xl font-bold text-white" style={{ fontFamily: "Audiowide" }}>
                    {matchData.gameData.turnDeciderChoice?.toUpperCase()}
                  </p>
                </div>
              </motion.div>

              {/* Rolling Animation */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="flex items-center justify-center gap-3"
              >
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <p 
                  className="text-gray-300 text-lg font-medium"
                  style={{ fontFamily: 'Audiowide' }}
                >
                  Rolling the dice...
                </p>
              </motion.div>
            </div>
          </div>
          
          {/* Debug: Force gameplay button */}
          {onForceGameplay && (
            <div className="mt-4">
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
        </motion.div>
      )}

      {/* Waiting for opponent choice - Mobile-First Design */}
      {!hasChoice && !isMyTurnToDecide && isInTurnDeciderPhase && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center w-full min-h-screen flex flex-col items-center justify-center px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col items-center gap-8 w-full"
          >
            {/* Massive Waiting Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 100 }}
              className="relative"
            >
              <img 
                src="/Design Elements/Match/Turn Decider/Waiting.webp" 
                alt="Waiting" 
                className="w-[60vw] h-[60vw] max-w-sm max-h-sm object-contain"
                style={{
                  filter: 'drop-shadow(0 0 40px rgba(255, 165, 0, 0.8))',
                }}
              />
            </motion.div>

            {/* Opponent Name and Status - Much Larger */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="text-center space-y-4"
            >
              <h3 
                className="text-6xl md:text-8xl text-orange-300 tracking-wide leading-tight"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '0 0 30px rgba(255, 165, 0, 0.6), 0 0 60px rgba(255, 165, 0, 0.3)'
                }}
              >
                {opponent.playerDisplayName}
              </h3>
              <p 
                className="text-3xl md:text-4xl text-gray-300 leading-relaxed"
                style={{ 
                  fontFamily: 'Audiowide',
                  textShadow: '2px 2px 8px rgba(0,0,0,0.8)'
                }}
              >
                is making their prediction
                <motion.span
                  className="inline-block ml-2"
                >
                  <span className="inline-block animate-pulse delay-0">.</span>
                  <span className="inline-block animate-pulse delay-200">.</span>
                  <span className="inline-block animate-pulse delay-400">.</span>
                </motion.span>
              </p>
            </motion.div>

            {/* Enhanced Loading Animation - Larger */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="flex items-center justify-center gap-3 mt-8"
            >
              <div className="flex gap-3">
                <motion.div 
                  className="w-6 h-6 bg-orange-400 rounded-full"
                  animate={{ 
                    scale: [1, 1.4, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.div 
                  className="w-6 h-6 bg-yellow-400 rounded-full"
                  animate={{ 
                    scale: [1, 1.4, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.3
                  }}
                />
                <motion.div 
                  className="w-6 h-6 bg-orange-400 rounded-full"
                  animate={{ 
                    scale: [1, 1.4, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.6
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      {/* Show user's choice - Mobile-First Design */}
      {hasChoice && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-20"
        >
          <div className="bg-gradient-to-r from-purple-600/90 to-blue-600/90 backdrop-blur-lg rounded-3xl px-8 py-4 border-2 border-purple-400/50 shadow-2xl">
            <p className="text-3xl md:text-4xl text-white font-bold text-center" style={{ fontFamily: 'Audiowide' }}>
              YOUR CHOICE: <span className="text-yellow-300 text-shadow-lg">{matchData.gameData.turnDeciderChoice?.toUpperCase()}</span>
            </p>
          </div>
        </motion.div>
      )}

      {/* Center-screen animated result container */}
      {hasDice && !diceAnimation.isSpinning && showDiceNumber && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ 
              scale: showResult ? 1.2 : 1,
              opacity: 1,
              width: showResult ? "auto" : "200px",
              height: showResult ? "auto" : "200px"
            }}
            transition={{ 
              duration: showResult ? 0.8 : 0.5,
              ease: showResult ? [0.175, 0.885, 0.32, 1.275] : "easeOut"
            }}
            className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl shadow-2xl border-4 border-yellow-300/50 flex items-center justify-center relative overflow-hidden"
            style={{ 
              minWidth: showResult ? "400px" : "200px",
              minHeight: showResult ? "200px" : "200px"
            }}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent"></div>
            
            {!showResult ? (
              // Show just the number initially
              <div className="text-7xl md:text-8xl font-bold text-white relative z-10" style={{ fontFamily: 'Audiowide', textShadow: '3px 3px 6px rgba(0,0,0,0.8)' }}>
                {matchData.gameData.turnDeciderDice}
              </div>
            ) : (
              // Show the full result with winner
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-center p-8 relative z-10"
              >
                {(() => {
                  // Determine winner logic
                  const choiceWasCorrect = (matchData.gameData.turnDeciderChoice === 'odd' && matchData.gameData.turnDeciderDice! % 2 === 1) ||
                                          (matchData.gameData.turnDeciderChoice === 'even' && matchData.gameData.turnDeciderDice! % 2 === 0);
                  
                  const chooserPlayerIndex = matchData.gameData.chooserPlayerIndex || 1;
                  let hostGoesFirst = false;
                  
                  if (chooserPlayerIndex === 1) {
                    hostGoesFirst = choiceWasCorrect;
                  } else {
                    hostGoesFirst = !choiceWasCorrect;
                  }
                  
                  const firstPlayerName = hostGoesFirst ? 
                    (isHost ? 'YOU' : opponent?.playerDisplayName || 'OPPONENT') : 
                    (isHost ? opponent?.playerDisplayName || 'OPPONENT' : 'YOU');
                  
                  return (
                    <>
                      <div className="text-5xl md:text-6xl font-bold text-white mb-4" style={{ fontFamily: 'Audiowide', textShadow: '3px 3px 6px rgba(0,0,0,0.8)' }}>
                        {matchData.gameData.turnDeciderDice}
                      </div>
                      <div className="text-2xl md:text-3xl text-white font-bold" style={{ fontFamily: 'Audiowide', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                        {firstPlayerName}
                      </div>
                      <div className="text-xl md:text-2xl text-white font-bold" style={{ fontFamily: 'Audiowide', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                        GOES FIRST!
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}

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
