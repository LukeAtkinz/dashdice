'use client';

import React, { useState, useEffect } from 'react';
import { useFriends } from '@/context/FriendsContext';
import { GameInvitation } from '@/types/friends';

interface InvitationPopupProps {
  invitation: GameInvitation;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

const InvitationPopup: React.FC<InvitationPopupProps> = ({
  invitation,
  onAccept,
  onDecline,
  onClose
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Calculate time left for invitation
  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = invitation.expiresAt.toDate().getTime();
      const remaining = Math.max(0, expiry - now);
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        onClose(); // Auto-close when expired
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [invitation.expiresAt, onClose]);

  const formatTimeLeft = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  };

  const getGameModeDisplayName = (gameType: string) => {
    const modeNames: Record<string, string> = {
      'classic': 'Only One Will Rise',
      'quickfire': 'Quickfire',
      'zero-hour': 'Zero Hour',
      'last-line': 'Last Line',
      'true-grit': 'True Grit',
      'tag-team': 'Tag Team'
    };
    return modeNames[gameType] || gameType.charAt(0).toUpperCase() + gameType.slice(1);
  };

  const getGameModeIcon = (gameType: string) => {
    const iconMap: Record<string, string> = {
      'classic': '/Design Elements/Crown Mode.webp',
      'quickfire': '/Design Elements/Shield.webp',
      'zero-hour': '/Design Elements/time out.webp',
      'last-line': '/Design Elements/skull.webp',
      'true-grit': '/Design Elements/Castle.webp',
      'tag-team': '/Design Elements/friends.webp'
    };
    return iconMap[gameType] || '/Design Elements/Crown Mode.webp';
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      {/* Main popup container */}
      <div className="bg-black/90 backdrop-blur-sm border border-white/20 rounded-xl p-4 w-80 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <img 
              src={getGameModeIcon(invitation.gameType)} 
              alt={getGameModeDisplayName(invitation.gameType)}
              className="w-6 h-6 object-contain"
            />
            <h3 className="text-white font-bold font-audiowide text-sm">
              Game Invitation
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-white font-medium font-audiowide">
              {getGameModeDisplayName(invitation.gameType)}
            </div>
            <div className="text-gray-300 text-sm font-montserrat">
              Your friend wants to play!
            </div>
          </div>

          {/* Time remaining */}
          <div className="text-center">
            <div className="text-yellow-400 text-sm font-montserrat">
              Expires in {formatTimeLeft(timeLeft)}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={onAccept}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-montserrat font-medium transition-colors"
            >
              Accept
            </button>
            <button
              onClick={onDecline}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-montserrat font-medium transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main component that manages showing invitation popups
export default function InvitationPopupManager() {
  const { gameInvitations, acceptGameInvitation, declineGameInvitation } = useFriends();
  const [visibleInvitations, setVisibleInvitations] = useState<string[]>([]);

  // Show new invitations as popups
  useEffect(() => {
    const newInvitations = gameInvitations
      .filter(inv => !visibleInvitations.includes(inv.id))
      .map(inv => inv.id);
    
    if (newInvitations.length > 0) {
      setVisibleInvitations(prev => [...prev, ...newInvitations]);
    }
  }, [gameInvitations, visibleInvitations]);

  const handleAccept = async (invitationId: string) => {
    try {
      const result = await acceptGameInvitation(invitationId);
      if (result.success && result.gameId) {
        // Navigate to game or waiting room
        window.location.href = `/game/${result.gameId}`;
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
    
    // Remove from visible invitations
    setVisibleInvitations(prev => prev.filter(id => id !== invitationId));
  };

  const handleDecline = async (invitationId: string) => {
    try {
      await declineGameInvitation(invitationId);
    } catch (error) {
      console.error('Error declining invitation:', error);
    }
    
    // Remove from visible invitations
    setVisibleInvitations(prev => prev.filter(id => id !== invitationId));
  };

  const handleClose = (invitationId: string) => {
    setVisibleInvitations(prev => prev.filter(id => id !== invitationId));
  };

  // Only show the most recent invitation as a popup
  const currentInvitation = gameInvitations.find(inv => 
    visibleInvitations.includes(inv.id)
  );

  if (!currentInvitation) {
    return null;
  }

  return (
    <InvitationPopup
      invitation={currentInvitation}
      onAccept={() => handleAccept(currentInvitation.id)}
      onDecline={() => handleDecline(currentInvitation.id)}
      onClose={() => handleClose(currentInvitation.id)}
    />
  );
}
