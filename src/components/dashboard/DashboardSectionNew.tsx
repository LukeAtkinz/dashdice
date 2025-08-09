'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/context/NavigationContext';
import { MatchmakingService } from '@/services/matchmakingService';
import { UserService } from '@/services/userService';

const gameConfig = {
  quickfire: { 
    name: 'QUICK\nFIRE', 
    icon: '/Design Elements/finance startup.webp', 
    description: 'more speed,\nmore skill',
    rotation: '-70deg',
    mobileRotation: '20deg', // 90 degrees different from desktop
    position: { top: '3rem', left: '-2rem' },
    mobilePosition: { top: '3rem', left: '-2rem' },
    mobileScale: '1.2', // Slightly bigger on mobile
    available: true
  },
  classic: { 
    name: 'CLASSIC\nMODE', 
    icon: '/Design Elements/Crown Mode.webp', 
    description: 'full force,\nfull focus',
    rotation: '0deg',
    mobileRotation: '0deg',
    position: { top: '-2rem', left: '-2rem' },
    mobilePosition: { top: '-2rem', left: '-2rem' },
    mobileScale: '1.0',
    available: false
  },
  zerohour: { 
    name: 'ZERO\nHOUR', 
    icon: '/Design Elements/time out.webp', 
    description: 'time runs\nbackwards',
    rotation: '0deg',
    mobileRotation: '0deg',
    position: { top: '-2rem', left: '-2rem' },
    mobilePosition: { top: '-2rem', left: '-3rem' }, // Move left on mobile
    mobileScale: '1.0',
    available: false
  },
  lastline: { 
    name: 'LAST\nLINE', 
    icon: '/Design Elements/skull.webp', 
    description: 'one roll,\none life',
    rotation: '5deg',
    mobileRotation: '5deg',
    position: { top: '-1rem', left: '-2rem' },
    mobilePosition: { top: '-1rem', left: '-2rem' },
    mobileScale: '1.0',
    available: false
  },
  truegrit: { 
    name: 'TRUE\nGRIT', 
    icon: '/Design Elements/Castle.webp', 
    description: 'no banking,\nno mercy',
    rotation: '0deg',
    mobileRotation: '0deg',
    position: { top: '1rem', left: '-4rem' },
    mobilePosition: { top: '0rem', left: '-4rem' }, // Move up on mobile
    mobileScale: '1.0',
    available: false
  },
  tagteam: { 
    name: 'TAG\nTEAM', 
    icon: '/Design Elements/friends.webp', 
    description: 'rise or fall\ntogether',
    rotation: '0deg',
    mobileRotation: '0deg',
    position: { top: '-2rem', left: '-2rem' },
    mobilePosition: { top: '-2rem', left: '-2rem' },
    mobileScale: '1.0',
    available: false
  }
};

