'use client';

import React, { useState } from 'react';
import { FriendWithStatus } from '@/types/friends';
import { useFriends } from '@/context/FriendsContext';
import MiniGameModeSelector from './MiniGameModeSelector';
import { useBackground } from '@/context/BackgroundContext';

interface FriendCardProps {
  friend: FriendWithStatus;
  compact?: boolean;
  showActions?: boolean;
}

// Function to get background style for friend card
const getFriendBackgroundStyle = (friend: FriendWithStatus) => {
  // Type assertion to handle the actual nested inventory structure
  const friendData = friend.friendData as any;
  
  console.log('Friend background data:', {
    friendId: friend.friendId,
    friendData: friendData,
    inventory: friendData?.inventory,
    displayBackgroundEquipped: friendData?.inventory?.displayBackgroundEquipped
  });
  
  // Check if friend has display background equipped in the new nested structure
  if (friendData?.inventory?.displayBackgroundEquipped) {
    const background = friendData.inventory.displayBackgroundEquipped;
    
    // Handle the new structure with name and file properties
    if (background && typeof background === 'object') {
      // Handle object with file property
      if (background.file) {
        const backgroundUrl = background.file.startsWith('/') 
          ? background.file 
          : `/backgrounds/${background.file}`;
        
        console.log('Using background from file property:', backgroundUrl);
        return {
          backgroundImage: `url(${backgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        };
      }
      
      // Handle object with url property
      if (background.url) {
        console.log('Using background from url property:', background.url);
        return {
          backgroundImage: `url(${background.url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        };
      }
      
      // Handle object with name property - construct path
      if (background.name) {
        let backgroundUrl = '';
        
        // Map background names to their file paths
        switch (background.name) {
          case 'Long Road Ahead':
            backgroundUrl = '/backgrounds/Long Road Ahead.jpg';
            break;
          case 'On A Mission':
            backgroundUrl = '/backgrounds/On A Mission.mp4';
            break;
          case 'New Day':
            backgroundUrl = '/backgrounds/New Day.mp4';
            break;
          case 'Relax':
            backgroundUrl = '/backgrounds/Relax.png';
            break;
          case 'Underwater':
            backgroundUrl = '/backgrounds/Underwater.mp4';
            break;
          case 'All For Glory':
            backgroundUrl = '/backgrounds/All For Glory.jpg';
            break;
          default:
            // Try to construct path from name
            backgroundUrl = `/backgrounds/${background.name}`;
        }
        
        if (backgroundUrl) {
          console.log('Using background from name property:', backgroundUrl);
          return {
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          };
        }
      }
    } else if (typeof background === 'string') {
      // Handle string URLs
      const backgroundUrl = background.startsWith('/') ? background : `/backgrounds/${background}`;
      console.log('Using background from string:', backgroundUrl);
      return {
        backgroundImage: `url(${backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }
  }
  
  // Fallback: Check legacy equippedBackground field
  if (friendData?.equippedBackground) {
    console.log('Using legacy equippedBackground:', friendData.equippedBackground);
    return {
      backgroundImage: `url(${friendData.equippedBackground})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    };
  }
  
  // Final fallback: Check if they have any background in their inventory array
  if (friendData?.inventory && Array.isArray(friendData.inventory)) {
    const backgroundItem = friendData.inventory.find((item: any) => item.type === 'background');
    if (backgroundItem) {
      console.log('Using background from inventory array:', backgroundItem.imageUrl);
      return {
        backgroundImage: `url(${backgroundItem.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }
  }
  
  console.log('No background found for friend:', friend.friendId);
  return {};
};

export default function FriendCard({ friend, compact = false, showActions = true }: FriendCardProps) {
  const { removeFriend, sendGameInvitation, friendPresences } = useFriends();
  const [isRemoving, setIsRemoving] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [showGameModeSelector, setShowGameModeSelector] = useState(false);
  const [selectedGameMode, setSelectedGameMode] = useState('classic');

  // Get presence from context
  const presence = friendPresences?.[friend.friendId];
  const presenceStatus = presence?.status || 'offline';

  const handleRemoveFriend = async () => {
    if (window.confirm(`Are you sure you want to remove ${friend.friendData.displayName} from your friends list?`)) {
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
      await sendGameInvitation(friend.friendId, selectedGameMode);
      setShowGameModeSelector(false); // Collapse selector after invitation sent
    } catch (error) {
      console.error('Error sending game invitation:', error);
    } finally {
      setIsInviting(false);
    }
  };

  const handleGameModeSelect = (gameMode: string) => {
    setSelectedGameMode(gameMode);
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
                {friend.friendData.displayName?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(presenceStatus)} rounded-full border-2 border-gray-800`}></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium font-audiowide truncate">{friend.friendData.displayName}</p>
            <p className="text-white text-sm font-montserrat">{getStatusText(presenceStatus)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative overflow-hidden transition-all duration-200"
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
      
      <div className="relative z-10 p-4">
        {/* Desktop Layout */}
        <div className="hidden md:block">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg font-bold font-audiowide">
                    {friend.friendData.displayName?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(presenceStatus)} rounded-full border-2 border-gray-800`}></div>
              </div>
              <div>
                <h3 className="text-white font-semibold font-audiowide">{friend.friendData.displayName}</h3>
                <p className="text-white text-sm font-montserrat">{getStatusText(presenceStatus)}</p>
              </div>
            </div>
            
            {showActions && (
              <div className="flex gap-2">
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
            )}
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-bold font-audiowide">
                  {friend.friendData.displayName?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(presenceStatus)} rounded-full border-2 border-gray-800`}></div>
            </div>
            <div>
              <h3 className="text-white font-semibold font-audiowide">{friend.friendData.displayName}</h3>
              <p className="text-white text-sm font-montserrat">{getStatusText(presenceStatus)}</p>
            </div>
          </div>
          
          {showActions && (
            <div className="flex gap-2 flex-wrap">
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
          )}
        </div>
        
        {/* Game Mode Selector - appears when invite is clicked */}
        {showGameModeSelector && (
          <div className="mt-3 space-y-2">
            <div className="text-white text-sm font-medium font-audiowide">
              Choose Game Mode:
            </div>
            <MiniGameModeSelector
              onGameModeSelect={handleGameModeSelect}
              isDisabled={presenceStatus === 'offline'}
              className="mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleGameInvite}
                disabled={isInviting}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded font-montserrat transition-colors"
              >
                {isInviting ? 'Sending Invite...' : `Invite to ${selectedGameMode.charAt(0).toUpperCase() + selectedGameMode.slice(1)}`}
              </button>
            </div>
          </div>
        )}
        
        {presence?.lastSeen && presenceStatus === 'offline' && (
          <div className="text-white text-xs font-montserrat opacity-75">
            Last seen: {new Date(presence.lastSeen.toDate()).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
