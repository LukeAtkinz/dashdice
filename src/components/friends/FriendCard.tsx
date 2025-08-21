'use client';

import React, { useState } from 'react';
import { FriendWithStatus } from '@/types/friends';
import { useFriends } from '@/context/FriendsContext';
import MiniGameModeSelector from './MiniGameModeSelector';
import { useBackground } from '@/context/BackgroundContext';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

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
      // Handle both string URLs and background objects
      const backgroundUrl = typeof background === 'string' ? background : background?.file;
      if (backgroundUrl && typeof backgroundUrl === 'string') {
        return {
          backgroundImage: `url(${backgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          // Add mobile-specific optimizations
          WebkitBackgroundSize: 'cover',
          MozBackgroundSize: 'cover',
          backgroundAttachment: 'scroll' // Better for mobile performance
        };
      }
    }
    
    // Fallback: Check legacy equippedBackground field
    if (friendData?.equippedBackground && typeof friendData.equippedBackground === 'string') {
      return {
        backgroundImage: `url(${friendData.equippedBackground})`,
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
        return {
          backgroundImage: `url(${backgroundItem.imageUrl})`,
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

export default function FriendCard({ friend, compact = false, showActions = true }: FriendCardProps) {
  // Add safety check to prevent React error #130
  if (!friend || typeof friend !== 'object' || !friend.friendData) {
    console.warn('FriendCard: Invalid friend data provided');
    return null;
  }

  const { removeFriend, sendGameInvitation, friendPresences } = useFriends();
  const [isRemoving, setIsRemoving] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [showGameModeSelector, setShowGameModeSelector] = useState(false);
  const [selectedGameMode, setSelectedGameMode] = useState('classic');

  // Get presence from context with safety checks
  const presence = friendPresences?.[friend.friendId];
  const presenceStatus = presence?.status || 'offline';

  const handleRemoveFriend = async () => {
    const displayName = friend.friendData?.displayName || 'this user';
    if (window.confirm(`Are you sure you want to remove ${displayName} from your friends list?`)) {
      setIsRemoving(true);
      try {
        await removeFriend(friend.friendId);
      } catch (error) {
        console.error('Error removing friend:', error);
      } finally {
        setIsRemoving(false);
      }
    }
  };

  const handleGameInvite = async () => {
    setIsInviting(true);
    try {
      if (!friend?.friendId || typeof friend.friendId !== 'string') {
        console.error('Invalid friend ID:', friend?.friendId);
        return;
      }
      
      const gameMode = selectedGameMode || 'classic';
      if (typeof gameMode !== 'string') {
        console.error('Invalid game mode:', gameMode);
        return;
      }
      
      const result = await sendGameInvitation(friend.friendId, gameMode);
      if (result?.success) {
        setShowGameModeSelector(false); // Collapse selector after invitation sent
      }
    } catch (error) {
      console.error('Error sending game invitation:', error);
    } finally {
      setIsInviting(false);
    }
  };

  const handleGameModeSelect = (gameMode: string) => {
    try {
      if (gameMode && typeof gameMode === 'string') {
        setSelectedGameMode(gameMode);
      } else {
        console.warn('Invalid game mode received:', gameMode);
        setSelectedGameMode('classic');
      }
    } catch (error) {
      console.error('Error in handleGameModeSelect:', error);
      setSelectedGameMode('classic');
    }
  };

  const toggleGameModeSelector = () => {
    if (presenceStatus === 'offline') return; // Don't expand if friend is offline
    setShowGameModeSelector(!showGameModeSelector);
  };

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
        {/* Dark overlay gradient for text readability - left (black) to right (transparent) */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, transparent 100%)',
            borderRadius: '20px'
          }}
        ></div>
        
        <div className="relative z-10 flex items-center gap-3 p-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold font-audiowide">
                {friend.friendData?.displayName?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
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
    <div 
      className="relative overflow-hidden transition-all duration-200 touch-manipulation"
      style={{
        ...getFriendBackgroundStyle(friend),
        borderRadius: '20px',
        // Enhanced mobile support
        WebkitTransform: 'translateZ(0)', // Hardware acceleration
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}
    >
      {/* Dark overlay gradient for text readability - left (black) to right (transparent) */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to right, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, transparent 100%)',
          borderRadius: '20px'
        }}
      ></div>
      
      <div className="relative z-10 p-4">
        {/* Profile section - Always at top */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-bold font-audiowide">
                {friend.friendData?.displayName?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(presenceStatus)} rounded-full border-2 border-gray-800`}></div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold font-audiowide truncate">
              {friend.friendData?.displayName || 'Unknown Player'}
            </h3>
            <p className="text-white text-sm font-montserrat">{getStatusText(presenceStatus)}</p>
          </div>
        </div>

        {/* Action buttons - Desktop: inline, Mobile: stacked below */}
        {showActions && (
          <div className="space-y-2">
            {/* Desktop: Horizontal layout */}
            <div className="hidden sm:flex gap-2">
              <button
                onClick={toggleGameModeSelector}
                disabled={presenceStatus === 'offline'}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded font-montserrat transition-colors"
              >
                {showGameModeSelector ? 'Cancel' : 'Invite'}
              </button>
              <button
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded font-montserrat transition-colors"
              >
                Chat
              </button>
              <button
                onClick={handleRemoveFriend}
                disabled={isRemoving}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded font-montserrat transition-colors"
              >
                {isRemoving ? 'Managing...' : 'Manage'}
              </button>
            </div>

            {/* Mobile: Vertical layout - stacked below profile */}
            <div className="sm:hidden flex flex-col gap-2 mt-2">
              <button
                onClick={toggleGameModeSelector}
                disabled={presenceStatus === 'offline'}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg font-montserrat transition-colors touch-manipulation"
              >
                {showGameModeSelector ? 'Cancel' : 'Invite'}
              </button>
              <div className="flex gap-2">
                <button
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm rounded-lg font-montserrat transition-colors touch-manipulation"
                >
                  Chat
                </button>
                <button
                  onClick={handleRemoveFriend}
                  disabled={isRemoving}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg font-montserrat transition-colors touch-manipulation"
                >
                  {isRemoving ? 'Managing...' : 'Manage'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Game Mode Selector - appears when invite is clicked */}
        {showGameModeSelector && (
          <div className="mt-3 space-y-2">
            <div className="text-white text-sm font-medium font-audiowide">
              Choose Game Mode:
            </div>
            <ErrorBoundary
              fallback={
                <div className="p-2 bg-yellow-100 border border-yellow-300 rounded">
                  <p className="text-yellow-800 text-xs">Game mode selector unavailable</p>
                  <button 
                    onClick={() => setSelectedGameMode('classic')}
                    className="mt-1 px-2 py-1 bg-yellow-600 text-white text-xs rounded"
                  >
                    Use Only One Will Rise
                  </button>
                </div>
              }
            >
              <MiniGameModeSelector
                onGameModeSelect={handleGameModeSelect}
                isDisabled={presenceStatus === 'offline'}
                className="mb-2"
              />
            </ErrorBoundary>
            <div className="flex gap-2">
              <button
                onClick={handleGameInvite}
                disabled={isInviting}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded font-montserrat transition-colors"
              >
                {isInviting ? 'Sending Invite...' : (() => {
                  try {
                    const gameMode = selectedGameMode || 'classic';
                    if (typeof gameMode === 'string' && gameMode.length > 0) {
                      return `Invite to ${gameMode.charAt(0).toUpperCase() + gameMode.slice(1)}`;
                    }
                    return 'Send Invite';
                  } catch (error) {
                    console.warn('Error generating invite button text:', error);
                    return 'Send Invite';
                  }
                })()}
              </button>
            </div>
          </div>
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
    </div>
  );
}
