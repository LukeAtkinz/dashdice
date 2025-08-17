'use client';

import React, { useState } from 'react';
import { FriendWithStatus, PresenceState } from '@/types/friends';
import { useFriends } from '@/context/FriendsContext';
import { PresenceService } from '@/services/presenceService';

interface FriendCardProps {
  friend: FriendWithStatus;
  presence?: PresenceState | null;
  onInviteToGame?: (friendId: string) => void;
  onRemoveFriend?: (friendId: string) => void;
  compact?: boolean;
}

export default function FriendCard({ 
  friend, 
  presence, 
  onInviteToGame, 
  onRemoveFriend,
  compact = false 
}: FriendCardProps) {
  const { sendGameInvitation } = useFriends();
  const [showActions, setShowActions] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const getStatusColor = (status?: string, isOnline?: boolean) => {
    if (!isOnline || status === 'offline') return 'bg-gray-400';
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status?: string, isOnline?: boolean) => {
    if (!isOnline || status === 'offline') return 'Offline';
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'busy': return 'Busy';
      default: return 'Offline';
    }
  };

  const getLastSeenText = () => {
    if (!presence?.lastSeen) return '';
    if (presence.isOnline) return '';
    return PresenceService.getLastSeenText(presence.lastSeen);
  };

  const handleInviteToGame = async (gameType: string = 'standard') => {
    setIsInviting(true);
    try {
      const result = await sendGameInvitation(friend.friendId, gameType);
      if (result.success) {
        onInviteToGame?.(friend.friendId);
      }
    } catch (error) {
      console.error('Error inviting friend:', error);
    } finally {
      setIsInviting(false);
      setShowActions(false);
    }
  };

  const handleRemoveFriend = () => {
    if (onRemoveFriend) {
      onRemoveFriend(friend.friendId);
    }
    setShowActions(false);
  };

  const isInGame = presence?.currentGame;
  const canInvite = presence?.isOnline && 
                   presence?.status !== 'busy' && 
                   !isInGame &&
                   friend.friendData.privacy?.allowGameInvites !== false;

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1">
        <div className="relative">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {friend.friendData.displayName?.[0]?.toUpperCase() || friend.friendData.email[0].toUpperCase()}
          </div>
          <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(presence?.status, presence?.isOnline)} rounded-full border-2 border-white dark:border-gray-800`}></div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {friend.nickname || friend.friendData.displayName || friend.friendData.email}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {getStatusText(presence?.status, presence?.isOnline)}
            {getLastSeenText() && ` • ${getLastSeenText()}`}
          </p>
        </div>
        {canInvite && (
          <button
            onClick={() => handleInviteToGame()}
            disabled={isInviting}
            className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
            title="Invite to game"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Avatar with status indicator */}
        <div className="relative">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {friend.friendData.displayName?.[0]?.toUpperCase() || friend.friendData.email[0].toUpperCase()}
          </div>
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(presence?.status, presence?.isOnline)} rounded-full border-2 border-white dark:border-gray-800`}></div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Name and nickname */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">
              {friend.nickname || friend.friendData.displayName || friend.friendData.email}
            </h3>
            {friend.nickname && (
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                ({friend.friendData.displayName || friend.friendData.email})
              </span>
            )}
          </div>

          {/* Status and activity */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {getStatusText(presence?.status, presence?.isOnline)}
            </span>
            {getLastSeenText() && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {getLastSeenText()}
                </span>
              </>
            )}
          </div>

          {/* Current activity */}
          {isInGame && (
            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              In Game
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {showActions && (
            <div className="absolute right-0 top-8 z-10 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1">
              {canInvite && (
                <button
                  onClick={() => handleInviteToGame('standard')}
                  disabled={isInviting}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isInviting ? 'Inviting...' : 'Invite to Game'}
                </button>
              )}
              
              <button
                onClick={() => {/* TODO: Open profile */}}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                View Profile
              </button>
              
              <button
                onClick={() => {/* TODO: Edit nickname */}}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Edit Nickname
              </button>
              
              <hr className="my-1 border-gray-200 dark:border-gray-600" />
              
              <button
                onClick={handleRemoveFriend}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Remove Friend
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick invite actions for online friends */}
      {canInvite && !showActions && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex gap-2">
            <button
              onClick={() => handleInviteToGame('standard')}
              disabled={isInviting}
              className="flex-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded-md transition-colors disabled:cursor-not-allowed"
            >
              {isInviting ? 'Inviting...' : 'Quick Game'}
            </button>
            <button
              onClick={() => handleInviteToGame('ranked')}
              disabled={isInviting}
              className="flex-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm rounded-md transition-colors disabled:cursor-not-allowed"
            >
              {isInviting ? 'Inviting...' : 'Ranked'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
