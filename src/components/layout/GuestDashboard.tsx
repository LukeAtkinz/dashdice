'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavigationProvider, useNavigation, DashboardSection } from '@/context/NavigationContext';
import { SectionTransition } from '@/components/layout/SectionTransition';
import { DashboardSection as DashboardSectionComponent } from '@/components/dashboard/DashboardSectionNew';
import { MatchSection } from '@/components/dashboard/MatchSectionNew';
import { Match } from '@/components/dashboard/Match';
import { GameWaitingRoom } from '@/components/dashboard/GameWaitingRoom';
// Using direct image paths from Design Elements folder
import { InventorySection } from '@/components/dashboard/InventoryReference';
import ProfileSection from '@/components/dashboard/ProfileSection';
import UserProfileViewer from '@/components/profile/UserProfileViewer';
import AchievementNotificationDisplay from '@/components/achievements/AchievementNotification';
import AchievementsDashboard from '@/components/achievements/AchievementsDashboard';
import FriendsDashboard from '@/components/friends/FriendsDashboard';
import { RankedDashboard } from '@/components/ranked/RankedDashboard';
import SwipeUpChat from '@/components/chat/SwipeUpChat';
import { GlobalRematchNotification } from '@/components/rematch/GlobalRematchNotification';
import { GameInvitationNotification } from '@/components/friends/GameInvitationNotification';
import InviteAcceptedNotification from '@/components/friends/InviteAcceptedNotification';
import PersistentNotificationManager from '@/components/notifications/PersistentNotificationManager';
import { GameType } from '@/types/ranked';
import { RematchProvider } from '@/context/RematchContext';
import { useAuth } from '@/context/AuthContext';
import { useBackground } from '@/context/BackgroundContext';
import { useBrowserRefresh } from '@/hooks/useBrowserRefresh';
import { useBackgroundPositioning } from '@/hooks/useBackgroundPositioning';
import { useOnlinePlayerCount } from '@/hooks/useOnlinePlayerCount';
import NotificationBadge from '@/components/ui/NotificationBadge';
import { MobileBackgroundControl } from '@/components/ui/MobileBackgroundControl';
// Removed GuestContext import completely - using direct guest data creation
import { createTestMatch, createTestMatchWithGuestData } from '@/utils/testMatchData';
import Link from 'next/link';

// Locked feature overlay component
interface LockedFeatureOverlayProps {
  featureName: string;
  children: React.ReactNode;
}

const LockedFeatureOverlay: React.FC<LockedFeatureOverlayProps> = ({ featureName, children }) => {
  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "Audiowide" }}>
            {featureName} Locked
          </h3>
          <p className="text-white/80 mb-6 max-w-md mx-auto">
            Sign up to unlock {featureName.toLowerCase()} and access all features of DashDice!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <button 
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
                style={{ fontFamily: "Audiowide" }}
              >
                SIGN IN
              </button>
            </Link>
            <Link href="/register">
              <button 
                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all"
                style={{ fontFamily: "Audiowide" }}
              >
                SIGN UP
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// Guest signup button component (replaces chat for guests)
const GuestSignupButton: React.FC = () => {
  return (
    <Link href="/register">
      <button
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold px-6 py-3 rounded-full shadow-lg transition-all transform hover:scale-105"
        style={{ fontFamily: "Audiowide" }}
      >
        SIGN UP
      </button>
    </Link>
  );
};

