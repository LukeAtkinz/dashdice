'use client';

import React from 'react';
import { GameMode } from '@/types/gameModes';

interface GameModeDisplayProps {
  gameMode: GameMode;
  gameState: any;
  currentScore: number;
  isCurrentPlayer: boolean;
}

export default function GameModeDisplay({
  gameMode,
  gameState,
  currentScore,
  isCurrentPlayer
}: GameModeDisplayProps) {
  const renderModeSpecificInfo = () => {
    switch (gameMode.id) {
      case 'classic':
        const roundsWon = gameState.modeSpecificData?.roundsWon || {};
        const currentRound = gameState.modeSpecificData?.currentRound || 1;
        
        return (
          <div className="bg-blue-600/20 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-blue-400">Classic Mode</h3>
              <span className="text-sm text-gray-300">Round {currentRound}</span>
            </div>
            <div className="text-sm text-gray-300 mt-1">
              First to 50 points wins the round • Best of 3 rounds
            </div>
            {gameState.players && gameState.players.length > 0 && (
              <div className="mt-2 flex gap-4">
                {gameState.players.map((playerId: string) => (
                  <div key={playerId} className="text-xs">
                    <span className="text-gray-400">Player:</span>
                    <span className="text-white ml-1">{roundsWon[playerId] || 0} wins</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'zero-hour':
        const remaining = currentScore;
        const isCloseToWin = remaining <= 10;
        
        return (
          <div className="bg-red-600/20 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-red-400">Zero Hour</h3>
              <span className={`text-2xl font-bold ${isCloseToWin ? 'text-red-400' : 'text-white'}`}>
                {remaining}
              </span>
            </div>
            <div className="text-sm text-gray-300 mt-1">
              Race to exactly 0 • Rolls subtract from your score
            </div>
            {isCloseToWin && (
              <div className="text-xs text-red-400 mt-2 animate-pulse">
                ⚠️ Careful! Don't overshoot or you'll reset to 100!
              </div>
            )}
          </div>
        );

      case 'last-line':
        const completedPlayers = gameState.modeSpecificData?.completedPlayers || [];
        const totalPlayers = gameState.players ? gameState.players.length : 0;
        
        return (
          <div className="bg-yellow-600/20 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-yellow-400">Last Line</h3>
              <span className="text-sm text-gray-300">
                {completedPlayers.length}/{totalPlayers} finished
              </span>
            </div>
            <div className="text-sm text-gray-300 mt-1">
              One roll to rule them all • Doubles grant extra roll
            </div>
            {isCurrentPlayer && (
              <div className="text-xs text-yellow-400 mt-2">
                🎲 Make it count! Highest roll wins!
              </div>
            )}
          </div>
        );

      case 'true-grit':
        const eliminatedPlayers = gameState.modeSpecificData?.eliminatedPlayers || [];
        const activePlayers = gameState.players ? gameState.players.length - eliminatedPlayers.length : 0;
        
        return (
          <div className="bg-orange-600/20 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-orange-400">True Grit</h3>
              <span className="text-sm text-gray-300">
                {activePlayers} players remaining
              </span>
            </div>
            <div className="text-sm text-gray-300 mt-1">
              No banking • Single 1 eliminates • Double 6s score normally
            </div>
            {isCurrentPlayer && (
              <div className="text-xs text-orange-400 mt-2">
                ⚡ No safety net! Keep rolling or bank it all!
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderScoreDisplay = () => {
    const { scoreDirection, targetScore, startingScore } = gameMode.rules;
    
    if (scoreDirection === 'down') {
      // Zero Hour - show countdown
      const progress = ((startingScore - currentScore) / startingScore) * 100;
      return (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Progress to Zero:</span>
            <span className="text-sm text-white">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      );
    } else {
      // Upward scoring - show progress to target
      const progress = (currentScore / targetScore) * 100;
      return (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Progress to {targetScore}:</span>
            <span className="text-sm text-white">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="mb-6">
      {renderModeSpecificInfo()}
      {gameMode.id !== 'last-line' && renderScoreDisplay()}
    </div>
  );
}
