'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFriends, useGameInvitationNotifications } from '@/context/FriendsContext';
import { useBackground } from '@/context/BackgroundContext';
import FriendsList from './FriendsList';
import FriendRequests from './FriendRequests';
import AddFriend from './AddFriend';

// CSS for custom button styling and new animations
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
  
  /* New Tab Button Animations */
  @keyframes borderLoad {
    0% {
      background: linear-gradient(90deg, 
        #FFD700 0%, 
        #FFD700 0%, 
        transparent 0%, 
        transparent 100%);
    }
    100% {
      background: linear-gradient(90deg, 
        #FFD700 0%, 
        #FFD700 100%, 
        transparent 100%, 
        transparent 100%);
    }
  }
  
  .tab-button {
    position: relative;
    border: 2px solid transparent;
    transition: all 0.3s ease;
    background: transparent !important;
  }
  
  .tab-button::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(90deg, transparent 0%, transparent 100%);
    border-radius: inherit;
    z-index: -1;
    transition: all 0.3s ease;
  }
  
  .tab-button:hover::before {
    animation: borderLoad 0.8s ease-in-out forwards;
  }
  
  .tab-button.active {
    border-color: #FFD700;
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
    background: transparent !important;
  }
  
  .tab-button.active::before {
    background: transparent;
  }
  
  /* Legacy navigation button hover effects */
  .nav-button {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .nav-button:active {
    transform: scale(0.95);
  }
  .nav-button.active {
    border-color: #FFD700;
  }
  
  /* Tab button hover effects - keep text white */
  .tab-button:hover span {
    color: #FFF !important;
  }
  .tab-button.active:hover span {
    color: #FFD700 !important;
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
  
  /* Disable hover effects for friends tab and manage friends tab */
  .friends-tab:hover::before,
  .manage-friends-tab:hover::before {
    animation: none !important;
    background: transparent !important;
  }
  
  .friends-tab:hover,
  .manage-friends-tab:hover {
    transform: none !important;
  }
`;

interface FriendsDashboardProps {
  className?: string;
}

export default function FriendsDashboard({ className = '' }: FriendsDashboardProps) {
  const { friends, pendingRequests, gameInvitations, getOnlineFriendsCount } = useFriends();
  const { hasInvitations } = useGameInvitationNotifications();
  const { DisplayBackgroundEquip } = useBackground();
  const [activeTab, setActiveTab] = useState<'friends' | 'manage'>('friends');

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
      background: 'transparent',
      boxShadow: isSelected 
        ? "0 4px 15px rgba(255, 215, 0, 0.4)" 
        : "0 2px 8px rgba(0, 0, 0, 0.2)",
      minWidth: "140px",
      minHeight: "100px",
      border: isSelected ? '2px solid #FFD700' : '2px solid transparent'
    };
  };

  // Auto-switch to manage when friend requests arrive
  React.useEffect(() => {
    if (activeTab === 'friends' && pendingRequests.length > 0) {
      setActiveTab('manage');
    }
  }, [pendingRequests.length, activeTab]);

  // Listen for tab changes from bottom navigation
  useEffect(() => {
    const handleTabChange = (event: Event) => {
      const customEvent = event as CustomEvent<'friends' | 'manage'>;
      const newTab = customEvent.detail;
      setActiveTab(newTab);

      // Update button styling - match Profile/Settings golden outline style
      const buttons = document.querySelectorAll('.friends-tab-btn');
      buttons.forEach(btn => {
        const button = btn as HTMLButtonElement;
        const isActive = button.dataset.tab === newTab;
        
        button.style.border = isActive ? '2px solid #FFD700' : '2px solid rgba(255, 255, 255, 0.1)';
        button.style.background = isActive ? 'rgba(255, 215, 0, 0.1)' : 'transparent';
        button.style.boxShadow = isActive ? '0 0 15px rgba(255, 215, 0, 0.3)' : 'none';
        
        const span = button.querySelector('span');
        if (span) {
          (span as HTMLElement).style.color = isActive ? '#FFD700' : '#FFF';
        }
      });
    };

    window.addEventListener('friendsTabChange', handleTabChange);

    // Initialize button styling
    setTimeout(() => {
      const buttons = document.querySelectorAll('.friends-tab-btn');
      buttons.forEach(btn => {
        const button = btn as HTMLButtonElement;
        const isActive = button.dataset.tab === activeTab;
        
        button.style.border = isActive ? '2px solid #FFD700' : '2px solid rgba(255, 255, 255, 0.1)';
        button.style.background = isActive ? 'rgba(255, 215, 0, 0.1)' : 'transparent';
        button.style.boxShadow = isActive ? '0 0 15px rgba(255, 215, 0, 0.3)' : 'none';
        
        const span = button.querySelector('span');
        if (span) {
          (span as HTMLElement).style.color = isActive ? '#FFD700' : '#FFF';
        }
      });
    }, 100);

    return () => {
      window.removeEventListener('friendsTabChange', handleTabChange);
    };
  }, [activeTab]);

  return (
    <>
      <style jsx>{buttonStyles}</style>
      <div className="w-full flex flex-col items-center justify-start gap-[2rem] py-[2rem] min-h-full mt-[7vh] md:mt-0">
      {/* Header - Hidden on Mobile */}
      <div className="text-center mb-8 flex-shrink-0 hidden md:block">
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

      {/* Navigation tabs moved to bottom nav in SinglePageDashboard.tsx */}

      {/* Content */}
      <div className="w-full max-w-[80rem] flex-1 overflow-y-auto px-4 md:max-h-screen" style={{
        touchAction: 'pan-y',
        maxHeight: 'calc(100vh - 150px)' // Mobile: reduce by bottom nav (60px tabs + 90px main nav)
      }}>
        {activeTab === 'friends' && (
          <div className="space-y-6">
            {/* Friends List */}
            <FriendsList showAddButton={false} />
          </div>
        )}
        
        {activeTab === 'manage' && (
          <div className="space-y-6">
            {/* Mobile: Stack vertically, Desktop: Side by side */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Friend Requests Section */}
              <div className="flex-1">
                <h3 className="text-xl font-audiowide text-white mb-4 uppercase">
                  Friend Requests
                </h3>
                {pendingRequests.length > 0 ? (
                  <FriendRequests />
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                      <img 
                        src="/Design Elements/lost connection.webp" 
                        alt="No requests" 
                        className="w-12 h-12 object-contain opacity-80"
                      />
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-1 font-audiowide text-lg font-semibold">No friend requests</p>
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
      </div>

      {/* Notification badges for inactive tabs */}
      {activeTab !== 'manage' && pendingRequests.length > 0 && (
        <div className="fixed top-4 right-4 z-50">
          <div 
            className="backdrop-blur-lg bg-black/40 rounded-2xl p-4 border border-white/20 shadow-2xl flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.8) 100%)',
              backdropFilter: 'blur(20px)'
            }}
          >
            <div className="text-xl">📬</div>
            <span 
              className="text-sm text-white font-bold"
              style={{ fontFamily: "Audiowide" }}
            >
              FRIEND REQUESTS
            </span>
            <button
              onClick={() => setActiveTab('manage')}
              className="ml-2 text-white/70 hover:text-white transition-colors"
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
