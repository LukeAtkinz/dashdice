'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/context/NavigationContext';

const gameConfig = {
  quickfire: { name: 'Quick Fire', icon: '🔥', description: 'Fast-paced rounds' },
  classic: { name: 'Classic', icon: '🎯', description: 'Traditional gameplay' },
  zerohour: { name: 'Zero Hour', icon: '⏰', description: 'Last chance mode' },
  lastline: { name: 'Last Line', icon: '🎲', description: 'Final roll counts' },
  truegrit: { name: 'True Grit', icon: '💪', description: 'No banking allowed' },
  tagteam: { name: 'Tag Team', icon: '👥', description: 'Team-based play' }
};

export const DashboardSection: React.FC = () => {
  const { user } = useAuth();
  const { setCurrentSection } = useNavigation();
  const [hoveredGameMode, setHoveredGameMode] = useState<string | null>(null);

  const handleGameModeAction = (gameMode: string, action: string) => {
    console.log(`${gameMode} - ${action} clicked`);
    setCurrentSection('match');
  };

  const handleNavigation = (section: string) => {
    setCurrentSection(section as any);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center gap-[2rem] py-[2rem]">
      {/* Welcome Section */}
      <div className="text-center mb-8">
        <h1 
          className="text-6xl font-bold text-white mb-4"
          style={{
            fontFamily: "Orbitron",
            textTransform: "uppercase",
            textShadow: "0 0 20px rgba(255, 215, 0, 0.5)"
          }}
        >
          Welcome Back
        </h1>
        <p 
          className="text-2xl text-white/80"
          style={{
            fontFamily: "Orbitron",
          }}
        >
          Ready for your next game?
        </p>
      </div>

      {/* Game Modes Grid */}
      <div className="w-full flex flex-row items-center justify-center flex-wrap gap-[1rem] max-w-[80rem]">
        {Object.entries(gameConfig).map(([mode, config]) => (
          <motion.div
            key={mode}
            onMouseEnter={() => setHoveredGameMode(mode)}
            onMouseLeave={() => setHoveredGameMode(null)}
            className="h-[15.625rem] w-[31.25rem] rounded-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-start relative cursor-pointer transition-all duration-300"
            style={{
              background: "linear-gradient(rgba(37, 37, 37, 0.12), rgba(37, 37, 37, 0.12)), linear-gradient(242.59deg, #192e39 30%, rgba(153, 153, 153, 0))",
              border: hoveredGameMode === mode ? "2px solid #FFD700" : "2px solid transparent",
              boxShadow: hoveredGameMode === mode 
                ? "0 0 30px rgba(255, 215, 0, 0.3)" 
                : "0 4px 15px rgba(0, 0, 0, 0.2)"
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {hoveredGameMode === mode ? (
              <div className="w-full h-full flex flex-col justify-center items-center gap-[10px] p-[20px]">
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGameModeAction(mode, 'live');
                  }}
                  className="w-full flex flex-col justify-center items-center transition-all duration-300"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #192E39 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                    border: 0,
                    boxShadow: '0 4px 15px rgba(25, 46, 57, 0.3)'
                  }}
                  whileHover={{ scale: 1.05, boxShadow: '0 6px 20px rgba(25, 46, 57, 0.4)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Orbitron',
                      fontSize: '24px',
                      fontWeight: 400,
                      textTransform: 'uppercase',
                    }}
                  >
                    QUICK MATCH
                  </span>
                </motion.button>
                
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGameModeAction(mode, 'custom');
                  }}
                  className="w-full flex flex-col justify-center items-center transition-all duration-300"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #FF0080 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                    border: 0,
                    boxShadow: '0 4px 15px rgba(255, 0, 128, 0.3)'
                  }}
                  whileHover={{ scale: 1.05, boxShadow: '0 6px 20px rgba(255, 0, 128, 0.4)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Orbitron',
                      fontSize: '24px',
                      fontWeight: 400,
                      textTransform: 'uppercase',
                    }}
                  >
                    CUSTOM GAME
                  </span>
                </motion.button>
              </div>
            ) : (
              <>
                <div className="max-h-[100%] relative flex-1 flex flex-col items-end px-[2.25rem] z-[0] transition-all duration-300">
                  <h2
                    className="m-0 self-stretch relative text-white uppercase font-normal"
                    style={{
                      color: "#FFF",
                      fontFamily: "Orbitron",
                      fontSize: "48px",
                      fontWeight: 400,
                      lineHeight: "50px",
                      textTransform: "uppercase",
                      marginTop: "1rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {config.name}
                  </h2>
                  <div
                    className="w-[80%] relative text-white font-light opacity-80"
                    style={{
                      fontFamily: "Orbitron",
                      fontSize: "18px",
                      fontWeight: 300,
                      textAlign: "right",
                      textTransform: "uppercase",
                    }}
                  >
                    {config.description}
                  </div>
                </div>
                <div
                  className="text-8xl absolute top-[-1rem] left-[-1rem] z-[1] opacity-[0.6] transition-all duration-300"
                  style={{
                    filter: "drop-shadow(0 0 10px rgba(255, 215, 0, 0.3))"
                  }}
                >
                  {config.icon}
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Quick Access Section */}
      <div className="w-full max-w-[60rem] flex flex-row items-center justify-center gap-[2rem] mt-8">
        <motion.button
          onClick={() => handleNavigation('inventory')}
          className="flex flex-col items-center justify-center gap-2 p-6 rounded-[20px] transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, #FF0080, #FF4DB8)",
            boxShadow: "0 4px 15px rgba(255, 0, 128, 0.3)",
            minWidth: "160px",
            minHeight: "120px"
          }}
          whileHover={{ 
            scale: 1.05, 
            boxShadow: "0 6px 20px rgba(255, 0, 128, 0.4)" 
          }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="text-4xl mb-2">🎒</div>
          <span
            style={{
              color: "#FFF",
              fontFamily: "Orbitron",
              fontSize: "16px",
              fontWeight: 400,
              textTransform: "uppercase",
            }}
          >
            Inventory
          </span>
        </motion.button>

        <motion.button
          onClick={() => handleNavigation('profile')}
          className="flex flex-col items-center justify-center gap-2 p-6 rounded-[20px] transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
            minWidth: "160px",
            minHeight: "120px"
          }}
          whileHover={{ 
            scale: 1.05, 
            boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)" 
          }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="text-4xl mb-2">👤</div>
          <span
            style={{
              color: "#FFF",
              fontFamily: "Orbitron",
              fontSize: "16px",
              fontWeight: 400,
              textTransform: "uppercase",
            }}
          >
            Profile
          </span>
        </motion.button>

        <motion.button
          onClick={() => handleNavigation('settings')}
          className="flex flex-col items-center justify-center gap-2 p-6 rounded-[20px] transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, #00FF80, #00A855)",
            boxShadow: "0 4px 15px rgba(0, 255, 128, 0.3)",
            minWidth: "160px",
            minHeight: "120px"
          }}
          whileHover={{ 
            scale: 1.05, 
            boxShadow: "0 6px 20px rgba(0, 255, 128, 0.4)" 
          }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="text-4xl mb-2">⚙️</div>
          <span
            style={{
              color: "#FFF",
              fontFamily: "Orbitron",
              fontSize: "16px",
              fontWeight: 400,
              textTransform: "uppercase",
            }}
          >
            Settings
          </span>
        </motion.button>
      </div>
    </div>
  );
};
