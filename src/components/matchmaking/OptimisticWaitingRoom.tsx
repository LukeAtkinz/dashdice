import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface OptimisticWaitingRoomProps {
  gameMode: string;
  onMatchFound: (matchId: string) => void;
  onCancel: () => void;
}

export const OptimisticWaitingRoom: React.FC<OptimisticWaitingRoomProps> = ({
  gameMode,
  onMatchFound,
  onCancel
}) => {
  const [status, setStatus] = useState<'searching' | 'creating' | 'waiting' | 'found'>('searching');
  const [waitTime, setWaitTime] = useState(0);
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (status === 'waiting' || status === 'searching') {
      interval = setInterval(() => {
        setWaitTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  useEffect(() => {
    // Auto-start the matchmaking flow
    startMatchmaking();
  }, []);

  const startMatchmaking = async () => {
    try {
      setStatus('searching');
      setWaitTime(0);
      
      // Step 1: Search for existing matches
      console.log('🔍 Searching for existing matches...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Show searching state
      
      const searchResponse = await fetch(`/api/proxy/matches?status=waiting&limit=10&game_mode=${gameMode}`);
      
      if (searchResponse.ok) {
        const matches = await searchResponse.json();
        if (matches && matches.length > 0) {
          // Found existing match - join it
          const match = matches[0];
          console.log('✅ Found existing match:', match.id);
          setStatus('found');
          setTimeout(() => onMatchFound(match.id), 1000);
          return;
        }
      }
      
      // Step 2: No existing matches, create new room
      console.log('🆕 Creating new waiting room...');
      setStatus('creating');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const createResponse = await fetch('/api/proxy/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameMode,
          status: 'waiting',
          maxPlayers: 2
        })
      });
      
      if (createResponse.ok) {
        const room = await createResponse.json();
        console.log('✅ Created waiting room:', room.id);
        setRoomId(room.id);
        setStatus('waiting');
        
        // Start polling for other players
        pollForPlayers(room.id);
        
        // Schedule bot join after 30 seconds
        setTimeout(() => {
          if (status === 'waiting') {
            joinBot(room.id);
          }
        }, 30000);
      }
      
    } catch (error) {
      console.error('❌ Matchmaking error:', error);
      // On error, still show waiting room (optimistic)
      setStatus('waiting');
      setRoomId('temp-' + Date.now());
    }
  };

  const pollForPlayers = async (matchId: string) => {
    // Poll every 2 seconds to check if someone joined
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/proxy/matches/${matchId}`);
        if (response.ok) {
          const match = await response.json();
          if (match.players && match.players.length >= 2) {
            clearInterval(pollInterval);
            setStatus('found');
            setTimeout(() => onMatchFound(matchId), 1000);
          }
        }
      } catch (error) {
        console.log('Polling error (expected if backend unavailable):', error);
      }
    }, 2000);

    // Clean up polling after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000);
  };

  const joinBot = async (matchId: string) => {
    try {
      console.log('🤖 30 seconds elapsed, joining bot...');
      // This would trigger bot join logic
      const botResponse = await fetch(`/api/proxy/matches/${matchId}/join-bot`, {
        method: 'POST'
      });
      
      if (botResponse.ok) {
        setStatus('found');
        setTimeout(() => onMatchFound(matchId), 1000);
      }
    } catch (error) {
      console.log('Bot join error (expected if backend unavailable):', error);
      // Even if bot join fails, show match found for optimistic UX
      setStatus('found');
      setTimeout(() => onMatchFound(matchId), 1000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'searching':
        return 'Searching for opponents...';
      case 'creating':
        return 'Creating your room...';
      case 'waiting':
        return 'Waiting for opponent...';
      case 'found':
        return 'Match found! Starting game...';
      default:
        return 'Connecting...';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'searching':
        return '🔍';
      case 'creating':
        return '🏗️';
      case 'waiting':
        return '⏳';
      case 'found':
        return '🎉';
      default:
        return '🎲';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-2xl border border-gray-700 max-w-md w-full mx-4"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: status === 'searching' || status === 'creating' ? 360 : 0 }}
            transition={{ duration: 2, repeat: status === 'searching' || status === 'creating' ? Infinity : 0, ease: "linear" }}
            className="text-6xl mb-4"
          >
            {getStatusIcon()}
          </motion.div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            {gameMode.charAt(0).toUpperCase() + gameMode.slice(1)} Match
          </h2>
          
          <p className="text-gray-300 mb-4">
            {getStatusMessage()}
          </p>
          
          {status === 'waiting' && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <div className="text-yellow-400 font-bold text-lg">
                {formatTime(waitTime)}
              </div>
              <div className="text-gray-400 text-sm">
                Bot joins in {Math.max(0, 30 - waitTime)}s
              </div>
              {roomId && (
                <div className="text-gray-500 text-xs mt-2">
                  Room: {roomId.slice(-8)}
                </div>
              )}
            </div>
          )}
          
          {status === 'found' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-green-800 rounded-lg p-4 mb-4"
            >
              <div className="text-green-300 font-bold">
                Opponent Found!
              </div>
              <div className="text-green-400 text-sm">
                Starting match...
              </div>
            </motion.div>
          )}
          
          <button
            onClick={onCancel}
            disabled={status === 'found'}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
};