import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MatchData } from '@/types/match';
import { RematchService, RematchRoom } from '@/services/rematchService';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { useAuth } from '@/context/AuthContext';
import { useBackground } from '@/context/BackgroundContext';

interface MatchSummaryScreenProps {
  matchData: MatchData;
  onLeaveMatch: () => void;
  onRematch?: (newMatchId: string) => void;
}

export const MatchSummaryScreen: React.FC<MatchSummaryScreenProps> = ({ 
  matchData, 
  onLeaveMatch,
  onRematch
}) => {
  const { user } = useAuth();
  const { DisplayBackgroundEquip } = useBackground();
  const [rematchState, setRematchState] = useState<'idle' | 'requesting' | 'waiting' | 'accepted' | 'expired' | 'opponent_left'>('idle');
  const [rematchRoomId, setRematchRoomId] = useState<string | null>(null);
  const [incomingRematch, setIncomingRematch] = useState<RematchRoom | null>(null);
  
  const winner = matchData.gameData.winner;
  const reason = matchData.gameData.gameOverReason;
  
  // Determine current user and opponent
  const isHost = matchData.hostData.playerId === user?.uid;
  const currentUser = isHost ? matchData.hostData : matchData.opponentData;
  const opponent = isHost ? matchData.opponentData : matchData.hostData;
  const opponentDisplayName = opponent.playerDisplayName;
  const opponentId = opponent.playerId;

  // Get nav-style button styling
  const getNavButtonStyle = (buttonType: 'dashboard' | 'rematch') => {
    const baseStyle = {
      fontFamily: "Audiowide",
      textTransform: "uppercase" as const,
      display: 'flex',
      width: '209px',
      height: '56px',
      padding: '4px 16px',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '10px',
      borderRadius: '18px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      backdropFilter: 'blur(6px)',
    };

    if (buttonType === 'dashboard') {
      return {
        ...baseStyle,
        background: "linear-gradient(135deg, #00FF80 0%, transparent 100%)", // Green to transparent
        color: "#FFF",
        boxShadow: "0 4px 15px rgba(0, 255, 128, 0.3)",
      };
    } else {
      return {
        ...baseStyle,
        background: "linear-gradient(135deg, #FF0080 0%, transparent 100%)", // Pink to transparent
        color: "#FFF",
        boxShadow: "0 4px 15px rgba(255, 0, 128, 0.3)",
      };
    }
  };

  // Rematch handlers
  const handleRequestRematch = async () => {
    if (!user || !opponentId) return;
    
    try {
      setRematchState('requesting');
      
      const roomId = await RematchService.createRematchRoom(
        user.uid,
        currentUser.playerDisplayName,
        opponentId,
        opponentDisplayName,
        matchData.id || '',
        'standard', // Default game mode
        'public' // Default game type
      );
      setRematchRoomId(roomId);
      setRematchState('waiting'); // Change to waiting after successful creation
    } catch (error) {
      console.error('Error creating rematch room:', error);
      setRematchState('idle');
    }
  };

  const handleAcceptRematch = async () => {
    if (!incomingRematch || !user?.uid) return;
    
    try {
      console.log('🎮 Accepting rematch...');
      setRematchState('waiting');
      setIncomingRematch(null); // Clear the incoming request
      
      const newMatchId = await RematchService.acceptRematch(incomingRematch.id, user.uid);
      console.log('✅ Rematch accepted, new match ID:', newMatchId);
      
      // Navigate to new match
      if (onRematch) {
        onRematch(newMatchId);
      }
    } catch (error) {
      console.error('❌ Error accepting rematch:', error);
      setRematchState('idle');
    }
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

  const handleRematchTimeout = () => {
    setRematchState('expired');
    setRematchRoomId(null);
  };

  const handleLeaveMatch = () => {
    // Cancel any pending rematch
    if (rematchRoomId && (rematchState === 'requesting' || rematchState === 'waiting')) {
      RematchService.cancelRematch(rematchRoomId, user?.uid || '');
    }
    
    setRematchState('opponent_left');
    onLeaveMatch();
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
    if (!rematchRoomId || rematchState !== 'waiting') return;
    
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
            console.log('🎮 Navigating to new rematch:', rematchData.newMatchId);
            onRematch(rematchData.newMatchId);
          }
        } else if (rematchData.status === 'expired' || rematchData.status === 'cancelled') {
          setRematchState('expired');
        }
      }
    );
    
    return () => unsubscribe();
  }, [rematchRoomId, rematchState, onRematch]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-4 md:p-8 space-y-6 pb-24 md:pb-8"
      style={{
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Victory/Defeat Announcement - Now visible on Mobile */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        className="text-center"
      >
        <motion.h1
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-6xl md:text-8xl font-bold mb-4"
          style={{ fontFamily: "Audiowide" }}
        >
          {winner === currentUser.playerDisplayName ? (
            <span className="text-yellow-400 drop-shadow-lg">VICTORY!</span>
          ) : (
            <span className="text-red-400 drop-shadow-lg">DEFEAT</span>
          )}
        </motion.h1>

        {/* Game Over Reason */}
        {reason && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="hidden md:block"
          >
            <p className="text-base md:text-xl text-gray-300">{reason}</p>
          </motion.div>
        )}
      </motion.div>

      {/* Final Scores - Hidden on Mobile, Visible on Desktop */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="hidden md:grid grid-cols-2 gap-2 md:gap-8"
      >
        {/* Host Score */}
        <div className="p-3 md:p-6 bg-white/10 rounded-2xl border border-gray-400 text-center">
          <p 
            className="text-sm md:text-xl font-bold text-white mb-1 md:mb-2 truncate" 
            style={{ fontFamily: "Audiowide" }}
            title={matchData.hostData.playerDisplayName}
          >
            {matchData.hostData.playerDisplayName}
          </p>
          <p className="text-xl md:text-3xl font-bold text-white" style={{ fontFamily: "Audiowide" }}>
            {matchData.hostData.playerScore}
          </p>
          <p className="text-xs md:text-sm text-gray-300">Final Score</p>
        </div>

        {/* Opponent Score */}
        <div className="p-3 md:p-6 bg-white/10 rounded-2xl border border-gray-400 text-center">
          <p 
            className="text-sm md:text-xl font-bold text-white mb-1 md:mb-2 truncate" 
            style={{ fontFamily: "Audiowide" }}
            title={matchData.opponentData.playerDisplayName}
          >
            {matchData.opponentData.playerDisplayName}
          </p>
          <p className="text-xl md:text-3xl font-bold text-white" style={{ fontFamily: "Audiowide" }}>
            {matchData.opponentData.playerScore}
          </p>
          <p className="text-xs md:text-sm text-gray-300">Final Score</p>
        </div>
      </motion.div>

      {/* Match Statistics - New 3-Column Layout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
        className="block p-4 md:p-6 bg-black/20 rounded-2xl border border-gray-600"
      >
        <h3 className="text-base md:text-lg font-bold text-white mb-4 md:mb-6 text-center" style={{ fontFamily: "Audiowide" }}>
          MATCH STATISTICS
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-8">
          {/* Left Column - Host Stats */}
          <div className="text-center space-y-4">
            <h4 className="text-sm md:text-md font-bold text-yellow-400 mb-4" style={{ fontFamily: "Audiowide" }}>
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
          
          {/* Center Column - Separator - Hidden on Mobile */}
          <div className="hidden md:flex items-center justify-center">
            <div className="w-px h-48 bg-gradient-to-b from-transparent via-gray-400 to-transparent"></div>
          </div>
          
          {/* Right Column - Opponent Stats */}
          <div className="text-center space-y-4">
            <h4 className="text-sm md:text-md font-bold text-yellow-400 mb-4" style={{ fontFamily: "Audiowide" }}>
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

      {/* Incoming Rematch Request - Hidden on Mobile */}
      {incomingRematch && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="hidden md:block mb-6 p-6 bg-green-600/20 border-2 border-green-400 rounded-2xl"
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

      {/* Action Buttons - Hidden on mobile, nav style buttons will replace these */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
        className="hidden md:flex flex-col md:flex-row justify-center gap-4"
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
        
        {rematchState === 'requesting' && (
          <div className="flex items-center gap-4 px-8 py-4 bg-yellow-600/20 border-2 border-yellow-400 rounded-xl">
            <CountdownTimer
              initialSeconds={10}
              onComplete={handleRematchTimeout}
              isActive={true}
              size="small"
            />
            <span className="text-yellow-400 font-bold text-xl" style={{ fontFamily: "Audiowide" }}>
              WAITING FOR {opponentDisplayName}
            </span>
            <button
              onClick={handleCancelRematch}
              className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all"
              style={{ fontFamily: "Audiowide" }}
            >
              CANCEL
            </button>
          </div>
        )}
        
        {rematchState === 'waiting' && (
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
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800),
              rotate: 0
            }}
            animate={{ 
              opacity: [0, 1, 0], 
              y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 100,
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

      {/* Mobile Nav-Style Buttons - Fixed at bottom like Play/Save buttons */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 w-full flex flex-row items-stretch z-50 backdrop-blur-sm"
        style={{
          height: 'max(70px, env(safe-area-inset-bottom) + 70px)',
          background: 'rgba(0, 0, 0, 0.3)'
        }}
      >
        <button
          onClick={onLeaveMatch}
          className="text-white text-lg font-bold transition-all active:scale-95 flex items-center justify-center"
          style={{
            width: rematchState === 'idle' ? '50%' : '100%',
            height: '100%',
            fontFamily: "Audiowide",
            textTransform: "uppercase" as const,
            border: 'none',
            borderRadius: '0',
            background: "linear-gradient(135deg, #00FF80 0%, transparent 100%)",
            backdropFilter: 'blur(6px)',
          }}
        >
          <span className="text-center">DASHBOARD</span>
        </button>
        
        {rematchState === 'idle' && (
          <button
            onClick={handleRequestRematch}
            className="text-white text-lg font-bold transition-all active:scale-95 flex items-center justify-center"
            style={{
              width: '50%',
              height: '100%',
              fontFamily: "Audiowide",
              textTransform: "uppercase" as const,
              border: 'none',
              borderRadius: '0',
              background: "linear-gradient(135deg, #FF0080 0%, transparent 100%)",
              backdropFilter: 'blur(6px)',
            }}
          >
            <span className="text-center">REMATCH</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default MatchSummaryScreen;
