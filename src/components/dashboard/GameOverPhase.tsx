import React from 'react';
import { motion } from 'framer-motion';
import { MatchData } from '@/types/match';

interface GameOverPhaseProps {
  matchData: MatchData;
  onLeaveMatch: () => void;
}

export const GameOverPhase: React.FC<GameOverPhaseProps> = ({
  matchData,
  onLeaveMatch
}) => {
  const winner = matchData.gameData.winner;
  const reason = matchData.gameData.gameOverReason;

  return (
    <div className="max-w-4xl mx-auto text-center">
      {/* Game Over Title */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mb-8"
      >
        <h1 className="text-6xl font-bold text-white mb-4" style={{ fontFamily: "Audiowide" }}>
          GAME OVER
        </h1>
        
        {/* Winner Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-6"
        >
          <div className="inline-block px-8 py-6 bg-gradient-to-r from-yellow-600/30 to-orange-600/30 border-2 border-yellow-500 rounded-2xl backdrop-blur-sm">
            <p className="text-2xl text-yellow-300 mb-2">🏆 WINNER 🏆</p>
            <p className="text-4xl font-bold text-yellow-400" style={{ fontFamily: "Audiowide" }}>
              {winner}
            </p>
          </div>
        </motion.div>

        {/* Game Over Reason */}
        {reason && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-8"
          >
            <p className="text-xl text-gray-300">{reason}</p>
          </motion.div>
        )}
      </motion.div>

      {/* Final Scores - Updated Layout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="grid grid-cols-2 gap-8 mb-8"
      >
        {/* Host Score */}
        <div className="p-6 bg-white/10 rounded-2xl backdrop-blur-sm border border-gray-400">
          <p className="text-xl font-bold text-white mb-2" style={{ fontFamily: "Audiowide" }}>
            {matchData.hostData.playerDisplayName}
          </p>
          <p className="text-3xl font-bold text-white" style={{ fontFamily: "Audiowide" }}>
            {matchData.hostData.playerScore}
          </p>
          <p className="text-sm text-gray-300">Final Score</p>
        </div>

        {/* Opponent Score */}
        <div className="p-6 bg-white/10 rounded-2xl backdrop-blur-sm border border-gray-400">
          <p className="text-xl font-bold text-white mb-2" style={{ fontFamily: "Audiowide" }}>
            {matchData.opponentData.playerDisplayName}
          </p>
          <p className="text-3xl font-bold text-white" style={{ fontFamily: "Audiowide" }}>
            {matchData.opponentData.playerScore}
          </p>
          <p className="text-sm text-gray-300">Final Score</p>
        </div>
      </motion.div>

      {/* Match Statistics - New 3-Column Layout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
        className="mb-8 p-6 bg-black/20 rounded-2xl backdrop-blur-sm border border-gray-600"
      >
        <h3 className="text-lg font-bold text-white mb-6 text-center" style={{ fontFamily: "Audiowide" }}>
          MATCH STATISTICS
        </h3>
        
        <div className="grid grid-cols-3 gap-8">
          {/* Left Column - Host Stats */}
          <div className="text-center space-y-4">
            <h4 className="text-md font-bold text-yellow-400 mb-4" style={{ fontFamily: "Audiowide" }}>
              {matchData.hostData.playerDisplayName}
            </h4>
            
            <div className="space-y-3">
              <div>
                <p className="text-gray-300 text-sm">Banks</p>
                <p className="text-white font-bold text-lg">{matchData.hostData.matchStats?.banks || 0}</p>
              </div>
              
              <div>
                <p className="text-gray-300 text-sm">Doubles</p>
                <p className="text-white font-bold text-lg">{matchData.hostData.matchStats?.doubles || 0}</p>
              </div>
              
              <div>
                <p className="text-gray-300 text-sm">Biggest Turn Score</p>
                <p className="text-white font-bold text-lg">{matchData.hostData.matchStats?.biggestTurnScore || 0}</p>
              </div>
              
              <div>
                <p className="text-gray-300 text-sm">Last Dice</p>
                <p className="text-white font-bold text-lg">{matchData.hostData.matchStats?.lastDiceSum || 0}</p>
              </div>
            </div>
          </div>
          
          {/* Center Column - Separator */}
          <div className="flex items-center justify-center">
            <div className="w-px h-48 bg-gradient-to-b from-transparent via-gray-400 to-transparent"></div>
          </div>
          
          {/* Right Column - Opponent Stats */}
          <div className="text-center space-y-4">
            <h4 className="text-md font-bold text-yellow-400 mb-4" style={{ fontFamily: "Audiowide" }}>
              {matchData.opponentData.playerDisplayName}
            </h4>
            
            <div className="space-y-3">
              <div>
                <p className="text-gray-300 text-sm">Banks</p>
                <p className="text-white font-bold text-lg">{matchData.opponentData.matchStats?.banks || 0}</p>
              </div>
              
              <div>
                <p className="text-gray-300 text-sm">Doubles</p>
                <p className="text-white font-bold text-lg">{matchData.opponentData.matchStats?.doubles || 0}</p>
              </div>
              
              <div>
                <p className="text-gray-300 text-sm">Biggest Turn Score</p>
                <p className="text-white font-bold text-lg">{matchData.opponentData.matchStats?.biggestTurnScore || 0}</p>
              </div>
              
              <div>
                <p className="text-gray-300 text-sm">Last Dice</p>
                <p className="text-white font-bold text-lg">{matchData.opponentData.matchStats?.lastDiceSum || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
        className="flex justify-center gap-4"
      >
        <button
          onClick={onLeaveMatch}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xl font-bold transition-all transform hover:scale-105"
          style={{ fontFamily: "Audiowide" }}
        >
          BACK TO DASHBOARD
        </button>
        
        {/* Future: Add rematch button */}
        <button
          disabled
          className="px-8 py-4 bg-gray-600 text-gray-400 rounded-xl text-xl font-bold cursor-not-allowed"
          style={{ fontFamily: "Audiowide" }}
        >
          REMATCH (SOON)
        </button>
      </motion.div>

      {/* Celebration Animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute inset-0 pointer-events-none"
      >
        {/* Confetti-like elements */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              opacity: 0, 
              y: -100, 
              x: Math.random() * window.innerWidth,
              rotate: 0
            }}
            animate={{ 
              opacity: [0, 1, 0], 
              y: window.innerHeight + 100,
              rotate: 360 * (Math.random() > 0.5 ? 1 : -1)
            }}
            transition={{ 
              duration: 3 + Math.random() * 2,
              delay: Math.random() * 2,
              repeat: Infinity,
              repeatDelay: 5 + Math.random() * 5
            }}
            className="absolute w-4 h-4 bg-yellow-400 rounded-full"
          />
        ))}
      </motion.div>
    </div>
  );
};
