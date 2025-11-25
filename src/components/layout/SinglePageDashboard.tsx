'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { SoftRankedLeaderboard } from '@/components/ranked/SoftRankedLeaderboard';
import SwipeRightChat from '@/components/chat/SwipeRightChat';
import { GlobalRematchNotification } from '@/components/rematch/GlobalRematchNotification';
import InviteAcceptedNotification from '@/components/friends/InviteAcceptedNotification';
import InviteDeclinedNotification from '@/components/friends/InviteDeclinedNotification';

import PersistentNotificationManager from '@/components/notifications/PersistentNotificationManager';
import { GameType } from '@/types/ranked';
import { RematchProvider } from '@/context/RematchContext';
import { useAuth } from '@/context/AuthContext';
import { useBackground } from '@/context/BackgroundContext';
import { useFriends } from '@/context/FriendsContext';
import { useBrowserRefresh } from '@/hooks/useBrowserRefresh';
import { useBackgroundPositioning } from '@/hooks/useBackgroundPositioning';
import { useOnlinePlayerCount } from '@/hooks/useOnlinePlayerCount';
import { useDashboardBackground } from '@/hooks/useOptimizedBackground';
import { useForceVideoAutoplay } from '@/hooks/useForceVideoAutoplay';
import NotificationBadge from '@/components/ui/NotificationBadge';
import { MobileBackgroundControl } from '@/components/ui/MobileBackgroundControl';
import { createTestMatch } from '@/utils/testMatchData';
import { NavigationWithInvitations } from '@/components/navigation/NavigationWithInvitations';

