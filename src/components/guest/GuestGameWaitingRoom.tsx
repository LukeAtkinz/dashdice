/**
 * Guest Game Waiting Room
 * 
 * Specialized waiting room for guest users that:
 * - Shows 3-second countdown
 * - Automatically matches with bots
 * - No real player interaction
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigation } from '@/context/NavigationContext';
import { guestBotMatchmaking, GuestMatchData } from '@/services/guestBotMatchmaking';

interface GuestGameWaitingRoomProps {
  gameMode: string;
  guestId: string;
  onMatchFound: (matchData: GuestMatchData) => void;
  onCancel: () => void;
}

export const GuestGameWaitingRoom: React.FC<GuestGameWaitingRoomProps> = ({
  gameMode,
  guestId,
  onMatchFound,
  onCancel
}) => {
  const [countdown, setCountdown] = useState(3);
  const [status, setStatus] = useState<'searching' | 'matched'>('searching');
  const matchIdRef = useRef<string | undefined>(undefined);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    let countdownInterval: NodeJS.Timeout;

    const startMatchmaking = async () => {
      try {
        console.log(`🎯 Starting guest matchmaking for ${gameMode}`);
        
        const newMatchId = await guestBotMatchmaking.startGuestMatchmaking(
          guestId,
          gameMode,
          (matchData) => {
            console.log('🤖 Guest match found!', matchData);
            setStatus('matched');
            onMatchFound(matchData);
          }
        );
        
        matchIdRef.current = newMatchId;
        
        // Start countdown
        countdownInterval = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
      } catch (error) {
        console.error('Error starting guest matchmaking:', error);
        onCancel();
      }
    };

    startMatchmaking();

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
      if (matchIdRef.current) {
        guestBotMatchmaking.cancelGuestMatchmaking(guestId);
      }
    };
  }, [gameMode, guestId, onMatchFound, onCancel]);

  const handleCancel = () => {
    if (matchIdRef.current) {
      guestBotMatchmaking.cancelGuestMatchmaking(guestId);
    }
    onCancel();
  };

  const getGameModeIcon = (mode: string) => {
    const icons: Record<string, string> = {
      'classic': '/Design Elements/Crown Mode.webp',
      'quickfire': '/Design Elements/Shield.webp',
      'zero-hour': '/Design Elements/time out.webp',
      'elimination': '/Design Elements/Cross.webp',
      'perfect-match': '/Design Elements/Target.webp',
      'last-stand': '/Design Elements/Sword.webp'
    };
    return icons[mode] || '/Design Elements/Crown Mode.webp';
  };

  const getGameModeName = (mode: string) => {
    const names: Record<string, string> = {
      'classic': 'CLASSIC MODE',
      'quickfire': 'QUICK FIRE',
      'zero-hour': 'ZERO HOUR',
      'elimination': 'ELIMINATION',
      'perfect-match': 'PERFECT MATCH',
      'last-stand': 'LAST STAND'
    };
    return names[mode] || mode.toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover"
      >
        <source src="/backgrounds/New Day.mp4" type="video/mp4" />
      </video>
      
      {/* Dark Overlay */}
      <div className="fixed inset-0 bg-black/70" />
      
      {/* Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-2xl mx-auto p-8"
      >
        <div 
          className="backdrop-blur-lg rounded-3xl p-12 border border-white/20 shadow-2xl text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 100%)',
            backdropFilter: 'blur(20px)'
          }}
        >
          {/* Game Mode Header */}
          <div className="flex items-center justify-center mb-8">
            <img 
              src={getGameModeIcon(gameMode)} 
              alt={gameMode}
              className="w-16 h-16 mr-4"
            />
            <h1 
              className="text-4xl md:text-5xl text-white"
              style={{ fontFamily: 'Audiowide' }}
            >
              {getGameModeName(gameMode)}
            </h1>
          </div>
          
          {status === 'searching' ? (
            <>
              {/* Searching Status */}
              <div className="mb-8">
                <h2 
                  className="text-2xl text-white/90 mb-4"
                  style={{ fontFamily: 'Audiowide' }}
                >
                  FINDING BOT OPPONENT
                </h2>
                <p className="text-white/70 text-lg">
                  Matching you with a skilled bot player...
                </p>
              </div>
              
              {/* Countdown */}
              <div className="mb-8">
                <motion.div
                  key={countdown}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-8xl font-bold text-yellow-400 mb-4"
                  style={{ fontFamily: 'Audiowide' }}
                >
                  {countdown}
                </motion.div>
                <p className="text-white/80">
                  {countdown > 0 ? 'Searching...' : 'Match Found!'}
                </p>
              </div>
              
              {/* Loading Animation */}
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-yellow-400/30 rounded-full animate-spin">
                    <div className="absolute top-0 left-0 w-4 h-4 bg-yellow-400 rounded-full"></div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Match Found */}
              <div className="mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-6xl mb-4"
                >
                  🤖
                </motion.div>
                <h2 
                  className="text-3xl text-green-400 mb-4"
                  style={{ fontFamily: 'Audiowide' }}
                >
                  BOT OPPONENT FOUND!
                </h2>
                <p className="text-white/80 text-lg">
                  Preparing your match...
                </p>
              </div>
            </>
          )}
          
          {/* Cancel Button */}
          <button
            onClick={handleCancel}
            className="px-8 py-3 bg-red-600/80 hover:bg-red-600 text-white font-bold rounded-xl transition-all backdrop-blur-sm"
            style={{ fontFamily: 'Audiowide' }}
          >
            CANCEL
          </button>
          
          {/* Guest Info */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <div className="flex items-center justify-center gap-2 text-white/60">
              <span>👤</span>
              <span style={{ fontFamily: 'Audiowide' }}>GUEST MODE</span>
              <span>•</span>
              <span>Playing vs Bots</span>
              <span>•</span>
              <span>No Data Saved</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};