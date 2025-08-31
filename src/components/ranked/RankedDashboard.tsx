'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, Calendar, Users, Target, Medal, Clock, Star, Award } from 'lucide-react';
import { ProgressionDisplay, CompactProgressionDisplay } from './ProgressionDisplay';
import { Leaderboard, CompactLeaderboard } from './Leaderboard';
import { AchievementsDisplay, CompactAchievements } from './AchievementsDisplay';
import { TournamentComponent } from './TournamentComponent';
import { AdvancedMatchmaking } from './AdvancedMatchmaking';
import { LevelUpAnimation, WinStreakAnimation, SeasonEndAnimation } from './RankedAnimations';
import { RankBadge, LevelTierBadge, WinStreakIndicator, SeasonProgressIndicator, ParticleEffect } from './RankedVisualEffects';
import { RankedStats, Season } from '../../types/ranked';
import { RankedMatchmakingService } from '../../services/rankedMatchmakingService';
import { SeasonService } from '../../services/seasonService';
import { leaderboardService } from '../../services/leaderboardService';
import { rankedAchievementService } from '../../services/rankedAchievementService';
import { useBackground } from '@/context/BackgroundContext';

// CSS for custom button styling matching Friends component with new animations
const buttonStyles = `
  .custom-ranked-button {
    background: var(--ui-inventory-button-bg, linear-gradient(135deg, #2a1810 0%, #1a0f08 100%));
    border: 2px solid var(--ui-inventory-button-border, #8b7355);
    color: var(--ui-inventory-button-text, #f4f1eb);
    transition: all 0.3s ease;
    font-family: 'Audiowide', monospace;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  }
  
  .custom-ranked-button:hover {
    background: var(--ui-inventory-button-hover-bg, linear-gradient(135deg, #3a2420 0%, #2a1810 100%));
    border-color: var(--ui-inventory-button-hover-border, #a68b5b);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 115, 85, 0.3);
  }
  
  .custom-ranked-button.active {
    background: var(--ui-inventory-button-active-bg, linear-gradient(135deg, #4a3020 0%, #3a2420 100%));
    border-color: var(--ui-inventory-button-active-border, #c9a96e);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  /* New Tab Button Animations */
  @keyframes borderLoad {
    0% {
      background: linear-gradient(90deg, 
        #FFD700 0%, 
        #FFD700 0%, 
        transparent 0%, 
        transparent 100%);
    }
    100% {
      background: linear-gradient(90deg, 
        #FFD700 0%, 
        #FFD700 100%, 
        transparent 100%, 
        transparent 100%);
    }
  }
  
  .tab-button {
    position: relative;
    border: 2px solid transparent;
    transition: all 0.3s ease;
  }
  
  .tab-button::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(90deg, transparent 0%, transparent 100%);
    border-radius: inherit;
    z-index: -1;
    transition: all 0.3s ease;
  }
  
  .tab-button:hover::before {
    animation: borderLoad 0.8s ease-in-out forwards;
  }
  
  .tab-button.active {
    border-color: #FFD700;
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
  }
  
  .tab-button.active::before {
    background: linear-gradient(90deg, #FFD700 0%, #FFD700 100%);
  }
  
  /* Ranked-style navigation button hover effects */
  .nav-button {
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid transparent;
    border-radius: 18px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .nav-button:hover {
    animation: navPulse 0.6s ease-in-out;
    box-shadow: 0 8px 25px rgba(255, 0, 128, 0.3);
    transform: scale(1.05);
  }
  .nav-button:active {
    animation: navClick 0.2s ease-in-out;
    transform: scale(0.95);
  }
  .nav-button.active {
    box-shadow: 0 6px 20px rgba(255, 0, 128, 0.4);
  }
  @keyframes navPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  @keyframes navClick {
    0% { transform: scale(1); }
    50% { transform: scale(0.95); }
    100% { transform: scale(1); }
  }
`;

interface RankedDashboardProps {
  userId: string;
  userDisplayName: string;
  compactMode?: boolean;
}

