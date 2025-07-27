'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { NavigationProvider, useNavigation } from '@/context/NavigationContext';
import { SectionTransition } from '@/components/layout/SectionTransition';
import { DashboardSection } from '@/components/dashboard/DashboardSectionNew';
import { MatchSection } from '@/components/dashboard/MatchSectionNew';
import { InventorySection } from '@/components/dashboard/InventoryReference';
import { ProfileSection } from '@/components/dashboard/ProfileSection';
import { SettingsSection } from '@/components/dashboard/SettingsSection';
import { useAuth } from '@/context/AuthContext';
import { useBackground } from '@/context/BackgroundContext';

const DashboardContent: React.FC = () => {
  const { currentSection, sectionParams, setCurrentSection } = useNavigation();
  const { user } = useAuth();
  const { DisplayBackgroundEquip } = useBackground();
  const [userGold] = useState(1000); // Placeholder for user gold

  const handleSectionChange = (section: string) => {
    setCurrentSection(section as any);
  };

  // Render background based on equipped display background
  const renderBackground = () => {
    if (DisplayBackgroundEquip) {
      if (DisplayBackgroundEquip.type === 'video') {
        return (
          <video
            autoPlay
            loop
            muted
            playsInline
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Dynamic Background */}
      {renderBackground()}
      
      {/* Overlay for better content visibility */}
      <div className="absolute inset-0 bg-black/30 z-10" />

      {/* Main Layout */}
      <div className="relative z-20 h-screen flex flex-col">
        {/* Top Navigation Header */}
        <header className="flex-shrink-0 w-full flex flex-row items-center justify-center gap-[1.25rem] relative z-30 px-[2rem] md:px-[4rem] py-[2rem]">
          <div className="flex-1 flex flex-row items-center justify-between rounded-[30px] px-[20px] md:px-[30px] py-[15px]" style={{ background: "var(--ui-navbar-bg)" }}>
            
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
                  DashDice
                </div>
              </div>

              {/* Navigation Items */}
              <div className="hidden md:flex items-center gap-[20px]">
                {/* VAULT Button */}
                <button
                  onClick={() => handleSectionChange('inventory')}
                  className="flex cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                  style={{
                    display: "flex",
                    width: "180px",
                    height: "48px",
                    padding: "4px 12px",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                    borderRadius: "18px",
                    background: "#FF0080",
                    border: "none"
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

                {/* SHOP Button */}
                <button
                  className="flex cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                  title="Coming Soon!"
                  style={{
                    display: "flex",
                    width: "180px",
                    height: "48px",
                    padding: "4px 12px",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                    borderRadius: "18px",
                    background: "#FF0080",
                    border: "none",
                    opacity: 0.7
                  }}
                >
                  <img
                    src="/Design Elements/discount tag.webp"
                    alt="Shop"
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
                    SHOP
                  </span>
                </button>
              </div>
            </div>

            {/* Right Side - Friends and Profile */}
            <div className="flex flex-row items-center justify-end gap-[1rem]">
              {/* FRIENDS Button */}
              <button
                onClick={() => handleSectionChange('friends')}
                className="flex cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                style={{
                  display: "flex",
                  width: "180px",
                  height: "48px",
                  padding: "4px 12px",
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
                className="flex cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                style={{
                  display: "flex",
                  width: "180px",
                  height: "48px",
                  padding: "4px 12px",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "18px",
                  background: "#FF0080",
                  border: "none"
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
        <main className="flex-1 w-full flex items-center justify-center min-h-0 overflow-auto">
          <div className="w-full max-w-[100rem] flex flex-col items-center justify-center gap-[2rem] py-[2rem] px-[2rem]">
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
                {currentSection === 'match' && (
                  <MatchSection 
                    gameMode={sectionParams.gameMode}
                    actionType={sectionParams.actionType}
                  />
                )}
                {currentSection === 'inventory' && <InventorySection />}
                {currentSection === 'profile' && <ProfileSection />}
                {currentSection === 'settings' && <SettingsSection />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Bottom Navigation for Mobile */}
        <footer className="md:hidden flex-shrink-0 w-full flex flex-row items-center justify-center py-[1rem] px-[2rem] relative z-30">
          <div className="flex flex-row items-center justify-center gap-[1rem] bg-gradient-to-br from-[#192E39] to-[#99999900] rounded-[30px] px-[20px] py-[10px]">
            <button
              onClick={() => handleSectionChange('dashboard')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                currentSection === 'dashboard' ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              <div className="text-xl">🎯</div>
              <span className="text-xs text-white" style={{ fontFamily: "Audiowide" }}>Dashboard</span>
            </button>
            <button
              onClick={() => handleSectionChange('match')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                currentSection === 'match' ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              <div className="text-xl">🎲</div>
              <span className="text-xs text-white" style={{ fontFamily: "Audiowide" }}>Match</span>
            </button>
            <button
              onClick={() => handleSectionChange('inventory')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                currentSection === 'inventory' ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              <div className="text-xl">🎒</div>
              <span className="text-xs text-white" style={{ fontFamily: "Audiowide" }}>Inventory</span>
            </button>
            <button
              onClick={() => handleSectionChange('settings')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                currentSection === 'settings' ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              <div className="text-xl">⚙️</div>
              <span className="text-xs text-white" style={{ fontFamily: "Audiowide" }}>Settings</span>
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
