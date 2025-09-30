/**
 * Guest Game Waiting Room
 * 
 * Specialized waiting room for guest users that:
 * - Shows 3-second countdown with beautiful UI matching regular waiting room
 * - Automatically matches with bots
 * - No real player interaction
 * - Uses same professional design as GameWaitingRoom
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
  const [searchText, setSearchText] = useState('Finding the perfect opponent...');
  const matchIdRef = useRef<string | undefined>(undefined);
  const hasStartedRef = useRef(false);

  // Game mode configuration matching real waiting room
  const gameModeConfig: Record<string, { name: string; description: string }> = {
    classic: { name: 'Classic', description: 'Traditional dice game' },
    quickfire: { name: 'Quick Fire', description: 'Fast-paced action' },
    'zero-hour': { name: 'Zero Hour', description: 'Time pressure game' },
    elimination: { name: 'Elimination', description: 'Sudden death showdown' },
    'perfect-match': { name: 'Perfect Match', description: 'Precision gameplay' },
    'last-stand': { name: 'Last Stand', description: 'Final battle mode' }
  };

  const currentGameMode = gameModeConfig[gameMode] || gameModeConfig.classic;

  // Animated searching text
  useEffect(() => {
    const texts = [
      'Finding the perfect opponent...',
      'Searching for players...',
      'Almost ready...',
      'Preparing your match...'
    ];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % texts.length;
      setSearchText(texts[index]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="waiting-room-container" style={{ 
      width: '100%', 
      height: '100vh', 
      maxHeight: '100vh',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '0',
      margin: '0',
      background: 'transparent',
      overflow: 'hidden'
    }}>
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover -z-10"
      >
        <source src="/backgrounds/New Day.mp4" type="video/mp4" />
      </video>

      {/* CSS Styles for animations */}
      <style jsx>{`
        @keyframes subtleGlow {
          0% { 
            transform: scale(1);
            filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
            opacity: 0.9;
          }
          50% { 
            transform: scale(1.05);
            filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.6));
            opacity: 1;
          }
          100% { 
            transform: scale(1);
            filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
            opacity: 0.9;
          }
        }
        
        @keyframes buttonPulse {
          0% { 
            transform: translateY(0) scale(1);
            box-shadow: 0 4px 15px rgba(255, 0, 128, 0.3);
          }
          50% { 
            transform: translateY(0) scale(1.02);
            box-shadow: 0 6px 20px rgba(255, 0, 128, 0.5);
          }
          100% { 
            transform: translateY(0) scale(1);
            box-shadow: 0 4px 15px rgba(255, 0, 128, 0.3);
          }
        }
      `}</style>

      {/* Main Content Container */}
      <div
        style={{
          display: 'flex',
          width: '100vw',
          maxWidth: '100vw',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: typeof window !== 'undefined' && window.innerWidth < 768 ? '30px' : '50px',
          background: 'transparent',
          padding: typeof window !== 'undefined' && window.innerWidth < 768 ? '15px' : '20px',
          paddingBottom: typeof window !== 'undefined' && window.innerWidth < 768 ? '100px' : '20px',
          boxSizing: 'border-box'
        }}
      >
        {/* Game Mode Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <h1
            className="text-center"
            style={{
              color: '#E2E2E2',
              fontFamily: 'Audiowide',
              fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '32px' : '64px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: typeof window !== 'undefined' && window.innerWidth < 768 ? '36px' : '72px',
              textTransform: 'uppercase',
              margin: 0,
              textShadow: "0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.4), 0 0 60px rgba(255, 215, 0, 0.2)",
              whiteSpace: typeof window !== 'undefined' && window.innerWidth < 768 ? 'nowrap' : 'normal'
            }}
          >
            {currentGameMode.name}
          </h1>
          
          {/* Game Type Badge */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '10px'
          }}>
            <div style={{
              backgroundColor: 'rgba(255, 165, 0, 0.2)',
              border: '2px solid #FFA500',
              borderRadius: '20px',
              padding: '8px 16px',
              color: '#FFA500',
              fontFamily: 'Audiowide',
              fontSize: '14px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🤖 Bot Match
            </div>
          </div>
        </div>

        {/* VS Section with Status */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: typeof window !== 'undefined' && window.innerWidth < 768 ? '20px' : '30px'
          }}
        >
          <div
            style={{
              color: '#E2E2E2',
              fontFamily: 'Audiowide',
              fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '32px' : '48px',
              fontWeight: 400,
              textShadow: '0 0 20px rgba(255, 255, 255, 0.3)'
            }}
          >
            GUEST VS BOT
          </div>
          
          {/* Status Text */}
          <div style={{
            textAlign: 'center',
            color: '#E2E2E2',
            fontFamily: 'Audiowide',
            fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '14px' : '18px',
            opacity: 0.8
          }}>
            {status === 'matched' ? 'Match Found!' : searchText}
          </div>
          
          {/* Countdown */}
          {countdown > 0 && (
            <motion.div
              style={{
                color: '#00FF00',
                fontFamily: 'Audiowide',
                fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '48px' : '72px',
                fontWeight: 400,
                textShadow: '0 0 30px rgba(0, 255, 0, 0.8)'
              }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {countdown}
            </motion.div>
          )}
          
          {/* Entering Arena Status */}
          {countdown === 0 && (
            <motion.div
              style={{
                color: '#FFD700',
                fontFamily: 'Audiowide',
                fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '24px' : '32px',
                fontWeight: 400,
                textShadow: '0 0 30px rgba(255, 215, 0, 0.8)',
                textAlign: 'center'
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ENTERING ARENA...
              <br />
              <span style={{ fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '16px' : '20px', opacity: 0.8 }}>
                PREPARING YOUR MATCH
              </span>
            </motion.div>
          )}
        </div>

        {/* Leave Game Button */}
        <div
          style={{
            position: 'fixed',
            bottom: typeof window !== 'undefined' && window.innerWidth < 768 ? '30px' : '50px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000
          }}
        >
          <button
            onClick={handleCancel}
            style={{
              padding: typeof window !== 'undefined' && window.innerWidth < 768 ? '15px 30px' : '20px 40px',
              borderRadius: '50px',
              background: '#FF0080',
              border: 'none',
              color: '#FFF',
              fontFamily: 'Audiowide',
              fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '14px' : '16px',
              fontWeight: 400,
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              animation: 'buttonPulse 2s infinite',
              boxShadow: '0 4px 15px rgba(255, 0, 128, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 25px rgba(255, 0, 128, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 0, 128, 0.3)';
            }}
          >
            Leave Game
          </button>
        </div>
      </div>
    </div>
  );
};