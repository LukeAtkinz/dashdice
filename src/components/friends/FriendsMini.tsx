'use client';

import React from 'react';
import { useFriends, useGameInvitationNotifications } from '@/context/FriendsContext';
import FriendCard from './FriendCard';
import FriendRequests from './FriendRequests';
import GameInvitations from './GameInvitations';

interface FriendsMiniProps {
  maxFriends?: number;
  onViewAll?: () => void;
}

export default function FriendsMini({ maxFriends = 5, onViewAll }: FriendsMiniProps) {
  const { 
    friends, 
    pendingRequests, 
    gameInvitations,
    isLoading,
    getFriendsWithPresence,
    getOnlineFriendsCount 
  } = useFriends();
  
  const { hasInvitations } = useGameInvitationNotifications();

  const friendsWithPresence = getFriendsWithPresence?.() || [];
  const onlineFriendsCount = getOnlineFriendsCount?.() || 0;

  // Sort friends by online status first, then by name
  const sortedFriends = [...friendsWithPresence]
    .sort((a, b) => {
      // Online friends first
      const aOnline = a.presence?.isOnline && a.presence?.status !== 'offline';
      const bOnline = b.presence?.isOnline && b.presence?.status !== 'offline';
      
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      
      // Then by name
      const nameA = a.nickname || a.friendData.displayName || a.friendData.email;
      const nameB = b.nickname || b.friendData.displayName || b.friendData.email;
      return nameA.localeCompare(nameB);
    })
    .slice(0, maxFriends);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  const hasNotifications = pendingRequests.length > 0 || gameInvitations.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <h3 className="font-semibold text-gray-900 dark:text-white">Friends</h3>
          
          {/* Notification indicators */}
          {hasNotifications && (
            <div className="flex items-center gap-1">
              {pendingRequests.length > 0 && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              )}
              {hasInvitations && (
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              )}
            </div>
          )}
        </div>
        
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
          >
            View All
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
          <span>{friends.length}</span>
          <span>friend{friends.length !== 1 ? 's' : ''}</span>
        </div>
        {onlineFriendsCount > 0 && (
          <div className="flex items-center gap-2 text-green-400 font-bold">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
            <span className="text-lg" style={{ textShadow: "0 0 10px rgba(74, 222, 128, 0.8)" }}>
              {onlineFriendsCount} online
            </span>
          </div>
        )}
      </div>

      {/* Notifications */}
      {pendingRequests.length > 0 && (
        <div className="mb-4">
          <FriendRequests compact />
        </div>
      )}

      {gameInvitations.length > 0 && (
        <div className="mb-4">
          <GameInvitations compact />
        </div>
      )}

      {/* Friends List */}
      {friends.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">No friends yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Add friends to play games together!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedFriends.map((friend) => (
            <FriendCard
              key={friend.id}
              friend={friend}
              compact
            />
          ))}
          
          {friends.length > maxFriends && (
            <div className="text-center pt-2">
              <button
                onClick={onViewAll}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
              >
                View {friends.length - maxFriends} more friend{friends.length - maxFriends !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      {friends.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <button
              onClick={onViewAll}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Manage Friends
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
