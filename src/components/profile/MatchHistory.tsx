'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MatchHistoryService, MatchHistoryEntry } from '@/services/matchHistoryService';
import { useAuth } from '@/context/AuthContext';

interface MatchHistoryProps {
  className?: string;
}

export const MatchHistory: React.FC<MatchHistoryProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

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
          className="relative overflow-hidden rounded-lg border border-gray-600"
          style={{
            background: match.backgroundFile 
              ? `linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)), url(${match.backgroundFile})`
              : 'rgba(31, 41, 55, 0.8)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="p-4">
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
              
              {/* Score */}
              <div className="text-right">
                <div className="text-lg font-bold font-audiowide text-white">
                  {match.playerScore} - {match.opponentScore}
                </div>
                <div className="text-xs text-gray-400 font-montserrat">
                  FINAL SCORE
                </div>
              </div>
            </div>
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
