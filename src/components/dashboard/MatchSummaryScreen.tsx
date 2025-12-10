import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MatchData } from '@/types/match';
// Rematch system temporarily simplified - using game invitations instead
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { GameModeSelector } from '@/components/ui/GameModeSelector';
import { useAuth } from '@/context/AuthContext';
import { useBackground } from '@/context/BackgroundContext';
import { useToast } from '@/context/ToastContext';
import { resolveBackgroundPath } from '@/config/backgrounds';

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
  const { DisplayBackgroundEquip, VictoryBackgroundEquip } = useBackground();
  const { showToast } = useToast();
  const [rematchState, setRematchState] = useState<'idle' | 'sent'>('idle');
  const [showGameModeSelector, setShowGameModeSelector] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [winnerVictoryBg, setWinnerVictoryBg] = useState<any>(null);
  
  const winner = matchData.gameData.winner;
  const reason = matchData.gameData.gameOverReason;
  
  // Determine current user and opponent
  const isHost = matchData.hostData.playerId === user?.uid;
  const currentUser = isHost ? matchData.hostData : matchData.opponentData;
  const opponent = isHost ? matchData.opponentData : matchData.hostData;
  const opponentDisplayName = opponent.playerDisplayName;
  const opponentId = opponent.playerId;
  
  // Determine winner's Victory background
  const winnerIsCurrentUser = winner === user?.uid;
  
  // Get the actual winner's data based on winner ID
  const winnerData = winner === matchData.hostData.playerId 
    ? matchData.hostData 
    : matchData.opponentData;
  
  // Fetch winner's victory background from Firebase
  useEffect(() => {
    const fetchWinnerVictoryBg = async () => {
      if (!winner) {
        console.log('🎬 No winner ID provided');
        return;
      }
      
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/services/firebase');
        
        console.log('🎬 Fetching victory background for winner:', winner);
        const userDoc = await getDoc(doc(db, 'users', winner));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('🎬 Winner user data:', userData);
          console.log('🎬 Winner inventory:', userData.inventory);
          
          const victoryBg = userData.inventory?.victoryBackgroundEquipped;
          console.log('🎬 Fetched winner victory background from Firebase:', victoryBg);
          console.log('🎬 Type of victoryBg:', typeof victoryBg);
          
          if (victoryBg) {
            setWinnerVictoryBg(victoryBg);
          } else {
            console.log('🎬 No victoryBackgroundEquipped found in user inventory');
          }
        } else {
          console.log('🎬 Winner user document does not exist');
        }
      } catch (error) {
        console.error('🎬 Error fetching winner victory background:', error);
      }
    };
    
    fetchWinnerVictoryBg();
  }, [winner]);
  
  // Get winner's victory background - use Firebase data first, then match data
  const victoryVideo = (() => {
    console.log('🎬 Victory Background Resolution START:', {
      winnerVictoryBg,
      winnerData,
      victoryBackgroundEquipped: winnerData?.victoryBackgroundEquipped,
      winnerId: winner
    });
    
    // Priority 1: Use fetched Firebase data
    const bgSource = winnerVictoryBg || winnerData?.victoryBackgroundEquipped;
    
    console.log('🎬 bgSource:', bgSource);
    
    if (bgSource) {
      // Handle both string ID and object with id property
      const bgId = typeof bgSource === 'string' 
        ? bgSource 
        : (bgSource.id || bgSource.backgroundId || bgSource.name);
      
      console.log('🎬 Extracted background ID:', bgId);
      
      if (bgId) {
        const resolved = resolveBackgroundPath(bgId, 'victory-screen');
        console.log('🎬 Resolved background:', resolved);
        
        if (resolved?.path) {
          console.log('🎬 ✅ Using winner\'s victory background:', resolved.path);
          return resolved.path;
        }
      }
    }
    
    console.log('🎬 ⚠️ Using fallback wind-blade - victoryBackgroundEquipped was not found or could not be resolved');
    // Fallback to default
    const resolved = resolveBackgroundPath('wind-blade', 'victory-screen');
    return resolved?.path || '/backgrounds/Game Backgrounds/Victory Screens/Best Quality/Wind Blade.mp4';
  })();

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

  // Rematch handlers - Using game invitation system (simple!)
  const handleRequestRematch = () => {
    if (!user || !opponentId || rematchState !== 'idle') return;
    setShowGameModeSelector(true);
  };

  const handleGameModeSelect = async (gameMode: string) => {
    setShowGameModeSelector(false);
    
    // Show \"Disabled for playtesting\" toast
    showToast('Disabled for playtesting', 'info', 3000);
  };

  const handleGameModeCancel = () => {
    setShowGameModeSelector(false);
  };

  return (
    <>
      {/* Victory Video Background - Winner's selected background */}
      <div 
        className="fixed top-0 left-0 right-0 bg-black" 
        style={{ 
          zIndex: 0,
          bottom: 'calc(130px + env(safe-area-inset-bottom))',
          width: '100vw',
          height: '100vh'
        }}
      >
        <video 
          key={victoryVideo}
          src={victoryVideo} 
          autoPlay 
          loop 
          muted 
          playsInline 
          controls={false}
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          {...{
            'webkit-playsinline': 'true',
            'x5-playsinline': 'true',
            'x5-video-player-type': 'h5-page',
            'x5-video-player-fullscreen': 'false'
          } as any}
          onLoadedMetadata={(e) => {
            const video = e.currentTarget;
            video.muted = true;
            video.play().catch(() => {});
          }}
          onCanPlay={(e) => {
            const video = e.currentTarget;
            video.muted = true;
            if (video.paused) video.play().catch(() => {});
          }}
          onLoadedData={(e) => {
            const video = e.currentTarget;
            video.muted = true;
            if (video.paused) video.play().catch(() => {});
          }}
          onSuspend={(e) => {
            const video = e.currentTarget;
            if (video.paused) video.play().catch(() => {});
          }}
          onPause={(e) => {
            const video = e.currentTarget;
            setTimeout(() => {
              if (video.paused) video.play().catch(() => {});
            }, 100);
          }}
          onStalled={(e) => {
            const video = e.currentTarget;
            video.load();
            video.play().catch(() => {});
          }}
          onWaiting={(e) => {
            const video = e.currentTarget;
            if (video.paused) video.play().catch(() => {});
          }}
          onClick={(e) => {
            const video = e.currentTarget;
            video.muted = true;
            if (video.paused) video.play().catch(() => {});
          }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Content Layer */}
      <div className="min-h-screen flex flex-col items-center justify-center relative p-4 md:p-8 space-y-6 pb-24 md:pb-8"
        style={{
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch',
          zIndex: 10
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
          className="text-7xl md:text-9xl font-bold mb-4"
          style={{ fontFamily: "Audiowide", textAlign: 'center' }}
        >
          {winner === currentUser.playerDisplayName ? (
            <div>
              <div className="text-yellow-400 drop-shadow-lg" style={{ textShadow: '0 0 40px rgba(255,215,0,0.8)' }}>
                {winner}
              </div>
              <div className="text-5xl md:text-6xl text-yellow-400 drop-shadow-lg mt-2" style={{ textShadow: '0 0 20px rgba(255,215,0,0.6)', opacity: 0.7 }}>
                WINS!
              </div>
            </div>
          ) : (
            <div>
              <div className="text-red-400 drop-shadow-lg" style={{ textShadow: '0 0 40px rgba(255,0,0,0.8)' }}>
                {winner}
              </div>
              <div className="text-5xl md:text-6xl text-red-400 drop-shadow-lg mt-2" style={{ textShadow: '0 0 20px rgba(255,0,0,0.6)', opacity: 0.7 }}>
                WINS!
              </div>
            </div>
          )}
        </motion.h1>

        {/* Game Over Reason - Hidden on desktop */}
        {reason && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="hidden"
          >
            <p className="text-base md:text-xl text-gray-300">{reason}</p>
          </motion.div>
        )}
      </motion.div>

      {/* Final Scores - Hidden on Mobile and Desktop */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="hidden"
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

      {/* Match Statistics - Collapsible */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="block p-6 md:p-6 bg-black/50 rounded-3xl border-2 border-yellow-500/30 backdrop-blur-lg shadow-2xl w-[90vw] md:w-auto max-w-[800px] md:max-w-none"
            style={{
              marginTop: '-40px' // Move up on y-axis
            }}
          >
          <h3 className="text-lg md:text-xl font-bold text-yellow-400 mb-6 text-center" style={{ fontFamily: "Audiowide", textShadow: "0 0 10px rgba(255, 215, 0, 0.5)" }}>
            MATCH STATISTICS
          </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column - Host Stats */}
          <div className="text-center space-y-4 bg-gradient-to-b from-yellow-500/10 to-transparent p-4 rounded-xl">
            <h4 className="text-base md:text-lg font-bold text-yellow-400 mb-4" style={{ fontFamily: "Audiowide" }}>
              {matchData.hostData.playerDisplayName}
            </h4>
            
            <div className="space-y-4">
              <div className="bg-black/30 p-2 rounded-lg">
                <p className="text-gray-400 text-xs uppercase tracking-wider">Banks</p>
                <p className="text-white font-bold text-2xl">{(() => {
                  console.log('📊 Host matchStats:', matchData.hostData.matchStats);
                  return matchData.hostData.matchStats?.banks || 0;
                })()}</p>
              </div>
              
              <div className="bg-black/30 p-2 rounded-lg">
                <p className="text-gray-400 text-xs uppercase tracking-wider">Doubles</p>
                <p className="text-white font-bold text-2xl">{matchData.hostData.matchStats?.doubles || 0}</p>
              </div>
              
              <div className="bg-black/30 p-2 rounded-lg">
                <p className="text-gray-400 text-xs uppercase tracking-wider">Largest Score</p>
                <p className="text-white font-bold text-2xl">{matchData.hostData.matchStats?.biggestTurnScore || 0}</p>
              </div>
              
              <div className="bg-black/30 p-2 rounded-lg">
                <p className="text-gray-400 text-xs uppercase tracking-wider">TOTAL AURA</p>
                <p className="text-yellow-400 font-bold text-2xl">{matchData.hostData.matchStats?.totalAura || 0}</p>
              </div>
            </div>
          </div>
          
          {/* Center Column - Separator - Hidden on Mobile */}
          <div className="hidden md:flex items-center justify-center">
            <div className="w-px h-full bg-gradient-to-b from-transparent via-yellow-500/50 to-transparent"></div>
          </div>
          
          {/* Right Column - Opponent Stats */}
          <div className="text-center space-y-4 bg-gradient-to-b from-yellow-500/10 to-transparent p-4 rounded-xl">
            <h4 className="text-base md:text-lg font-bold text-yellow-400 mb-4" style={{ fontFamily: "Audiowide" }}>
              {matchData.opponentData.playerDisplayName}
            </h4>
            
            <div className="space-y-4">
              <div className="bg-black/30 p-2 rounded-lg">
                <p className="text-gray-400 text-xs uppercase tracking-wider">Banks</p>
                <p className="text-white font-bold text-2xl">{(() => {
                  console.log('📊 Opponent matchStats:', matchData.opponentData.matchStats);
                  return matchData.opponentData.matchStats?.banks || 0;
                })()}</p>
              </div>
              
              <div className="bg-black/30 p-2 rounded-lg">
                <p className="text-gray-400 text-xs uppercase tracking-wider">Doubles</p>
                <p className="text-white font-bold text-2xl">{matchData.opponentData.matchStats?.doubles || 0}</p>
              </div>
              
              <div className="bg-black/30 p-2 rounded-lg">
                <p className="text-gray-400 text-xs uppercase tracking-wider">Largest Score</p>
                <p className="text-white font-bold text-2xl">{matchData.opponentData.matchStats?.biggestTurnScore || 0}</p>
              </div>
              
              <div className="bg-black/30 p-2 rounded-lg">
                <p className="text-gray-400 text-xs uppercase tracking-wider">TOTAL AURA</p>
                <p className="text-yellow-400 font-bold text-2xl">{matchData.opponentData.matchStats?.totalAura || 0}</p>
              </div>
            </div>
          </div>
        </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Action Buttons - Aligned to bottom on desktop */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
        className="hidden md:flex flex-col md:flex-row justify-center gap-4 md:fixed md:bottom-8 md:left-1/2 md:-translate-x-1/2"
      >
        <button
          onClick={() => setShowStats(!showStats)}
          className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xl font-bold transition-all transform hover:scale-105"
          style={{ fontFamily: "Audiowide" }}
        >
          {showStats ? 'CLOSE STATS' : 'STATS'}
        </button>
        
        <button
          onClick={onLeaveMatch}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xl font-bold transition-all transform hover:scale-105"
          style={{ fontFamily: "Audiowide" }}
        >
          DASHBOARD
        </button>
        
        {/* Simple Rematch Button */}
        {rematchState === 'idle' && (
          <button
            onClick={handleRequestRematch}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xl font-bold transition-all transform hover:scale-105"
            style={{ fontFamily: "Audiowide" }}
          >
            REMATCH
          </button>
        )}
        
        {rematchState === 'sent' && (
          <div className="px-8 py-4 bg-green-600/20 border-2 border-green-400 rounded-xl">
            <span className="text-green-400 font-bold text-xl" style={{ fontFamily: "Audiowide" }}>
              REMATCH SENT ✓
            </span>
          </div>
        )}
      </motion.div>

      {/* Simple message for mobile - rematch will appear in game invitations */}
      {rematchState === 'sent' && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden fixed bottom-32 left-4 right-4 z-40 p-4 bg-green-600/90 border-2 border-green-400 rounded-2xl backdrop-blur-sm"
        >
          <div className="text-center">
            <span className="text-white font-bold text-lg" style={{ fontFamily: "Audiowide" }}>
              REMATCH SENT TO {opponentDisplayName} ✓
            </span>
          </div>
        </motion.div>
      )}

      {/* Mobile Nav-Style Buttons - Fixed at bottom with 2-line layout */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 w-full z-50 backdrop-blur-sm"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Top Row - STATS Button (centered, full width) */}
        <div className="w-full flex items-center justify-center" style={{ height: '60px' }}>
          <button
            onClick={() => setShowStats(!showStats)}
            className="text-white text-xl font-bold transition-all active:scale-95 w-full h-full flex items-center justify-center"
            style={{
              fontFamily: "Audiowide",
              textTransform: "uppercase" as const,
              border: 'none',
              borderRadius: '0px',
              backdropFilter: 'blur(2px)',
            }}
          >
            <span className="text-center">{showStats ? 'CLOSE' : 'STATS'}</span>
          </button>
        </div>

        {/* Bottom Row - DASHBOARD and REMATCH Buttons */}
        <div className="w-full flex flex-row items-stretch" style={{ height: '70px' }}>
          {/* DASHBOARD Button */}
          <button
            onClick={onLeaveMatch}
            className="text-white text-xl font-bold transition-all active:scale-95 flex items-center justify-center"
            style={{
              width: rematchState === 'idle' ? '50%' : '100%',
              height: '100%',
              fontFamily: "Audiowide",
              textTransform: "uppercase" as const,
              border: 'none',
              borderRadius: '0',          
              backdropFilter: 'blur(2px)',
            }}
          >
            <span className="text-center">DASHBOARD</span>
          </button>
          
          {rematchState === 'idle' && (
            <button
              onClick={handleRequestRematch}
              className="text-white text-xl font-bold transition-all active:scale-95 flex items-center justify-center"
              style={{
                width: '50%',
                height: '100%',
                fontFamily: "Audiowide",
                textTransform: "uppercase" as const,
                border: 'none',
                borderRadius: '0',
                backdropFilter: 'blur(2px)',
              }}
            >
              <span className="text-center">REMATCH</span>
            </button>
          )}
        </div>
      </div>

      {/* Game Mode Selector Modal */}
      <GameModeSelector
        isOpen={showGameModeSelector}
        onSelect={handleGameModeSelect}
        onCancel={handleGameModeCancel}
      />
      </div>
    </>
  );
};

export default MatchSummaryScreen;
