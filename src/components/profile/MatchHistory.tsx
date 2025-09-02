'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, Trophy, Target, Users } from 'lucide-react';
import { MatchHistoryService, MatchHistoryEntry } from '@/services/matchHistoryService';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/context/NavigationContext';

// Game mode icon mapping
const getGameModeIcon = (gameType: string): string => {
  const iconMap: { [key: string]: string } = {
    'classic': '/Design Elements/Crown Mode.webp',
    'quickfire': '/Design Elements/Shield.webp',
    'zero-hour': '/Design Elements/time out.webp',
    'last-line': '/Design Elements/skull.webp',
    'blitz': '/Design Elements/Shield.webp',
    'puzzle': '/Design Elements/Crown Mode.webp',
    'survival': '/Design Elements/skull.webp'
  };
  
  return iconMap[gameType.toLowerCase()] || '/Design Elements/Crown Mode.webp';
};

// Match type icon mapping
const getMatchTypeIcon = (matchType: string): string => {
  const iconMap: { [key: string]: string } = {
    'ranked': '/Design Elements/Player Profiles/Ranked.webp',
    'rematch': '/Design Elements/Player Profiles/Remtach.webp',
    'tournament': '/Design Elements/Player Profiles/Tourdement.webp',
    'casual': '/Design Elements/Player Profiles/QuickMatch.webp',
    'friends': '/Design Elements/friends.webp'
  };
  
  return iconMap[matchType.toLowerCase()] || '/Design Elements/Player Profiles/QuickMatch.webp';
};

// Get match type display name
const getMatchTypeDisplayName = (match: any): string => {
  if (match.isFriendMatch) return 'Friends';
  if (match.isRanked) return 'Ranked';
  if (match.isTournament) return 'Tournament';
  if (match.isRematch) return 'Rematch';
  return 'Casual';
};

interface MatchHistoryProps {
  className?: string;
}

export const MatchHistory: React.FC<MatchHistoryProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const { setCurrentSection } = useNavigation();
  const [matches, setMatches] = useState<MatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  // Subscribe to match history
  useEffect(() => {
    if (!user?.uid) {
      console.log('🔒 MatchHistory: No authenticated user, skipping match history subscription');
      setLoading(false);
      return;
    }

    // Additional auth check
    if (typeof user.uid !== 'string' || user.uid.trim() === '') {
      console.warn('⚠️ MatchHistory: Invalid user ID format');
      setLoading(false);
      return;
    }

    console.log('🔄 MatchHistoryService: Subscribing to match history for user:', user.uid);
    setLoading(true);
    
    try {
      const unsubscribe = MatchHistoryService.subscribeToMatchHistory(
        user.uid,
        (matchHistory) => {
          console.log('🎮 MatchHistory: Received match data:', matchHistory.map(m => ({
            id: m.id,
            opponent: m.opponentDisplayName,
            opponentBgFile: m.opponentBackgroundFile,
            opponentBg: m.opponentBackground
          })));
          setMatches(matchHistory);
          setLoading(false);
        }
      );

      return () => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from match history:', error);
        }
      };
    } catch (error) {
      console.error('Error setting up match history subscription:', error);
      setLoading(false);
      setMatches([]);
    }
  }, [user?.uid]);

  const toggleExpanded = (matchId: string) => {
    setExpandedMatch(expandedMatch === matchId ? null : matchId);
  };

  const handleViewProfile = (opponentId: string, opponentName: string) => {
    setCurrentSection('user-profile', { 
      userId: opponentId, 
      userName: opponentName 
    });
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
          onClick={() => toggleExpanded(match.id)}
        >
          {/* Video Background Support */}
          {match.opponentBackgroundFile && match.opponentBackgroundFile.endsWith('.mp4') ? (
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ zIndex: 0 }}
            >
              <source src={match.opponentBackgroundFile} type="video/mp4" />
            </video>
          ) : null}

          {/* Background Image or Fallback */}
          <div 
            className="absolute inset-0"
            style={{
              zIndex: 0,
              background: (() => {
                if (match.opponentBackgroundFile) {
                  // Handle video backgrounds - skip the background image for videos
                  if (match.opponentBackgroundFile.endsWith('.mp4')) {
                    return 'rgba(31, 41, 55, 0.8)';
                  }
                  // Handle image backgrounds with proper path fixing
                  let backgroundPath = match.opponentBackgroundFile;
                  
                  // Fix common background paths (same logic as in other components)
                  if (!backgroundPath.startsWith('/') && !backgroundPath.startsWith('http')) {
                    backgroundPath = `/backgrounds/${backgroundPath}`;
                  }
                  
                  return `linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)), url("${backgroundPath}")`;
                }
                
                // Fallback background
                return 'rgba(31, 41, 55, 0.8)';
              })(),
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />

          {/* Win/Loss Gradient Overlay */}
          <div 
            className={`absolute inset-0 pointer-events-none ${
              match.result === 'won' 
                ? 'bg-gradient-to-r from-green-600/20 via-green-600/10 to-transparent' 
                : 'bg-gradient-to-r from-red-600/20 via-red-600/10 to-transparent'
            }`}
            style={{ zIndex: 1 }}
          ></div>
          
          <div className="relative p-4" style={{ zIndex: 2 }}>
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
                  {match.opponentUserId && match.opponentUserId !== 'unknown' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewProfile(match.opponentUserId, match.opponentDisplayName);
                      }}
                      className="ml-2 px-6 py-2 bg-blue-600/60 hover:bg-blue-700/60 text-white rounded-xl font-audiowide transition-colors"
                    >
                      PROFILE
                    </button>
                  )}
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    {/* Match Stats */}
                    <div className="flex flex-col items-center">
                      <img 
                        src="/Design Elements/Player Profiles/Game Duration.webp" 
                        alt="Duration" 
                        className="w-12 h-12 mb-3" 
                      />
                      <div className="text-xl font-bold text-white font-audiowide mb-1">
                        {match.duration ? MatchHistoryService.formatDuration(match.duration) : '—'}
                      </div>
                      <div className="text-sm text-gray-400 font-montserrat">Duration</div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <img 
                        src={getGameModeIcon(match.gameType)} 
                        alt={match.gameType} 
                        className="w-12 h-12 mb-3" 
                      />
                      <div className="text-xl font-bold text-white font-audiowide mb-1">
                        {match.gameType}
                      </div>
                      <div className="text-sm text-gray-400 font-montserrat">Mode</div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <img 
                        src="/Design Elements/Player Profiles/Your Score.webp" 
                        alt="Your Score" 
                        className="w-12 h-12 mb-3" 
                      />
                      <div className="text-xl font-bold text-white font-audiowide mb-1">
                        {match.playerScore}
                      </div>
                      <div className="text-sm text-gray-400 font-montserrat">Your Score</div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <img 
                        src={getMatchTypeIcon(getMatchTypeDisplayName(match))} 
                        alt="Match Type" 
                        className="w-12 h-12 mb-3" 
                      />
                      <div className="text-xl font-bold text-white font-audiowide mb-1">
                        {getMatchTypeDisplayName(match)}
                      </div>
                      <div className="text-sm text-gray-400 font-montserrat">Match Type</div>
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
      

    </div>
  );
};
