import React from 'react';
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

  // Debug logging
  console.log('🔍 TurnDeciderPhase Debug:', {
    isHost,
    chooserPlayerIndex: matchData.gameData.chooserPlayerIndex,
    isMyTurnToDecide,
    hasChoice,
    hasDice,
    currentPlayerName: currentPlayer?.playerDisplayName,
    turnDeciderChoice: matchData.gameData.turnDeciderChoice
  });

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Turn Decider Phase - Single Dice with Animation */}
      <div className="flex justify-center mb-8">
        <div style={{ width: '600px' }}>
          <SlotMachineDice
            diceNumber={'turnDecider' as any}
            animationState={diceAnimation}
            matchRollPhase={matchData.gameData.turnDeciderChoice ? 'turnDecider' : undefined}
            actualValue={matchData.gameData.turnDeciderDice || null}
            isGameRolling={matchData.gameData.turnDeciderChoice !== null && matchData.gameData.turnDeciderDice !== null}
            isTurnDecider={true}
            matchData={matchData}
          />
        </div>
      </div>

      {/* Choice Selection or Display */}
      {!hasChoice && isMyTurnToDecide && (
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
              onClick={() => onChoiceSelect('odd')}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xl font-bold transition-all transform hover:scale-105 border-2 border-blue-400 cursor-pointer z-50 relative"
              style={{ fontFamily: "Audiowide", pointerEvents: 'auto' }}
            >
              ODD
            </button>
            <button
              onClick={() => onChoiceSelect('even')}
              className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xl font-bold transition-all transform hover:scale-105 border-2 border-purple-400 cursor-pointer z-50 relative"
              style={{ fontFamily: "Audiowide", pointerEvents: 'auto' }}
            >
              EVEN
            </button>
          </div>
          
          {/* Debug info */}
          <div className="mt-4 text-sm text-gray-400 bg-black/20 p-2 rounded">
            Host: {isHost ? 'Yes' : 'No'}, Chooser: {matchData.gameData.chooserPlayerIndex}, MyTurn: {isMyTurnToDecide ? 'Yes' : 'No'}
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
      {!hasChoice && !isMyTurnToDecide && (
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
          
          {/* Debug: Force choice button for development */}
          <button
            onClick={() => onChoiceSelect('odd')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-all transform hover:scale-105 border border-red-400"
            style={{ fontFamily: "Audiowide" }}
            title="Development: Force choice to unstick"
          >
            🔧 FORCE ODD (DEV)
          </button>
        </motion.div>
      )}

      {/* Show result */}
      {hasDice && (
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
              {((matchData.gameData.turnDeciderChoice === 'odd' && matchData.gameData.turnDeciderDice! % 2 === 1) ||
                (matchData.gameData.turnDeciderChoice === 'even' && matchData.gameData.turnDeciderDice! % 2 === 0))
                ? `${isMyTurnToDecide ? 'YOU' : opponent.playerDisplayName} GO FIRST!`
                : `${isMyTurnToDecide ? opponent.playerDisplayName : 'YOU'} GO FIRST!`}
            </p>
          </div>
        </motion.div>
      )}
      
      {/* Always visible debug section for testing */}
      <div className="mt-8 p-4 bg-red-900/30 border border-red-500 rounded-lg">
        <p className="text-white text-sm mb-2">Debug Controls (Always Visible):</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => onChoiceSelect('odd')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-all z-50 relative"
            style={{ fontFamily: "Audiowide", pointerEvents: 'auto' }}
          >
            FORCE ODD
          </button>
          <button
            onClick={() => onChoiceSelect('even')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all z-50 relative"
            style={{ fontFamily: "Audiowide", pointerEvents: 'auto' }}
          >
            FORCE EVEN
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-300">
          Host: {isHost ? 'Yes' : 'No'} | Chooser: {matchData.gameData.chooserPlayerIndex} | MyTurn: {isMyTurnToDecide ? 'Yes' : 'No'} | HasChoice: {hasChoice ? 'Yes' : 'No'}
        </div>
      </div>
    </div>
  );
};
