'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Target, Users, Clock, Star, Trophy, Gamepad2, TrendingUp } from 'lucide-react';
import { AdvancedMatchmakingIntegration, AdvancedMatchmakingOptions, MatchmakingResult } from '../../services/advancedMatchmakingIntegration';
import { SessionPlayerData } from '../../services/gameSessionService';
import { useAuth } from '@/context/AuthContext';

interface AdvancedMatchmakingProps {
  userId: string;
  userDisplayName: string;
  compactMode?: boolean;
}

export function AdvancedMatchmaking({ userId, userDisplayName, compactMode = false }: AdvancedMatchmakingProps) {
  const [isMatching, setIsMatching] = useState(false);
  const [matchmakingStatus, setMatchmakingStatus] = useState<string>('');
  const [selectedGameMode, setSelectedGameMode] = useState('classic');
  const [selectedMatchType, setSelectedMatchType] = useState<'quick' | 'skill-based' | 'queue' | 'tournament'>('quick');
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<number>(0);
  const [skillRating, setSkillRating] = useState<number | undefined>();
  const { user } = useAuth();

  const gameModes = [
    { id: 'classic', name: 'Classic', icon: <Target className="w-4 h-4" />, description: 'Traditional dice rolling' },
    { id: 'quickfire', name: 'Quick Fire', icon: <Zap className="w-4 h-4" />, description: 'Fast-paced matches' },
    { id: 'zero-hour', name: 'Zero Hour', icon: <Clock className="w-4 h-4" />, description: 'Time pressure mode' },
    { id: 'last-line', name: 'Last Line', icon: <Trophy className="w-4 h-4" />, description: 'Elimination style' }
  ];

  const matchTypes = [
    { 
      id: 'quick' as const, 
      name: 'Quick Match', 
      icon: <Gamepad2 className="w-4 h-4" />, 
      description: 'Find a match instantly',
      estimatedTime: '< 30s'
    },
    { 
      id: 'skill-based' as const, 
      name: 'Skill Match', 
      icon: <TrendingUp className="w-4 h-4" />, 
      description: 'Match with similar skill level',
      estimatedTime: '1-2 min'
    },
    { 
      id: 'queue' as const, 
      name: 'Ranked Queue', 
      icon: <Star className="w-4 h-4" />, 
      description: 'Priority-based matching',
      estimatedTime: '2-5 min'
    },
    { 
      id: 'tournament' as const, 
      name: 'Tournament', 
      icon: <Trophy className="w-4 h-4" />, 
      description: 'Competitive tournaments',
      estimatedTime: 'Varies'
    }
  ];

  useEffect(() => {
    // Get player status on component mount
    const getPlayerStatus = async () => {
      try {
        const status = await AdvancedMatchmakingIntegration.getPlayerStatus(userId);
        setSkillRating(status.skillRating);
        if (status.inQueue) {
          setMatchmakingStatus(`In queue (position ${status.queuePosition})`);
          setEstimatedWaitTime(status.estimatedWaitTime || 0);
        }
      } catch (error) {
        console.error('Error getting player status:', error);
      }
    };

    getPlayerStatus();
  }, [userId]);

  const handleStartMatchmaking = async () => {
    if (!user) {
      setMatchmakingStatus('Please sign in to play');
      return;
    }

    setIsMatching(true);
    setMatchmakingStatus('Initializing matchmaking...');

    try {
      const playerData: SessionPlayerData = {
        playerId: userId,
        playerDisplayName: userDisplayName,
        playerStats: {
          gamesPlayed: 0,
          matchWins: 0,
          currentStreak: 0,
          bestStreak: 0
        },
        displayBackgroundEquipped: {
          name: 'Default',
          file: '/backgrounds/Relax.png',
          type: 'image'
        },
        matchBackgroundEquipped: {
          name: 'Default',
          file: '/backgrounds/Relax.png',
          type: 'image'
        },
        ready: false
      };

      const options: AdvancedMatchmakingOptions = {
        useSkillBasedMatching: selectedMatchType === 'skill-based',
        usePriorityQueue: selectedMatchType === 'queue',
        tournamentMode: selectedMatchType === 'tournament',
        preferredGameMode: selectedGameMode,
        maxWaitTime: 300000, // 5 minutes
        skillRange: 200
      };

      setMatchmakingStatus('Finding opponents...');
      
      const result: MatchmakingResult = await AdvancedMatchmakingIntegration.findMatch(playerData, options);

      if (result.success && result.sessionId) {
        setMatchmakingStatus('Match found! Starting game...');
        
        // Redirect to game session
        setTimeout(() => {
          window.location.href = `/game/${result.sessionId}`;
        }, 1500);
      } else {
        setMatchmakingStatus(result.error || 'Matchmaking failed');
        if (result.matchType === 'queue') {
          // Player added to queue, show status
          const checkStatus = async () => {
            const status = await AdvancedMatchmakingIntegration.getPlayerStatus(userId);
            if (status.inQueue) {
              setMatchmakingStatus(`In queue (position ${status.queuePosition || 'unknown'})`);
              setEstimatedWaitTime(status.estimatedWaitTime || 0);
            }
          };
          
          checkStatus();
        }
      }
    } catch (error: any) {
      console.error('Matchmaking error:', error);
      setMatchmakingStatus(`Error: ${error.message || 'Unknown error'}`);
    } finally {
      setIsMatching(false);
    }
  };

  const handleCancelMatchmaking = async () => {
    try {
      await AdvancedMatchmakingIntegration.cancelMatchmaking(userId);
      setMatchmakingStatus('');
      setIsMatching(false);
      setEstimatedWaitTime(0);
    } catch (error) {
      console.error('Error cancelling matchmaking:', error);
    }
  };

  if (compactMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold text-blue-400">Quick Match</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {gameModes.slice(0, 4).map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSelectedGameMode(mode.id)}
              className={`p-2 rounded-lg border transition-all ${
                selectedGameMode === mode.id
                  ? 'bg-blue-600 border-blue-400 text-white'
                  : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {mode.icon}
                <span className="text-sm font-bold">{mode.name}</span>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={isMatching ? handleCancelMatchmaking : handleStartMatchmaking}
          disabled={!user}
          className={`w-full py-3 rounded-lg font-bold transition-all ${
            isMatching
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isMatching ? 'Cancel Search' : 'Find Match'}
        </button>

        {matchmakingStatus && (
          <div className="text-center text-sm text-gray-300">
            {matchmakingStatus}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Target className="w-8 h-8 text-blue-400" />
        <h2 className="text-2xl font-bold text-blue-400">Advanced Matchmaking</h2>
        {skillRating && (
          <div className="ml-auto text-sm text-gray-300">
            Skill Rating: <span className="font-bold text-yellow-400">{skillRating}</span>
          </div>
        )}
      </div>

      {/* Match Type Selection */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Match Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {matchTypes.map((type) => (
            <motion.button
              key={type.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedMatchType(type.id)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedMatchType === type.id
                  ? 'bg-blue-600/20 border-blue-400 text-white'
                  : 'bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <div className="flex flex-col items-center text-center gap-2">
                {type.icon}
                <span className="font-bold text-sm">{type.name}</span>
                <span className="text-xs text-gray-400">{type.description}</span>
                <span className="text-xs text-yellow-400">{type.estimatedTime}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Game Mode Selection */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Game Mode</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {gameModes.map((mode) => (
            <motion.button
              key={mode.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedGameMode(mode.id)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedGameMode === mode.id
                  ? 'bg-purple-600/20 border-purple-400 text-white'
                  : 'bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <div className="flex flex-col items-center text-center gap-2">
                {mode.icon}
                <span className="font-bold text-sm">{mode.name}</span>
                <span className="text-xs text-gray-400">{mode.description}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Matchmaking Controls */}
      <div className="bg-gray-800/30 border border-gray-600 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Ready to Play?</h3>
            <p className="text-gray-400">
              {selectedMatchType === 'quick' && 'Find an opponent instantly'}
              {selectedMatchType === 'skill-based' && 'Match with players of similar skill'}
              {selectedMatchType === 'queue' && 'Join the priority matchmaking queue'}
              {selectedMatchType === 'tournament' && 'Compete in organized tournaments'}
            </p>
          </div>
          {estimatedWaitTime > 0 && (
            <div className="text-center">
              <div className="text-sm text-gray-400">Estimated Wait</div>
              <div className="text-lg font-bold text-yellow-400">
                {Math.ceil(estimatedWaitTime / 1000)}s
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={isMatching ? handleCancelMatchmaking : handleStartMatchmaking}
            disabled={!user}
            className={`flex-1 py-4 rounded-lg font-bold text-lg transition-all ${
              isMatching
                ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isMatching ? 'Cancel Search' : `Start ${selectedMatchType.replace('-', ' ')} Match`}
          </button>
          
          {selectedMatchType === 'queue' && (
            <button
              onClick={() => {
                // Show queue statistics or status
                console.log('Show queue info');
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Queue Info
            </button>
          )}
        </div>

        {matchmakingStatus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg"
          >
            <div className="flex items-center gap-2">
              {isMatching && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>}
              <span className="text-blue-300">{matchmakingStatus}</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
