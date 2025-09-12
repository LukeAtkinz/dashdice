'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/context/NavigationContext';
import { useBackground } from '@/context/BackgroundContext';
import { MatchmakingService } from '@/services/matchmakingService';
import { UserService } from '@/services/userService';
import { RankedMatchmakingService } from '@/services/rankedMatchmakingService';
import { GoBackendAdapter } from '@/services/goBackendAdapter';
import { OptimisticMatchmakingService } from '@/services/optimisticMatchmakingService';
import { MatchmakingCleanupService } from '@/services/matchmakingCleanupService';
import { userDataCache } from '@/services/userDataCache';
import AchievementsMini from '@/components/achievements/AchievementsMini';
import { CompactLeaderboard } from '@/components/ranked/Leaderboard';
import { CompactProgressionDisplay } from '@/components/ranked/ProgressionDisplay';
import { AlreadyInMatchNotification } from '@/components/notifications/AlreadyInMatchNotification';

const gameConfig = {
  quickfire: { 
    name: 'QUICK\nFIRE', 
    icon: '/Design Elements/Shield.webp', 
    description: 'more speed,\nmore skill',
    rotation: '6deg',
    mobileRotation: '6deg',
    position: { top: '0rem', left: '-4rem' },
    mobilePosition: { top: '0rem', left: '-2rem' },
    mobileScale: '1.0',
    available: true
  },
  classic: { 
    name: 'CLASSIC\nMODE', 
    icon: '/Design Elements/Crown Mode.webp', 
    description: 'ONLY ONE\nWILL RISE',
    rotation: '0deg',
    mobileRotation: '0deg',
    position: { top: '-2rem', left: '-2rem' },
    mobilePosition: { top: '-1.5rem', left: '-2rem' },
    mobileScale: '1.0',
    available: true // Enable classic mode
  },
  'zero-hour': { 
    name: 'ZERO\nHOUR', 
    icon: '/Design Elements/time out.webp', 
    description: 'countdown\nto victory',
    rotation: '0deg',
    mobileRotation: '0deg',
    position: { top: '-2rem', left: '-5rem' },
    mobilePosition: { top: '-1rem', left: '-2rem' },
    mobileScale: '1.0',
    available: true // Enable zero hour mode
  },
  'last-line': { 
    name: 'LAST\nLINE', 
    icon: '/Design Elements/skull.webp', 
    description: 'SHIFT THE\nBALANCE',
    rotation: '5deg',
    mobileRotation: '5deg',
    position: { top: '-1rem', left: '-5rem' },
    mobilePosition: { top: '-1rem', left: '-2rem' },
    mobileScale: '1.0',
    available: true // Enable last line mode
  },
  'true-grit': { 
    name: 'TRUE\nGRIT', 
    icon: '/Design Elements/Castle.webp', 
    description: 'no banking,\nno mercy',
    rotation: '0deg',
    mobileRotation: '0deg',
    position: { top: '-1rem', left: '-5rem' },
    mobilePosition: { top: '0rem', left: '-4rem' },
    mobileScale: '1.0',
    available: false // Disable true grit mode - coming soon
  },
  'tag-team': { 
    name: 'TAG\nTEAM', 
    icon: '/Design Elements/friends.webp', 
    description: 'rise or fall\ntogether',
    rotation: '0deg',
    mobileRotation: '0deg',
    position: { top: '-2rem', left: '-5rem' },
    mobilePosition: { top: '-2rem', left: '-2rem' },
    mobileScale: '1.0',
    available: false // Keep tag team disabled for now
  }
};

