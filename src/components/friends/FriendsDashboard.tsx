'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useFriends, useGameInvitationNotifications } from '@/context/FriendsContext';
import { useBackground } from '@/context/BackgroundContext';
import FriendsList from './FriendsList';
import FriendRequests from './FriendRequests';
import GameInvitations from './GameInvitations';
import AddFriend from './AddFriend';

// CSS for custom button styling
const buttonStyles = `
  .custom-inventory-button {
    background: var(--ui-inventory-button-bg, linear-gradient(135deg, #2a1810 0%, #1a0f08 100%));
    border: 2px solid var(--ui-inventory-button-border, #8b7355);
    color: var(--ui-inventory-button-text, #f4f1eb);
    transition: all 0.3s ease;
    font-family: 'Audiowide', monospace;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  }
  
  .custom-inventory-button:hover {
    background: var(--ui-inventory-button-hover-bg, linear-gradient(135deg, #3a2420 0%, #2a1810 100%));
    border-color: var(--ui-inventory-button-hover-border, #a68b5b);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 115, 85, 0.3);
  }
  
  .custom-inventory-button.active {
    background: var(--ui-inventory-button-active-bg, linear-gradient(135deg, #4a3020 0%, #3a2420 100%));
    border-color: var(--ui-inventory-button-active-border, #c9a96e);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  /* Inventory-style navigation button hover effects */
  .nav-button {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .nav-button:hover {
    animation: navPulse 0.6s ease-in-out;
    box-shadow: 0 8px 25px rgba(255, 0, 128, 0.3);
    transform: scale(1.05);
  }
  .nav-button:active {
    animation: navClick 0.2s ease-in-out;
    transform: scale(0.95);
  }
  .nav-button.active {
    box-shadow: 0 6px 20px rgba(255, 0, 128, 0.4);
  }
  @keyframes navPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  @keyframes navClick {
    0% { transform: scale(1); }
    50% { transform: scale(0.95); }
    100% { transform: scale(1); }
  }
`;

interface FriendsDashboardProps {
  className?: string;
}

