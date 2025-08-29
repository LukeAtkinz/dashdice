import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MatchData } from '@/types/match';
import { MatchService } from '@/services/matchService';
import { RematchService, RematchRoom } from '@/services/rematchService';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { useAuth } from '@/context/AuthContext';

interface GameOverPhaseProps {
  matchData: MatchData;
  onLeaveMatch: () => void;
  onRematch?: (newMatchId: string) => void;
}

export const GameOverPhase: React.FC<GameOverPhaseProps> = ({
  matchData,
  onLeaveMatch,
  onRematch
}) => {
  const { user } = useAuth();
  const [rematchState, setRematchState] = useState<'idle' | 'selecting' | 'requesting' | 'waiting' | 'accepted' | 'expired' | 'opponent_left'>('idle');
  const [rematchRoomId, setRematchRoomId] = useState<string | null>(null);
  const [incomingRematch, setIncomingRematch] = useState<RematchRoom | null>(null);
  const [selectedGameMode, setSelectedGameMode] = useState<string>('standard');
  
  const winner = matchData.gameData.winner;
  const reason = matchData.gameData.gameOverReason;
  
  // Determine current user and opponent
  const isHost = matchData.hostData.playerId === user?.uid;
  const currentUser = isHost ? matchData.hostData : matchData.opponentData;
  const opponent = isHost ? matchData.opponentData : matchData.hostData;
  const opponentDisplayName = opponent.playerDisplayName;
  const opponentId = opponent.playerId;

  // Game mode display name mapping
  const getGameModeDisplayName = (gameType: string): string => {
    const modeNames: Record<string, string> = {
      'classic': 'Classic Mode',
      'quickfire': 'Quick Fire',
      'zero-hour': 'Zero Hour',
      'last-line': 'Last Line',
      'true-grit': 'True Grit',
      'tag-team': 'Tag Team'
    };
    return modeNames[gameType.toLowerCase()] || gameType.charAt(0).toUpperCase() + gameType.slice(1);
  };

  // Rematch handlers
  const handleShowGameModeSelector = () => {
    setRematchState('selecting');
  };

  const handleSelectGameMode = (gameMode: string) => {
    setSelectedGameMode(gameMode);
    handleRequestRematchWithMode(gameMode);
  };

  const handleRequestRematchWithMode = async (gameMode: string) => {
    if (!user || !opponentId) return;
    
    try {
      setRematchState('requesting');
      
      // Archive the current completed match before creating rematch
      if (matchData.gameData.gamePhase === 'gameOver' && matchData.gameData.winner) {
        const winnerId = isHost ? 
          (matchData.gameData.winner === matchData.hostData.playerDisplayName ? matchData.hostData.playerId : matchData.opponentData.playerId) :
          (matchData.gameData.winner === matchData.opponentData.playerDisplayName ? matchData.opponentData.playerId : matchData.hostData.playerId);
        
        const winnerData = winnerId === matchData.hostData.playerId ? matchData.hostData : matchData.opponentData;
        
        await MatchService.archiveCompletedMatch(
          matchData.id || '',
          winnerId,
          winnerData.playerDisplayName,
          winnerData.playerScore
        );
        
        console.log('✅ Match archived when requesting rematch');
      }
      
      const roomId = await RematchService.createRematchRoom(
        user.uid,
        currentUser.playerDisplayName,
        opponentId,
        opponentDisplayName,
        matchData.id || '',
        gameMode, // Use selected game mode
        'public' // Default game type
      );
      setRematchRoomId(roomId);
    } catch (error) {
      console.error('Error creating rematch room:', error);
      setRematchState('idle');
    }
  };

  const handleRequestRematch = async () => {
    // This function now just opens the game mode selector
    handleShowGameModeSelector();
  };

  const handleCancelRematch = async () => {
    if (!rematchRoomId || !user?.uid) return;
    
    try {
      await RematchService.cancelRematch(rematchRoomId, user.uid);
      setRematchState('idle');
      setRematchRoomId(null);
    } catch (error) {
      console.error('Error canceling rematch:', error);
    }
  };

  // Listen for incoming rematch requests
  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubscribe = RematchService.subscribeToIncomingRematches(
      user.uid,
      (rematches) => {
        // Find rematch from current opponent
        const relevantRematch = rematches.find(r => 
          r.requesterUserId === opponent.playerId && 
          r.opponentUserId === user.uid
        );
        
        if (relevantRematch) {
          setIncomingRematch(relevantRematch);
        }
      }
    );
    
    return () => unsubscribe();
  }, [user?.uid, opponent.playerId]);

  // Listen for rematch room updates when we're the requester
  useEffect(() => {
    if (!rematchRoomId || (rematchState !== 'requesting' && rematchState !== 'waiting')) return;
    
    const unsubscribe = RematchService.subscribeToRematchRoom(
      rematchRoomId,
      (rematchData) => {
        if (!rematchData) {
          setRematchState('expired');
          return;
        }
        
        if (rematchData.status === 'accepted') {
          setRematchState('accepted');
          
          // Navigate to the new match if newMatchId is available
          if (rematchData.newMatchId && onRematch) {
            console.log('🎮 GameOverPhase: Navigating to new rematch:', rematchData.newMatchId);
            onRematch(rematchData.newMatchId);
          }
        } else if (rematchData.status === 'expired' || rematchData.status === 'cancelled') {
          setRematchState('expired');
        }
      }
    );
    
    return () => unsubscribe();
  }, [rematchRoomId, rematchState, onRematch]);

  const handleRematchRequest = async () => {
    if (!user?.uid || rematchState !== 'idle') return;
    
    try {
      setRematchState('requesting');
      
      const roomId = await RematchService.createRematchRoom(
        user.uid,
        currentUser.playerDisplayName,
        opponent.playerId,
        opponent.playerDisplayName,
        matchData.id || '',
        matchData.gameMode,
        matchData.gameType || 'Open Server'
      );
      
      setRematchRoomId(roomId);
      // Stay in 'requesting' state until opponent accepts
    } catch (error) {
      console.error('❌ Error creating rematch request:', error);
      setRematchState('idle');
    }
  };

  const handleAcceptRematch = async () => {
    if (!incomingRematch || !user?.uid) return;
    
    try {
      console.log('🎮 Accepting rematch...');
      setRematchState('waiting');
      setIncomingRematch(null); // Clear the incoming request
      
      // Archive the current completed match before creating new one
      if (matchData.gameData.gamePhase === 'gameOver' && matchData.gameData.winner) {
        const winnerId = isHost ? 
          (matchData.gameData.winner === matchData.hostData.playerDisplayName ? matchData.hostData.playerId : matchData.opponentData.playerId) :
          (matchData.gameData.winner === matchData.opponentData.playerDisplayName ? matchData.opponentData.playerId : matchData.hostData.playerId);
        
        const winnerData = winnerId === matchData.hostData.playerId ? matchData.hostData : matchData.opponentData;
        
        await MatchService.archiveCompletedMatch(
          matchData.id || '',
          winnerId,
          winnerData.playerDisplayName,
          winnerData.playerScore
        );
        
        console.log('✅ Match archived when accepting rematch');
      }
      
      const newMatchId = await RematchService.acceptRematch(incomingRematch.id, user.uid);
      console.log('✅ Rematch accepted, new match ID:', newMatchId);
      
      // Navigate to new match
      if (onRematch) {
        onRematch(newMatchId);
      }
    } catch (error) {
      console.error('❌ Error accepting rematch:', error);
      setRematchState('idle');
      // Show the incoming rematch again if there was an error
      // Note: The incoming rematch might have expired, so this is just for error handling
    }
  };

  const handleRematchTimeout = () => {
    setRematchState('expired');
    if (rematchRoomId && user?.uid) {
      RematchService.cancelRematch(rematchRoomId, user.uid, 'timeout');
    }
  };

  const handleLeaveMatch = async () => {
    try {
      // Cancel any pending rematch
      if (rematchRoomId && rematchState === 'waiting') {
        await RematchService.cancelRematch(rematchRoomId, user?.uid || '');
      }
      
      // Archive the completed match before leaving
      if (matchData.gameData.gamePhase === 'gameOver' && matchData.gameData.winner) {
        const winnerId = isHost ? 
          (matchData.gameData.winner === matchData.hostData.playerDisplayName ? matchData.hostData.playerId : matchData.opponentData.playerId) :
          (matchData.gameData.winner === matchData.opponentData.playerDisplayName ? matchData.opponentData.playerId : matchData.hostData.playerId);
        
        const winnerData = winnerId === matchData.hostData.playerId ? matchData.hostData : matchData.opponentData;
        
        await MatchService.archiveCompletedMatch(
          matchData.id || '',
          winnerId,
          winnerData.playerDisplayName,
          winnerData.playerScore
        );
        
        console.log('✅ Match archived when leaving game over screen');
      }
      
      setRematchState('opponent_left');
      onLeaveMatch();
    } catch (error) {
      console.error('❌ Error leaving match:', error);
      // Still leave even if archiving fails
      onLeaveMatch();
    }
  };

  const getRematchButtonContent = () => {
    switch (rematchState) {
      case 'requesting':
        return 'CREATING REMATCH...';
      case 'waiting':
        return 'WAITING FOR OPPONENT';
      case 'accepted':
        return 'STARTING REMATCH...';
      case 'expired':
        return 'REMATCH EXPIRED';
      case 'opponent_left':
        return 'OPPONENT LEFT';
      default:
        return 'REMATCH';
    }
  };

  const getRematchButtonClass = () => {
    switch (rematchState) {
      case 'expired':
      case 'opponent_left':
        return 'bg-gray-600 text-gray-400 cursor-not-allowed';
      case 'requesting':
      case 'waiting':
      case 'accepted':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white cursor-wait';
      default:
        return 'bg-green-600 hover:bg-green-700 text-white';
    }
  };

  return (
    <div 
      className="max-w-4xl mx-auto text-center overflow-hidden" 
      style={{ 
        flexDirection: 'column', 
        position: 'relative',
        height: '100vh',
        maxHeight: '100vh'
      }}
    >
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
            <p className="text-2xl text-yellow-300 mb-2">WINNER</p>
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

      {/* Incoming Rematch Request */}
      {incomingRematch && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-6 bg-green-600/20 border-2 border-green-400 rounded-2xl backdrop-blur-sm"
        >
          <div className="text-center">
            <p className="text-xl font-bold text-green-400 mb-4" style={{ fontFamily: "Audiowide" }}>
              {opponentDisplayName} wants a rematch!
            </p>
            <div className="flex justify-center items-center gap-4">
              <CountdownTimer
                initialSeconds={10}
                onComplete={() => {
                  setIncomingRematch(null);
                  setRematchState('expired');
                }}
                isActive={true}
                size="medium"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleAcceptRematch}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all transform hover:scale-105"
                  style={{ fontFamily: "Audiowide" }}
                >
                  ACCEPT
                </button>
                <button
                  onClick={() => setIncomingRematch(null)}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all transform hover:scale-105"
                  style={{ fontFamily: "Audiowide" }}
                >
                  DECLINE
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
        className="flex justify-center gap-4"
      >
        <button
          onClick={handleLeaveMatch}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xl font-bold transition-all transform hover:scale-105"
          style={{ fontFamily: "Audiowide" }}
        >
          BACK TO DASHBOARD
        </button>
        
        {/* Rematch Button with Timer */}
        {rematchState === 'idle' && (
          <button
            onClick={handleRequestRematch}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xl font-bold transition-all transform hover:scale-105"
            style={{ fontFamily: "Audiowide" }}
          >
            REMATCH
          </button>
        )}

        {/* Game Mode Selector */}
        {rematchState === 'selecting' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border-2 border-blue-400/50"
          >
            <h3 
              className="text-2xl font-bold text-white mb-4 text-center"
              style={{ fontFamily: "Audiowide" }}
            >
              CHOOSE GAME MODE
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelectGameMode('standard')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all border-2 border-blue-400/50"
                style={{ fontFamily: "Audiowide" }}
              >
                🎲 STANDARD
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelectGameMode('rapidFire')}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-xl transition-all border-2 border-orange-400/50"
                style={{ fontFamily: "Audiowide" }}
              >
                🔥 RAPID FIRE
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelectGameMode('marathon')}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all border-2 border-purple-400/50"
                style={{ fontFamily: "Audiowide" }}
              >
                🏃 MARATHON
              </motion.button>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setRematchState('idle')}
              className="mt-4 w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
              style={{ fontFamily: "Audiowide" }}
            >
              CANCEL
            </motion.button>
          </motion.div>
        )}
        
        {rematchState === 'requesting' && (
          <div className="flex flex-col items-center gap-4 px-8 py-4 bg-yellow-600/20 border-2 border-yellow-400 rounded-xl">
            <div className="text-center">
              <p className="text-yellow-400 font-bold text-sm mb-1" style={{ fontFamily: "Audiowide" }}>
                GAME MODE: {getGameModeDisplayName(selectedGameMode)}
              </p>
              <span className="text-yellow-400 font-bold text-xl" style={{ fontFamily: "Audiowide" }}>
                WAITING FOR {opponentDisplayName}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <CountdownTimer
                initialSeconds={10}
                onComplete={handleRematchTimeout}
                isActive={true}
                size="small"
              />
              <button
                onClick={handleCancelRematch}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all"
                style={{ fontFamily: "Audiowide" }}
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
        
        {rematchState === 'accepted' && (
          <div className="px-8 py-4 bg-blue-600/20 border-2 border-blue-400 rounded-xl">
            <span className="text-blue-400 font-bold text-xl" style={{ fontFamily: "Audiowide" }}>
              REMATCH ACCEPTED - STARTING GAME...
            </span>
          </div>
        )}
        
        {rematchState === 'expired' && (
          <div className="px-8 py-4 bg-red-600/20 border-2 border-red-400 rounded-xl">
            <span className="text-red-400 font-bold text-xl" style={{ fontFamily: "Audiowide" }}>
              REMATCH EXPIRED
            </span>
          </div>
        )}
        
        {rematchState === 'opponent_left' && (
          <div className="px-8 py-4 bg-gray-600/20 border-2 border-gray-400 rounded-xl">
            <span className="text-gray-400 font-bold text-xl" style={{ fontFamily: "Audiowide" }}>
              {opponentDisplayName} LEFT
            </span>
          </div>
        )}
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
