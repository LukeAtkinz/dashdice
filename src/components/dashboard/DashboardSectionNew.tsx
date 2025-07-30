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
    description: 'More Speed, More Pressure',
    rotation: '-70deg',
    position: { top: '3rem', left: '-2rem' },
    available: true
  },
  classic: { 
    name: 'CLASSIC\nMODE', 
    icon: '/Design Elements/Crown Mode.webp', 
    description: 'Full Force, Full Focus',
    rotation: '0deg',
    position: { top: '-2rem', left: '-2rem' },
    available: false
  },
  zerohour: { 
    name: 'ZERO\nHOUR', 
    icon: '/Design Elements/time out.webp', 
    description: 'Time Runs Backwards',
    rotation: '0deg',
    position: { top: '-2rem', left: '-2rem' },
    available: false
  },
  lastline: { 
    name: 'LAST\nLINE', 
    icon: '/Design Elements/skull.webp', 
    description: 'One Roll, One Life',
    rotation: '5deg',
    position: { top: '-1rem', left: '-2rem' },
    available: false
  },
  truegrit: { 
    name: 'TRUE\nGRIT', 
    icon: '/Design Elements/Castle.webp', 
    description: 'No Banking, No Mercy',
    rotation: '0deg',
    position: { top: '1rem', left: '-4rem' },
    available: false
  },
  tagteam: { 
    name: 'TAG\nTEAM', 
    icon: '/Design Elements/friends.webp', 
    description: 'Rise Or Fall Together',
    rotation: '0deg',
    position: { top: '-2rem', left: '-2rem' },
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
      className="w-full flex flex-col items-center justify-center gap-[2rem] py-[2rem]"
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
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>

      {/* Game Mode Container - Match reference exactly */}
      <div className="w-[100%] overflow-hidden flex flex-row items-center justify-center flex-wrap content-center gap-x-[0.687rem] gap-y-[0.625rem]">
        {Object.entries(gameConfig).map(([mode, config]) => (
          <div
            key={mode}
            onMouseEnter={() => setHoveredGameMode(mode)}
            onMouseLeave={() => setHoveredGameMode(null)}
            className="h-[15.625rem] w-[31.25rem] rounded-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-start relative text-right text-[4rem] text-gainsboro font-audiowide cursor-pointer transition-all duration-300"
            style={{
              background: `var(--ui-game-mode-bg, linear-gradient(rgba(37, 37, 37, 0.12), rgba(37, 37, 37, 0.12)), linear-gradient(242.59deg, #192e39 30%, rgba(153, 153, 153, 0)))`
            }}
          >
            {hoveredGameMode === mode ? (
              <div className="w-full h-full flex flex-col justify-center items-center gap-[10px] p-[20px] animate-fade-in">
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
                        height: '100px',
                        alignContent: 'center',
                        justifyContent: 'center',
                        border: 0,
                        boxShadow: '0 4px 15px rgba(25, 46, 57, 0.3)'
                      }}
                    >
                      <span
                        style={{
                          color: '#E2E2E2',
                          textAlign: 'center',
                          fontFamily: 'Audiowide',
                          fontSize: '28px',
                          fontStyle: 'normal',
                          fontWeight: 400,
                          lineHeight: '40px',
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
                        height: '100px',
                        alignContent: 'center',
                        justifyContent: 'center',
                        border: 0,
                        boxShadow: '0 4px 15px rgba(255, 0, 128, 0.3)'
                      }}
                    >
                      <span
                        style={{
                          color: '#E2E2E2',
                          textAlign: 'center',
                          fontFamily: 'Audiowide',
                          fontSize: '28px',
                          fontStyle: 'normal',
                          fontWeight: 400,
                          lineHeight: '40px',
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
                        background: 'linear-gradient(243deg, rgba(128, 128, 128, 0.6) 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                        height: '210px',
                        alignContent: 'center',
                        justifyContent: 'center',
                        border: 0,
                        boxShadow: '0 4px 15px rgba(128, 128, 128, 0.3)',
                        cursor: 'not-allowed'
                      }}
                    >
                      <span
                        style={{
                          color: '#E2E2E2',
                          textAlign: 'center',
                          fontFamily: 'Audiowide',
                          fontSize: '32px',
                          fontStyle: 'normal',
                          fontWeight: 400,
                          lineHeight: '40px',
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
                <div className="max-h-[100%] relative flex-1 flex flex-col items-end px-[2.25rem] z-[0] transition-all duration-300">
                  <h2
                    className="m-0 self-stretch relative text-white uppercase font-normal"
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                      fontSize: "64px",
                      fontStyle: "normal",
                      fontWeight: 400,
                      lineHeight: "60px",
                      textTransform: "uppercase",
                      whiteSpace: "pre-line"
                    }}
                  >
                    {config.name}
                  </h2>
                  <div
                    className="w-[50%] relative font-light inline-block"
                    style={{
                      color: "#FFF",
                      fontFamily: "Montserrat",
                      fontSize: "24px",
                      fontStyle: "normal",
                      fontWeight: 300,
                      lineHeight: "24px",
                      textTransform: "uppercase",
                      textAlign: "right",
                      opacity: 0.8,
                    }}
                  >
                    {config.description}
                  </div>
                </div>
                <img
                  className="w-[25.256rem] absolute max-h-none object-contain z-[1] transition-all duration-300"
                  alt={mode}
                  src={config.icon}
                  style={{
                    top: config.position.top,
                    left: config.position.left,
                    transform: `rotate(${config.rotation})`,
                    opacity: config.available ? 0.8 : 0.4
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