const DashboardContent: React.FC = () => {
  const { currentSection, sectionParams, setCurrentSection, previousSection, isGameOver } = useNavigation();
  const { user } = useAuth();
  
  console.log('🎯 DASHBOARD CONTENT: currentSection is:', currentSection);
  const { DisplayBackgroundEquip } = useBackground();
  const { backgroundPath, isVideo } = useDashboardBackground(DisplayBackgroundEquip);
  const { getOnlineFriendsCount } = useFriends();
  const { getBackgroundPosition } = useBackgroundPositioning();
  const onlinePlayerCount = useOnlinePlayerCount();
  const onlineFriendsCount = getOnlineFriendsCount?.() || 0;
  const [userGold] = useState(1000); // Placeholder for user gold
  
  // Force video autoplay globally across entire app
  useForceVideoAutoplay();
  
  const previousSectionRef = useRef(currentSection);
  const [prevSection, setPrevSection] = useState(currentSection);
  
  // Track section changes to detect transitions between expanded nav sections
  useEffect(() => {
    if (currentSection !== prevSection) {
      setPrevSection(prevSection);
      previousSectionRef.current = prevSection;
    }
  }, [currentSection, prevSection]);
  
  // Video transitions removed for better UX
  
  // Create button gradient style based on user's display background
  const getButtonGradientStyle = (baseColor: string) => {
    if (DisplayBackgroundEquip?.id) {
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

  // Handle golden styling for Vault tabs
  useEffect(() => {
    const handleVaultTabChange = (event: CustomEvent) => {
      const activeTab = event.detail;
      const buttons = document.querySelectorAll('.vault-tab-btn');
      
      buttons.forEach((button) => {
        const btn = button as HTMLButtonElement;
        const span = btn.querySelector('span');
        const isActive = btn.getAttribute('data-tab') === activeTab;
        
        if (span) {
          // Golden outline style for active tab
          btn.style.border = isActive ? '2px solid #FFD700' : '2px solid rgba(255, 255, 255, 0.1)';
          btn.style.background = isActive ? 'rgba(255, 215, 0, 0.1)' : 'transparent';
          btn.style.boxShadow = isActive ? '0 0 15px rgba(255, 215, 0, 0.3)' : 'none';
          span.style.color = isActive ? '#FFD700' : '#FFF';
        }
      });
    };

    window.addEventListener('vaultTabChange', handleVaultTabChange as EventListener);
    
    // Initial styling - set Power tab as active by default
    setTimeout(() => {
      const event = new CustomEvent('vaultTabChange', { detail: 'power' });
      window.dispatchEvent(event);
    }, 100);

    return () => {
      window.removeEventListener('vaultTabChange', handleVaultTabChange as EventListener);
    };
  }, []);

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
    if (DisplayBackgroundEquip && backgroundPath) {
      const positioning = getBackgroundPosition(DisplayBackgroundEquip.name);
      
      if (isVideo) {
        const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        return (
          <video
            key={backgroundPath} // Force re-render when video changes
            autoPlay
            loop
            muted
            playsInline
            controls={false}
            webkit-playsinline="true"
            x5-playsinline="true"
            x5-video-player-type="h5-page"
            x5-video-player-fullscreen="false"
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            poster={isMobile ? undefined : "/backgrounds/placeholder.jpg"} // Remove poster on mobile for faster loading
            onLoadStart={(e) => handleVideoLoadStart(e.currentTarget)}
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              video.muted = true;
              video.play().catch(err => console.log('LoadedMetadata autoplay failed:', err));
            }}
            onCanPlay={(e) => {
              const video = e.currentTarget;
              video.muted = true;
              if (video.paused) {
                video.play().catch(err => console.log('CanPlay autoplay failed:', err));
              }
            }}
            onLoadedData={(e) => {
              const video = e.currentTarget;
              video.muted = true;
              if (video.paused) {
                video.play().catch(err => console.log('LoadedData autoplay failed:', err));
              }
            }}
            onSuspend={(e) => {
              const video = e.currentTarget;
              if (video.paused) {
                video.play().catch(() => {});
              }
            }}
            onPause={(e) => {
              // If video pauses unexpectedly, try to resume
              const video = e.currentTarget;
              setTimeout(() => {
                if (video.paused) {
                  video.play().catch(() => {});
                }
              }, 100);
            }}
            onClick={(e) => {
              // On user interaction, ensure video plays
              const video = e.currentTarget;
              video.muted = true;
              if (video.paused) {
                video.play().catch(() => {});
              }
            }}
            className={`absolute inset-0 w-full h-full object-cover z-0 scrollbar-hide ${positioning.className}`}
            style={{
              objectPosition: positioning.objectPosition
            }}
          >
            <source src={backgroundPath} type="video/mp4" />
          </video>
        );
      } else {
        const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        return (
          <img
            src={backgroundPath}
            alt={DisplayBackgroundEquip.name}
            loading="lazy" // Always lazy load for performance
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
          <div className="flex-1" style={{ 
            background: DisplayBackgroundEquip?.name === 'On A Mission' 
              ? 'transparent'
              : "var(--ui-navbar-bg)",
            backdropFilter: DisplayBackgroundEquip?.name === 'On A Mission' ? 'none' : 'none'
          }}>
            <NavigationWithInvitations
              currentSection={currentSection}
              isGameOver={isGameOver}
              onSectionChange={handleSectionChange}
            >
              {/* Left Navigation */}
              <div className="flex flex-row items-center justify-start gap-[1rem] md:gap-[2rem]">
              {/* Logo Section */}
              <div className="flex flex-row items-center justify-start gap-[1rem]">
                <img
                  src="/Design Elements/CrownLogo.webp"
                  alt="DashDice Logo"
                  className="w-8 h-8 md:w-14 md:h-14 object-contain"
                  loading="lazy"
                  decoding="async"
                  style={{ maxWidth: '56px', maxHeight: '56px' }}
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
                  onClick={() => handleSectionChange('ranked')}
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
            </NavigationWithInvitations>
          </div>
        </header>

        {/* Main Content Area - Simplified without video transitions for now */}
        {(currentSection === 'match' || currentSection === 'waiting-room') ? (
          // Full-screen centered layout for match, waiting-room, and winner screens
          <main className="flex-1 w-full h-full min-h-0 overflow-hidden flex items-center justify-center">
            <AnimatePresence>
              <motion.div
                key={currentSection}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.5, ease: 'easeInOut' }}
                className="w-full h-full flex items-center justify-center"
                style={{ position: 'absolute', inset: 0 }}
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
                    <SoftRankedLeaderboard />
                  )}
                  {currentSection === 'profile' && <ProfileSection />}
                  {currentSection === 'settings' && <ProfileSection />}
                  {currentSection === 'user-profile' && sectionParams.userId && (
                    <UserProfileViewer 
                      userId={sectionParams.userId}
                      onClose={() => setCurrentSection(previousSection || 'friends')}
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
            className="md:hidden fixed bottom-0 left-0 right-0 w-[100vw] flex flex-col items-center justify-center z-50"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)', padding: '0' }}
          >
            <NavigationWithInvitations
              currentSection={currentSection}
              isGameOver={isGameOver}
              onSectionChange={handleSectionChange}
            >
              {/* Mobile Navigation Container */}
              <div className="w-full" style={{
                background: DisplayBackgroundEquip?.name === 'On A Mission' 
                  ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.6) 0%, rgba(14, 165, 233, 0.3) 50%, rgba(14, 165, 233, 0.1) 100%)'
                  : (DisplayBackgroundEquip?.name === 'Long Road Ahead' || DisplayBackgroundEquip?.name === 'As They Fall' || DisplayBackgroundEquip?.name === 'End Of The Dragon')
                  ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.6) 0%, rgba(76, 29, 149, 0.4) 25%, rgba(30, 27, 75, 0.3) 50%, rgba(30, 58, 138, 0.4) 75%, rgba(59, 130, 246, 0.3) 100%)'
                  : DisplayBackgroundEquip?.name === 'New Day'
                  ? 'linear-gradient(0deg, #5a7579 0%, transparent 100%)'
                  : DisplayBackgroundEquip?.name === 'Relax'
                  ? 'linear-gradient(0deg, #407080 0%, transparent 100%)'
                  : DisplayBackgroundEquip?.name === 'Underwater'
                  ? 'linear-gradient(0deg, #00518c 0%, transparent 100%)'
                  : 'rgba(0, 0, 0, 0.6)',
                backdropFilter: DisplayBackgroundEquip?.name === 'On A Mission' || DisplayBackgroundEquip?.name === 'Long Road Ahead' || DisplayBackgroundEquip?.name === 'As They Fall' || DisplayBackgroundEquip?.name === 'End Of The Dragon' ? 'blur(8px)' : 'none',
                boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)'
              }}>
                
                {/* Profile/Settings Tabs - Only show when on profile section */}
                <AnimatePresence mode="wait">
                  {currentSection === 'profile' && (
                    <motion.div
                      key="profile-tabs"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { duration: 0.2, ease: "easeOut" } }}
                      exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeIn" } }}
                      className="flex items-center justify-center gap-4 px-4 pt-3 pb-2"
                    >
                      <button
                        onClick={() => {
                          // This will be handled by ProfileSection's activeTab state
                          const event = new CustomEvent('profileTabChange', { detail: 'profile' });
                          window.dispatchEvent(event);
                        }}
                        className="profile-tab-btn flex items-center justify-center gap-2 px-6 py-2.5 rounded-[18px] transition-all duration-300"
                        style={{
                          border: '2px solid rgba(255, 255, 255, 0.1)',
                          background: 'transparent',
                        }}
                        data-tab="profile"
                      >
                        <span style={{
                          color: '#FFF',
                          fontFamily: 'Audiowide', 
                          fontSize: '14px', 
                          fontWeight: 400, 
                          textTransform: 'uppercase' 
                        }}>
                          Profile
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          const event = new CustomEvent('profileTabChange', { detail: 'settings' });
                          window.dispatchEvent(event);
                        }}
                        className="profile-tab-btn flex items-center justify-center gap-2 px-6 py-2.5 rounded-[18px] transition-all duration-300"
                        style={{
                          border: '2px solid rgba(255, 255, 255, 0.1)',
                          background: 'transparent',
                        }}
                        data-tab="settings"
                      >
                        <span style={{
                          color: '#FFF',
                          fontFamily: 'Audiowide', 
                          fontSize: '14px', 
                          fontWeight: 400, 
                          textTransform: 'uppercase' 
                        }}>
                          Settings
                        </span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Friends/Manage Tabs - Only show when on friends section */}
                <AnimatePresence mode="wait">
                  {currentSection === 'friends' && (
                    <motion.div
                      key="friends-tabs"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { duration: 0.2, ease: "easeOut" } }}
                      exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeIn" } }}
                      className="flex items-center justify-center gap-4 px-4 pt-3 pb-2"
                    >
                      <button
                        onClick={() => {
                          const event = new CustomEvent('friendsTabChange', { detail: 'friends' });
                          window.dispatchEvent(event);
                        }}
                        className="friends-tab-btn flex items-center justify-center gap-2 px-6 py-2.5 rounded-[18px] transition-all duration-300"
                        style={{
                          border: '2px solid rgba(255, 255, 255, 0.1)',
                          background: 'transparent',
                        }}
                        data-tab="friends"
                      >
                        <span style={{
                          color: '#FFF',
                          fontFamily: 'Audiowide', 
                          fontSize: '14px', 
                          fontWeight: 400, 
                          textTransform: 'uppercase' 
                        }}>
                          Friends
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          const event = new CustomEvent('friendsTabChange', { detail: 'manage' });
                          window.dispatchEvent(event);
                        }}
                        className="friends-tab-btn flex items-center justify-center gap-2 px-6 py-2.5 rounded-[18px] transition-all duration-300"
                        style={{
                          border: '2px solid rgba(255, 255, 255, 0.1)',
                          background: 'transparent',
                        }}
                        data-tab="manage"
                      >
                        <span style={{
                          color: '#FFF',
                          fontFamily: 'Audiowide', 
                          fontSize: '14px', 
                          fontWeight: 400, 
                          textTransform: 'uppercase' 
                        }}>
                          Manage
                        </span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Vault Tabs - Only show when on inventory section */}
                <AnimatePresence mode="wait">
                  {currentSection === 'inventory' && (
                    <motion.div
                      key="vault-tabs"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { duration: 0.2, ease: "easeOut" } }}
                      exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeIn" } }}
                      className="flex flex-col items-stretch justify-center gap-3 px-4 pt-3 pb-2 w-full"
                    >
                      {/* Top Row: Decider (left), Victory (right) */}
                      <div className="flex items-center justify-center gap-4 w-full px-8">
                        <button
                          onClick={() => {
                            const event = new CustomEvent('vaultTabChange', { detail: 'decider' });
                            window.dispatchEvent(event);
                          }}
                          className="vault-tab-btn flex items-center justify-center gap-2 px-5 py-2.5 rounded-[18px] transition-all duration-300"
                          style={{
                            border: '2px solid rgba(255, 255, 255, 0.1)',
                            background: 'transparent',
                          }}
                          data-tab="decider"
                        >
                          <span style={{
                            color: '#FFF',
                            fontFamily: 'Audiowide', 
                            fontSize: '14px', 
                            fontWeight: 400, 
                            textTransform: 'uppercase' 
                          }}>
                            Decider
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            const event = new CustomEvent('vaultTabChange', { detail: 'victory' });
                            window.dispatchEvent(event);
                          }}
                          className="vault-tab-btn flex items-center justify-center gap-2 px-5 py-2.5 rounded-[18px] transition-all duration-300"
                          style={{
                            border: '2px solid rgba(255, 255, 255, 0.1)',
                            background: 'transparent',
                          }}
                          data-tab="victory"
                        >
                          <span style={{
                            color: '#FFF',
                            fontFamily: 'Audiowide', 
                            fontSize: '14px', 
                            fontWeight: 400, 
                            textTransform: 'uppercase' 
                          }}>
                            Victory
                          </span>
                        </button>
                      </div>
                      {/* Bottom Row: Flexin (left), Vibin (middle), Power (right) */}
                      <div className="flex items-center justify-between w-full px-2">
                        <button
                          onClick={() => {
                            const event = new CustomEvent('vaultTabChange', { detail: 'match' });
                            window.dispatchEvent(event);
                          }}
                          className="vault-tab-btn flex items-center justify-center gap-2 px-5 py-2.5 rounded-[18px] transition-all duration-300"
                          style={{
                            border: '2px solid rgba(255, 255, 255, 0.1)',
                            background: 'transparent',
                          }}
                          data-tab="match"
                        >
                          <span style={{
                            color: '#FFF',
                            fontFamily: 'Audiowide', 
                            fontSize: '14px', 
                            fontWeight: 400, 
                            textTransform: 'uppercase' 
                          }}>
                            Flexin
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            const event = new CustomEvent('vaultTabChange', { detail: 'display' });
                            window.dispatchEvent(event);
                          }}
                          className="vault-tab-btn flex items-center justify-center gap-2 px-5 py-2.5 rounded-[18px] transition-all duration-300"
                          style={{
                            border: '2px solid rgba(255, 255, 255, 0.1)',
                            background: 'transparent',
                          }}
                          data-tab="display"
                        >
                          <span style={{
                            color: '#FFF',
                            fontFamily: 'Audiowide', 
                            fontSize: '14px', 
                            fontWeight: 400, 
                            textTransform: 'uppercase' 
                          }}>
                            Vibin
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            const event = new CustomEvent('vaultTabChange', { detail: 'power' });
                            window.dispatchEvent(event);
                          }}
                          className="vault-tab-btn flex items-center justify-center gap-2 px-5 py-2.5 rounded-[18px] transition-all duration-300"
                          style={{
                            border: '2px solid rgba(255, 255, 255, 0.1)',
                            background: 'transparent',
                          }}
                          data-tab="power"
                        >
                          <span style={{
                            color: '#FFF',
                            fontFamily: 'Audiowide', 
                            fontSize: '14px', 
                            fontWeight: 400, 
                            textTransform: 'uppercase' 
                          }}>
                            Power
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Main Navigation Row */}
                <div className="flex flex-row items-center justify-between w-full px-[2vw] py-[15px]">
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
                    <img 
                      src="/Design Elements/CrownLogo.webp" 
                      alt="Play" 
                      className="w-12 h-12 object-contain" 
                      loading="lazy"
                      decoding="async"
                      style={{ maxWidth: '48px', maxHeight: '48px' }}
                    />
                    <span className="hidden text-xs text-white font-semibold text-center" style={{ fontFamily: "Audiowide" }}>PLAY</span>
                  </button>
                  <button
                    onClick={() => handleSectionChange('ranked')}
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
              </div>
            </NavigationWithInvitations>
          </footer>
        )}
        
        {/* Mobile Background Position Control */}
        <MobileBackgroundControl currentSection={currentSection} />
        
        {/* Achievement Notifications */}
        <AchievementNotificationDisplay />
        
        {/* Global Rematch Notifications */}
        <GlobalRematchNotification />
        
        {/* Invite Accepted Notifications - Auto-navigate sender to match */}
        <InviteAcceptedNotification />
        
        {/* Invite Declined Notifications - Show toast to sender */}
        <InviteDeclinedNotification />
        
        {/* Game Invitation Notifications - Now handled by NavigationWithInvitations */}
        
        {/* Persistent Match Notifications */}
        <PersistentNotificationManager />
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
