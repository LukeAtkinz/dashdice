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
import ProfileSection from '@/components/dashboard/ProfileSection';
import UserProfileViewer from '@/components/profile/UserProfileViewer';
import AchievementNotificationDisplay from '@/components/achievements/AchievementNotification';
import AchievementsDashboard from '@/components/achievements/AchievementsDashboard';
import FriendsDashboard from '@/components/friends/FriendsDashboard';
import { RankedDashboard } from '@/components/ranked/RankedDashboard';
import GlobalChatButton from '@/components/chat/GlobalChatButton';
import SwipeRightChat from '@/components/chat/SwipeRightChat';
import { GlobalRematchNotification } from '@/components/rematch/GlobalRematchNotification';
import { GameInvitationNotification } from '@/components/friends/GameInvitationNotification';
import InviteAcceptedNotification from '@/components/friends/InviteAcceptedNotification';
import PersistentNotificationManager from '@/components/notifications/PersistentNotificationManager';
import { GameType } from '@/types/ranked';
import { RematchProvider } from '@/context/RematchContext';
import { useAuth } from '@/context/AuthContext';
import { useBackground } from '@/context/BackgroundContext';
import { useFriends } from '@/context/FriendsContext';
import { useBrowserRefresh } from '@/hooks/useBrowserRefresh';
import { useBackgroundPositioning } from '@/hooks/useBackgroundPositioning';
import { useOnlinePlayerCount } from '@/hooks/useOnlinePlayerCount';
import NotificationBadge from '@/components/ui/NotificationBadge';
import { MobileBackgroundControl } from '@/components/ui/MobileBackgroundControl';
import { createTestMatch } from '@/utils/testMatchData';