export default function FriendsDashboard({ className = '' }: FriendsDashboardProps) {
  const { friends, pendingRequests, gameInvitations, getOnlineFriendsCount } = useFriends();
  const { hasInvitations } = useGameInvitationNotifications();
  const { DisplayBackgroundEquip } = useBackground();
  const [activeTab, setActiveTab] = useState<'friends' | 'manage' | 'invitations'>('friends');

  const onlineFriendsCount = getOnlineFriendsCount?.() || 0;

  const tabs = [
    {
      id: 'friends' as const,
      label: 'Friends',
      count: friends.length,
      badge: undefined, 
      color: 'linear-gradient(135deg, #667eea, #764ba2)'
    },
    {
      id: 'manage' as const,
      label: 'Manage Friends',
      mobileLabel: 'Manage', // Mobile short label
      count: pendingRequests.length,
      isActive: pendingRequests.length > 0,
      color: 'linear-gradient(135deg, #FF0080, #FF4DB8)'
    },
    {
      id: 'invitations' as const,
      label: 'Game Invites',
      mobileLabel: 'Invites', // Mobile short label
      count: gameInvitations.length,
      isActive: hasInvitations,
      color: 'linear-gradient(135deg, #00FF80, #00A855)'
    }
  ];

  // Get background-specific styling for navigation buttons (matching inventory)
  const getNavButtonStyle = (tab: any, isSelected: boolean) => {
    if (DisplayBackgroundEquip?.name === 'On A Mission') {
      return {
        background: isSelected 
          ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.8) 0%, rgba(14, 165, 233, 0.4) 50%, rgba(14, 165, 233, 0.2) 100%)'
          : 'linear-gradient(135deg, rgba(14, 165, 233, 0.6) 0%, rgba(14, 165, 233, 0.3) 50%, rgba(14, 165, 233, 0.1) 100%)',
        boxShadow: isSelected 
          ? "0 4px 15px rgba(14, 165, 233, 0.4)" 
          : "0 2px 8px rgba(0, 0, 0, 0.2)",
        minWidth: "140px",
        minHeight: "100px",
        border: isSelected ? '2px solid rgba(14, 165, 233, 0.6)' : '2px solid transparent',
        backdropFilter: 'blur(6px)'
      };
    }
    
    return {
      background: isSelected ? tab.color : 'rgba(255, 255, 255, 0.1)',
      boxShadow: isSelected 
        ? "0 4px 15px rgba(255, 255, 255, 0.2)" 
        : "0 2px 8px rgba(0, 0, 0, 0.2)",
      minWidth: "140px",
      minHeight: "100px",
      border: isSelected ? '2px solid #FFD700' : '2px solid transparent'
    };
  };

  // Auto-switch to manage/invitations when they arrive
  React.useEffect(() => {
    if (activeTab === 'friends') {
      if (gameInvitations.length > 0) {
        setActiveTab('invitations');
      } else if (pendingRequests.length > 0) {
        setActiveTab('manage');
      }
    }
  }, [gameInvitations.length, pendingRequests.length, activeTab]);

  return (
    <>
      <style jsx>{buttonStyles}</style>
      <div className="w-full flex flex-col items-center justify-start gap-[2rem] py-[2rem] min-h-full">
      {/* Header */}
      <div className="text-center mb-8 flex-shrink-0">
        <h1 
          className="text-5xl font-bold text-white mb-4"
          style={{
            fontFamily: "Audiowide",
            textTransform: "uppercase",
            textShadow: "0 0 20px rgba(255, 215, 0, 0.5)"
          }}
        >
          Friends
        </h1>
      </div>

      {/* Navigation Tabs - Using Inventory Template */}
      <div className="w-full max-w-[60rem] flex flex-row items-center justify-center gap-[1rem] mb-8 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              nav-button
              flex flex-col items-center justify-center gap-2 p-4 rounded-[20px]
              transition-all duration-300
              h-12 md:h-16 px-4 md:px-6 min-w-[120px] md:min-w-[140px]
              ${activeTab === tab.id ? 'active' : ''}
            `}
            style={{
              display: 'flex',
              width: 'fit-content',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '18px',
              border: 0,
              background: activeTab === tab.id ? 'var(--ui-inventory-button-bg, var(--ui-button-bg))' : 'rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base md:text-lg font-audiowide uppercase" style={{ 
                  color: activeTab === tab.id ? 'var(--ui-inventory-button-text, var(--ui-button-text))' : '#FFF', 
                  fontFamily: 'Audiowide', 
                  fontWeight: 400, 
                  textTransform: 'uppercase' 
                }}>
                  <span className="hidden md:inline">{tab.label}</span>
                  <span className="md:hidden">{tab.mobileLabel || tab.label}</span>
                </span>
                {/* Count badge - don't show for friends tab */}
                {tab.count > 0 && tab.id !== 'friends' && (
                  <span className={`
                    px-2 py-0.5 text-xs rounded-full min-w-[1.25rem] h-5 flex items-center justify-center font-audiowide
                    ${tab.isActive 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-white/20 text-white'
                    }
                  `}>
                    {tab.count}
                  </span>
                )}
              </div>
              
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="w-full max-w-[80rem] flex-1 overflow-y-auto scrollbar-hide px-4">
        {activeTab === 'friends' && (
          <FriendsList showAddButton={false} />
        )}
        
        {activeTab === 'manage' && (
          <div className="space-y-6">
            {/* Mobile: Stack vertically, Desktop: Side by side */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Friend Requests Section */}
              <div className="flex-1">
                <h3 className="text-xl font-audiowide text-white mb-4 uppercase">
                  Friend Requests
                  {pendingRequests.length > 0 && (
                    <span className="ml-2 text-sm bg-red-500 text-white px-2 py-1 rounded-full">
                      {pendingRequests.length}
                    </span>
                  )}
                </h3>
                {pendingRequests.length > 0 ? (
                  <FriendRequests />
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                      <div className="text-2xl">📬</div>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-1 font-audiowide">No friend requests</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 font-montserrat">
                      When someone sends you a friend request, it will appear here
                    </p>
                  </div>
                )}
              </div>

              {/* Add Friend Section */}
              <div className="flex-1">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-audiowide text-white uppercase">Add Friend</h3>
                </div>
                <div 
                  className="relative overflow-hidden p-6"
                  style={{
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <AddFriend onSuccess={() => setActiveTab('friends')} />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'invitations' && (
          <GameInvitations />
        )}

        {/* Empty States */}
        {activeTab === 'invitations' && gameInvitations.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
              <div className="text-2xl">⚡</div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-1 font-audiowide">No game invitations</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 font-montserrat">
              When friends invite you to games, invitations will appear here
            </p>
          </div>
        )}
      </div>

      {/* Notification badges for inactive tabs */}
      {activeTab !== 'manage' && pendingRequests.length > 0 && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="text-lg">📬</div>
            <span className="text-sm font-montserrat">
              {pendingRequests.length} friend request{pendingRequests.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setActiveTab('manage')}
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
            <div className="text-lg">⚡</div>
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
    </>
  );
}
