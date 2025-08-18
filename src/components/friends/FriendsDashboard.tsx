'use client';

import React, { useState } from 'react';
import { useFriends, useGameInvitationNotifications } from '@/context/FriendsContext';
import FriendsList from './FriendsList';
import FriendRequests from './FriendRequests';
import GameInvitations from './GameInvitations';
import AddFriend from './AddFriend';

interface FriendsDashboardProps {
  className?: string;
}

export default function FriendsDashboard({ className = '' }: FriendsDashboardProps) {
  const { friends, pendingRequests, gameInvitations, getOnlineFriendsCount } = useFriends();
  const { hasInvitations } = useGameInvitationNotifications();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'invitations' | 'add'>('friends');

  const onlineFriendsCount = getOnlineFriendsCount?.() || 0;

  const tabs = [
    {
      id: 'friends' as const,
      label: 'Friends',
      count: friends.length,
      badge: onlineFriendsCount > 0 ? `${onlineFriendsCount} online` : undefined,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
    },
    {
      id: 'requests' as const,
      label: 'Requests',
      count: pendingRequests.length,
      isActive: pendingRequests.length > 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      )
    },
    {
      id: 'invitations' as const,
      label: 'Game Invites',
      count: gameInvitations.length,
      isActive: hasInvitations,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      id: 'add' as const,
      label: 'Add Friend',
      count: 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      )
    }
  ];

  // Auto-switch to requests/invitations when they arrive
  React.useEffect(() => {
    if (activeTab === 'friends') {
      if (gameInvitations.length > 0) {
        setActiveTab('invitations');
      } else if (pendingRequests.length > 0) {
        setActiveTab('requests');
      }
    }
  }, [gameInvitations.length, pendingRequests.length, activeTab]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header with Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              {tab.icon}
              <span className="font-audiowide">{tab.label}</span>
              
              {/* Count badge */}
              {tab.count > 0 && (
                <span className={`
                  px-2 py-0.5 text-xs rounded-full min-w-[1.25rem] h-5 flex items-center justify-center
                  ${tab.isActive 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : activeTab === tab.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }
                `}>
                  {tab.count}
                </span>
              )}
              
              {/* Online badge for friends */}
              {tab.id === 'friends' && tab.badge && (
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'friends' && (
          <FriendsList showAddButton={false} />
        )}
        
        {activeTab === 'requests' && (
          <FriendRequests />
        )}
        
        {activeTab === 'invitations' && (
          <GameInvitations />
        )}
        
        {activeTab === 'add' && (
          <AddFriend onSuccess={() => setActiveTab('friends')} />
        )}

        {/* Empty States */}
        {activeTab === 'requests' && pendingRequests.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-1 font-audiowide">No friend requests</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 font-montserrat">
              When someone sends you a friend request, it will appear here
            </p>
          </div>
        )}

        {activeTab === 'invitations' && gameInvitations.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-1 font-audiowide">No game invitations</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 font-montserrat">
              When friends invite you to games, invitations will appear here
            </p>
          </div>
        )}
      </div>

      {/* Notification badges for inactive tabs */}
      {activeTab !== 'requests' && pendingRequests.length > 0 && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span className="text-sm font-montserrat">
              {pendingRequests.length} friend request{pendingRequests.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setActiveTab('requests')}
              className="ml-2 text-green-200 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {activeTab !== 'invitations' && gameInvitations.length > 0 && (
        <div className="fixed top-16 right-4 z-50">
          <div className="bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-montserrat">
              {gameInvitations.length} game invitation{gameInvitations.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setActiveTab('invitations')}
              className="ml-2 text-blue-200 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
