'use client';

import React, { useState, useMemo } from 'react';
import { useFriends } from '@/context/FriendsContext';
import FriendCard from './FriendCard';
import AddFriend from './AddFriend';
import { FriendWithStatus } from '@/types/friends';

interface FriendsListProps {
  compact?: boolean;
  showAddButton?: boolean;
  maxVisible?: number;
}

export default function FriendsList({ 
  compact = false, 
  showAddButton = true, 
  maxVisible 
}: FriendsListProps) {
  const { 
    friends, 
    isLoading, 
    removeFriend, 
    getFriendsWithPresence,
    getOnlineFriendsCount,
    getFriendsByStatus 
  } = useFriends();
  
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'recent'>('status');

  // Get friends with presence data
  const friendsWithPresence = getFriendsWithPresence?.() || [];

  // Filter and sort friends
  const filteredAndSortedFriends = useMemo(() => {
    let filtered = friendsWithPresence;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(friend => {
        const name = friend.nickname || friend.friendData.displayName || friend.friendData.email;
        return name.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Apply status filter
    if (statusFilter === 'online') {
      filtered = filtered.filter(friend => 
        friend.presence?.isOnline && friend.presence?.status !== 'offline'
      );
    } else if (statusFilter === 'offline') {
      filtered = filtered.filter(friend => 
        !friend.presence?.isOnline || friend.presence?.status === 'offline'
      );
    }

    // Sort friends
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const nameA = a.nickname || a.friendData.displayName || a.friendData.email;
          const nameB = b.nickname || b.friendData.displayName || b.friendData.email;
          return nameA.localeCompare(nameB);
        
        case 'status':
          const statusOrder = { online: 0, away: 1, busy: 2, offline: 3 };
          const statusA = a.presence?.isOnline ? (a.presence.status as keyof typeof statusOrder) : 'offline';
          const statusB = b.presence?.isOnline ? (b.presence.status as keyof typeof statusOrder) : 'offline';
          return statusOrder[statusA] - statusOrder[statusB];
        
        case 'recent':
          const timeA = a.presence?.lastSeen?.toDate()?.getTime() || 0;
          const timeB = b.presence?.lastSeen?.toDate()?.getTime() || 0;
          return timeB - timeA;
        
        default:
          return 0;
      }
    });

    // Limit visible friends if specified
    if (maxVisible && filtered.length > maxVisible) {
      filtered = filtered.slice(0, maxVisible);
    }

    return filtered;
  }, [friendsWithPresence, searchTerm, statusFilter, sortBy, maxVisible]);

  const handleRemoveFriend = async (friendId: string) => {
    if (confirm('Are you sure you want to remove this friend?')) {
      await removeFriend(friendId);
    }
  };

  const onlineFriendsCount = getOnlineFriendsCount?.() || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading friends...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-audiowide">
            Friends
          </h2>
          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 font-montserrat">
            <span>({friends.length})</span>
            {onlineFriendsCount > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {onlineFriendsCount} online
                </span>
              </>
            )}
          </div>
        </div>
        
        {showAddButton && (
          <button
            onClick={() => setShowAddFriend(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Friend
          </button>
        )}
      </div>

      {/* Filters and Search (not shown in compact mode) */}
      {!compact && friends.length > 0 && (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search friends..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                       placeholder-gray-400 dark:placeholder-gray-500 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'online' | 'offline')}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Friends</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'status' | 'recent')}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="status">Sort by Status</option>
              <option value="name">Sort by Name</option>
              <option value="recent">Sort by Recent</option>
            </select>
          </div>
        </div>
      )}

      {/* Friends List */}
      {filteredAndSortedFriends.length === 0 ? (
        <div className="text-center py-8">
          {friends.length === 0 ? (
            <div className="space-y-3">
              <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-audiowide">No friends yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 font-montserrat">
                Add friends using their friend codes to start playing together!
              </p>
              {showAddButton && (
                <button
                  onClick={() => setShowAddFriend(true)}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Your First Friend
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-500 dark:text-gray-400 font-audiowide">No friends match your filters</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
          {filteredAndSortedFriends.map((friend) => (
            <FriendCard
              key={friend.id}
              friend={friend}
              presence={friend.presence}
              onRemoveFriend={handleRemoveFriend}
              compact={compact}
            />
          ))}
          
          {maxVisible && friends.length > maxVisible && (
            <div className="text-center py-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {maxVisible} of {friends.length} friends
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full">
            <AddFriend
              onClose={() => setShowAddFriend(false)}
              onSuccess={() => setShowAddFriend(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
