'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigation, DashboardSection } from '@/context/NavigationContext';

interface NavigationItem {
  id: DashboardSection;
  label: string;
  icon: string;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '🏠',
    description: 'Overview and quick stats'
  },
  {
    id: 'match',
    label: 'Match',
    icon: '🎲',
    description: 'Create or join games'
  },
  {
    id: 'inventory',
    label: 'Vault',
    icon: '🎒',
    description: 'Manage your items'
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: '👤',
    description: 'Account settings'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    description: 'App preferences'
  }
];

export const DashboardNavigation: React.FC = () => {
  const { currentSection, setCurrentSection } = useNavigation();

  return (
    <div className="w-full flex flex-row items-center justify-center relative z-30 px-[2rem] md:px-[4rem] py-[2rem]">
      <style jsx>{`
        .nav-button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-button:hover {
          animation: navHover 0.3s ease-in-out forwards;
          box-shadow: 0 12px 35px rgba(255, 0, 128, 0.4);
        }
        .nav-button:active {
          animation: navClick 0.2s ease-in-out;
          transform: translateY(-4px) scale(0.95);
        }
        .nav-button.active {
          box-shadow: 0 6px 20px rgba(255, 0, 128, 0.4);
        }
        @keyframes navHover {
          0% { 
            transform: translateY(0) scale(1); 
          }
          100% { 
            transform: translateY(-6px) scale(1.08); 
          }
        }
        @keyframes navClick {
          0% { transform: translateY(-6px) scale(1.08); }
          50% { transform: translateY(-4px) scale(0.95); }
          100% { transform: translateY(-6px) scale(1.08); }
        }
      `}</style>

      <div className="flex-1 flex flex-row items-center justify-between bg-gradient-to-br from-[#192E39] to-[#99999900] rounded-[30px] px-[20px] md:px-[30px] py-[15px]">
        
        {/* Left Navigation */}
        <div className="flex flex-row items-center justify-start gap-[1rem] md:gap-[2rem]">
          {/* Logo Section */}
          <div className="flex flex-row items-center justify-start gap-[1rem]">
            <div 
              className="w-6 h-6 md:w-10 md:h-10 bg-gradient-to-br from-[#ffd700] to-[#ffed4e] rounded-full flex items-center justify-center"
            >
              🎲
            </div>
            <div
              onClick={() => setCurrentSection('dashboard')}
              className="relative text-xl md:text-3xl bg-gradient-to-br from-[#ffd700] to-[#ffed4e] bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                fontFamily: "Audiowide",
                fontWeight: 400,
              }}
            >
              DashDice
            </div>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center gap-[20px]">
            {navigationItems.slice(0, 3).map((item) => {
              const isActive = currentSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentSection(item.id)}
                  className={`nav-button ${isActive ? 'active' : ''} flex items-center justify-center px-[20px] py-[10px] rounded-[15px] cursor-pointer border-0`}
                  style={{
                    background: isActive ? '#FF0080' : 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <span
                    style={{
                      color: '#FFF',
                      fontFamily: 'Audiowide',
                      fontSize: '18px',
                      fontWeight: 400,
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Navigation */}
        <div className="flex flex-row items-center justify-end gap-[20px]">
          {navigationItems.slice(3).map((item) => {
            const isActive = currentSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentSection(item.id)}
                className={`nav-button ${isActive ? 'active' : ''} flex items-center justify-center px-[20px] py-[10px] rounded-[15px] cursor-pointer border-0`}
                style={{
                  background: isActive ? '#FF0080' : 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <span
                  style={{
                    color: '#FFF',
                    fontFamily: 'Audiowide',
                    fontSize: '18px',
                    fontWeight: 400,
                    textTransform: 'uppercase',
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden absolute top-full left-0 right-0 bg-gradient-to-br from-[#192E39] to-[#99999900] rounded-[20px] mx-4 mt-2 p-4">
        <div className="grid grid-cols-2 gap-2">
          {navigationItems.map((item) => {
            const isActive = currentSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentSection(item.id)}
                className={`nav-button ${isActive ? 'active' : ''} flex flex-col items-center justify-center p-3 rounded-[10px] cursor-pointer border-0`}
                style={{
                  background: isActive ? '#FF0080' : 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <span className="text-lg mb-1">{item.icon}</span>
                <span
                  style={{
                    color: '#FFF',
                    fontFamily: 'Audiowide',
                    fontSize: '12px',
                    fontWeight: 400,
                    textTransform: 'uppercase',
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
