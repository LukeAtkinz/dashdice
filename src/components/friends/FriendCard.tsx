'use client';

import React, { useState } from 'react';
import { FriendWithStatus } from '@/types/friends';
import { useFriends } from '@/context/FriendsContext';
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
  
  // Check if friend has display background equipped in the new nested structure
  if (friendData?.inventory?.displayBackgroundEquipped) {
    const background = friendData.inventory.displayBackgroundEquipped;
    // Handle both string URLs and background objects
    const backgroundUrl = typeof background === 'string' ? background : background.file;
    if (backgroundUrl) {
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
      return {
        backgroundImage: `url(${backgroundItem.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }
  }
  
  return {};
};

export default function FriendCard({ friend, compact = false, showActions = true }: FriendCardProps) {
  const { removeFriend, sendGameInvitation, friendPresences } = useFriends();
  const [isRemoving, setIsRemoving] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

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
      await sendGameInvitation(friend.friendId, 'classic');
    } catch (error) {
      console.error('Error sending game invitation:', error);
    } finally {
      setIsInviting(false);
    }
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
                onClick={handleGameInvite}
                disabled={isInviting || presenceStatus === 'offline'}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded font-montserrat transition-colors"
              >
                {isInviting ? 'Inviting...' : 'Invite'}
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
        
        {presence?.lastSeen && presenceStatus === 'offline' && (
          <div className="text-white text-xs font-montserrat opacity-75">
            Last seen: {new Date(presence.lastSeen.toDate()).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
