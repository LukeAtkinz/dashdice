'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FriendWithStatus } from '@/types/friends';
import { useFriends } from '@/context/FriendsContext';
import { useChat } from '@/context/ChatContext';
import { useToast } from '@/context/ToastContext';
import { useNavigation } from '@/context/NavigationContext';
import { openFriendChatInUnified } from '@/components/chat/UnifiedChatWindow';
import MiniGameModeSelector from './MiniGameModeSelector';
import { useBackground } from '@/context/BackgroundContext';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { ProfilePicture } from '@/components/ui/ProfilePicture';

// Game mode icon mapping
const getGameModeIcon = (gameType: string): string => {
  const iconMap: { [key: string]: string } = {
    'classic': '/Design Elements/Crown Mode.webp',
    'quickfire': '/Design Elements/Shield.webp',
    'zero-hour': '/Design Elements/time out.webp',
    'blitz': '/Design Elements/Shield.webp',
    'puzzle': '/Design Elements/Crown Mode.webp',
    'survival': '/Design Elements/skull.webp'
  };
  
  return iconMap[gameType.toLowerCase()] || '/Design Elements/Crown Mode.webp';
};

interface FriendCardProps {
  friend: FriendWithStatus;
  compact?: boolean;
  showActions?: boolean;
}

// Function to get background style for friend card with improved mobile support
const getFriendBackgroundStyle = (friend: FriendWithStatus) => {
  try {
    // Safe type checking to prevent React error #130
    if (!friend || typeof friend !== 'object' || !friend.friendData) {
      return {};
    }

    const friendData = friend.friendData as any;
    
    // Check if friend has display background equipped in the new nested structure
    if (friendData?.inventory?.displayBackgroundEquipped) {
      const background = friendData.inventory.displayBackgroundEquipped;
      
      // Handle complete background objects with name, file, and type
      if (typeof background === 'object' && background.file && background.type) {
        // For video backgrounds, we need to return empty style object since videos are handled separately
        if (background.type === 'video') {
          return {}; // Videos will be handled in JSX with <video> element
        }
        
        // For image backgrounds - fix path handling
        if (background.type === 'image' && background.file) {
          let backgroundPath = background.file;
          
          // Fix common background paths
          if (backgroundPath === 'All For Glory.jpg' || backgroundPath === '/backgrounds/All For Glory.jpg') {
            backgroundPath = '/backgrounds/All For Glory.jpg';
          } else if (backgroundPath === 'Long Road Ahead.jpg' || backgroundPath === '/backgrounds/Long Road Ahead.jpg') {
            backgroundPath = '/backgrounds/Long Road Ahead.jpg';
          } else if (backgroundPath === 'Relax.png' || backgroundPath === '/backgrounds/Relax.png') {
            backgroundPath = '/backgrounds/Relax.png';
          } else if (!backgroundPath.startsWith('/') && !backgroundPath.startsWith('http')) {
            // If it's a filename without path, prepend /backgrounds/
            backgroundPath = `/backgrounds/${backgroundPath}`;
          }
          
          return {
            backgroundImage: `url("${backgroundPath}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            WebkitBackgroundSize: 'cover',
            MozBackgroundSize: 'cover',
            backgroundAttachment: 'scroll'
          };
        }
      }
      
      // Legacy support: Handle string URLs or background objects with different structure
      const backgroundUrl = typeof background === 'string' ? background : background?.file;
      if (backgroundUrl && typeof backgroundUrl === 'string') {
        let backgroundPath = backgroundUrl;
        
        // Fix common background paths for legacy format
        if (backgroundPath === 'All For Glory.jpg' || backgroundPath === '/backgrounds/All For Glory.jpg') {
          backgroundPath = '/backgrounds/All For Glory.jpg';
        } else if (backgroundPath === 'Long Road Ahead.jpg' || backgroundPath === '/backgrounds/Long Road Ahead.jpg') {
          backgroundPath = '/backgrounds/Long Road Ahead.jpg';
        } else if (backgroundPath === 'Relax.png' || backgroundPath === '/backgrounds/Relax.png') {
          backgroundPath = '/backgrounds/Relax.png';
        } else if (!backgroundPath.startsWith('/') && !backgroundPath.startsWith('http')) {
          backgroundPath = `/backgrounds/${backgroundPath}`;
        }
        
        return {
          backgroundImage: `url("${backgroundPath}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          WebkitBackgroundSize: 'cover',
          MozBackgroundSize: 'cover',
          backgroundAttachment: 'scroll'
        };
      }
    }
    
    // Fallback: Check legacy equippedBackground field
    if (friendData?.equippedBackground && typeof friendData.equippedBackground === 'string') {
      let backgroundPath = friendData.equippedBackground;
      
      // Fix paths for legacy equippedBackground
      if (backgroundPath === 'All For Glory.jpg' || backgroundPath === '/backgrounds/All For Glory.jpg') {
        backgroundPath = '/backgrounds/All For Glory.jpg';
      } else if (backgroundPath === 'Long Road Ahead.jpg' || backgroundPath === '/backgrounds/Long Road Ahead.jpg') {
        backgroundPath = '/backgrounds/Long Road Ahead.jpg';
      } else if (backgroundPath === 'Relax.png' || backgroundPath === '/backgrounds/Relax.png') {
        backgroundPath = '/backgrounds/Relax.png';
      } else if (!backgroundPath.startsWith('/') && !backgroundPath.startsWith('http')) {
        backgroundPath = `/backgrounds/${backgroundPath}`;
      }
      
      return {
        backgroundImage: `url("${backgroundPath}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        WebkitBackgroundSize: 'cover',
        MozBackgroundSize: 'cover',
        backgroundAttachment: 'scroll'
      };
    }
    
    // Final fallback: Check if they have any background in their inventory array
    if (friendData?.inventory && Array.isArray(friendData.inventory)) {
      const backgroundItem = friendData.inventory.find((item: any) => 
        item && typeof item === 'object' && item.type === 'background'
      );
      if (backgroundItem?.imageUrl && typeof backgroundItem.imageUrl === 'string') {
        let backgroundPath = backgroundItem.imageUrl;
        
        // Fix paths for inventory backgrounds
        if (backgroundPath === 'All For Glory.jpg' || backgroundPath === '/backgrounds/All For Glory.jpg') {
          backgroundPath = '/backgrounds/All For Glory.jpg';
        } else if (backgroundPath === 'Long Road Ahead.jpg' || backgroundPath === '/backgrounds/Long Road Ahead.jpg') {
          backgroundPath = '/backgrounds/Long Road Ahead.jpg';
        } else if (backgroundPath === 'Relax.png' || backgroundPath === '/backgrounds/Relax.png') {
          backgroundPath = '/backgrounds/Relax.png';
        } else if (!backgroundPath.startsWith('/') && !backgroundPath.startsWith('http')) {
          backgroundPath = `/backgrounds/${backgroundPath}`;
        }
        
        return {
          backgroundImage: `url("${backgroundPath}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          WebkitBackgroundSize: 'cover',
          MozBackgroundSize: 'cover',
          backgroundAttachment: 'scroll'
        };
      }
    }
    
    return {};
  } catch (error) {
    console.warn('Error getting friend background style:', error);
    return {};
  }
};

// Function to get friend's video background for rendering
const getFriendVideoBackground = (friend: FriendWithStatus) => {
  try {
    if (!friend || typeof friend !== 'object' || !friend.friendData) {
      return null;
    }

    const friendData = friend.friendData as any;
    
    // Check for display background in new nested structure
    if (friendData?.inventory?.displayBackgroundEquipped) {
      const background = friendData.inventory.displayBackgroundEquipped;
      
      // Handle complete background objects with video type
      if (typeof background === 'object' && background.type === 'video' && background.file) {
        let videoPath = background.file;
        
        // Fix common video background paths
        if (videoPath === 'New Day.mp4' || videoPath === '/backgrounds/New Day.mp4') {
          videoPath = '/backgrounds/New Day.mp4';
        } else if (videoPath === 'On A Mission.mp4' || videoPath === '/backgrounds/On A Mission.mp4') {
          videoPath = '/backgrounds/On A Mission.mp4';
        } else if (videoPath === 'Underwater.mp4' || videoPath === '/backgrounds/Underwater.mp4') {
          videoPath = '/backgrounds/Underwater.mp4';
        } else if (!videoPath.startsWith('/') && !videoPath.startsWith('http')) {
          // If it's a filename without path, prepend /backgrounds/
          videoPath = `/backgrounds/${videoPath}`;
        }
        
        return {
          file: videoPath,
          name: background.name || 'Background Video'
        };
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Error getting friend video background:', error);
    return null;
  }
};

export default function FriendCard({ friend, compact = false, showActions = true }: FriendCardProps) {
  // Add safety check to prevent React error #130
  if (!friend || typeof friend !== 'object' || !friend.friendData) {
    console.warn('FriendCard: Invalid friend data provided');
    return null;
  }

  const { sendGameInvitation, friendPresences } = useFriends();
  const { setCurrentSection } = useNavigation();
  const { showToast } = useToast();
  const [isInviting, setIsInviting] = useState(false);
  const [isGameSelectorExpanded, setIsGameSelectorExpanded] = useState(false);

  // Get presence from context with safety checks
  const presence = friendPresences?.[friend.friendId];
  const presenceStatus = presence?.status || 'offline';

  const handleViewProfile = () => {
    setCurrentSection('user-profile', { 
      userId: friend.friendId, 
      userName: friend.friendData?.displayName || 'Friend' 
    });
  };

  const handleGameInvite = async (gameMode: string) => {
    setIsInviting(true);
    setIsGameSelectorExpanded(false); // Close the selector after selection
    try {
      if (!friend?.friendId || typeof friend.friendId !== 'string') {
        console.error('Invalid friend ID:', friend?.friendId);
        showToast('Unable to send invitation - invalid friend data', 'error');
        return;
      }
      
      if (!gameMode || typeof gameMode !== 'string') {
        console.error('Invalid game mode:', gameMode);
        showToast('Please select a valid game mode', 'error');
        return;
      }
      
      const result = await sendGameInvitation(friend.friendId, gameMode);
      if (result?.success) {
        console.log('✅ Game invitation sent successfully');
        
        // Enhanced toast with game mode info and icon
        const getGameModeDisplayName = (gameType: string): string => {
          const modeNames: Record<string, string> = {
            'classic': 'Classic Mode',
            'quickfire': 'Quick Fire',
            'zero-hour': 'Zero Hour',
            'last-line': 'Last Line',
            'true-grit': 'True Grit',
            'tag-team': 'Tag Team'
          };
          return modeNames[gameType.toLowerCase()] || gameType.charAt(0).toUpperCase() + gameType.slice(1);
        };
        
        const gameModeName = getGameModeDisplayName(gameMode);
        const gameModeIcon = getGameModeIcon(gameMode);
        showToast(
          `${gameModeName} invite sent to ${friend.friendData?.displayName || 'friend'}!`, 
          'success',
          3000,
          gameModeIcon
        );
      } else {
        console.error('❌ Failed to send game invitation:', result?.error);
        showToast(result?.error || 'Failed to send game invitation', 'error');
      }
    } catch (error) {
      console.error('❌ Error sending game invitation:', error);
      showToast('An error occurred while sending the invitation', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleOpenChat = async () => {
    try {
      if (!friend?.friendId) {
        console.error('Invalid friend ID for chat');
        return;
      }

      // First open the chat window if it's not already open
      const { openChatWindow } = await import('../chat/GlobalChatButton');
      openChatWindow();

      // Wait a minimal moment to ensure the chat window is initialized (reduced from 300ms to 100ms)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Then open the friend's chat tab
      const friendName = friend.friendData?.displayName || 'Unknown Player';
      openFriendChatInUnified(friend.friendId, friendName);
    } catch (error) {
      console.error('Error opening chat:', error);
    }
  };

  // Game mode options for inline selector
  const gameModes = [
    { id: 'quickfire', name: 'Quickfire', icon: '/Design Elements/Shield.webp' },
    { id: 'classic', name: 'Classic Mode', icon: '/Design Elements/Crown Mode.webp' },
    { id: 'zero-hour', name: 'Zero Hour', icon: '/Design Elements/time out.webp' },
    { id: 'last-line', name: 'Last Line', icon: '/Design Elements/skull.webp' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-400';
      case 'away': return 'bg-yellow-400';
      case 'busy': return 'bg-red-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'busy': return 'Busy';
      default: return 'Offline';
    }
  };

  if (compact) {
    return (
      <div 
        className="relative overflow-hidden transition-colors"
        style={{
          ...getFriendBackgroundStyle(friend),
          borderRadius: '20px'
        }}
      >
        {/* Video background for friends with video display backgrounds */}
        {(() => {
          const videoBackground = getFriendVideoBackground(friend);
          if (videoBackground) {
            return (
              <video
                autoPlay
                loop
                muted
                playsInline
                controls={false}
                webkit-playsinline="true"
                x5-playsinline="true"
                preload="metadata"
                className="absolute inset-0 w-full h-full object-cover z-0"
                style={{ borderRadius: '20px' }}
              >
                <source src={videoBackground.file} type="video/mp4" />
              </video>
            );
          }
          return null;
        })()}
        
        {/* Dark overlay gradient for text readability - left (black) to right (transparent) */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, transparent 100%)',
            borderRadius: '20px',
            zIndex: 1
          }}
        ></div>
        
        <div className="relative z-10 flex items-center gap-3 p-3">
          <div className="relative">
            <ProfilePicture
              src={friend.friendData?.profilePicture || friend.friendData?.photoURL}
              alt={`${friend.friendData?.displayName || 'Friend'}'s profile picture`}
              size="sm"
              fallbackInitials={friend.friendData?.displayName?.charAt(0)?.toUpperCase() || friend.friendData?.userTag?.charAt(0)?.toUpperCase()}
            />
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(presenceStatus)} rounded-full border-2 border-gray-800`}></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium font-audiowide truncate">
              {friend.friendData?.displayName || 'Unknown Player'}
            </p>
            <p className="text-white text-sm font-montserrat">{getStatusText(presenceStatus)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="relative overflow-hidden touch-manipulation"
      style={{
        ...getFriendBackgroundStyle(friend),
        borderRadius: '20px',
        // Enhanced mobile support
        WebkitTransform: 'translateZ(0)', // Hardware acceleration
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}
      animate={{
        height: isGameSelectorExpanded ? 'auto' : 'auto'
      }}
      transition={{
        duration: 0.3,
        ease: "easeInOut"
      }}
      layout
    >
      {/* Video background for friends with video display backgrounds */}
      {(() => {
        const videoBackground = getFriendVideoBackground(friend);
        if (videoBackground) {
          return (
            <video
              autoPlay
              loop
              muted
              playsInline
              controls={false}
              webkit-playsinline="true"
              x5-playsinline="true"
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover z-0"
              style={{ borderRadius: '20px' }}
            >
              <source src={videoBackground.file} type="video/mp4" />
            </video>
          );
        }
        return null;
      })()}
      
      {/* Dark overlay gradient for text readability - left (black) to right (transparent) */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to right, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, transparent 100%)',
          borderRadius: '20px',
          zIndex: 1
        }}
      ></div>
      
      <div className="relative z-10 p-4">
        {/* Action buttons - Desktop: inline, Mobile: stacked below */}
        {showActions && (
          <motion.div 
            className="space-y-2"
            layout
          >
            {/* Desktop: Horizontal layout aligned with content */}
            <div className="hidden sm:flex items-center gap-3">
              {/* Profile section content for alignment */}
              <div className="flex items-center gap-3 flex-1">
                <div className="relative">
                  <ProfilePicture
                    src={friend.friendData?.profilePicture || friend.friendData?.photoURL}
                    alt={`${friend.friendData?.displayName || 'Friend'}'s profile picture`}
                    size="md"
                    fallbackInitials={friend.friendData?.displayName?.charAt(0)?.toUpperCase() || friend.friendData?.userTag?.charAt(0)?.toUpperCase()}
                  />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(presenceStatus)} rounded-full border-2 border-gray-800`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold font-audiowide truncate">
                    {friend.friendData?.displayName || 'Unknown Player'}
                  </h3>
                  <p className="text-white text-sm font-montserrat">{getStatusText(presenceStatus)}</p>
                </div>
              </div>
              
              {/* Action buttons aligned with content */}
              <div className="flex gap-2">
                <motion.button
                  onClick={() => setIsGameSelectorExpanded(!isGameSelectorExpanded)}
                  disabled={presenceStatus === 'offline' || isInviting}
                  whileHover={presenceStatus !== 'offline' && !isInviting ? { scale: 1.05 } : {}}
                  whileTap={presenceStatus !== 'offline' && !isInviting ? { scale: 0.95 } : {}}
                  className="transition-all duration-300"
                  style={{ 
                    display: 'flex', 
                    width: 'fit-content', 
                    height: '40px', 
                    padding: '4px 16px', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    gap: '10px', 
                    borderRadius: '18px', 
                    background: (presenceStatus === 'offline' || isInviting) ? 'rgba(255, 0, 128, 0.5)' : '#FF0080', 
                    border: 'none', 
                    cursor: (presenceStatus === 'offline' || isInviting) ? 'not-allowed' : 'pointer',
                    fontFamily: 'Audiowide',
                    color: '#FFF',
                    fontSize: '12px',
                    fontWeight: 400,
                    textTransform: 'uppercase'
                  }}
                >
                  {isGameSelectorExpanded ? 'SELECT' : 'INVITE'}
                </motion.button>
                <button
                  onClick={handleOpenChat}
                  className="transition-all duration-300 hover:scale-105"
                  style={{ 
                    display: 'flex', 
                    width: 'fit-content', 
                    height: '40px', 
                    padding: '4px 16px', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    gap: '10px', 
                    borderRadius: '18px', 
                    background: '#FF0080', 
                    border: 'none', 
                    cursor: 'pointer',
                    fontFamily: 'Audiowide',
                    color: '#FFF',
                    fontSize: '12px',
                    fontWeight: 400,
                    textTransform: 'uppercase'
                  }}
                >
                  CHAT
                </button>
                <button
                  onClick={handleViewProfile}
                  className="transition-all duration-300 hover:scale-105"
                  style={{ 
                    display: 'flex', 
                    width: 'fit-content', 
                    height: '40px', 
                    padding: '4px 16px', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    gap: '10px', 
                    borderRadius: '18px', 
                    background: '#FF0080', 
                    border: 'none', 
                    cursor: 'pointer',
                    fontFamily: 'Audiowide',
                    color: '#FFF',
                    fontSize: '12px',
                    fontWeight: 400,
                    textTransform: 'uppercase'
                  }}
                >
                  PROFILE
                </button>
              </div>
            </div>

            {/* Mobile: Show profile section separately */}
            <div className="sm:hidden">
              {/* Profile section - Mobile */}
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <ProfilePicture
                    src={friend.friendData?.profilePicture || friend.friendData?.photoURL}
                    alt={`${friend.friendData?.displayName || 'Friend'}'s profile picture`}
                    size="md"
                    fallbackInitials={friend.friendData?.displayName?.charAt(0)?.toUpperCase() || friend.friendData?.userTag?.charAt(0)?.toUpperCase()}
                  />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(presenceStatus)} rounded-full border-2 border-gray-800`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold font-audiowide truncate">
                    {friend.friendData?.displayName || 'Unknown Player'}
                  </h3>
                  <p className="text-white text-sm font-montserrat">{getStatusText(presenceStatus)}</p>
                </div>
              </div>
              
              {/* Mobile buttons */}
              <div className="flex flex-col gap-2 mt-2">
                <motion.button
                  onClick={() => setIsGameSelectorExpanded(!isGameSelectorExpanded)}
                  disabled={presenceStatus === 'offline' || isInviting}
                  whileHover={presenceStatus !== 'offline' && !isInviting ? { scale: 1.05 } : {}}
                  whileTap={presenceStatus !== 'offline' && !isInviting ? { scale: 0.95 } : {}}
                  className="w-full transition-all duration-300"
                  style={{ 
                    display: 'flex', 
                    width: '100%', 
                    height: '48px', 
                    padding: '4px 30px', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    gap: '10px', 
                    borderRadius: '18px', 
                    background: (presenceStatus === 'offline' || isInviting) ? 'rgba(255, 0, 128, 0.5)' : '#FF0080', 
                    border: 'none', 
                    cursor: (presenceStatus === 'offline' || isInviting) ? 'not-allowed' : 'pointer',
                    fontFamily: 'Audiowide',
                    color: '#FFF',
                    fontSize: '14px',
                    fontWeight: 400,
                    textTransform: 'uppercase'
                  }}
                >
                  {isGameSelectorExpanded ? 'SELECT GAME MODE' : 'INVITE TO GAME'}
                </motion.button>
                <div className="flex gap-2">
                  <button
                    onClick={handleOpenChat}
                    className="flex-1 transition-all duration-300 hover:scale-105 touch-manipulation"
                    style={{ 
                      display: 'flex', 
                      width: 'fit-content', 
                      height: '48px', 
                      padding: '4px 20px', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      gap: '10px', 
                      borderRadius: '18px', 
                      background: '#FF0080', 
                      border: 'none', 
                      cursor: 'pointer',
                      fontFamily: 'Audiowide',
                      color: '#FFF',
                      fontSize: '14px',
                      fontWeight: 400,
                      textTransform: 'uppercase'
                    }}
                  >
                    CHAT
                  </button>
                  <button
                    onClick={handleViewProfile}
                    className="flex-1 transition-all duration-300 hover:scale-105 touch-manipulation"
                    style={{ 
                      display: 'flex', 
                      width: 'fit-content', 
                      height: '48px', 
                      padding: '4px 20px', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      gap: '10px', 
                      borderRadius: '18px', 
                      background: '#FF0080', 
                      border: 'none', 
                      cursor: 'pointer',
                      fontFamily: 'Audiowide',
                      color: '#FFF',
                      fontSize: '14px',
                      fontWeight: 400,
                      textTransform: 'uppercase'
                    }}
                  >
                    PROFILE
                  </button>
                </div>
              </div>
            </div>

            {/* Expandable Game Mode Grid - Appears below actions when expanded */}
            <AnimatePresence>
              {isGameSelectorExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="bg-transparent backdrop-blur-[0.5px] border border-gray-700/50 rounded-xl p-4 md:pl-8">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {gameModes.map((mode, index) => (
                        <motion.button
                          key={mode.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.2 }}
                          onClick={() => handleGameInvite(mode.id)}
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex flex-col md:flex-row items-center justify-center md:justify-start p-4 md:p-5 rounded-lg
                                   bg-gray-800/30 hover:bg-gray-700/40 border border-gray-600/50
                                   hover:border-blue-400/70 transition-all duration-200 min-h-[100px] md:min-h-[120px] md:gap-4"
                        >
                          <img 
                            src={mode.icon} 
                            alt={mode.name}
                            className="w-12 h-12 md:w-20 md:h-20 object-contain mb-3 md:mb-0 opacity-60 md:flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/Design Elements/Crown Mode.webp'; // Fallback icon
                            }}
                          />
                          <span className="text-sm md:text-xl text-white font-medium text-center md:text-left leading-tight
                                         drop-shadow-lg md:flex-1 font-audiowide tracking-wide" 
                                style={{ 
                                  textShadow: '0 0 8px rgba(255, 255, 255, 0.3), 0 0 16px rgba(255, 255, 255, 0.1)' 
                                }}>
                            {mode.name}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                    
                    {/* Cancel Button */}
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      onClick={() => setIsGameSelectorExpanded(false)}
                      className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 
                                 text-white rounded-lg font-medium transition-colors"
                      style={{ fontFamily: 'Audiowide' }}
                    >
                      CANCEL
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
        
        {presence?.lastSeen && presenceStatus === 'offline' && (
          <div className="text-white text-xs font-montserrat opacity-75">
            Last seen: {(() => {
              try {
                if (presence.lastSeen && typeof presence.lastSeen.toDate === 'function') {
                  return new Date(presence.lastSeen.toDate()).toLocaleDateString();
                } else if (presence.lastSeen instanceof Date) {
                  return presence.lastSeen.toLocaleDateString();
                } else if (typeof presence.lastSeen === 'string' || typeof presence.lastSeen === 'number') {
                  return new Date(presence.lastSeen).toLocaleDateString();
                }
                return 'Recently';
              } catch (error) {
                console.warn('Error formatting last seen date:', error);
                return 'Recently';
              }
            })()}
          </div>
        )}
      </div>
    </motion.div>
  );
}