export const DashboardSection: React.FC = () => {
  const { user } = useAuth();
  const { setCurrentSection } = useNavigation();
  const { DisplayBackgroundEquip } = useBackground();
  const [hoveredGameMode, setHoveredGameMode] = useState<string | null>(null);
  const [tappedGameMode, setTappedGameMode] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [showAlreadyInMatchNotification, setShowAlreadyInMatchNotification] = useState(false);
  const [currentMatchInfo, setCurrentMatchInfo] = useState<{ gameMode: string; currentGame: string } | null>(null);
  const [skillRating, setSkillRating] = useState<{ level: number; dashNumber: number } | null>(null);

  // Preload user data for faster matchmaking and start cleanup service
  useEffect(() => {
    console.log('🚀 Preloading user data for faster matchmaking...');
    
    if (user?.uid) {
      userDataCache.preloadUserData(user.uid).catch(error => {
        console.warn('Failed to preload user data:', error);
      });
    }

    // Start the aggressive matchmaking cleanup service
    MatchmakingCleanupService.startCleanupService();
    console.log('✅ User data preloaded and cached');

    // Cleanup function to stop the service when component unmounts
    return () => {
      MatchmakingCleanupService.stopCleanupService();
    };
  }, [user?.uid]);

  // Fetch user's skill rating
  useEffect(() => {
    const fetchSkillRating = async () => {
      if (user?.uid) {
        try {
          const rankedStats = await RankedMatchmakingService.getUserRankedStats(user.uid);
          if (rankedStats && rankedStats.currentSeason) {
            setSkillRating({
              level: rankedStats.currentSeason.level,
              dashNumber: rankedStats.currentSeason.dashNumber
            });
          }
        } catch (error) {
          console.warn('Failed to fetch skill rating:', error);
        }
      }
    };

    fetchSkillRating();
  }, [user?.uid]);

  // Get background-specific game mode selector styling
  const getGameModeSelectorBackground = () => {
    switch (DisplayBackgroundEquip?.name) {
      case 'Relax':
        return 'rgba(37, 37, 37, 0.6)';
      case 'New Day':
        return 'linear-gradient(135deg, #192E39, transparent)';
      case 'All For Glory':
        return 'linear-gradient(135deg, #CC2E2E, transparent)';
      default:
        return 'var(--ui-game-mode-bg, linear-gradient(rgba(37, 37, 37, 0.12), rgba(37, 37, 37, 0.12)), linear-gradient(242.59deg, #192e39 30%, rgba(153, 153, 153, 0)))';
    }
  };

  // Get background-specific Live Play button styling
  const getLivePlayButtonBackground = () => {
    switch (DisplayBackgroundEquip?.name) {
      case 'All For Glory':
        return '#2a2a2a'; // Off-black, lighter than straight black
      case 'Relax':
        return '#3c5822'; // Specific green color
      default:
        return 'var(--ui-background-container)';
    }
  };

  const handleGameModeAction = async (gameMode: string, action: string) => {
    console.log(`${gameMode} - ${action} clicked`);
    
    if ((action === 'live' || action === 'ranked') && user) {
      setIsExiting(true);
      
      try {
        // First, check if user is already in a match using Go backend (with Firebase fallback)
        console.log('🔍 Checking if user is already in a match...');
        const matchStatus = await GoBackendAdapter.checkUserInMatch(user.uid);
        
        if (matchStatus.inMatch) {
          console.log('⚠️ User is already in a match:', matchStatus);
          setCurrentMatchInfo({
            gameMode: matchStatus.gameMode || 'Unknown',
            currentGame: matchStatus.currentGame || ''
          });
          setShowAlreadyInMatchNotification(true);
          setIsExiting(false);
          return;
        }

        // Get complete user profile data from cache for faster loading
        const cachedData = await userDataCache.getCachedUserData(user.uid);
        
        let userProfile;
        if (cachedData && cachedData.profile) {
          userProfile = cachedData.profile;
        } else {
          userProfile = await UserService.getUserProfile(user.uid);
          if (!userProfile) {
            throw new Error('Could not fetch user profile');
          }
        }
        
        // Prepare host data using complete profile data
        const hostData = {
          playerDisplayName: userProfile.displayName || userProfile.email?.split('@')[0] || 'Anonymous',
          playerId: user.uid,
          displayBackgroundEquipped: userProfile.inventory.displayBackgroundEquipped,
          matchBackgroundEquipped: userProfile.inventory.matchBackgroundEquipped,
          playerStats: userProfile.stats
        };

        // STEP 2: Try Go Backend first, with Optimistic UI fallback
        console.log('✨ Attempting Go backend matchmaking with Firebase fallback...');
        
        // Determine game type
        const gameType = action === 'ranked' ? 'ranked' : 'quick';
        
        // Try Go backend first
        try {
          console.log('🚀 Attempting Go backend match creation...');
          const matchResult = await GoBackendAdapter.findOrCreateMatch(
            gameMode,
            gameType as 'quick' | 'ranked',
            user.uid,
            userProfile
          );
          
          if (matchResult.success && matchResult.roomId) {
            console.log('✅ Go backend match created successfully!');
            setCurrentSection('waiting-room', {
              gameMode,
              actionType: action as 'live' | 'custom',
              roomId: matchResult.roomId,
              isOptimistic: false // This is a real Go backend room
            });
            return;
          }
        } catch (goError) {
          console.log('Go backend failed, using Firebase optimistic fallback:', goError);
        }

        // Fallback to Firebase optimistic approach if Go backend fails
        console.log('🔄 Using Firebase optimistic room creation as fallback...');
        const optimisticRoom = await OptimisticMatchmakingService.createOptimisticRoom(
          gameMode,
          gameType,
          user.uid,
          userProfile,
          {
            onRealRoomCreated: (realRoomId: string) => {
              console.log(`🎯 Firebase room created: ${realRoomId}, seamlessly transitioning...`);
              
              // Update navigation to use real room ID without user noticing
              setCurrentSection('waiting-room', {
                gameMode,
                actionType: action as 'live' | 'custom',
                roomId: realRoomId,
                gameType,
                isOptimistic: false // Now using real room
              });
            },
            onStatusUpdate: (status, searchText) => {
              console.log(`📊 Status update: ${status} - ${searchText}`);
              // Status updates will be handled by the GameWaitingRoom component
            },
            onError: (error: string) => {
              console.error(`❌ Optimistic matchmaking error: ${error}`);
              setIsExiting(false);
              alert(`Failed to create game room: ${error}`);
            }
          }
        );
        
        // Navigate to waiting room IMMEDIATELY with optimistic data
        setCurrentSection('waiting-room', {
          gameMode,
          actionType: action as 'live' | 'custom',
          roomId: optimisticRoom.id,
          gameType,
          isOptimistic: true
        });
        
        console.log(`🚀 Immediately navigated to waiting room with optimistic room: ${optimisticRoom.id}`);
        console.log(`🔧 Background real room creation started for seamless transition`);

      } catch (error) {
        console.error('Error in matchmaking:', error);
        setIsExiting(false);
        alert('Failed to find or create game room. Please try again.');
      }
    } else {
      // For custom games, navigate to waiting room first
      setIsExiting(true);
      setTimeout(() => {
        setCurrentSection('waiting-room', { gameMode, actionType: action as 'live' | 'custom' });
      }, 600);
    }
  };

  const handleNavigation = (section: string) => {
    setCurrentSection(section as any);
  };

  return (
    <motion.div 
      className="w-full flex flex-col items-center justify-start gap-[2rem] py-[2rem] md:py-[2rem] pt-[1rem] md:pt-[2rem]"
      initial={{ opacity: 1, scale: 1 }}
      animate={{ 
        opacity: isExiting ? 0.7 : 1, 
        scale: isExiting ? 0.95 : 1,
        filter: isExiting ? "blur(2px)" : "blur(0px)"
      }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        minHeight: 'auto', // Allow natural height growth
        overflow: 'visible' // Ensure no clipping
      }}
    >
      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideAndFade {
          from {
            opacity: 0;
            transform: translateX(20px) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0) translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }

        /* Hover effect for game mode cards */
        .game-mode-card:hover .game-mode-text {
          animation: slideAndFade 0.4s ease-out forwards;
        }
        
        .game-mode-card:hover .game-mode-image {
          animation: slideAndFade 0.5s ease-out 0.1s forwards;
          opacity: 0;
        }

        /* Mobile responsive image positioning */
        @media (max-width: 767px) {
          img[style*="--mobile-top"] {
            top: var(--mobile-top) !important;
            left: var(--mobile-left) !important;
            transform: rotate(var(--mobile-rotation)) scale(var(--mobile-scale)) !important;
          }
        }
      `}</style>

      {/* Skill Rating Display */}
      {skillRating && (
        <div className="w-full flex justify-center mb-4">
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl px-6 py-3 border border-gray-700/50">
            <div className="flex items-center gap-4">
              <div className="text-white">
                <span className="text-sm font-medium opacity-80">Elo: </span>
                <span className="font-bold text-yellow-400" style={{ fontFamily: 'Audiowide' }}>
                  {skillRating.level * 100 + skillRating.dashNumber * 10}
                </span>
              </div>
              <div className="h-4 w-px bg-gray-600"></div>
              <div className="text-white">
                <span className="text-sm font-medium opacity-80">Rank: </span>
                <span className="font-bold text-yellow-400" style={{ fontFamily: 'Audiowide' }}>
                  Dash {skillRating.dashNumber}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Mode Container - Ensure proper scrolling */}
      <div 
        className="w-[100%] flex flex-row items-center justify-center flex-wrap content-center gap-x-[0.5rem] md:gap-x-[0.687rem] gap-y-[0.5rem] md:gap-y-[0.625rem] px-[1rem] md:px-[2rem]"
        style={{
          touchAction: 'pan-y pan-x', // Allow both vertical and horizontal scrolling
          overflow: 'visible', // Ensure content is not clipped
          WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
          minHeight: 'auto', // Allow natural height
          maxHeight: 'none' // Remove any height constraints
        }}
      >
        {Object.entries(gameConfig).map(([mode, config]) => (
          <div
            key={mode}
            onMouseEnter={() => setHoveredGameMode(mode)}
            onMouseLeave={() => setHoveredGameMode(null)}
            onClick={() => {
              // On mobile, require explicit tap to show buttons first
              if (window.innerWidth < 768 && hoveredGameMode !== mode) {
                setHoveredGameMode(mode);
                setTappedGameMode(mode);
                // Clear tap state after 5 seconds if no button is pressed
                setTimeout(() => {
                  if (tappedGameMode === mode) {
                    setTappedGameMode(null);
                    setHoveredGameMode(null);
                  }
                }, 5000);
              }
            }}
            className="game-mode-card h-[12rem] md:h-[15.625rem] w-[90vw] md:w-[30rem] rounded-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-start relative text-right text-[2.5rem] md:text-[4rem] text-gainsboro font-audiowide cursor-pointer transition-all duration-300"
            style={{
              background: getGameModeSelectorBackground(),
              touchAction: 'manipulation' // Prevent double-tap zoom on mobile
            }}
          >
            {hoveredGameMode === mode ? (
              <div className="w-full h-full flex flex-col justify-center items-center gap-[8px] md:gap-[10px] p-[15px] md:p-[20px] animate-fade-in">
                {config.available ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        console.log(`🎮 ${mode.toUpperCase()} QUICK GAME CLICKED!`);
                        handleGameModeAction(mode, 'live');
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        console.log(`🎮 ${mode.toUpperCase()} QUICK GAME TOUCH END!`);
                        handleGameModeAction(mode, 'live');
                      }}
                      className="w-full flex flex-col justify-center items-center hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300 pointer-events-auto"
                      style={{
                        borderRadius: '30px',
                        background: getLivePlayButtonBackground(),
                        height: '80px',
                        alignContent: 'center',
                        justifyContent: 'center',
                        border: 0,
                        boxShadow: '0 4px 15px rgba(25, 46, 57, 0.3)',
                        touchAction: 'manipulation',
                        zIndex: 10,
                        position: 'relative',
                        cursor: 'pointer'
                      }}
                    >
                      <div className="flex items-center gap-2 pointer-events-none">
                        <img 
                          src="/Design Elements/Player Profiles/Quick Match.webp" 
                          alt="Quick Match" 
                          className="w-6 h-6 md:w-8 md:h-8 object-contain"
                        />
                        <span
                          className="text-[18px] md:text-[24px] leading-[22px] md:leading-[28px]"
                          style={{
                            color: '#E2E2E2',
                            textAlign: 'center',
                            fontFamily: 'Audiowide',
                            fontStyle: 'normal',
                            fontWeight: 400,
                            textTransform: 'uppercase',
                          }}
                        >
                          CASUAL
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        console.log(`🎮 ${mode.toUpperCase()} RANKED CLICKED!`);
                        handleGameModeAction(mode, 'ranked');
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        console.log(`🎮 ${mode.toUpperCase()} RANKED TOUCH END!`);
                        handleGameModeAction(mode, 'ranked');
                      }}
                      className="w-full flex flex-col justify-center items-center hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300 pointer-events-auto"
                      style={{
                        borderRadius: '30px',
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #9333EA 100%)',
                        height: '80px',
                        alignContent: 'center',
                        justifyContent: 'center',
                        border: 0,
                        boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
                        touchAction: 'manipulation',
                        zIndex: 10,
                        position: 'relative',
                        cursor: 'pointer'
                      }}
                    >
                      <div className="flex items-center gap-2 pointer-events-none">
                        <img 
                          src="/Design Elements/Player Profiles/Ranked.webp" 
                          alt="Ranked" 
                          className="w-6 h-6 md:w-8 md:h-8 object-contain"
                        />
                        <span
                          className="text-[18px] md:text-[24px] leading-[22px] md:leading-[28px]"
                          style={{
                            color: '#E2E2E2',
                            textAlign: 'center',
                            fontFamily: 'Audiowide',
                            fontStyle: 'normal',
                            fontWeight: 400,
                            textTransform: 'uppercase',
                          }}
                        >
                          RANKED
                        </span>
                      </div>
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col justify-center items-center">
                    <div
                      className="w-full flex flex-col justify-center items-center"
                      style={{
                        borderRadius: '30px',
                        background: 'transparent',
                        height: '160px',
                        alignContent: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 4px 15px rgba(128, 128, 128, 0.1)',
                        cursor: 'not-allowed'
                      }}
                    >
                      <span
                        className="text-[24px] md:text-[32px] leading-[28px] md:leading-[40px]"
                        style={{
                          color: '#E2E2E2',
                          textAlign: 'center',
                          fontFamily: 'Audiowide',
                          fontStyle: 'normal',
                          fontWeight: 400,
                          textTransform: 'uppercase',
                          opacity: 0.8
                        }}
                      >
                        Coming Soon!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="game-mode-text max-h-[100%] relative flex-1 flex flex-col items-end px-[1rem] md:px-[2.25rem] z-[2] transition-all duration-300">
                  <h2
                    className="m-0 self-stretch relative text-white uppercase font-normal text-[40px] md:text-[72px] leading-[38px] md:leading-[68px]"
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                      fontStyle: "normal",
                      fontWeight: 400,
                      textTransform: "uppercase",
                      whiteSpace: "pre-line"
                    }}
                  >
                    {config.name}
                  </h2>
                  <div
                    className="w-[70%] relative font-light inline-block text-[14px] md:text-[24px] leading-[14px] md:leading-[24px]"
                    style={{
                      color: "#FFF",
                      fontFamily: "Montserrat",
                      fontStyle: "normal",
                      fontWeight: 300,
                      textTransform: "uppercase",
                      textAlign: "right",
                      opacity: 0.8,
                    }}
                  >
                    {config.description.split('\n').map((line, index) => (
                      <div key={index}>{line}</div>
                    ))}
                  </div>
                </div>
                <img
                  className="game-mode-image w-[15rem] md:w-[25.256rem] absolute max-h-none object-contain z-[1] transition-all duration-500 ease-in-out hover:scale-110"
                  alt={mode}
                  src={config.icon}
                  style={{
                    top: config.position.top,
                    left: config.position.left,
                    transform: `rotate(${config.rotation})`,
                    opacity: hoveredGameMode === mode ? 1.0 : 0.4, // Dynamic opacity based on hover state
                    '--mobile-top': config.mobilePosition.top,
                    '--mobile-left': config.mobilePosition.left,
                    '--mobile-rotation': config.mobileRotation,
                    '--mobile-scale': config.mobileScale,
                  } as React.CSSProperties & {
                    '--mobile-top': string;
                    '--mobile-left': string;
                    '--mobile-rotation': string;
                    '--mobile-scale': string;
                  }}
                />
              </>
            )}
          </div>
        ))}
      </div>
      
      {/* Mini Components Layout - Between Game Modes and Achievements */}
      <div className="w-full flex flex-col lg:flex-row justify-center items-start gap-6 mt-6 mb-4">
        
        {/* Mobile: Stack all mini components vertically */}
        <div className="w-full flex flex-col lg:hidden gap-6">
          {/* Leaderboard Preview Section */}
          <div className="w-full flex justify-center">
            <div className="w-full max-w-md">
              <CompactLeaderboard userId={user?.uid} />
            </div>
          </div>
          
          {/* Ranked Progression Section */}
          <div className="w-full flex justify-center">
            <div className="w-full max-w-md">
              <CompactProgressionDisplay
                currentLevel={skillRating?.level || 1}
                winsInLevel={0}
                dashNumber={skillRating?.dashNumber || 1}
              />
            </div>
          </div>
        </div>

        {/* Desktop: Side by side mini components layout - 45% width each */}
        <div className="hidden lg:flex w-full max-w-7xl justify-center gap-6">
          {/* Leaderboard Preview - 45% width */}
          <div className="w-full max-w-lg">
            <CompactLeaderboard userId={user?.uid} />
          </div>
          
          {/* Ranked Progression - 45% width */}
          <div className="w-full max-w-lg">
            <CompactProgressionDisplay
              currentLevel={skillRating?.level || 1}
              winsInLevel={0}
              dashNumber={skillRating?.dashNumber || 1}
            />
          </div>
        </div>
      </div>

      {/* Achievements Preview Section - Full Width */}
      <div className="w-full flex justify-center mt-4">
        <AchievementsMini maxDisplay={3} />
      </div>

      {/* Already in Match Notification */}
      {showAlreadyInMatchNotification && currentMatchInfo && user && (
        <AlreadyInMatchNotification
          gameMode={currentMatchInfo.gameMode}
          currentGame={currentMatchInfo.currentGame}
          userId={user.uid}
          onClose={() => {
            setShowAlreadyInMatchNotification(false);
            setCurrentMatchInfo(null);
          }}
          onJoin={() => {
            // Navigate to the existing match
            setCurrentSection('match', { 
              matchId: currentMatchInfo.currentGame, 
              gameMode: currentMatchInfo.gameMode.toLowerCase() 
            });
          }}
        />
      )}
    </motion.div>
  );
};
