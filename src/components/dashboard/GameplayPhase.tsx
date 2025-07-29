import React from 'react';
import { motion } from 'framer-motion';
import { MatchData, GAME_RULES } from '@/types/match';
import { SlotMachineDice } from './SlotMachineDice';

interface GameplayPhaseProps {
  matchData: MatchData;
  currentPlayer: any;
  opponent: any;
  isHost: boolean;
  dice1Animation: {
    isSpinning: boolean;
    currentNumber: number;
    finalNumber: number | null;
    reelSpeed?: number;
  };
  dice2Animation: {
    isSpinning: boolean;
    currentNumber: number;
    finalNumber: number | null;
    reelSpeed?: number;
  };
  onRollDice: () => void;
  onBankScore: () => void;
}

export const GameplayPhase: React.FC<GameplayPhaseProps> = ({
  matchData,
  currentPlayer,
  opponent,
  isHost,
  dice1Animation,
  dice2Animation,
  onRollDice,
  onBankScore
}) => {
  const isMyTurn = currentPlayer.turnActive;
  const canRoll = isMyTurn && !matchData.gameData.isRolling;
  const canBank = isMyTurn && !matchData.gameData.isRolling && matchData.gameData.turnScore > 0;

  // Get game rule result for display
  const getGameRuleResult = () => {
    const dice1 = matchData.gameData.diceOne;
    const dice2 = matchData.gameData.diceTwo;
    
    if (!dice1 || !dice2) return null;
    
    // Single 1
    if ((dice1 === 1 && dice2 !== 1) || (dice2 === 1 && dice1 !== 1)) {
      return { rule: 'SINGLE ONE', result: 'Turn over, no score added', color: 'text-red-400' };
    }
    // Double 6
    else if (dice1 === 6 && dice2 === 6) {
      return { rule: 'DOUBLE SIX', result: 'Player score reset to 0', color: 'text-red-500' };
    }
    // Snake Eyes
    else if (dice1 === 1 && dice2 === 1) {
      return { rule: 'SNAKE EYES', result: '+20 to turn score, continue playing', color: 'text-yellow-400' };
    }
    // Normal scoring
    else {
      const sum = dice1 + dice2;
      return { rule: 'NORMAL', result: `+${sum} to turn score`, color: 'text-green-400' };
    }
  };

  const gameRuleResult = getGameRuleResult();

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Dice Container - Two Dice Stacked Vertically like reference */}
      <div className="flex flex-col gap-4 mb-8">
        {/* Dice 1 - Slot Machine */}
        <div style={{ width: '600px' }}>
          <SlotMachineDice
            diceNumber={1}
            animationState={dice1Animation}
            matchRollPhase={matchData.gameData.rollPhase}
            actualValue={matchData.gameData.diceOne}
            isGameRolling={matchData.gameData.isRolling || false}
            matchData={matchData}
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
            matchData={matchData}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-8">
        {isMyTurn ? (
          <>
            <button
              onClick={onRollDice}
              disabled={!canRoll}
              className={`px-8 py-4 rounded-xl text-xl font-bold transition-all transform ${
                canRoll
                  ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 border-2 border-blue-400'
                  : 'bg-gray-600 text-gray-300 cursor-not-allowed border-2 border-gray-500'
              }`}
              style={{ fontFamily: "Audiowide" }}
            >
              {matchData.gameData.isRolling ? 'ROLLING...' : 'ROLL DICE'}
            </button>
            
            <button
              onClick={onBankScore}
              disabled={!canBank}
              className={`px-8 py-4 rounded-xl text-xl font-bold transition-all transform ${
                canBank
                  ? 'bg-green-600 hover:bg-green-700 text-white hover:scale-105 border-2 border-green-400'
                  : 'bg-gray-600 text-gray-300 cursor-not-allowed border-2 border-gray-500'
              }`}
              style={{ fontFamily: "Audiowide" }}
            >
              BANK SCORE
            </button>
          </>
        ) : (
          <div className="text-center">
            <p 
              className="text-gray-300 text-xl"
              style={{ 
                fontFamily: "Audiowide",
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
              }}
            >
              Waiting for {opponent.playerDisplayName} to play...
            </p>
          </div>
        )}
      </div>

      {/* Turn Score Display */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-block px-8 py-4 bg-yellow-600/20 border-2 border-yellow-500 rounded-2xl backdrop-blur-sm">
          <p 
            className="text-lg text-yellow-300 mb-1"
            style={{ fontFamily: "Audiowide" }}
          >
            Turn Score
          </p>
          <p 
            className="text-4xl font-bold text-yellow-400" 
            style={{ fontFamily: "Audiowide" }}
          >
            {matchData.gameData.turnScore}
          </p>
        </div>
      </motion.div>

      {/* Game Rule Result */}
      {gameRuleResult && !matchData.gameData.isRolling && matchData.gameData.diceOne > 0 && matchData.gameData.diceTwo > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-8"
        >
          <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/20">
            <p 
              className={`text-lg font-bold ${gameRuleResult.color}`} 
              style={{ fontFamily: "Audiowide" }}
            >
              {gameRuleResult.rule}
            </p>
            <p 
              className="text-white mt-1"
              style={{ fontFamily: "Audiowide" }}
            >
              {gameRuleResult.result}
            </p>
          </div>
        </motion.div>
      )}

      {/* Game Rules Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="bg-white/5 rounded-2xl p-6 backdrop-blur-sm max-w-2xl border border-white/10">
          <h3 
            className="text-lg font-bold text-white mb-4" 
            style={{ fontFamily: "Audiowide" }}
          >
            GAME RULES
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-300">
            <div>
              <span className="text-red-400 font-bold">Single 1:</span> Turn over, no score
            </div>
            <div>
              <span className="text-red-500 font-bold">Double 6:</span> Player score reset to 0
            </div>
            <div>
              <span className="text-yellow-400 font-bold">Snake Eyes:</span> +20 to turn, continue
            </div>
            <div>
              <span className="text-green-400 font-bold">Normal:</span> Add dice sum to turn
            </div>
          </div>
          <p 
            className="text-gray-400 text-xs mt-3"
            style={{ fontFamily: "Audiowide" }}
          >
            First to reach {matchData.gameData.roundObjective} wins!
          </p>
        </div>
      </motion.div>
    </div>
  );
};