const GuestDashboardContent: React.FC = () => {
  const { currentSection, sectionParams, setCurrentSection, isGameOver } = useNavigation();
  const { user } = useAuth();
  const { DisplayBackgroundEquip } = useBackground();
  const { getBackgroundPosition } = useBackgroundPositioning();
  const onlinePlayerCount = useOnlinePlayerCount();

  // Create button gradient style based on user's display background
  const getButtonGradientStyle = (baseColor: string) => {
    return {
      background: `linear-gradient(243deg, ${baseColor} 25.17%, rgba(153, 153, 153, 0.00) 109.89%)`,
      backdropFilter: 'blur(5px)',
      border: '2px solid rgba(255, 255, 255, 0.3)'
    };
  };

  // Handle browser refresh functionality
  useBrowserRefresh();

  const handleSectionChange = async (section: string) => {
    if (section === 'match') {
      try {
        console.log('🧪 Creating test match for guest user (from button click)...');
        
        // Create guest data for the match
        const guestData = {
          guestUser: {
            id: `guest_${Date.now()}`,
            displayName: 'Guest Player',
            isGuest: true,
            sessionId: `session_${Date.now()}`
          },
          displayBackground: {
            name: 'New Day',
            file: '/backgrounds/NewDay.mp4',
            type: 'video' as const
          },
          matchBackground: {
            name: 'Long Road Ahead',
            file: '/backgrounds/Long Road Ahead.jpg',
            type: 'image' as const
          }
        };
        
        const testMatchId = await createTestMatchWithGuestData(guestData);
        if (testMatchId) {
          setCurrentSection('match' as DashboardSection, { roomId: testMatchId, gameMode: 'classic' });
        } else {
          console.error('Failed to create test match');
        }
      } catch (error) {
        console.error('Error creating test match:', error);
      }
    } else {
      setCurrentSection(section as DashboardSection);
    }
  };

  const handleVideoLoad = (videoElement: HTMLVideoElement) => {
    if (videoElement) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        videoElement.setAttribute('webkit-playsinline', 'true');
        videoElement.setAttribute('playsinline', 'true');
      } else {
        videoElement.setAttribute('x5-video-player-type', 'h5-page');
        videoElement.setAttribute('x5-video-player-fullscreen', 'false');
        videoElement.setAttribute('x5-video-orientation', 'portraint');
        
        videoElement.play().catch(e => {
          console.log('Initial video autoplay failed:', e);
          
          if (isIOS) {
            setTimeout(() => {
              videoElement.play().catch(err => 
                console.log('Delayed video autoplay failed:', err)
              );
            }, 50);
          }
        });
      }
    }
  };

  // Render background - default to NewDay.mp4 for guests
  const renderBackground = () => {
    // For guests, always use NewDay.mp4 as default display background
    if (!user) {
      const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      return (
        <video
          key="/backgrounds/NewDay.mp4"
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          webkit-playsinline="true"
          className="fixed inset-0 w-full h-full object-cover z-0"
          style={{
            objectFit: 'cover',
            objectPosition: getBackgroundPosition('NewDay').objectPosition || 'center center'
          }}
          onLoadedData={(e) => handleVideoLoad(e.target as HTMLVideoElement)}
        >
          <source src="/backgrounds/NewDay.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      );
    }

    return null;
  };

  // Get default match background for guests - Long Road Ahead
  const getGuestMatchBackground = () => {
    return {
      name: 'Long Road Ahead',
      file: 'Long Road Ahead.jpg',
      type: 'image' as const
    };
  };

  return (
    <SwipeUpChat>
      <div 
        className="guest-dashboard-container"
        style={{
          width: '100%',
          height: '100vh',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
      {/* Background Video */}
      {renderBackground()}

      {/* Notifications */}
      <AchievementNotificationDisplay />
      <GlobalRematchNotification />
      <GameInvitationNotification />
      <InviteAcceptedNotification />
      <PersistentNotificationManager />

      {/* Overlay for better content visibility */}
      <div className={`${isGameOver ? 'hidden' : 'fixed inset-0 bg-black/30 z-10'}`} />

      {/* Main Layout */}
      <div className="relative z-20 min-h-screen flex flex-col" style={{
        height: '100vh',
        overflow: 'hidden'
      }}>
        {/* Top Navigation Header */}
        <header className={`${(currentSection === 'match' || currentSection === 'waiting-room') ? 'hidden' : 'hidden md:flex'} flex-shrink-0 w-full flex-row items-center justify-center gap-[1.25rem] relative z-30 px-[1rem] md:px-[4rem] py-[1rem] md:py-[2rem]`}>
          <div className="flex-1 flex flex-row items-center justify-between rounded-[30px] px-[20px] md:px-[30px] py-[15px] w-full max-w-none" style={{ 
            background: "var(--ui-navbar-bg)",
            backdropFilter: 'none'
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
                {/* VAULT Button - Locked for guests */}
                <button
                  onClick={() => {}} // Disabled for guests
                  disabled
                  className="opacity-50 cursor-not-allowed flex"
                  style={{
                    display: "flex",
                    width: "180px",
                    height: "48px",
                    padding: "8px 16px",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                    borderRadius: "18px",
                    background: "#666666",
                    border: "none"
                  }}
                >
                  <div style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="/Design Elements/Player Profiles/Vault.webp" alt="Vault" className="w-10 h-10" />
                  </div>
                  <span style={{ color: "#FFF", fontFamily: "Audiowide", fontSize: "20px", fontWeight: 400, lineHeight: "20px" }}>
                    VAULT
                  </span>
                </button>

                {/* FRIENDS Button - Locked for guests */}
                <button
                  onClick={() => {}} // Disabled for guests
                  disabled
                  className="opacity-50 cursor-not-allowed flex"
                  style={{
                    display: "flex",
                    width: "180px",
                    height: "48px",
                    padding: "8px 16px",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                    borderRadius: "18px",
                    background: "#666666",
                    border: "none"
                  }}
                >
                  <div style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="/Design Elements/friends.webp" alt="Friends" className="w-10 h-10" />
                  </div>
                  <span style={{ color: "#FFF", fontFamily: "Audiowide", fontSize: "20px", fontWeight: 400, lineHeight: "20px" }}>
                    FRIENDS
                  </span>
                </button>

                {/* RANKED Button - Locked for guests */}
                <button
                  onClick={() => {}} // Disabled for guests  
                  disabled
                  className="opacity-50 cursor-not-allowed flex"
                  style={{
                    display: "flex",
                    width: "180px",
                    height: "48px",
                    padding: "8px 16px",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                    borderRadius: "18px",
                    background: "#666666",
                    border: "none"
                  }}
                >
                  <div style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="/Design Elements/Player Profiles/Ranked.webp" alt="Ranked" className="w-8 h-8" />
                  </div>
                  <span style={{ color: "#FFF", fontFamily: "Audiowide", fontSize: "22px", fontWeight: 400, lineHeight: "22px" }}>
                    RANKED
                  </span>
                </button>
              </div>
            </div>

            {/* Right Navigation */}
            <div className="hidden md:flex flex-row items-center justify-end gap-[1rem]">
              {/* Sign Up Button */}
              <Link href="/register">
                <button
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold rounded-lg transition-all"
                  style={{ fontFamily: "Audiowide" }}
                >
                  SIGN UP
                </button>
              </Link>

              {/* Sign In Button */}
              <Link href="/login">
                <button
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-lg transition-all"
                  style={{ fontFamily: "Audiowide" }}
                >
                  SIGN IN
                </button>
              </Link>
            </div>
          </div>
        </header>

        {/* Game Match Section - Hidden unless in match or waiting room */}
        {(currentSection === 'match' || currentSection === 'waiting-room') && (
          <div className="w-full h-full overflow-hidden" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100
          }}>
            {currentSection === 'match' && sectionParams.roomId && (
              <Match 
                gameMode={sectionParams.gameMode} 
                roomId={sectionParams.roomId}
              />
            )}
            {currentSection === 'waiting-room' && (
              <GameWaitingRoom 
                gameMode={sectionParams.gameMode || 'classic'}
                actionType="live"
                onBack={() => setCurrentSection('dashboard')}
              />
            )}
          </div>
        )}

        {/* Main Content Area - Hidden during match */}
        {(currentSection !== 'match' && currentSection !== 'waiting-room') && (
          <main className="flex-1 overflow-auto scrollbar-hide w-full" style={{
            paddingBottom: '120px',
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch'
          }}>
            <div className="w-full max-w-[100rem] flex flex-col items-center justify-start gap-[2rem] pt-[1rem] md:pt-[2rem] px-[1rem] md:px-[2rem] pb-0" style={{
              minHeight: 'min-content',
              flex: 'none'
            }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSection}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  {currentSection === 'dashboard' && <DashboardSectionComponent />}
                  {currentSection === 'inventory' && (
                    <LockedFeatureOverlay featureName="Vault">
                      <InventorySection />
                    </LockedFeatureOverlay>
                  )}
                  {currentSection === 'achievements' && (
                    <LockedFeatureOverlay featureName="Achievements">
                      <AchievementsDashboard />
                    </LockedFeatureOverlay>
                  )}
                  {currentSection === 'friends' && (
                    <LockedFeatureOverlay featureName="Friends">
                      <FriendsDashboard />
                    </LockedFeatureOverlay>
                  )}
                  {currentSection === 'ranked' && (
                    <LockedFeatureOverlay featureName="Ranked">
                      <RankedDashboard 
                        userId="" 
                        userDisplayName="Guest Player" 
                      />
                    </LockedFeatureOverlay>
                  )}
                  {currentSection === 'profile' && (
                    <LockedFeatureOverlay featureName="Profile">
                      <ProfileSection />
                    </LockedFeatureOverlay>
                  )}
                  {currentSection === 'settings' && (
                    <LockedFeatureOverlay featureName="Settings">
                      <ProfileSection />
                    </LockedFeatureOverlay>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        )}

        {/* Mobile Bottom Navigation - Large SIGNUP Button */}
        {(currentSection !== 'match' && currentSection !== 'waiting-room') && (
          <footer className="md:hidden fixed bottom-0 left-0 right-0 w-[100vw] flex flex-row items-center justify-center z-50"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)', padding: '0' }}>
            <div className="flex flex-col items-center justify-center w-full px-[2vw] py-[15px] shadow-lg" style={{
              background: 'linear-gradient(0deg, #5a7579 0%, transparent 100%)', // NewDay theme
              borderRadius: '0'
            }}>
              {/* Main Navigation Buttons */}
              <div className="flex flex-row items-center justify-between w-full mb-3">
                <button
                  onClick={() => handleSectionChange('dashboard')}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all flex-1 max-w-[18vw] ${
                    currentSection === 'dashboard' ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  <img src="/Design Elements/CrownLogo.webp" alt="Play" className="w-8 h-8" />
                  <span className="text-xs text-white font-semibold text-center" style={{ fontFamily: "Audiowide" }}>PLAY</span>
                </button>
                
                <button
                  onClick={() => {}} // Locked for guests
                  className="flex flex-col items-center gap-1 p-3 rounded-lg transition-all flex-1 max-w-[18vw] opacity-50"
                >
                  <img src="/Design Elements/Player Profiles/Ranked.webp" alt="Ranked" className="w-8 h-8" />
                  <span className="text-xs text-white font-semibold text-center" style={{ fontFamily: "Audiowide" }}>RANKED</span>
                </button>
                
                <button
                  onClick={() => {}} // Locked for guests
                  className="flex flex-col items-center gap-1 p-3 rounded-lg transition-all flex-1 max-w-[18vw] opacity-50"
                >
                  <img src="/Design Elements/Player Profiles/Vault.webp" alt="Vault" className="w-8 h-8" />
                  <span className="text-xs text-white font-semibold text-center" style={{ fontFamily: "Audiowide" }}>VAULT</span>
                </button>
                
                <button
                  onClick={() => {}} // Locked for guests
                  className="flex flex-col items-center gap-1 p-3 rounded-lg transition-all flex-1 max-w-[18vw] opacity-50"
                >
                  <img src="/Design Elements/friends.webp" alt="Friends" className="w-9 h-9" />
                  <span className="text-xs text-white font-semibold text-center" style={{ fontFamily: "Audiowide" }}>FRIENDS</span>
                </button>
              </div>

              {/* Large SIGNUP Button */}
              <Link href="/register" className="w-full">
                <button
                  className="w-full py-4 px-8 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                  style={{ fontFamily: "Audiowide", fontSize: "18px" }}
                >
                  SIGN UP TO UNLOCK ALL FEATURES
                </button>
              </Link>
            </div>
          </footer>
        )}

        {/* Mobile Background Position Control */}
        <MobileBackgroundControl currentSection={currentSection} />
        
        {/* Guest Signup Button (replaces chat for guests) */}
        <GuestSignupButton />
      </div>
    </div>
    </SwipeUpChat>
  );
};

export default function GuestDashboard() {
  return (
    <NavigationProvider>
      <RematchProvider>
        <GuestDashboardContent />
      </RematchProvider>
    </NavigationProvider>
  );
}