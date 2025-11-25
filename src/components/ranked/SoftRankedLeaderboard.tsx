'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/context/NavigationContext';
import { BackgroundService } from '@/services/backgroundService';
import { usePlayerCardBackground } from '@/hooks/useOptimizedBackground';

interface PlayerStats {
  uid: string;
  displayName: string;
  matchWins: number;
  matchLosses: number;
  rating: number;
  winPercentage: number;
  totalGames: number;
  rank: number;
  equippedBackground?: string;
}

// Player card component with optimized background
interface PlayerCardProps {
  player: PlayerStats;
  index: number;
  colors: any;
  isCurrentUser: boolean;
  userCardRef?: React.RefObject<HTMLDivElement>;
  handleViewProfile: (uid: string, name: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, index, colors, isCurrentUser, userCardRef, handleViewProfile, isExpanded, onToggleExpand }) => {
  // Get player's background and optimize it
  const playerBackground = player.equippedBackground ? 
    BackgroundService.getBackgroundSafely(player.equippedBackground) : 
    null;
  const { backgroundPath, isVideo } = usePlayerCardBackground(playerBackground);

  return (
    <motion.div
      key={player.uid}
      ref={isCurrentUser ? userCardRef : undefined}
      initial={{ opacity: 0, x: -50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9 }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.05,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{ 
        scale: 1.02, 
        transition: { duration: 0.2 } 
      }}
      onClick={onToggleExpand}
      className={`
        relative bg-gradient-to-r ${colors.bg} 
        rounded-xl border ${colors.border} 
        shadow-lg ${colors.glow}
        ${isCurrentUser ? 'ring-2 ring-blue-500/50' : ''} p-4
        ${player.rank <= 3 ? 'shadow-2xl' : ''}
        group cursor-pointer overflow-hidden
      `}
    >
      {/* Player Background - Optimized */}
      {backgroundPath && (
        <>
          {isVideo ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              webkit-playsinline="true"
              x5-playsinline="true"
              controls={false}
              preload="metadata"
              disablePictureInPicture
              disableRemotePlayback
              className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-100"
              style={{ pointerEvents: 'none' }}
            >
              <source src={backgroundPath} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <div 
              className="absolute inset-0 rounded-xl opacity-100"
              style={{
                backgroundImage: `url('${backgroundPath}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            />
          )}
        </>
      )}

      {/* Black gradient overlay */}
      <div 
        className="absolute inset-0 rounded-xl"
        style={{
          background: 'linear-gradient(to right, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.6) 50%, transparent 100%)'
        }}
      />

      {/* Rest of player card content */}
      <div className="relative z-10 flex items-center justify-between">
        {/* Rank and Player Info */}
        <div className="flex items-center space-x-4">
          {/* Rank Icon/Number */}
          <div 
            className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
              player.rank <= 3 ? 'text-yellow-400' : 'text-white'
            }`}
            style={{ 
              fontFamily: 'Audiowide',
              ...(player.rank <= 3 ? {
                textShadow: "0 0 15px rgba(255, 215, 0, 0.8)"
              } : {})
            }}
          >
            {player.rank <= 3 ? (
              <img 
                src={
                  player.rank === 1 
                    ? "/Leaderboards/CrownLogo.webp?v=2" 
                    : player.rank === 2 
                      ? "/Leaderboards/Second.webp?v=2" 
                      : "/Leaderboards/Third.webp?v=2"
                } 
                alt={`Rank ${player.rank}`} 
                className="w-full h-full object-contain"
                onError={(e) => {
                  console.error(`Failed to load rank ${player.rank} icon`);
                  // Fallback to text
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = `<span class="text-2xl font-bold">${player.rank}</span>`;
                  }
                }}
              />
            ) : (
              `${player.rank}`
            )}
          </div>

          {/* Player Name */}
          <div>
            <h3 
              className={`text-lg font-bold ${player.rank <= 3 ? 'text-yellow-400' : 'text-white'}`}
              style={{ 
                fontFamily: 'Audiowide',
                ...(player.rank <= 3 ? {
                  textShadow: "0 0 10px rgba(255, 215, 0, 0.6)"
                } : {
                  textShadow: "0 2px 4px rgba(0, 0, 0, 0.8)"
                })
              }}
            >
              {player.displayName}
            </h3>
          </div>
        </div>

        {/* Rating on the right */}
        <div className="text-right">
          <p 
            className="text-3xl font-bold text-yellow-400"
            style={{ 
              fontFamily: 'Audiowide',
              textShadow: "0 0 8px rgba(251, 191, 36, 0.5)"
            }}
          >
            {player.rating}
          </p>
        </div>
      </div>

      {/* Expanded Section - Shows Wins, View Profile, Win Rate */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 overflow-hidden"
          >
            <div 
              className="flex items-center justify-between gap-6 mt-4 pt-4 border-t"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}
            >
              {/* Wins */}
              <div className="flex-1 text-center">
                <p 
                  className="text-xl font-bold text-green-400 mb-1"
                  style={{ 
                    fontFamily: 'Audiowide',
                    textShadow: "0 0 12px rgba(74, 222, 128, 0.8)"
                  }}
                >
                  {player.matchWins}
                </p>
                <p 
                  className="text-xs font-bold text-green-300"
                  style={{ 
                    fontFamily: 'Audiowide',
                    letterSpacing: '0.1em'
                  }}
                >
                  W
                </p>
              </div>

              {/* View Profile Text */}
              <motion.div
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewProfile(player.uid, player.displayName || 'Anonymous');
                }}
                className="flex-1 text-center cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <p 
                  className="text-sm font-bold text-gray-300"
                  style={{ 
                    fontFamily: 'Audiowide',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  View Profile
                </p>
              </motion.div>

              {/* Win Rate */}
              <div className="flex-1 text-center">
                <p 
                  className="text-xl font-bold text-blue-400 mb-1"
                  style={{ 
                    fontFamily: 'Audiowide',
                    textShadow: "0 0 12px rgba(96, 165, 250, 0.8)"
                  }}
                >
                  {player.winPercentage.toFixed(0)}%
                </p>
                <p 
                  className="text-xs font-bold text-blue-300"
                  style={{ 
                    fontFamily: 'Audiowide',
                    letterSpacing: '0.1em'
                  }}
                >
                  WR
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export function SoftRankedLeaderboard() {
  const { user } = useAuth();
  const { setCurrentSection } = useNavigation();
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userCardRef = useRef<HTMLDivElement>(null);

  const toggleCardExpanded = (uid: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(uid)) {
        newSet.delete(uid);
      } else {
        newSet.add(uid);
      }
      return newSet;
    });
  };

  // Fetch and calculate player rankings in real-time
  useEffect(() => {
    const fetchPlayerStats = () => {
      console.log('🏆 Fetching soft ranked leaderboard data...');
      
      const usersRef = collection(db, 'users');
      
      // Debug: Check if we can access Firebase at all
      console.log('🔍 Attempting to connect to Firebase users collection...');
      
      const unsubscribe = onSnapshot(usersRef, (snapshot) => {
        try {
          console.log(`🏆 Processing ${snapshot.size} users from Firebase...`);
          const playerStats: PlayerStats[] = [];
          
          snapshot.forEach((doc) => {
            const userData = doc.data();
            
            // Only include real users (not bots) with 5+ games
            const isRealUser = !userData.isBot && userData.displayName;
            
            // Try multiple potential field locations for wins/losses
            const matchWins = userData.stats?.matchWins || 
                            userData.matchWins || 
                            userData.stats?.wins || 
                            userData.wins || 
                            userData.stats?.gamesWon || 0;
            
            const matchLosses = userData.stats?.matchLosses || 
                              userData.matchLosses || 
                              userData.stats?.losses || 
                              userData.losses || 
                              userData.stats?.gamesLost || 0;
            
            const totalGames = matchWins + matchLosses;
            
            // Enhanced debugging
            if (userData.displayName) {
              console.log(`🔍 DEBUG: User ${userData.displayName}:`, {
                isRealUser,
                isBot: userData.isBot,
                matchWins,
                matchLosses,
                totalGames,
                meetsGameRequirement: totalGames >= 5,
                rawUserData: {
                  topLevel: {
                    matchWins: userData.matchWins,
                    matchLosses: userData.matchLosses,
                    wins: userData.wins,
                    losses: userData.losses
                  },
                  stats: userData.stats
                }
              });
            }
            
            if (isRealUser && totalGames >= 1) {
              // Use gamesPlayed from stats for consistency with profile component
              const gamesPlayed = userData.stats?.gamesPlayed || totalGames;
              const winPercentage = gamesPlayed > 0 ? (matchWins / gamesPlayed) * 100 : 0;
              const winRate = gamesPlayed > 0 ? (matchWins / gamesPlayed) : 0;
              const rating = Math.round(matchWins * winPercentage);
              
              // Debug win percentage calculation
              console.log(`📊 Win % calculation for ${userData.displayName}:`, {
                matchWins,
                matchLosses,
                totalGames,
                gamesPlayed,
                calculationCheck: `${matchWins} / ${gamesPlayed} = ${matchWins / gamesPlayed}`,
                winPercentage: winPercentage.toFixed(1) + '%',
                winRate: winRate.toFixed(3),
                ratingFormula: `${matchWins} × ${winPercentage.toFixed(1)} = ${rating}`,
                rating,
                isWinPercentage100: winPercentage === 100
              });
              
              playerStats.push({
                uid: doc.id,
                displayName: userData.displayName,
                matchWins,
                matchLosses,
                rating,
                winPercentage,
                totalGames,
                rank: 0, // Will be set after sorting
                equippedBackground: userData.inventory?.matchBackgroundEquipped?.id || userData.equippedBackground
              });
            }
          });
          
          // Sort by rating (highest first) and assign ranks
          playerStats.sort((a, b) => b.rating - a.rating);
          playerStats.forEach((player, index) => {
            player.rank = index + 1;
          });
          
          console.log(`📊 Final results: ${playerStats.length} players qualified for leaderboard`);
          setPlayers(playerStats);
          
          // Find current user's rank
          if (user) {
            const userPlayer = playerStats.find(p => p.uid === user.uid);
            setUserRank(userPlayer ? userPlayer.rank : null);
            console.log(`👤 Current user rank: ${userPlayer ? userPlayer.rank : 'Not qualified'}`);
          }
          
          setLoading(false);
          console.log(`✅ Soft ranked leaderboard loaded with ${playerStats.length} players`);
        } catch (err) {
          console.error('❌ Error processing leaderboard data:', err);
          setError('Failed to load leaderboard');
          setLoading(false);
        }
      }, (err) => {
        console.error('❌ Error fetching leaderboard:', err);
        setError('Failed to fetch leaderboard data');
        setLoading(false);
      });

      return unsubscribe;
    };

    const unsubscribe = fetchPlayerStats();
    return () => unsubscribe();
  }, [user]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return (
        <img 
          src="/Leaderboards/CrownLogo.webp?v=2" 
          alt="1st Place" 
          className="w-8 h-8 object-contain"
          style={{
            filter: 'drop-shadow(0 2px 8px rgba(255, 215, 0, 0.8))'
          }}
          onError={(e) => {
            console.error('Failed to load 1st place icon');
            e.currentTarget.style.display = 'none';
          }}
        />
      );
      case 2: return (
        <img 
          src="/Leaderboards/Second.webp?v=2" 
          alt="2nd Place" 
          className="w-8 h-8 object-contain"
          style={{
            filter: 'drop-shadow(0 2px 8px rgba(192, 192, 192, 0.8))'
          }}
          onError={(e) => {
            console.error('Failed to load 2nd place icon:', e);
            // Fallback to emoji and then text
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.innerHTML = '<span class="text-xl">🥈</span>';
            }
          }}
        />
      );
      case 3: return (
        <img 
          src="/Leaderboards/Third.webp?v=2" 
          alt="3rd Place" 
          className="w-8 h-8 object-contain"
          style={{
            filter: 'drop-shadow(0 2px 8px rgba(205, 127, 50, 0.8))'
          }}
          onError={(e) => {
            console.error('Failed to load 3rd place icon:', e);
            // Fallback to emoji and then text
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.innerHTML = '<span class="text-xl">🥉</span>';
            }
          }}
        />
      );
      default: return rank.toString();
    }
  };

  const handleViewProfile = (playerId: string, playerName: string) => {
    setCurrentSection('user-profile', { 
      userId: playerId, 
      userName: playerName 
    });
  };

  const scrollToUserPosition = () => {
    if (userCardRef.current && scrollContainerRef.current) {
      userCardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  const getRankColors = (rank: number) => {
    switch (rank) {
      case 1: return {
        bg: 'from-yellow-400/20 via-yellow-300/15 to-amber-400/20',
        border: 'border-yellow-400/50',
        glow: 'shadow-yellow-400/30',
        text: 'text-yellow-400'
      };
      case 2: return {
        bg: 'from-gray-300/20 via-gray-200/15 to-slate-300/20',
        border: 'border-gray-300/50',
        glow: 'shadow-gray-300/30',
        text: 'text-gray-300'
      };
      case 3: return {
        bg: 'from-amber-600/20 via-orange-500/15 to-amber-700/20',
        border: 'border-amber-600/50',
        glow: 'shadow-amber-600/30',
        text: 'text-amber-600'
      };
      default: return {
        bg: 'from-gray-800/20 via-gray-700/15 to-gray-800/20',
        border: 'border-gray-600/20',
        glow: 'shadow-gray-600/10',
        text: 'text-gray-300'
      };
    }
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden" style={{ minHeight: '600px' }}>
        <div className="relative z-10 p-8 text-white">
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center space-y-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full"
              />
              <p className="text-lg text-gray-300" style={{ fontFamily: 'Audiowide' }}>
                Loading Leaderboard...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative overflow-hidden" style={{ minHeight: '400px' }}>
        <div className="relative z-10 p-8 text-white">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg text-red-400 mb-2" style={{ fontFamily: 'Audiowide' }}>
                Error Loading Leaderboard
              </p>
              <p className="text-gray-400">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative pt-8 md:pt-0 -mt-4 md:mt-0 h-full md:h-auto mt-[7vh] md:mt-0"
      style={{
        height: '100%',
        maxHeight: '100%',
        overflow: 'hidden',
        touchAction: 'none',
        overscrollBehavior: 'none'
      }}
    >      
      <div className="relative z-10 text-white h-full flex flex-col">
        {/* Header */}
        <motion.div 
          className="text-center mb-4 md:mb-8 flex-shrink-0"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative inline-block">
            <p 
              className="text-xs md:text-sm text-white/60 mb-1"
              style={{
                fontFamily: "Audiowide",
                textTransform: "uppercase",
                letterSpacing: "0.1em"
              }}
            >
              THE
            </p>
            <h1 
              className="text-3xl md:text-5xl font-bold text-white mb-2 md:mb-4"
              style={{
                fontFamily: "Audiowide",
                textTransform: "uppercase",
                textShadow: "0 0 20px rgba(255, 215, 0, 0.5)"
              }}
            >
              DASHBOARD
            </h1>
          </div>
        </motion.div>
          
        {/* User's rank display */}
        {user && userRank && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-black/80 border border-yellow-400/30 rounded-lg p-3 md:p-4 mb-3 md:mb-4 mx-4 md:mx-6 cursor-pointer hover:bg-black/90 hover:border-yellow-400/50 transition-all duration-200"
            style={{
              boxShadow: "0 0 20px rgba(255, 215, 0, 0.3)"
            }}
            onClick={scrollToUserPosition}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="text-center text-white">
              <div className="text-lg font-bold mb-2" style={{ fontFamily: 'Audiowide' }}>
                YOUR RANK
              </div>
              <div className="flex items-center justify-center space-x-3">
                <span 
                  className="text-3xl font-bold text-yellow-400" 
                  style={{ 
                    fontFamily: 'Audiowide',
                    textShadow: "0 0 15px rgba(255, 215, 0, 0.8)"
                  }}
                >
                  {userRank}
                </span>
                <div className="w-px h-8 bg-yellow-400/50"></div>
                <span 
                  className="text-3xl font-bold text-yellow-400" 
                  style={{ 
                    fontFamily: 'Audiowide',
                    textShadow: "0 0 15px rgba(255, 215, 0, 0.8)"
                  }}
                >
                  TOP {((userRank / players.length) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Leaderboard */}
        <div 
          ref={scrollContainerRef}
          className="px-6 pb-6 space-y-3 flex-1 overflow-y-auto custom-scrollbar" 
          style={{ 
            maxHeight: 'calc(100vh - 250px)',
            touchAction: 'pan-y', // Allow vertical scrolling ONLY in this container
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain', // Stop scroll from bubbling up to parent
            scrollBehavior: 'smooth'
          }}
        >
          <AnimatePresence>
            {players.map((player, index) => {
              const colors = getRankColors(player.rank);
              const isCurrentUser = Boolean(user && player.uid === user.uid);
              
              return (
                <PlayerCard
                  key={player.uid}
                  player={player}
                  index={index}
                  colors={colors}
                  isCurrentUser={isCurrentUser}
                  userCardRef={isCurrentUser ? userCardRef : undefined}
                  handleViewProfile={handleViewProfile}
                  isExpanded={expandedCards.has(player.uid)}
                  onToggleExpand={() => toggleCardExpanded(player.uid)}
                />
              );
            })}
          </AnimatePresence>

          {players.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="text-6xl mb-4">🏆</div>
              <p className="text-xl text-gray-400 mb-2" style={{ fontFamily: 'Audiowide' }}>
                No Ranked Players Yet
              </p>
              <p className="text-sm text-gray-500">
                Play 1 game to appear on the leaderboard!
              </p>
            </motion.div>
          )}
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: transparent;
        }
        .custom-scrollbar {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }
      `}</style>
    </div>
  );
}