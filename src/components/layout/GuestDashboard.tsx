'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { NavigationProvider, useNavigation, DashboardSection } from '@/context/NavigationContext';
import { SectionTransition } from '@/components/layout/SectionTransition';
import { DashboardSection as DashboardSectionComponent } from '@/components/dashboard/DashboardSectionNew';
import { MatchSection } from '@/components/dashboard/MatchSectionNew';
import { Match } from '@/components/dashboard/Match';
import { resolveBackgroundPath } from '@/config/backgrounds';
import { GameWaitingRoom } from '@/components/dashboard/GameWaitingRoom';
// Using direct image paths from Design Elements folder
import { InventorySection } from '@/components/dashboard/InventoryReference';
import ProfileSection from '@/components/dashboard/ProfileSection';
import UserProfileViewer from '@/components/profile/UserProfileViewer';
import AchievementNotificationDisplay from '@/components/achievements/AchievementNotification';
import AchievementsDashboard from '@/components/achievements/AchievementsDashboard';
import FriendsDashboard from '@/components/friends/FriendsDashboard';
import { RankedDashboard } from '@/components/ranked/RankedDashboard';
import SwipeRightChat from '@/components/chat/SwipeRightChat';
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
import { createTestMatch } from '@/utils/testMatchData';
import { GuestGameWaitingRoom } from '@/components/guest/GuestGameWaitingRoom';
import { guestBotMatchmaking, GuestMatchData } from '@/services/guestBotMatchmaking';
import { enhancedGuestMatchmaking, GuestUserData } from '@/services/enhancedGuestMatchmaking';
import EnhancedGuestGameWaitingRoom from '@/components/guest/EnhancedGuestGameWaitingRoom';
import GuestMatch from '@/components/guest/GuestMatch';
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
                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all transform hover:scale-105"
                style={{ 
                  fontFamily: "Audiowide",
                  boxShadow: "0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.3)",
                  filter: "drop-shadow(0 0 10px rgba(255, 215, 0, 0.4))"
                }}
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
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold px-6 py-3 rounded-full transition-all transform hover:scale-105"
        style={{ 
          fontFamily: "Audiowide",
          boxShadow: "0 0 30px rgba(255, 215, 0, 0.6), 0 0 60px rgba(255, 215, 0, 0.4), 0 8px 25px rgba(0, 0, 0, 0.3)",
          filter: "drop-shadow(0 0 20px rgba(255, 215, 0, 0.5))"
        }}
      >
        SIGN UP
      </button>
    </Link>
  );
};

