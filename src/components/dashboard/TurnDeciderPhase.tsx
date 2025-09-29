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
      // Show dice number immediately when dice stops spinning
      setShowDiceNumber(true);
      setShowResult(false);
      
      // After 1 second, show the result
      const timer = setTimeout(() => {
        setShowDiceNumber(false);
        setShowResult(true);
      }, 1000);
      
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
      {/* Turn Decider Phase - Single Dice with Animation */}
      <div className="flex justify-center mb-8">
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
      </div>

      {/* Choice Selection or Display */}
      {!hasChoice && isMyTurnToDecide && isInTurnDeciderPhase && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <p 
            className="text-2xl text-white mb-6"
            style={{ 
              fontFamily: 'Audiowide',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}
          >
            Choose ODD or EVEN:
          </p>
          <div className="flex gap-6 justify-center">
            <button
              onClick={() => handleChoice('odd')}
              disabled={isProcessing || hasChoice || !isInTurnDeciderPhase}
              className={`px-8 py-4 text-white rounded-xl text-xl font-bold transition-all transform hover:scale-105 border-2 cursor-pointer z-50 relative ${
                isProcessing || hasChoice || !isInTurnDeciderPhase
                  ? 'bg-gray-600 border-gray-400 cursor-not-allowed opacity-50' 
                  : 'bg-blue-600 hover:bg-blue-700 border-blue-400'
              }`}
              style={{ fontFamily: "Audiowide", pointerEvents: 'auto' }}
            >
              {isProcessing ? 'PROCESSING...' : 'ODD'}
            </button>
            <button
              onClick={() => handleChoice('even')}
              disabled={isProcessing || hasChoice || !isInTurnDeciderPhase}
              className={`px-8 py-4 text-white rounded-xl text-xl font-bold transition-all transform hover:scale-105 border-2 cursor-pointer z-50 relative ${
                isProcessing || hasChoice || !isInTurnDeciderPhase
                  ? 'bg-gray-600 border-gray-400 cursor-not-allowed opacity-50' 
                  : 'bg-purple-600 hover:bg-purple-700 border-purple-400'
              }`}
              style={{ fontFamily: "Audiowide", pointerEvents: 'auto' }}
            >
              {isProcessing ? 'PROCESSING...' : 'EVEN'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Show Choice if Made */}
      {hasChoice && !hasDice && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <p 
            className="text-lg text-gray-300 mb-2"
            style={{ fontFamily: 'Audiowide' }}
          >
            Choice Made:
          </p>
          <div className="inline-block px-6 py-3 bg-yellow-600/20 border-2 border-yellow-500 rounded-xl mb-4">
            <p className="text-2xl font-bold text-yellow-400" style={{ fontFamily: "Audiowide" }}>
              {matchData.gameData.turnDeciderChoice?.toUpperCase()}
            </p>
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

      {/* Waiting for opponent choice */}
      {!hasChoice && !isMyTurnToDecide && isInTurnDeciderPhase && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p 
            className="text-xl text-gray-300 mb-4"
            style={{ 
              fontFamily: 'Audiowide',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}
          >
            Waiting for {opponent.playerDisplayName} to choose...
          </p>
        </motion.div>
      )}

      {/* Show result - delayed until dice animation completes */}
      {hasDice && !diceAnimation.isSpinning && (
        <>
          {/* Show dice number for 1 second */}
          {showDiceNumber && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="text-center mt-8"
            >
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full p-8 mx-auto w-32 h-32 flex items-center justify-center shadow-2xl">
                <p 
                  className="text-6xl font-bold text-white"
                  style={{ 
                    fontFamily: 'Audiowide',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                  }}
                >
                  {matchData.gameData.turnDeciderDice}
                </p>
              </div>
            </motion.div>
          )}

          {/* Show detailed result after 1 second */}
          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mt-8"
            >
              <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <p 
                  className="text-lg text-gray-300 mb-2"
                  style={{ fontFamily: 'Audiowide' }}
                >
                  Result: {matchData.gameData.turnDeciderDice} ({matchData.gameData.turnDeciderDice! % 2 === 0 ? 'EVEN' : 'ODD'})
                </p>
                <p 
                  className="text-xl font-bold text-green-400"
                  style={{ fontFamily: 'Audiowide' }}
                >
                  {(() => {
                    // Determine if the choice was correct
                    const choiceWasCorrect = (matchData.gameData.turnDeciderChoice === 'odd' && matchData.gameData.turnDeciderDice! % 2 === 1) ||
                                            (matchData.gameData.turnDeciderChoice === 'even' && matchData.gameData.turnDeciderDice! % 2 === 0);
                    
                    // If choice was correct, the chooser goes first
                    // If choice was wrong, the other player goes first
                    if (choiceWasCorrect) {
                      return `${isMyTurnToDecide ? 'YOU' : opponent.playerDisplayName} GO FIRST!`;
                    } else {
                      return `${isMyTurnToDecide ? opponent.playerDisplayName : 'YOU'} GO FIRST!`;
                    }
                  })()}
                </p>
              </div>
            </motion.div>
          )}
        </>
      )}
      
      {/* Show when not in turn decider phase */}
      {!isInTurnDeciderPhase && (
        <div className="mt-8 p-4 bg-green-900/30 border border-green-500 rounded-lg">
          <p className="text-white text-sm mb-2">Turn Decider Complete - Game Phase: {matchData.gameData.gamePhase}</p>
          <div className="text-xs text-gray-300">
            Phase has moved to: {matchData.gameData.gamePhase} | Choice: {matchData.gameData.turnDeciderChoice} | Dice: {matchData.gameData.turnDeciderDice}
          </div>
        </div>
      )}
    </div>
  );
};
