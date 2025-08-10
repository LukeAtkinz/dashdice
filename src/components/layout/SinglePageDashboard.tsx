'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { NavigationProvider, useNavigation } from '@/context/NavigationContext';
import { SectionTransition } from '@/components/layout/SectionTransition';
import { DashboardSection } from '@/components/dashboard/DashboardSectionNew';
import { MatchSection } from '@/components/dashboard/MatchSectionNew';
import { Match } from '@/components/dashboard/Match';
import { GameWaitingRoom } from '@/components/dashboard/GameWaitingRoom';
import { InventorySection } from '@/components/dashboard/InventoryReference';
import { ProfileSection } from '@/components/dashboard/ProfileSection';
import { SettingsSection } from '@/components/dashboard/SettingsSection';
import { useAuth } from '@/context/AuthContext';
import { useBackground } from '@/context/BackgroundContext';
import { useBrowserRefresh } from '@/hooks/useBrowserRefresh';
import { createTestMatch } from '@/utils/testMatchData';
import '@/utils/testUtils'; // Load test utilities for development

const DashboardContent: React.FC = () => {
  const { currentSection, sectionParams, setCurrentSection, isGameOver } = useNavigation();
  const { user } = useAuth();
  const { DisplayBackgroundEquip } = useBackground();
  const [userGold] = useState(1000); // Placeholder for user gold
  
  console.log('🏠 SinglePageDashboard: Component rendered with:', {
    currentSection,
    sectionParams,
    timestamp: new Date().toISOString()
  });
  
  // Handle browser refresh functionality
  useBrowserRefresh();

  // Track section changes
  useEffect(() => {
    console.log('🏠 SinglePageDashboard: Section changed to:', {
      currentSection,
      sectionParams,
      timestamp: new Date().toISOString()
    });
  }, [currentSection, sectionParams]);

  const handleSectionChange = async (section: string) => {
    // This function is only for manual button clicks, not for programmatic navigation
    // When GameWaitingRoom calls setCurrentSection directly, it bypasses this function
    if (section === 'match') {
      try {
        console.log('🧪 Creating test match for development (from button click)...');
        const testMatchId = await createTestMatch();
        setCurrentSection('match', {
          gameMode: 'classic',
          matchId: testMatchId
        });
        console.log('✅ Test match created and navigated to:', testMatchId);
      } catch (error) {
        console.error('❌ Error creating test match:', error);
        // Fallback to regular navigation
        setCurrentSection(section as any);
      }
    } else {
      setCurrentSection(section as any);
    }
  };

  // Render background based on equipped display background
  const renderBackground = () => {
    if (DisplayBackgroundEquip) {
      if (DisplayBackgroundEquip.type === 'video') {
        return (
          <video
            key={DisplayBackgroundEquip.file} // Force re-render when video changes
            autoPlay
            loop
            muted
            playsInline
            controls={false}
            webkit-playsinline="true"
            x5-playsinline="true"
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover z-0"
          >
            <source src={DisplayBackgroundEquip.file} type="video/mp4" />
          </video>
        );
      } else {
        return (
          <img
            src={DisplayBackgroundEquip.file}
            alt={DisplayBackgroundEquip.name}
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
        );
      }
    }
    
    // Default gradient background
    return (
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: "radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #3533CD 0%, #7209B7 100%)"
        }}
      />
    );
  };

  return (
    <div className="min-h-screen max-h-screen relative overflow-hidden" style={{ height: '100vh', maxHeight: '100vh' }}>
      {/* Dynamic Background */}
      {renderBackground()}
      
      {/* Overlay for better content visibility */}
      <div className="absolute inset-0 bg-black/30 z-10" />

      {/* Main Layout */}
      <div className="relative z-20 h-full flex flex-col" style={{ height: '100vh', maxHeight: '100vh' }}>
        {/* Top Navigation Header */}
        <header className={`${((currentSection === 'match' || currentSection === 'waiting-room') && !isGameOver) ? 'hidden' : 'hidden md:flex'} flex-shrink-0 w-full flex-row items-center justify-center gap-[1.25rem] relative z-30 px-[1rem] md:px-[4rem] py-[1rem] md:py-[2rem]`}>
          <div className="flex-1 flex flex-row items-center justify-between rounded-[30px] px-[20px] md:px-[30px] py-[15px] w-full max-w-none" style={{ 
            background: DisplayBackgroundEquip?.name === 'On A Mission' 
              ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.6) 0%, rgba(14, 165, 233, 0.3) 50%, rgba(14, 165, 233, 0.1) 100%)'
              : DisplayBackgroundEquip?.name === 'Long Road Ahead'
              ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.6) 0%, rgba(76, 29, 149, 0.4) 25%, rgba(30, 27, 75, 0.3) 50%, rgba(30, 58, 138, 0.4) 75%, rgba(59, 130, 246, 0.2) 100%)'
              : "var(--ui-navbar-bg)",
            backdropFilter: DisplayBackgroundEquip?.name === 'On A Mission' || DisplayBackgroundEquip?.name === 'Long Road Ahead' ? 'blur(8px)' : 'none'
          }}>
            
            {/* Left Navigation */}
            <div className="flex flex-row items-center justify-start gap-[1rem] md:gap-[2rem]">
              {/* Logo Section */}
              <div className="flex flex-row items-center justify-start gap-[1rem]">
                <img
                  src="/Design Elements/CrownLogo.webp"
                  alt="DashDice Logo"
                  className="w-8 h-8 md:w-14 md:h-14"
                />
                <div
                  onClick={() => handleSectionChange('dashboard')}
                  className="relative text-2xl md:text-4xl bg-gradient-to-br from-[#ffd700] to-[#ffed4e] bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    fontFamily: "Audiowide",
                    fontWeight: 400,
                  }}
                >
                  Dashdice
                </div>
              </div>

              {/* Navigation Items */}
              <div className="hidden md:flex items-center gap-[20px]">
                {/* VAULT Button */}
                <button
                  onClick={() => handleSectionChange('inventory')}
                  disabled={currentSection === 'match' && !isGameOver}
                  className={`flex cursor-pointer transition-all duration-300 ${
                    currentSection === 'match' && !isGameOver 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:scale-105 hover:shadow-lg active:scale-95'
                  }`}
                  style={{
                    display: "flex",
                    width: "180px",
                    height: "48px",
                    padding: "8px 16px",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                    borderRadius: "18px",
                    background: currentSection === 'match' && !isGameOver 
                      ? "#666666" 
                      : DisplayBackgroundEquip?.name === 'On A Mission'
                      ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.8) 0%, rgba(14, 165, 233, 0.4) 50%, rgba(14, 165, 233, 0.2) 100%)'
                      : DisplayBackgroundEquip?.name === 'Long Road Ahead'
                      ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.8) 0%, rgba(76, 29, 149, 0.6) 25%, rgba(30, 27, 75, 0.4) 50%, rgba(30, 58, 138, 0.6) 75%, rgba(59, 130, 246, 0.4) 100%)'
                      : "#FF0080",
                    border: "none",
                    backdropFilter: DisplayBackgroundEquip?.name === 'On A Mission' || DisplayBackgroundEquip?.name === 'Long Road Ahead' ? 'blur(6px)' : 'none'
                  }}
                >
                  <img
                    src="/Design Elements/Gem Bucket.webp"
                    alt="Vault"
                    style={{
                      width: "40px",
                      height: "40px",
                      flexShrink: 0,
                      aspectRatio: "1/1"
                    }}
                  />
                  <span
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                      fontSize: "26px",
                      fontStyle: "normal",
                      fontWeight: 400,
                      lineHeight: "26px"
                    }}
                  >
                    VAULT
                  </span>
                </button>

                {/* SHOP Button - Disabled for future implementation */}
                {false && currentSection !== 'match' && (
                  <button
                    disabled
                    className="hidden cursor-not-allowed transition-all duration-300"
                    title="Shop - Coming Soon!"
                    style={{
                      display: "none",
                      width: "180px",
                      height: "48px",
                      padding: "8px 16px",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                      borderRadius: "18px",
                      background: "#808080",
                      border: "none",
                      opacity: 0.8
                    }}
                  >
                    <img
                      src="/Design Elements/discount tag.webp"
                      alt="Shop"
                      style={{
                        width: "40px",
                        height: "40px",
                        flexShrink: 0,
                        aspectRatio: "1/1",
                        opacity: 0.8
                      }}
                    />
                    <span
                      style={{
                        color: "#FFF",
                        fontFamily: "Audiowide",
                        fontSize: "20px",
                        fontStyle: "normal",
                        fontWeight: 400,
                        lineHeight: "20px"
                      }}
                    >
                      SHOP
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Side - Friends and Profile */}
            <div className="flex flex-row items-center justify-end gap-[1rem]">
              {/* FRIENDS Button */}
              <button
                onClick={() => handleSectionChange('friends')}
                className="hidden cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                style={{
                  display: "none",
                  width: "180px",
                  height: "48px",
                  padding: "8px 16px",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "18px",
                  background: "#FF0080",
                  border: "none"
                }}
              >
                <img
                  src="/Design Elements/friends.webp"
                  alt="Friends"
                  style={{
                    width: "40px",
                    height: "40px",
                    flexShrink: 0,
                    aspectRatio: "1/1"
                  }}
                />
                <span
                  style={{
                    color: "#FFF",
                    fontFamily: "Audiowide",
                    fontSize: "24px",
                    fontStyle: "normal",
                    fontWeight: 400,
                    lineHeight: "26px"
                  }}
                >
                  FRIENDS
                </span>
              </button>

              {/* PROFILE Button */}
              <button
                onClick={() => handleSectionChange('profile')}
                disabled={currentSection === 'match' && !isGameOver}
                className={`flex transition-all duration-300 ${
                  currentSection === 'match' && !isGameOver 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95'
                }`}
                style={{
                  display: "flex",
                  width: "180px",
                  height: "48px",
                  padding: "8px 16px",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "18px",
                  background: currentSection === 'match' && !isGameOver 
                    ? "#666666" 
                    : DisplayBackgroundEquip?.name === 'On A Mission'
                    ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.8) 0%, rgba(14, 165, 233, 0.4) 50%, rgba(14, 165, 233, 0.2) 100%)'
                    : DisplayBackgroundEquip?.name === 'Long Road Ahead'
                    ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.8) 0%, rgba(76, 29, 149, 0.6) 25%, rgba(30, 27, 75, 0.4) 50%, rgba(30, 58, 138, 0.6) 75%, rgba(59, 130, 246, 0.4) 100%)'
                    : "#FF0080",
                  border: "none",
                  backdropFilter: DisplayBackgroundEquip?.name === 'On A Mission' || DisplayBackgroundEquip?.name === 'Long Road Ahead' ? 'blur(6px)' : 'none'
                }}
              >
                <img
                  src="/Design Elements/Delivery Man.webp"
                  alt="Profile"
                  style={{
                    width: "40px",
                    height: "40px",
                    flexShrink: 0,
                    aspectRatio: "1/1"
                  }}
                />
                <span
                  className="hidden md:inline"
                  style={{
                    color: "#FFF",
                    fontFamily: "Audiowide",
                    fontSize: "22px",
                    fontStyle: "normal",
                    fontWeight: 400,
                    lineHeight: "26px"
                  }}
                >
                  PROFILE
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        {(currentSection === 'match' || currentSection === 'waiting-room') ? (
          // Full-screen centered layout for match, waiting-room, and winner screens
          <main className="flex-1 w-full h-full min-h-0 overflow-hidden flex items-center justify-center">
            {(() => {
              console.log('🏠 SinglePageDashboard: Rendering centered section with:', {
                currentSection,
                sectionParams,
                gameMode: sectionParams.gameMode,
                matchId: sectionParams.matchId,
                roomId: sectionParams.matchId || "dev-room-123",
                timestamp: new Date().toISOString()
              });
              return null;
            })()}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full flex items-center justify-center"
              >
                {currentSection === 'match' && (
                  <Match 
                    gameMode={sectionParams.gameMode}
                    roomId={sectionParams.matchId || "dev-room-123"}
                  />
                )}
                {currentSection === 'waiting-room' && (
                  <GameWaitingRoom 
                    gameMode={sectionParams.gameMode || 'classic'}
                    actionType={sectionParams.actionType || 'live'}
                    roomId={sectionParams.roomId}
                    onBack={() => setCurrentSection('dashboard')}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        ) : (
          // Regular content with constraints
          <main className="flex-1 w-full flex items-start justify-center min-h-0 overflow-auto pb-[6rem] md:pb-0" style={{ paddingBottom: 'max(4rem, env(safe-area-inset-bottom) + 4rem)', touchAction: 'pan-y' }}>
            <div className="w-full max-w-[100rem] flex flex-col items-center justify-center gap-[2rem] py-[2rem] px-[1rem] md:px-[2rem] pr-[1rem] md:pr-[2rem]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSection}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full"
                >
                  {currentSection === 'dashboard' && <DashboardSection />}
                  {currentSection === 'inventory' && <InventorySection />}
                  {currentSection === 'profile' && <ProfileSection />}
                  {currentSection === 'settings' && <SettingsSection />}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        )}

        {/* Bottom Navigation for Mobile - Fixed at bottom */}
        <footer 
          className={`${((currentSection === 'match' || currentSection === 'waiting-room') && !isGameOver) ? 'hidden' : 'md:hidden'} fixed bottom-0 left-0 right-0 w-[100vw] flex flex-row items-center justify-center z-50`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)', padding: '0', opacity: 0.4 }}
        >
          <div className="flex flex-row items-center justify-between w-full px-[2vw] py-[15px] shadow-lg" style={{
            background: DisplayBackgroundEquip?.name === 'On A Mission' 
              ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.8) 0%, rgba(14, 165, 233, 0.4) 50%, rgba(14, 165, 233, 0.2) 100%)'
              : DisplayBackgroundEquip?.name === 'Long Road Ahead'
              ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.8) 0%, rgba(76, 29, 149, 0.6) 25%, rgba(30, 27, 75, 0.4) 50%, rgba(30, 58, 138, 0.6) 75%, rgba(59, 130, 246, 0.4) 100%)'
              : '#000000',
            backdropFilter: DisplayBackgroundEquip?.name === 'On A Mission' || DisplayBackgroundEquip?.name === 'Long Road Ahead' ? 'blur(8px)' : 'none',
            borderRadius: '0'
          }}>
            <button
              onClick={() => handleSectionChange('dashboard')}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all flex-1 max-w-[20vw] ${
                currentSection === 'dashboard' ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              <img src="/Design Elements/CrownLogo.webp" alt="Play" className="w-8 h-8" />
              <span className="text-xs text-white font-semibold text-center" style={{ fontFamily: "Audiowide" }}>PLAY</span>
            </button>
            <button
              disabled
              className="flex flex-col items-center gap-1 p-3 rounded-lg transition-all cursor-not-allowed opacity-60 flex-1 max-w-[20vw]"
              title="Friends - Coming Soon!"
            >
              <img src="/Design Elements/friends.webp" alt="Friends" className="w-8 h-8" />
              <span className="text-xs text-white font-semibold text-center" style={{ fontFamily: "Audiowide" }}>FRIENDS</span>
            </button>
            <button
              onClick={() => handleSectionChange('inventory')}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all flex-1 max-w-[20vw] ${
                currentSection === 'inventory' ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              <img src="/Design Elements/Gem Bucket.webp" alt="Vault" className="w-8 h-8" />
              <span className="text-xs text-white font-semibold text-center" style={{ fontFamily: "Audiowide" }}>VAULT</span>
            </button>
            <button
              onClick={() => handleSectionChange('settings')}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all flex-1 max-w-[20vw] ${
                currentSection === 'settings' ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              <img src="/Design Elements/Delivery Man.webp" alt="Profile" className="w-8 h-8" />
              <span className="text-xs text-white font-semibold text-center" style={{ fontFamily: "Audiowide" }}>PROFILE</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default function SinglePageDashboard() {
  return (
    <ProtectedRoute>
      <NavigationProvider>
        <DashboardContent />
      </NavigationProvider>
    </ProtectedRoute>
  );
}
