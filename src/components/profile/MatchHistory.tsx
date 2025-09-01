'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, Trophy, Target, Users } from 'lucide-react';
import { MatchHistoryService, MatchHistoryEntry } from '@/services/matchHistoryService';
import { useAuth } from '@/context/AuthContext';

interface MatchHistoryProps {
  className?: string;
}

export const MatchHistory: React.FC<MatchHistoryProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  // Subscribe to match history
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = MatchHistoryService.subscribeToMatchHistory(
      user.uid,
      (matchHistory) => {
        setMatches(matchHistory);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const toggleExpanded = (matchId: string) => {
    setExpandedMatch(expandedMatch === matchId ? null : matchId);
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-gray-600/30 rounded-lg p-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-500/50 rounded w-32"></div>
                <div className="h-3 bg-gray-500/30 rounded w-24"></div>
              </div>
              <div className="h-6 bg-gray-500/50 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-4xl mb-4">🎮</div>
        <p className="text-gray-400 font-montserrat">No matches played yet</p>
        <p className="text-sm text-gray-500 font-montserrat mt-1">
          Your recent games will appear here
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {matches.map((match, index) => (
        <motion.div
          key={match.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="relative overflow-hidden rounded-lg border border-gray-600 cursor-pointer hover:border-gray-500 transition-colors"
          style={{
            background: match.backgroundFile 
              ? `linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)), url(${match.backgroundFile})`
              : 'rgba(31, 41, 55, 0.8)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
          onClick={() => toggleExpanded(match.id)}
        >
          {/* Win/Loss Gradient Overlay */}
          <div 
            className={`absolute inset-0 pointer-events-none ${
              match.result === 'won' 
                ? 'bg-gradient-to-r from-green-600/20 via-green-600/10 to-transparent' 
                : 'bg-gradient-to-r from-red-600/20 via-red-600/10 to-transparent'
            }`}
          ></div>
          
          <div className="relative z-10 p-4">
            <div className="flex items-center justify-between">
              {/* Match Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {/* Result Badge */}
                  <div className={`px-3 py-1 rounded-full text-xs font-bold font-audiowide ${
                    match.result === 'won' 
                      ? 'bg-green-600/80 text-green-100' 
                      : 'bg-red-600/80 text-red-100'
                  }`}>
                    {match.result.toUpperCase()}
                  </div>
                  
                  {/* Game Mode */}
                  <span className="text-xs text-gray-300 font-montserrat">
                    {MatchHistoryService.getGameModeDisplayName(match.gameType)}
                  </span>
                </div>
                
                {/* Opponent */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-gray-300 font-montserrat">vs</span>
                  <span className="text-white font-semibold font-audiowide">
                    {match.opponentDisplayName}
                  </span>
                </div>
                
                {/* Date */}
                <div className="text-xs text-gray-400 font-montserrat">
                  {MatchHistoryService.formatMatchDate(match.completedAt)}
                  {match.duration && (
                    <span className="ml-2">
                      • {MatchHistoryService.formatDuration(match.duration)}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Score and Expand Button */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-lg font-bold font-audiowide text-white">
                    {match.playerScore} - {match.opponentScore}
                  </div>
                  <div className="text-xs text-gray-400 font-montserrat">
                    FINAL SCORE
                  </div>
                </div>
                
                <div className="text-gray-400">
                  {expandedMatch === match.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
            </div>
            
            {/* Expandable Match Details */}
            <AnimatePresence>
              {expandedMatch === match.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 pt-4 border-t border-gray-600 overflow-hidden"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    {/* Match Stats */}
                    <div className="flex flex-col items-center">
                      <Clock className="w-4 h-4 text-blue-400 mb-1" />
                      <div className="text-sm font-bold text-white font-audiowide">
                        {match.duration ? MatchHistoryService.formatDuration(match.duration) : '—'}
                      </div>
                      <div className="text-xs text-gray-400 font-montserrat">Duration</div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <Trophy className="w-4 h-4 text-yellow-400 mb-1" />
                      <div className="text-sm font-bold text-white font-audiowide">
                        {match.gameType}
                      </div>
                      <div className="text-xs text-gray-400 font-montserrat">Mode</div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <Target className="w-4 h-4 text-green-400 mb-1" />
                      <div className="text-sm font-bold text-white font-audiowide">
                        {match.playerScore}
                      </div>
                      <div className="text-xs text-gray-400 font-montserrat">Your Score</div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <Users className="w-4 h-4 text-purple-400 mb-1" />
                      <div className="text-sm font-bold text-white font-audiowide">
                        {match.isFriendMatch ? 'Friend' : 'Public'}
                      </div>
                      <div className="text-xs text-gray-400 font-montserrat">Match Type</div>
                    </div>
                  </div>
                  
                  {/* Additional match details if available */}
                  <div className="mt-4 p-3 bg-black/30 rounded-lg">
                    <div className="text-xs text-gray-300 font-montserrat mb-2">Match Summary:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-gray-400">Result: <span className={`font-bold ${match.result === 'won' ? 'text-green-400' : 'text-red-400'}`}>{match.result.toUpperCase()}</span></div>
                      <div className="text-gray-400">Mode: <span className="text-white">{MatchHistoryService.getGameModeDisplayName(match.gameType)}</span></div>
                      {match.duration && (
                        <div className="text-gray-400">Duration: <span className="text-white">{MatchHistoryService.formatDuration(match.duration)}</span></div>
                      )}
                      <div className="text-gray-400">Type: <span className="text-white">{match.isFriendMatch ? 'Friend Match' : 'Public Match'}</span></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Subtle gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20 pointer-events-none"></div>
        </motion.div>
      ))}
      
      {matches.length >= 10 && (
        <div className="text-center py-2">
          <p className="text-xs text-gray-500 font-montserrat">
            Showing last 10 matches
          </p>
        </div>
      )}
    </div>
  );
};