export const DashboardSection: React.FC = () => {
  const { user } = useAuth();
  const { setCurrentSection } = useNavigation();
  const [hoveredGameMode, setHoveredGameMode] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const handleGameModeAction = async (gameMode: string, action: string) => {
    console.log(`${gameMode} - ${action} clicked`);
    
    if (action === 'live' && user) {
      setIsExiting(true);
      
      try {
        // Get complete user profile data instead of using basic auth data
        console.log('🔍 DashboardSectionNew: Fetching user profile for:', user.uid);
        const userProfile = await UserService.getUserProfile(user.uid);
        
        if (!userProfile) {
          throw new Error('Could not fetch user profile');
        }
        
        console.log('📊 DashboardSectionNew: User profile fetched:', userProfile);
        
        // Prepare host data using complete profile data
        const hostData = {
          playerDisplayName: userProfile.displayName || userProfile.email?.split('@')[0] || 'Anonymous',
          playerId: user.uid,
          displayBackgroundEquipped: userProfile.inventory.displayBackgroundEquipped,
          matchBackgroundEquipped: userProfile.inventory.matchBackgroundEquipped,
          playerStats: userProfile.stats
        };
        
        console.log('✅ DashboardSectionNew: Host data prepared:', hostData);

        // Search for existing room or create new one
        const { roomId, isNewRoom, hasOpponent } = await MatchmakingService.findOrCreateRoom(gameMode, hostData);
        
        console.log(`${isNewRoom ? 'Created' : 'Joined'} room:`, roomId);
        
        if (hasOpponent) {
          console.log('Opponent found! Starting 5-second countdown...');
        }
        
        // Navigate to waiting room section
        setTimeout(() => {
          setCurrentSection('waiting-room', { 
            gameMode, 
            actionType: action as 'live' | 'custom',
            roomId: roomId 
          });
        }, 600);

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

      {/* Game Mode Container - Match reference exactly */}
      <div className="w-[100%] overflow-hidden flex flex-row items-center justify-center flex-wrap content-center gap-x-[0.5rem] md:gap-x-[0.687rem] gap-y-[0.5rem] md:gap-y-[0.625rem] px-[1rem] md:px-[2rem]">
        {Object.entries(gameConfig).map(([mode, config]) => (
          <div
            key={mode}
            onMouseEnter={() => setHoveredGameMode(mode)}
            onMouseLeave={() => setHoveredGameMode(null)}
            className="game-mode-card h-[12rem] md:h-[15.625rem] w-[90vw] md:w-[30rem] rounded-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-start relative text-right text-[2.5rem] md:text-[4rem] text-gainsboro font-audiowide cursor-pointer transition-all duration-300"
            style={{
              background: `var(--ui-game-mode-bg, linear-gradient(rgba(37, 37, 37, 0.12), rgba(37, 37, 37, 0.12)), linear-gradient(242.59deg, #192e39 30%, rgba(153, 153, 153, 0)))`
            }}
          >
            {hoveredGameMode === mode ? (
              <div className="w-full h-full flex flex-col justify-center items-center gap-[8px] md:gap-[10px] p-[15px] md:p-[20px] animate-fade-in">
                {config.available ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log(`🎮 ${mode.toUpperCase()} LIVE BUTTON CLICKED!`);
                        handleGameModeAction(mode, 'live');
                      }}
                      className="w-full flex flex-col justify-center items-center hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                      style={{
                        borderRadius: '30px',
                        background: 'var(--ui-background-container)',
                        height: '80px',
                        alignContent: 'center',
                        justifyContent: 'center',
                        border: 0,
                        boxShadow: '0 4px 15px rgba(25, 46, 57, 0.3)'
                      }}
                    >
                      <span
                        className="text-[20px] md:text-[28px] leading-[24px] md:leading-[40px]"
                        style={{
                          color: '#E2E2E2',
                          textAlign: 'center',
                          fontFamily: 'Audiowide',
                          fontStyle: 'normal',
                          fontWeight: 400,
                          textTransform: 'uppercase',
                        }}
                      >
                        LIVE PLAY
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log(`🎮 ${mode.toUpperCase()} CUSTOM BUTTON CLICKED!`);
                        handleGameModeAction(mode, 'custom');
                      }}
                      className="w-full flex flex-col justify-center items-center hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                      style={{
                        borderRadius: '30px',
                        background: 'var(--ui-button-bg)',
                        height: '80px',
                        alignContent: 'center',
                        justifyContent: 'center',
                        border: 0,
                        boxShadow: '0 4px 15px rgba(255, 0, 128, 0.3)'
                      }}
                    >
                      <span
                        className="text-[20px] md:text-[28px] leading-[24px] md:leading-[40px]"
                        style={{
                          color: '#E2E2E2',
                          textAlign: 'center',
                          fontFamily: 'Audiowide',
                          fontStyle: 'normal',
                          fontWeight: 400,
                          textTransform: 'uppercase',
                        }}
                      >
                        CUSTOM GAME
                      </span>
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
                  className="game-mode-image w-[15rem] md:w-[25.256rem] absolute max-h-none object-contain z-[1] transition-all duration-300 hover:scale-105 hover:opacity-100"
                  alt={mode}
                  src={config.icon}
                  style={{
                    top: config.position.top,
                    left: config.position.left,
                    transform: `rotate(${config.rotation})`,
                    opacity: config.available ? 0.8 : 0.4,
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
    </motion.div>
  );
};
