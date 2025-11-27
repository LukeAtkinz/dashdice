'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { useFriends } from '@/context/FriendsContext';
import { resolveBackgroundPath, getVictoryBackgrounds } from '@/config/backgrounds';
import { Clock, Trophy, Users } from 'lucide-react';

interface SocialLeaguePlayer {
  uid: string;
  displayName: string;
  wins: number;
  rank: number;
  equippedBackground?: string;
}

export default function SocialLeagueLeaderboard() {
  const { user } = useAuth();
  const { friends, getFriendsWithPresence } = useFriends();
  const [leaderboardData, setLeaderboardData] = useState<SocialLeaguePlayer[]>([]);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Calculate if Social League is active (6:00 PM - 6:15 PM daily)
  const checkLeagueStatus = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Active from 18:00 to 18:15 (6:00 PM to 6:15 PM)
    const isCurrentlyActive = hour === 18 && minute < 15;
    setIsActive(isCurrentlyActive);
    
    // Calculate time remaining
    if (isCurrentlyActive) {
      const endTime = new Date();
      endTime.setHours(18, 15, 0, 0);
      const diffMs = endTime.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      setTimeRemaining(`${diffMins}:${diffSecs.toString().padStart(2, '0')}`);
    } else {
      // Calculate time until next 6:00 PM
      const nextLeague = new Date();
      if (hour >= 18) {
        nextLeague.setDate(nextLeague.getDate() + 1);
      }
      nextLeague.setHours(18, 0, 0, 0);
      const diffMs = nextLeague.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / 3600000);
      const diffMins = Math.floor((diffMs % 3600000) / 60000);
      setTimeRemaining(`${diffHours}h ${diffMins}m`);
    }
  };

  // Update timer every second
  useEffect(() => {
    checkLeagueStatus();
    const interval = setInterval(checkLeagueStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  // Get today's date string for querying
  const getTodayDateString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  };

  // Load Social League data
  useEffect(() => {
    if (!user) return;

    const loadLeaderboard = async () => {
      try {
        setLoading(true);
        const friendsWithPresence = getFriendsWithPresence?.() || [];
        const friendIds = friendsWithPresence.map(f => f.id);
        
        if (friendIds.length === 0) {
          setLeaderboardData([]);
          setLoading(false);
          return;
        }

        // Add current user
        if (!friendIds.includes(user.uid)) {
          friendIds.push(user.uid);
        }

        // Query social league stats for today
        const todayDate = getTodayDateString();
        const statsQuery = query(
          collection(db, 'socialLeagueStats'),
          where('date', '==', todayDate),
          where('uid', 'in', friendIds.slice(0, 10)) // Firestore 'in' limit
        );

        const snapshot = await getDocs(statsQuery);
        const stats = snapshot.docs.map(doc => ({
          uid: doc.data().uid,
          displayName: doc.data().displayName,
          wins: doc.data().wins || 0,
          equippedBackground: doc.data().equippedBackground
        }));

        // Add friends who haven't played today
        const playersMap = new Map(stats.map(s => [s.uid, s]));
        friendsWithPresence.forEach(friend => {
          if (!playersMap.has(friend.id)) {
            playersMap.set(friend.id, {
              uid: friend.id,
              displayName: friend.friendData?.displayName || 'Unknown',
              wins: 0,
              equippedBackground: friend.friendData?.equippedBackground
            });
          }
        });

        // Add current user if not present
        if (!playersMap.has(user.uid)) {
          playersMap.set(user.uid, {
            uid: user.uid,
            displayName: user.displayName || 'You',
            wins: 0,
            equippedBackground: undefined
          });
        }

        // Sort by wins and assign ranks
        const sortedPlayers = Array.from(playersMap.values())
          .sort((a, b) => b.wins - a.wins)
          .map((player, index) => ({
            ...player,
            rank: index + 1
          }));

        setLeaderboardData(sortedPlayers);
      } catch (error) {
        console.error('Error loading Social League leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
    
    // Set up real-time listener
    const todayDate = getTodayDateString();
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'socialLeagueStats'),
        where('date', '==', todayDate)
      ),
      () => {
        loadLeaderboard();
      }
    );

    return () => unsubscribe();
  }, [user, friends]);

  // Get random victory background
  const victoryBackground = useMemo(() => {
    const victoryBgs = getVictoryBackgrounds();
    const randomBg = victoryBgs[Math.floor(Math.random() * victoryBgs.length)];
    const resolved = resolveBackgroundPath(randomBg.id, 'victory-screen');
    return resolved;
  }, []);

  const getRankColors = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bg: 'from-yellow-900/40 to-yellow-800/30',
          border: 'border-yellow-500/50',
          glow: 'shadow-yellow-500/20'
        };
      case 2:
        return {
          bg: 'from-gray-400/40 to-gray-500/30',
          border: 'border-gray-400/50',
          glow: 'shadow-gray-400/20'
        };
      case 3:
        return {
          bg: 'from-orange-900/40 to-orange-800/30',
          border: 'border-orange-600/50',
          glow: 'shadow-orange-600/20'
        };
      default:
        return {
          bg: 'from-gray-800/40 to-gray-900/30',
          border: 'border-gray-600/30',
          glow: ''
        };
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with Victory Video */}
      <div className="mb-6">
        {/* Victory Video Container */}
        <div className="relative rounded-xl overflow-hidden mb-4" style={{ height: '200px' }}>
          {victoryBackground?.type === 'video' ? (
            <video
              key={victoryBackground.path}
              autoPlay
              loop
              muted
              playsInline
              controls={false}
              className="w-full h-full object-cover"
              src={victoryBackground.path}
            />
          ) : (
            <div 
              className="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900"
              style={{
                backgroundImage: victoryBackground?.path ? `url(${victoryBackground.path})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          )}
          {/* Overlay with Title */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center justify-end p-4">
            <h2 
              className="text-3xl font-bold text-white mb-2"
              style={{
                fontFamily: 'Audiowide',
                textTransform: 'uppercase',
                textShadow: '0 0 20px rgba(255, 215, 0, 0.5)'
              }}
            >
              Social League
            </h2>
          </div>
        </div>

        {/* Timer and Status */}
        <motion.div 
          className={`flex items-center justify-center gap-3 p-3 rounded-lg ${
            isActive ? 'bg-green-500/20 border border-green-500/50' : 'bg-gray-800/50 border border-gray-600/30'
          }`}
          animate={isActive ? {
            boxShadow: [
              '0 0 10px rgba(34, 197, 94, 0.3)',
              '0 0 20px rgba(34, 197, 94, 0.5)',
              '0 0 10px rgba(34, 197, 94, 0.3)'
            ]
          } : {}}
          transition={isActive ? {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          } : {}}
        >
          <Clock className={`w-5 h-5 ${isActive ? 'text-green-400' : 'text-gray-400'}`} />
          <div className="text-center">
            <p 
              className={`text-sm font-semibold ${isActive ? 'text-green-400' : 'text-gray-400'}`}
              style={{ fontFamily: 'Audiowide', textTransform: 'uppercase' }}
            >
              {isActive ? 'Active Now' : 'Next League In'}
            </p>
            <p 
              className={`text-2xl font-bold ${isActive ? 'text-white' : 'text-gray-300'}`}
              style={{ fontFamily: 'Orbitron' }}
            >
              {timeRemaining}
            </p>
          </div>
          {isActive && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Trophy className="w-5 h-5 text-green-400" />
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Leaderboard */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-2 animate-pulse" />
              <p className="text-gray-400" style={{ fontFamily: 'Audiowide' }}>Loading...</p>
            </div>
          </div>
        ) : leaderboardData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400" style={{ fontFamily: 'Audiowide' }}>No friends to compete with</p>
              <p className="text-gray-500 text-sm mt-2" style={{ fontFamily: 'Montserrat' }}>
                Add friends to join the Social League!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {leaderboardData.map((player, index) => {
                const colors = getRankColors(player.rank);
                const isCurrentUser = player.uid === user?.uid;
                const resolved = player.equippedBackground ? 
                  resolveBackgroundPath(player.equippedBackground, 'leaderboard-card') : null;

                return (
                  <motion.div
                    key={player.uid}
                    initial={{ opacity: 0, x: -50, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 50, scale: 0.9 }}
                    transition={{ 
                      duration: 0.3, 
                      delay: index * 0.05
                    }}
                    whileHover={{ scale: 1.02 }}
                    className={`
                      relative bg-gradient-to-r ${colors.bg} 
                      rounded-xl border ${colors.border} 
                      shadow-lg ${colors.glow}
                      ${isCurrentUser ? 'ring-2 ring-blue-500/50' : ''} 
                      p-4 overflow-hidden
                    `}
                  >
                    {/* Background */}
                    {resolved && (
                      <>
                        {resolved.type === 'video' ? (
                          <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-100"
                            style={{ pointerEvents: 'none' }}
                          >
                            <source src={resolved.path} type="video/mp4" />
                          </video>
                        ) : (
                          <div 
                            className="absolute inset-0 rounded-xl opacity-100"
                            style={{
                              backgroundImage: `url('${resolved.path}')`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}
                          />
                        )}
                      </>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-black/85 via-black/60 to-transparent" />

                    {/* Content */}
                    <div className="relative z-10 flex items-center justify-between">
                      {/* Rank and Name */}
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold ${
                            player.rank <= 3 ? 'text-yellow-400' : 'text-white'
                          }`}
                          style={{ fontFamily: 'Audiowide' }}
                        >
                          {player.rank <= 3 ? (
                            <img 
                              src={
                                player.rank === 1 
                                  ? "/Leaderboards/CrownLogo.webp" 
                                  : player.rank === 2 
                                    ? "/Leaderboards/Second.webp" 
                                    : "/Leaderboards/Third.webp"
                              } 
                              alt={`Rank ${player.rank}`} 
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            `#${player.rank}`
                          )}
                        </div>
                        
                        <div>
                          <p 
                            className="text-white font-semibold text-lg"
                            style={{ fontFamily: 'Audiowide' }}
                          >
                            {player.displayName}
                          </p>
                          {isCurrentUser && (
                            <span className="text-xs text-blue-400" style={{ fontFamily: 'Montserrat' }}>
                              YOU
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Wins */}
                      <div className="text-right">
                        <p 
                          className="text-3xl font-bold text-white"
                          style={{ fontFamily: 'Orbitron' }}
                        >
                          {player.wins}
                        </p>
                        <p 
                          className="text-xs text-gray-300"
                          style={{ fontFamily: 'Audiowide', textTransform: 'uppercase' }}
                        >
                          Wins
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