const GuestDashboardContent: React.FC = () => {
  const router = useRouter();
  const { currentSection, sectionParams, setCurrentSection, isGameOver } = useNavigation();
  const { user } = useAuth();
  const { DisplayBackgroundEquip } = useBackground();
  const { getBackgroundPosition } = useBackgroundPositioning();
  const onlinePlayerCount = useOnlinePlayerCount();
  
  // Guest-specific state
  const [guestUser] = useState<GuestUserData>(() => enhancedGuestMatchmaking.generateGuestUser());
  const [isGuestWaiting, setIsGuestWaiting] = useState(false);
  const [waitingGameMode, setWaitingGameMode] = useState<string>();
  const [guestMatchRoomId, setGuestMatchRoomId] = useState<string>();

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
      // For guests, we don't create a real match - this shouldn't be called directly
      // Instead, guests should go through handleGameModeAction
      console.log('🚫 Direct match access not allowed for guests');
      return;
    } else {
      setCurrentSection(section as DashboardSection);
    }
  };
  
  // Handle game mode selection for guests - redirect to sign-up page
  const handleGameModeAction = (gameMode: string, actionType: 'live' | 'ranked') => {
    console.log(`🚀 Guest user clicked ${gameMode} ${actionType} - redirecting to sign-up`);
    router.push('/register');
  };
  
  // Handle enhanced guest match start
  const handleEnhancedGuestMatchStart = (roomId: string, gameMode: string) => {
    console.log(`🎯 Enhanced guest match starting: ${roomId}`);
    setIsGuestWaiting(false);
    setGuestMatchRoomId(roomId);
    setCurrentSection('match' as DashboardSection, { 
      roomId: roomId, 
      gameMode: gameMode,
      isGuestMatch: true
    });
  };
  
  // Handle enhanced guest waiting room back
  const handleEnhancedGuestWaitingBack = () => {
    console.log('⬅️ Enhanced guest returning to dashboard');
    setIsGuestWaiting(false);
    setWaitingGameMode(undefined);
    setCurrentSection('dashboard' as DashboardSection);
  };

  // Legacy guest match handlers (for fallback)
  const handleGuestMatchFound = (matchData: GuestMatchData) => {
    console.log('🎮 Legacy guest match ready!', matchData);
    setIsGuestWaiting(false);
    setCurrentSection('match' as DashboardSection, { 
      roomId: matchData.matchId, 
      gameMode: matchData.gameMode,
      isGuestMatch: true,
      botOpponent: matchData.botOpponent
    });
  };
  
  const handleGuestMatchCancel = () => {
    console.log('❌ Legacy guest matchmaking cancelled');
    setIsGuestWaiting(false);
    setWaitingGameMode(undefined);
  };

  // Prevent re-renders during guest waiting to avoid infinite loops
  const stableGuestUser = React.useMemo(() => guestUser, []);
  const stableHandleGuestMatchFound = React.useCallback((matchData: GuestMatchData) => {
    console.log('🎮 Guest match ready!', matchData);
    setIsGuestWaiting(false);
    setWaitingGameMode(undefined);
    setCurrentSection('match' as DashboardSection, { 
      roomId: matchData.matchId, 
      gameMode: matchData.gameMode,
      isGuestMatch: true,
      botOpponent: matchData.botOpponent
    });
  }, [setCurrentSection]);

  const stableHandleGuestMatchCancel = React.useCallback(() => {
    console.log('❌ Guest matchmaking cancelled');
    setIsGuestWaiting(false);
    setWaitingGameMode(undefined);
  }, []);

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
      return (
        <video
          key="/backgrounds/New Day.mp4"
          autoPlay
          loop
          muted
          playsInline
          webkit-playsinline="true"
          x5-playsinline="true"
          x5-video-player-type="h5-page"
          x5-video-player-fullscreen="false"
          controls={false}
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          onLoadedMetadata={(e) => {
            const video = e.target as HTMLVideoElement;
            video.muted = true;
            video.play().catch(() => {});
            handleVideoLoad(video);
          }}
          onCanPlay={(e) => {
            const video = e.target as HTMLVideoElement;
            video.muted = true;
            if (video.paused) video.play().catch(() => {});
          }}
          onLoadedData={(e) => {
            const video = e.target as HTMLVideoElement;
            video.muted = true;
            if (video.paused) video.play().catch(() => {});
            handleVideoLoad(video);
          }}
          onSuspend={(e) => {
            const video = e.target as HTMLVideoElement;
            if (video.paused) video.play().catch(() => {});
          }}
          onPause={(e) => {
            const video = e.target as HTMLVideoElement;
            setTimeout(() => {
              if (video.paused) video.play().catch(() => {});
            }, 100);
          }}
          onClick={(e) => {
            const video = e.target as HTMLVideoElement;
            video.muted = true;
            if (video.paused) video.play().catch(() => {});
          }}
          className="fixed inset-0 w-full h-full object-cover z-0"
          style={{
            objectFit: 'cover',
            objectPosition: 'center center'
          }}
        >
          <source src="/backgrounds/New Day.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      );
    }

    // For authenticated users, render their equipped background
    if (DisplayBackgroundEquip) {
      const positioning = getBackgroundPosition(DisplayBackgroundEquip.name);
      const resolved = resolveBackgroundPath(DisplayBackgroundEquip.id, 'dashboard-display');
      
      if (DisplayBackgroundEquip.category === 'Videos' && resolved) {
        return (
          <video
            key={resolved.path}
            autoPlay
            loop
            muted
            playsInline
            webkit-playsinline="true"
            x5-playsinline="true"
            x5-video-player-type="h5-page"
            x5-video-player-fullscreen="false"
            controls={false}
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            onLoadedMetadata={(e) => {
              const video = e.target as HTMLVideoElement;
              video.muted = true;
              video.play().catch(() => {});
              handleVideoLoad(video);
            }}
            onCanPlay={(e) => {
              const video = e.target as HTMLVideoElement;
              video.muted = true;
              if (video.paused) video.play().catch(() => {});
            }}
            onLoadedData={(e) => {
              const video = e.target as HTMLVideoElement;
              video.muted = true;
              if (video.paused) video.play().catch(() => {});
              handleVideoLoad(video);
            }}
            onSuspend={(e) => {
              const video = e.target as HTMLVideoElement;
              if (video.paused) video.play().catch(() => {});
            }}
            onPause={(e) => {
              const video = e.target as HTMLVideoElement;
              setTimeout(() => {
                if (video.paused) video.play().catch(() => {});
              }, 100);
            }}
            onClick={(e) => {
              const video = e.target as HTMLVideoElement;
              video.muted = true;
              if (video.paused) video.play().catch(() => {});
            }}
            className="fixed inset-0 w-full h-full object-cover z-0"
            style={{
              objectFit: 'cover',
              objectPosition: positioning.objectPosition || 'center center'
            }}
          >
            <source src={resolved.path} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        );
      } else if (resolved) {
        return (
          <img
            src={resolved.path}
            alt={DisplayBackgroundEquip.name}
            className="fixed inset-0 w-full h-full object-cover z-0"
            style={{
              objectFit: 'cover',
              objectPosition: positioning.objectPosition || 'center center'
            }}
          />
        );
      }
    }

    // Fallback - no background
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
    <SwipeRightChat>
      <div 
        className="guest-dashboard-container"
        style={{
          width: '100%',
          height: '100vh',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
      {/* Notifications */}
      <AchievementNotificationDisplay />
      <GlobalRematchNotification />
      <GameInvitationNotification />
      <InviteAcceptedNotification />
      <PersistentNotificationManager />

      {/* Main Layout */}
      <div className="relative z-10 min-h-screen flex flex-col" style={{
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
                {/* VAULT Button - Redirects to signup for guests */}
                <Link href="/register">
                  <button
                    className="hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer flex"
                    style={{
                      display: "flex",
                      width: "180px",
                      height: "48px",
                      padding: "8px 16px",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                      borderRadius: "18px",
                      background: "linear-gradient(135deg, #374151 0%, #4B5563 50%, #6B7280 100%)",
                      border: "2px solid rgba(255, 255, 255, 0.3)"
                    }}
                  >
                    <div style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src="/Design Elements/Player Profiles/Vault.webp" alt="Vault" className="w-10 h-10" />
                    </div>
                    <span style={{ color: "#FFF", fontFamily: "Audiowide", fontSize: "20px", fontWeight: 400, lineHeight: "20px" }}>
                      VAULT
                    </span>
                  </button>
                </Link>

                {/* FRIENDS Button - Redirects to signup for guests */}
                <Link href="/register">
                  <button
                    className="hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer flex"
                    style={{
                      display: "flex",
                      width: "180px",
                      height: "48px",
                      padding: "8px 16px",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                      borderRadius: "18px",
                      background: "linear-gradient(135deg, #374151 0%, #4B5563 50%, #6B7280 100%)",
                      border: "2px solid rgba(255, 255, 255, 0.3)"
                    }}
                  >
                    <div style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src="/Design Elements/friends.webp" alt="Friends" className="w-10 h-10" />
                    </div>
                    <span style={{ color: "#FFF", fontFamily: "Audiowide", fontSize: "20px", fontWeight: 400, lineHeight: "20px" }}>
                      FRIENDS
                    </span>
                  </button>
                </Link>

                {/* CHAT Button - Hidden */}
                <div style={{ display: "none" }}>
                  <Link href="/register">
                    <button
                      className="hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer flex"
                      style={{
                        display: "flex",
                        width: "180px",
                        height: "48px",
                        padding: "8px 16px",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "8px",
                        borderRadius: "18px",
                        background: "linear-gradient(135deg, #374151 0%, #4B5563 50%, #6B7280 100%)",
                        border: "2px solid rgba(255, 255, 255, 0.3)"
                      }}
                    >
                      <div style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img src="/Design Elements/chat.webp" alt="Chat" className="w-10 h-10" />
                      </div>
                      <span style={{ color: "#FFF", fontFamily: "Audiowide", fontSize: "20px", fontWeight: 400, lineHeight: "20px" }}>
                        CHAT
                      </span>
                    </button>
                  </Link>
                </div>

                {/* RANKED Button - Redirect to donation page */}
                <button
                  onClick={() => {
                    console.log('🎯 Guest RANKED Button clicked - Redirecting to donation page!');
                    window.location.href = '/helpus';
                  }}
                  className="hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer flex"
                  style={{
                    display: "flex",
                    width: "180px",
                    height: "48px",
                    padding: "8px 16px",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                    borderRadius: "18px",
                    background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #9333EA 100%)",
                    border: "none",
                    boxShadow: "0 4px 15px rgba(139, 92, 246, 0.4)"
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
              {/* PROFILE Button - Redirects to signup for guests */}
              <Link href="/register">
                <button
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold rounded-lg transition-all transform hover:scale-105"
                  style={{ 
                    fontFamily: "Audiowide",
                    boxShadow: "0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.2)",
                    filter: "drop-shadow(0 0 10px rgba(255, 215, 0, 0.3))"
                  }}
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

        {/* Enhanced Guest Bot Waiting Room - No longer conditional here, handled by section navigation */}
        
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
              sectionParams.isGuestMatch ? (
                <GuestMatch 
                  matchId={sectionParams.roomId}
                  onBack={() => setCurrentSection('dashboard')}
                />
              ) : (
                <Match 
                  gameMode={sectionParams.gameMode} 
                  roomId={sectionParams.roomId}
                />
              )
            )}
            {currentSection === 'waiting-room' && !user && waitingGameMode && (
              <EnhancedGuestGameWaitingRoom
                gameMode={waitingGameMode}
                guestUser={stableGuestUser}
                onBack={handleEnhancedGuestWaitingBack}
                onMatchStart={handleEnhancedGuestMatchStart}
              />
            )}
            {currentSection === 'waiting-room' && user && (
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
          <main className="flex-1 overflow-auto scrollbar-hide w-full flex items-start md:items-center justify-center" style={{
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
                  {currentSection === 'dashboard' && (
                    <DashboardSectionComponent onGuestGameModeAction={handleGameModeAction} />
                  )}
                  {currentSection === 'inventory' && (
                    <LockedFeatureOverlay featureName="Vault">
                      <InventorySection />
                    </LockedFeatureOverlay>
                  )}
                  {currentSection === 'achievements' && (
                    <LockedFeatureOverlay featureName="Achievements">
                      <div className="blur-sm pointer-events-none">
                        <AchievementsDashboard />
                      </div>
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

        {/* Mobile Bottom Navigation - SIGN IN / SIGN UP buttons */}
        {(currentSection !== 'match' && currentSection !== 'waiting-room') && (
          <footer className="md:hidden fixed bottom-0 left-0 right-0 w-[100vw] flex flex-row items-center justify-center z-50"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)', padding: '0' }}>
            <div className="flex flex-col items-center justify-center w-full px-[4vw] py-[20px] shadow-lg" style={{
              background: 'linear-gradient(0deg, #5a7579 0%, transparent 100%)', // NewDay theme
              borderRadius: '0'
            }}>
              {/* Sign In and Sign Up Buttons */}
              <div className="flex flex-row items-center justify-center gap-4 w-full">
                <Link href="/login" className="flex-1">
                  <button
                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                    style={{ fontFamily: "Audiowide", fontSize: "18px" }}
                  >
                    SIGN IN
                  </button>
                </Link>
                
                <Link href="/register" className="flex-1">
                  <button
                    className="w-full py-4 px-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                    style={{ 
                      fontFamily: "Audiowide", 
                      fontSize: "18px",
                      boxShadow: "0 0 25px rgba(255, 215, 0, 0.5), 0 0 50px rgba(255, 215, 0, 0.3), 0 4px 15px rgba(0, 0, 0, 0.3)",
                      filter: "drop-shadow(0 0 15px rgba(255, 215, 0, 0.4))"
                    }}
                  >
                    SIGN UP
                  </button>
                </Link>
              </div>
            </div>
          </footer>
        )}

        {/* Mobile Background Position Control */}
        <MobileBackgroundControl currentSection={currentSection} />
      </div>
    </div>
    </SwipeRightChat>
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