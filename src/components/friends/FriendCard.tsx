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
  // Check if friend has an equipped background
  if (friend.friendData?.equippedBackground) {
    return {
      backgroundImage: `url(${friend.friendData.equippedBackground})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    };
  }
  
  // Fallback: Check if they have any background in their inventory
  if (friend.friendData?.inventory && Array.isArray(friend.friendData.inventory)) {
    const backgroundItem = friend.friendData.inventory.find(item => item.type === 'background');
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
        className="relative bg-gray-800 rounded-lg p-3 hover:bg-gray-700 transition-colors overflow-hidden"
        style={getFriendBackgroundStyle(friend)}
      >
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg"></div>
        
        <div className="relative z-10 flex items-center gap-3">
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
      className="relative bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-all duration-200 overflow-hidden"
      style={getFriendBackgroundStyle(friend)}
    >
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg"></div>
      
      <div className="relative z-10">
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
                onClick={handleRemoveFriend}
                disabled={isRemoving}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded font-montserrat transition-colors"
              >
                {isRemoving ? 'Removing...' : 'Remove'}
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