const DashboardContent: React.FC = () => {
  const { currentSection, sectionParams, setCurrentSection, isGameOver } = useNavigation();
  const { user } = useAuth();
  const { DisplayBackgroundEquip } = useBackground();
  const { getOnlineFriendsCount } = useFriends();
  const { getBackgroundPosition } = useBackgroundPositioning();
  const onlinePlayerCount = useOnlinePlayerCount();
  const onlineFriendsCount = getOnlineFriendsCount?.() || 0;
  const [userGold] = useState(1000); // Placeholder for user gold
  
  // Create button gradient style based on user's display background
  const getButtonGradientStyle = (baseColor: string) => {
    if (DisplayBackgroundEquip?.file) {
      return {
        background: `var(--ui-button-bg, linear-gradient(243deg, ${baseColor} 25.17%, rgba(153, 153, 153, 0.00) 109.89%))`,
        backdropFilter: 'blur(5px)',
        border: '2px solid rgba(255, 255, 255, 0.3)'
      };
    }
    return {
      background: `linear-gradient(243deg, ${baseColor} 25.17%, rgba(153, 153, 153, 0.00) 109.89%)`,
      backdropFilter: 'blur(5px)',
      border: '2px solid rgba(255, 255, 255, 0.3)'
    };
  };
  
  // Removed console log to prevent infinite re-renders
  // console.log('🏠 SinglePageDashboard: Component rendered with:', {
  //   currentSection,
  //   sectionParams,
  //   timestamp: new Date().toISOString()
  // });
  
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

  // Handle achievements navigation event
  useEffect(() => {
    const handleAchievementsNavigation = () => {
      setCurrentSection('achievements');
    };

    window.addEventListener('navigate-to-achievements', handleAchievementsNavigation);
    
    return () => {
      window.removeEventListener('navigate-to-achievements', handleAchievementsNavigation);
    };
  }, [setCurrentSection]);

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

  // Enhanced mobile video autoplay handler with better performance
  const handleVideoLoadStart = (videoElement: HTMLVideoElement) => {
    // Force autoplay on mobile devices with performance optimizations
    if (typeof window !== 'undefined') {
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isMobile) {
        // Mobile-specific optimizations for faster loading
        videoElement.setAttribute('webkit-playsinline', 'true');
        videoElement.setAttribute('x5-playsinline', 'true');
        videoElement.setAttribute('x5-video-player-type', 'h5');
        videoElement.setAttribute('x5-video-player-fullscreen', 'false');
        videoElement.setAttribute('x5-video-orientation', 'portraint');
        
        // Immediate play attempt
        videoElement.play().catch(e => {
          console.log('Initial video autoplay failed:', e);
          
          // For iOS, try again after a short delay
          if (isIOS) {
            setTimeout(() => {
              videoElement.play().catch(err => 
                console.log('Delayed video autoplay failed:', err)
              );
            }, 50); // Reduced delay for faster response
          }
        });
      }
    }
  };

  // Render background based on equipped display background
  const renderBackground = () => {
    if (DisplayBackgroundEquip) {
      const positioning = getBackgroundPosition(DisplayBackgroundEquip.name);
      
      if (DisplayBackgroundEquip.type === 'video') {
        const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
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
            preload={isMobile ? "auto" : "metadata"} // Aggressive preloading on mobile
            poster={isMobile ? undefined : "/backgrounds/placeholder.jpg"} // Remove poster on mobile for faster loading
            onLoadStart={(e) => handleVideoLoadStart(e.currentTarget)}
            onCanPlay={(e) => {
              // Additional attempt when video can play
              if (isMobile) {
                e.currentTarget.play().catch(err => console.log('CanPlay autoplay failed:', err));
              }
            }}
            onLoadedData={(e) => {
              // Ensure video starts immediately when data is loaded on mobile
              if (isMobile && e.currentTarget.paused) {
                e.currentTarget.play().catch(err => console.log('LoadedData autoplay failed:', err));
              }
            }}
            className={`absolute inset-0 w-full h-full object-cover z-0 scrollbar-hide ${positioning.className}`}
            style={{
              objectPosition: positioning.objectPosition
            }}
          >
            <source src={DisplayBackgroundEquip.file} type="video/mp4" />
          </video>
        );
      } else {
        const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        return (
          <img
            src={DisplayBackgroundEquip.file}
            alt={DisplayBackgroundEquip.name}
            loading={isMobile ? "eager" : "lazy"} // Eager loading on mobile for instant display
            fetchPriority={isMobile ? "high" : "auto"} // High priority on mobile
            className={`absolute inset-0 w-full h-full object-cover z-0 ${positioning.className}`}
            style={{
              objectPosition: positioning.objectPosition
            }}
          />
        );
      }
    }
    
    // Default gradient background
    return (
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.8) 50%, rgba(30, 41, 59, 0.9) 100%)"
        }}
      />
    );
  };

  return (
    <div 
      className="min-h-screen relative" 
      style={{ minHeight: '100vh' }}
      onTouchStart={() => {
        // Ensure video plays on first touch interaction (mobile Safari requirement)
        const video = document.querySelector('video');
        if (video && video.paused) {
          video.play().catch(e => console.log('Touch-triggered video play failed:', e));
        }
      }}
    >
      {/* Background Container with Fixed Position */}
      <div className="fixed inset-0 w-full h-full overflow-hidden z-0" style={{
        willChange: 'transform', // Optimize for mobile GPU acceleration
        transform: 'translateZ(0)' // Force hardware acceleration
      }}>
        {renderBackground()}
      </div>
      
      {/* Overlay for better content visibility - Hidden during game over */}
      <div className={`${isGameOver ? 'hidden' : 'fixed inset-0 bg-black/30 z-10'}`} />

      {/* Main Layout */}
      <div className="relative z-20 min-h-screen flex flex-col" style={{
        height: '100vh',
        overflow: 'hidden'
      }}>
        {/* Top Navigation Header */}
        <header className={`${(currentSection === 'match' || currentSection === 'waiting-room') ? 'hidden' : 'hidden md:flex'} flex-shrink-0 w-full flex-row items-center justify-center gap-[1.25rem] relative z-30 px-[1rem] md:px-[4rem] py-[1rem] md:py-[2rem]`}>
          <div className="flex-1 flex flex-row items-center justify-between rounded-[30px] px-[20px] md:px-[30px] py-[15px] w-full max-w-none" style={{ 
            background: DisplayBackgroundEquip?.name === 'On A Mission' 
              ? 'transparent'
              : "var(--ui-navbar-bg)",
            backdropFilter: DisplayBackgroundEquip?.name === 'On A Mission' ? 'none' : 'none'
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
                      : 'hover:-translate-y-1 hover:scale-105 active:scale-95'
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
                      : "transparent",
                    border: "none",
                    backdropFilter: currentSection === 'match' && !isGameOver 
                      ? 'none' 
                      : 'blur(2px)',
                    boxShadow: currentSection === 'match' && !isGameOver 
                      ? 'none' 
                      : '0 4px 8px rgba(255, 215, 0, 0.3)'
                  }}
                >
                  <img
                    src="/Design Elements/Player Profiles/Vault.webp"
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

                {/* FRIENDS Button */}
                <button
                  onClick={() => handleSectionChange('friends')}
                  disabled={currentSection === 'match' && !isGameOver}
                  className={`relative flex cursor-pointer transition-all duration-300 ${
                    currentSection === 'match' && !isGameOver 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:-translate-y-1 hover:scale-105 active:scale-95'
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
                      : "transparent",
                    border: "none",
                    backdropFilter: currentSection === 'match' && !isGameOver 
                      ? 'none' 
                      : 'blur(2px)',
                    boxShadow: currentSection === 'match' && !isGameOver 
                      ? 'none' 
                      : '0 4px 8px rgba(255, 215, 0, 0.3)'
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      fontSize: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <img src="/Design Elements/friends.webp" alt="Friends" className="w-10 h-10" />
                  </div>
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
                    FRIENDS
                  </span>
                  {/* Notification Badge positioned at top-right of button */}
                  <NotificationBadge 
                    count={onlineFriendsCount} 
                    className="absolute -top-2 -right-2"
                  />
                </button>

                {/* RANKED Button */}
                <button
                  onClick={() => {
                    console.log('🎯 RANKED Button clicked - Redirecting to donation page!');
                    window.location.href = '/helpus';
                  }}
                  disabled={currentSection === 'match' && !isGameOver}
                  className={`flex cursor-pointer transition-all duration-300 ${
                    currentSection === 'match' && !isGameOver 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:-translate-y-1 hover:scale-105 active:scale-95'
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
                      : "transparent",
                    border: "none",
                    backdropFilter: currentSection === 'match' && !isGameOver 
                      ? 'none' 
                      : 'blur(2px)',
                    boxShadow: currentSection === 'match' && !isGameOver 
                      ? 'none' 
                      : '0 4px 8px rgba(255, 215, 0, 0.3)'
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      fontSize: "28px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <img src="/Design Elements/Player Profiles/Ranked.webp" alt="Ranked" className="w-8 h-8" />
                  </div>
                  <span
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                      fontSize: "22px",
                      fontStyle: "normal",
                      fontWeight: 400,
                      lineHeight: "22px"
                    }}
                  >
                    RANKED
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
                    : 'cursor-pointer hover:-translate-y-1 hover:scale-105 active:scale-95'
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
                    : "transparent",
                  border: "none",
                  backdropFilter: currentSection === 'match' && !isGameOver 
                    ? 'none' 
                    : 'blur(2px)',
                  boxShadow: currentSection === 'match' && !isGameOver 
                    ? 'none' 
                    : '0 4px 8px rgba(255, 215, 0, 0.3)'
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
                    key={`match-${sectionParams.matchId || "dev-room-123"}`}
                    gameMode={sectionParams.gameMode}
                    roomId={sectionParams.matchId || "dev-room-123"}
                  />
                )}
                {currentSection === 'waiting-room' && (
                  <GameWaitingRoom 
                    gameMode={sectionParams.gameMode || 'classic'}
                    actionType={sectionParams.actionType || 'live'}
                    gameType={(sectionParams.gameType || 'quick') as GameType}
                    roomId={sectionParams.roomId}
                    isOptimistic={sectionParams.isOptimistic || false}
                    onBack={async () => {
                      // Debug logging
                      console.log('🐛 DEBUG: GameWaitingRoom onBack - sectionParams:', sectionParams);
                      // Clear the currentGame field when user manually exits waiting room
                      if (user?.uid) {
                        try {
                          const { GameInvitationService } = await import('@/services/gameInvitationService');
                          await GameInvitationService.forceClearUserCurrentGame(user.uid);
                        } catch (error) {
                          console.error('Error clearing currentGame on back:', error);
                        }
                      }
                      setCurrentSection('dashboard');
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        ) : (
          // Regular content with constraints
          <main 
            className="flex-1 w-full flex items-start justify-center overflow-y-auto overflow-x-hidden scrollbar-hide" 
            data-scrollable="true"
            style={{ 
              height: 0, // Force flex item to shrink and allow overflow
              paddingBottom: 'max(6rem, env(safe-area-inset-bottom) + 6rem)', // Account for bottom nav
              paddingTop: '0', // Ensure content starts at top
              touchAction: 'pan-y',
              WebkitOverflowScrolling: 'touch' // Smooth scrolling on iOS
            }}
          >
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
                  style={{
                    touchAction: 'pan-y',
                    overflow: 'visible',
                    flex: 'none'
                  }}
                >
                  {currentSection === 'dashboard' && <DashboardSection />}
                  {currentSection === 'inventory' && <InventorySection />}
                  {currentSection === 'achievements' && <AchievementsDashboard />}
                  {currentSection === 'friends' && <FriendsDashboard />}
                  {currentSection === 'ranked' && (
                    <RankedDashboard 
                      userId={user?.uid || ''} 
                      userDisplayName={user?.displayName || user?.email || 'Player'} 
                    />
                  )}
                  {currentSection === 'profile' && <ProfileSection />}
                  {currentSection === 'settings' && <ProfileSection />}
                  {currentSection === 'user-profile' && sectionParams.userId && (
                    <UserProfileViewer 
                      userId={sectionParams.userId}
                      onClose={() => setCurrentSection('friends')}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        )}

        {/* Bottom Navigation for Mobile - Fixed at bottom - Hidden during match, waiting-room, and game over */}
        {(currentSection !== 'match' && currentSection !== 'waiting-room') && (
          <footer 
            className="md:hidden fixed bottom-0 left-0 right-0 w-[100vw] flex flex-row items-center justify-center z-50"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)', padding: '0' }}
          >
            {/* Regular Mobile Navigation */}
            <div className="flex flex-row items-center justify-between w-full px-[2vw] py-[15px] shadow-lg" style={{
              background: DisplayBackgroundEquip?.name === 'On A Mission' 
                ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.6) 0%, rgba(14, 165, 233, 0.3) 50%, rgba(14, 165, 233, 0.1) 100%)'
                : DisplayBackgroundEquip?.name === 'Long Road Ahead'
                ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.6) 0%, rgba(76, 29, 149, 0.4) 25%, rgba(30, 27, 75, 0.3) 50%, rgba(30, 58, 138, 0.4) 75%, rgba(59, 130, 246, 0.3) 100%)'
                : DisplayBackgroundEquip?.name === 'New Day'
                ? 'linear-gradient(0deg, #5a7579 0%, transparent 100%)'
                : DisplayBackgroundEquip?.name === 'Relax'
                ? 'linear-gradient(0deg, #407080 0%, transparent 100%)'
                : DisplayBackgroundEquip?.name === 'Underwater'
                ? 'linear-gradient(0deg, #00518c 0%, transparent 100%)'
                : 'rgba(0, 0, 0, 0.6)',
              backdropFilter: DisplayBackgroundEquip?.name === 'On A Mission' || DisplayBackgroundEquip?.name === 'Long Road Ahead' ? 'blur(8px)' : 'none',
              borderRadius: '0'
            }}>
              <button
                onClick={() => handleSectionChange('profile')}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all flex-1 max-w-[18vw] ${
                  currentSection === 'profile' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <img src="/Design Elements/Delivery Man.webp" alt="Profile" className="w-12 h-12" />
                <span className="hidden text-xs text-white font-semibold text-center" style={{ fontFamily: "Audiowide" }}>PROFILE</span>
              </button>
              <button
                onClick={() => handleSectionChange('friends')}
                className={`relative flex flex-col items-center gap-1 p-3 rounded-lg transition-all flex-1 max-w-[18vw] ${
                  currentSection === 'friends' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <img src="/Design Elements/friends.webp" alt="Friends" className="w-12 h-12" />
                <span className="hidden text-xs text-white font-semibold text-center" style={{ fontFamily: "Audiowide" }}>FRIENDS</span>
                <NotificationBadge count={onlineFriendsCount} />
              </button>
              <button
                onClick={() => handleSectionChange('dashboard')}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all flex-1 max-w-[18vw] ${
                  currentSection === 'dashboard' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <img src="/Design Elements/CrownLogo.webp" alt="Play" className="w-12 h-12" />
                <span className="hidden text-xs text-white font-semibold text-center" style={{ fontFamily: "Audiowide" }}>PLAY</span>
              </button>
              <button
                onClick={() => {
                  console.log('🎯 Mobile RANKED Button clicked - Redirecting to donation page!');
                  window.location.href = '/helpus';
                }}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all flex-1 max-w-[18vw] ${
                  currentSection === 'ranked' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <img src="/Design Elements/Player Profiles/Ranked.webp" alt="Ranked" className="w-12 h-12" />
                <span className="hidden text-xs text-white font-semibold text-center" style={{ fontFamily: "Audiowide" }}>RANKED</span>
              </button>
              <button
                onClick={() => handleSectionChange('inventory')}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all flex-1 max-w-[18vw] ${
                  currentSection === 'inventory' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <img src="/Design Elements/Player Profiles/Vault.webp" alt="Vault" className="w-12 h-12" />
                <span className="hidden text-xs text-white font-semibold text-center" style={{ fontFamily: "Audiowide" }}>VAULT</span>
              </button>
            </div>
          </footer>
        )}
        
        {/* Mobile Background Position Control */}
        <MobileBackgroundControl currentSection={currentSection} />
        
        {/* Achievement Notifications */}
        <AchievementNotificationDisplay />
        
        {/* Global Rematch Notifications */}
        <GlobalRematchNotification />
        
        {/* Game Invitation Notifications */}
        <GameInvitationNotification />
        
        {/* Invite Accepted Notifications */}
        <InviteAcceptedNotification />
        
        {/* Persistent Match Notifications */}
        <PersistentNotificationManager />
        
        {/* Global Chat Button */}
        <GlobalChatButton />
      </div>
    </div>
  );
};

export default function SinglePageDashboard() {
  return (
    <ProtectedRoute>
      <NavigationProvider>
        <RematchProvider>
          <SwipeRightChat>
            <DashboardContent />
          </SwipeRightChat>
        </RematchProvider>
      </NavigationProvider>
    </ProtectedRoute>
  );
}