export function RankedDashboard({ userId, userDisplayName, compactMode = false }: RankedDashboardProps) {
  const [rankedStats, setRankedStats] = useState<RankedStats | null>(null);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'achievements' | 'tournaments' | 'matchmaking' | 'history'>('overview');
  
  // Animation states
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showWinStreak, setShowWinStreak] = useState(false);
  const [showSeasonEnd, setShowSeasonEnd] = useState(false);
  const [newLevel, setNewLevel] = useState(1);
  const [celebrateRank, setCelebrateRank] = useState(false);

  const { DisplayBackgroundEquip } = useBackground();

  const tabs = [
    {
      id: 'overview' as const,
      label: 'Overview',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'linear-gradient(135deg, #667eea, #764ba2)'
    },
    {
      id: 'matchmaking' as const,
      label: 'Matchmaking',
      icon: <Target className="w-4 h-4" />,
      color: 'linear-gradient(135deg, #4facfe, #00f2fe)'
    },
    {
      id: 'tournaments' as const,
      label: 'Tournaments',
      icon: <Medal className="w-4 h-4" />,
      color: 'linear-gradient(135deg, #ffd89b, #19547b)'
    },
    {
      id: 'leaderboard' as const,
      label: 'Leaderboard',
      icon: <Trophy className="w-4 h-4" />,
      color: 'linear-gradient(135deg, #FF0080, #FF4DB8)'
    },
    {
      id: 'achievements' as const,
      label: 'Achievements',
      icon: <Award className="w-4 h-4" />,
      color: 'linear-gradient(135deg, #f093fb, #f5576c)'
    },
    {
      id: 'history' as const,
      label: 'History',
      icon: <Clock className="w-4 h-4" />,
      color: 'linear-gradient(135deg, #4facfe, #00f2fe)'
    }
  ];

  // Get background-specific styling for navigation buttons (matching Friends component)
  const getNavButtonStyle = (tab: any, isSelected: boolean) => {
    if (DisplayBackgroundEquip?.name === 'On A Mission') {
      return {
        background: isSelected 
          ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.8) 0%, rgba(14, 165, 233, 0.4) 50%, rgba(14, 165, 233, 0.2) 100%)'
          : 'linear-gradient(135deg, rgba(14, 165, 233, 0.6) 0%, rgba(14, 165, 233, 0.3) 50%, rgba(14, 165, 233, 0.1) 100%)',
        boxShadow: isSelected 
          ? '0 0 30px rgba(14, 165, 233, 0.6), inset 0 0 20px rgba(14, 165, 233, 0.2)'
          : '0 0 15px rgba(14, 165, 233, 0.3)',
        border: isSelected ? '2px solid rgba(14, 165, 233, 0.8)' : '2px solid rgba(14, 165, 233, 0.4)',
        backdropFilter: 'blur(8px)'
      };
    }
    return {
      background: isSelected ? tab.color : 'rgba(255, 255, 255, 0.1)',
      minHeight: "100px",
      border: isSelected ? '2px solid #FFD700' : '2px solid transparent'
    };
  };

  useEffect(() => {
    loadRankedData();
  }, [userId]);

  useEffect(() => {
    // Update time remaining every minute
    const interval = setInterval(updateTimeRemaining, 60000);
    return () => clearInterval(interval);
  }, [currentSeason]);

  const loadRankedData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all data in parallel
      const [stats, season, rank] = await Promise.all([
        RankedMatchmakingService.getUserRankedStats(userId),
        SeasonService.getCurrentSeason(),
        leaderboardService.getUserCurrentSeasonRank(userId)
      ]);

      setRankedStats(stats);
      setCurrentSeason(season);
      
      // Check for rank improvements and trigger celebrations
      if (rank && userRank && rank < userRank && rank <= 10) {
        setCelebrateRank(true);
        setTimeout(() => setCelebrateRank(false), 3000);
      }
      setUserRank(rank);
      
      if (season) {
        updateTimeRemaining();
      }

      // Check for new achievements
      if (stats) {
        rankedAchievementService.checkAndAwardAchievements(userId, stats, rank || undefined);
      }
    } catch (err) {
      setError('Failed to load ranked data');
      console.error('Ranked dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateTimeRemaining = async () => {
    if (currentSeason) {
      try {
        const remaining = await SeasonService.getTimeRemainingInSeason();
        const formatted = SeasonService.formatTimeRemaining(remaining);
        setTimeRemaining(formatted);
      } catch (err) {
        console.error('Error updating time remaining:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse bg-gray-800 rounded-lg p-6 h-64"></div>
        <div className="animate-pulse bg-gray-800 rounded-lg p-6 h-96"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadRankedData}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!rankedStats) {
    // User hasn't played ranked yet
    return (
      <div className="bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 rounded-lg p-8 text-center text-white">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
        <h2 className="text-2xl font-bold mb-2">Welcome to Ranked Mode!</h2>
        <p className="text-gray-300 mb-6">
          Compete in ranked matches to climb the leaderboard and earn rewards.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="bg-black/20 rounded-lg p-4">
            <Medal className="w-6 h-6 mb-2 text-yellow-400" />
            <h3 className="font-semibold mb-1">Level Progression</h3>
            <p className="text-sm text-gray-300">Win 5 games to advance each level</p>
          </div>
          <div className="bg-black/20 rounded-lg p-4">
            <Calendar className="w-6 h-6 mb-2 text-blue-400" />
            <h3 className="font-semibold mb-1">Seasonal Play</h3>
            <p className="text-sm text-gray-300">2-week seasons with fresh starts</p>
          </div>
          <div className="bg-black/20 rounded-lg p-4">
            <Users className="w-6 h-6 mb-2 text-green-400" />
            <h3 className="font-semibold mb-1">Competitive</h3>
            <p className="text-sm text-gray-300">No friends allowed - pure skill</p>
          </div>
        </div>
      </div>
    );
  }

  // Compact mode for smaller spaces
  if (compactMode) {
    return (
      <div className="space-y-4">
        <CompactProgressionDisplay
          currentLevel={rankedStats.currentSeason.level}
          winsInLevel={rankedStats.currentSeason.winsInLevel}
          dashNumber={rankedStats.currentSeason.dashNumber}
        />
        
        <div className="bg-gray-800 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Current Rank</span>
              {userRank && userRank <= 3 && <RankBadge rank={userRank} size="sm" />}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-yellow-400">#{userRank || '---'}</span>
              {rankedStats.currentSeason.winStreak >= 3 && (
                <WinStreakIndicator streak={rankedStats.currentSeason.winStreak} animated={false} />
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center text-xs mb-3">
            <div>
              <p className="text-gray-400">Win Rate</p>
              <p className="font-bold text-green-400">
                {rankedStats.currentSeason.gamesPlayed > 0
                  ? Math.round((rankedStats.currentSeason.totalWins / rankedStats.currentSeason.gamesPlayed) * 100)
                  : 0}%
              </p>
            </div>
            <div>
              <p className="text-gray-400">Streak</p>
              <p className="font-bold text-orange-400">{rankedStats.currentSeason.winStreak}</p>
            </div>
            <div>
              <p className="text-gray-400">Games</p>
              <p className="font-bold text-blue-400">{rankedStats.currentSeason.gamesPlayed}</p>
            </div>
          </div>
          
          {timeRemaining && (
            <SeasonProgressIndicator timeRemaining={timeRemaining} animated={false} />
          )}
        </div>

        <CompactAchievements
          userId={userId}
          rankedStats={rankedStats}
          currentRank={userRank || undefined}
        />
      </div>
    );
  }

  return (
    <>
      <style jsx>{buttonStyles}</style>
      <div className="w-full flex flex-col items-center justify-start gap-[2rem] py-[2rem] min-h-full">
        
        {/* Header */}
        <div className="text-center mb-8 flex-shrink-0">
          <h1 
            className="text-5xl font-bold text-white mb-4 cursor-pointer hover:text-yellow-400 transition-colors duration-300"
            style={{
              fontFamily: "Audiowide",
              textTransform: "uppercase",
              textShadow: "0 0 20px rgba(255, 215, 0, 0.5)"
            }}
            onClick={() => setActiveTab('overview')}
          >
            Ranked
          </h1>
        </div>

        {/* Navigation Tabs - Using Friends Template */}
        <div className="w-full max-w-[60rem] flex flex-row items-center justify-center gap-[1rem] mb-8 flex-shrink-0">
          {tabs.filter(tab => tab.id !== 'matchmaking' && tab.id !== 'achievements' && tab.id !== 'history' && tab.id !== 'overview').map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                tab-button nav-button
                flex flex-col items-center justify-center gap-2 p-4 rounded-[20px]
                transition-all duration-300
                h-12 md:h-16 px-4 md:px-6 min-w-[120px] md:min-w-[140px]
                ${activeTab === tab.id ? 'active' : ''}
              `}
              style={{
                display: 'flex',
                width: 'fit-content',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                borderRadius: '18px',
                cursor: 'pointer',
                ...getNavButtonStyle(tab, activeTab === tab.id)
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base md:text-lg font-audiowide uppercase" style={{ 
                    color: activeTab === tab.id ? 'var(--ui-inventory-button-text, var(--ui-button-text))' : '#FFF', 
                    fontFamily: 'Audiowide', 
                    fontWeight: 400, 
                    textTransform: 'uppercase' 
                  }}>
                    <span className="hidden md:inline">{tab.label}</span>
                    <span className="md:hidden">{tab.label}</span>
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="w-full max-w-[80rem] flex-1 overflow-y-auto scrollbar-hide px-4">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current progression */}
              <ProgressionDisplay
                currentLevel={rankedStats.currentSeason.level}
                winsInLevel={rankedStats.currentSeason.winsInLevel}
                totalWins={rankedStats.currentSeason.totalWins}
                winStreak={rankedStats.currentSeason.winStreak}
                longestWinStreak={rankedStats.currentSeason.longestWinStreak}
                dashNumber={rankedStats.currentSeason.dashNumber}
                gamesPlayed={rankedStats.currentSeason.gamesPlayed}
              />

              {/* Stats overview */}
              <div className="bg-gray-900 rounded-lg p-6 text-white">
                <h3 className="text-xl font-bold mb-4 flex items-center" style={{ fontFamily: 'Audiowide' }}>
                  <Target className="w-5 h-5 mr-2 text-blue-400" />
                  Your Stats
                </h3>
                
                <div className="space-y-4">
                  {/* Current rank */}
                  <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <span className="font-medium" style={{ fontFamily: 'Audiowide' }}>Current Rank</span>
                    <span className="text-2xl font-bold text-yellow-400" style={{ fontFamily: 'Audiowide' }}>#{userRank || '---'}</span>
                  </div>

                  {/* Quick stats grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-400 mb-1" style={{ fontFamily: 'Audiowide' }}>All-Time Best</p>
                      <p className="text-lg font-bold text-purple-400" style={{ fontFamily: 'Audiowide' }}>
                        Level {rankedStats.allTime.maxLevelReached}
                      </p>
                    </div>
                    
                    <div className="bg-gray-800 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-400 mb-1" style={{ fontFamily: 'Audiowide' }}>Total Dashes</p>
                      <p className="text-lg font-bold text-blue-400" style={{ fontFamily: 'Audiowide' }}>
                        {rankedStats.allTime.totalDashes}
                      </p>
                    </div>
                    
                    <div className="bg-gray-800 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-400 mb-1" style={{ fontFamily: 'Audiowide' }}>Career Wins</p>
                      <p className="text-lg font-bold text-green-400" style={{ fontFamily: 'Audiowide' }}>
                        {rankedStats.allTime.totalRankedWins}
                      </p>
                    </div>
                    
                    <div className="bg-gray-800 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-400 mb-1" style={{ fontFamily: 'Audiowide' }}>Best Streak</p>
                      <p className="text-lg font-bold text-orange-400" style={{ fontFamily: 'Audiowide' }}>
                        {rankedStats.allTime.longestWinStreak}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Removed matchmaking and achievements tabs */}

          {activeTab === 'tournaments' && (
            <TournamentComponent 
              userId={userId}
              compactMode={false}
            />
          )}

          {activeTab === 'leaderboard' && (
            <Leaderboard userId={userId} />
          )}

          {/* Achievements tab removed */}
          {/* History tab removed */}

          {/* Animations */}
          <AnimatePresence>
            <LevelUpAnimation
              newLevel={newLevel}
              show={showLevelUp}
              onComplete={() => setShowLevelUp(false)}
            />
            
            <WinStreakAnimation
              streakCount={rankedStats?.currentSeason.winStreak || 0}
              show={showWinStreak}
              onComplete={() => setShowWinStreak(false)}
            />
            
            <SeasonEndAnimation
              finalLevel={rankedStats?.currentSeason.level || 1}
              finalRank={userRank || 999}
              newSeasonNumber={currentSeason?.dashNumber || 1}
              show={showSeasonEnd}
              onComplete={() => setShowSeasonEnd(false)}
            />
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

// Export compact version for dashboard widgets
export function CompactRankedDashboard({ userId, userDisplayName }: RankedDashboardProps) {
  return (
    <RankedDashboard 
      userId={userId} 
      userDisplayName={userDisplayName} 
      compactMode={true} 
    />
  );
}
