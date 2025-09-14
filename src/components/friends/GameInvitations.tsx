'use client';

import React, { useState } from 'react';
import { useFriends } from '@/context/FriendsContext';
import { useNavigation } from '@/context/NavigationContext';
import { GameInvitation } from '@/types/friends';
import { useRouter } from 'next/navigation';

interface GameInvitationsProps {
  compact?: boolean;
}

export default function GameInvitations({ compact = false }: GameInvitationsProps) {
  const { gameInvitations, acceptGameInvitation, declineGameInvitation } = useFriends();
  const { setCurrentSection } = useNavigation();
  const [processingInvitations, setProcessingInvitations] = useState<Set<string>>(new Set());
  const router = useRouter();

  // Filter out expired invitations on the client side for immediate UI update
  const validInvitations = gameInvitations.filter(invitation => {
    if (!invitation.expiresAt) return true;
    return invitation.expiresAt.toDate() > new Date();
  });

  const handleAcceptInvitation = async (invitationId: string) => {
    console.log('🎯 GameInvitations: Accept button clicked for invitation:', invitationId);
    setProcessingInvitations(prev => new Set(prev).add(invitationId));
    
    try {
      // Find the invitation to get the game mode
      const invitation = validInvitations.find(inv => inv.id === invitationId);
      console.log('🎯 GameInvitations: Found invitation:', invitation);
      
      console.log('🎯 GameInvitations: Calling acceptGameInvitation...');
      const result = await acceptGameInvitation(invitationId);
      console.log('🎯 GameInvitations: acceptGameInvitation result:', result);
      
      if (result.success && result.gameId) {
        // Navigate to waiting room with the room ID and game mode (consistent with GameInvitationNotification)
        console.log('🎯 GameInvitations: Navigating to waiting room:', { 
          roomId: result.gameId,
          gameMode: invitation?.gameMode || 'classic'
        });
        setCurrentSection('waiting-room', { 
          roomId: result.gameId,
          gameMode: invitation?.gameMode || 'classic'
        });
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
    } finally {
      setProcessingInvitations(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitationId);
        return newSet;
      });
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    console.log('🎯 GameInvitations: Decline button clicked for invitation:', invitationId);
    setProcessingInvitations(prev => new Set(prev).add(invitationId));
    
    try {
      console.log('🎯 GameInvitations: Calling declineGameInvitation...');
      const result = await declineGameInvitation(invitationId);
      console.log('🎯 GameInvitations: declineGameInvitation result:', result);
    } catch (error) {
      console.error('Error declining invitation:', error);
    } finally {
      setProcessingInvitations(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitationId);
        return newSet;
      });
    }
  };

  const getTimeRemaining = (invitation: GameInvitation) => {
    const now = new Date();
    const expiry = invitation.expiresAt.toDate();
    const diffMs = expiry.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    if (diffMs <= 0) return 'Expired';
    if (diffMinutes > 0) return `${diffMinutes}m ${diffSeconds}s`;
    return `${diffSeconds}s`;
  };

  const getGameTypeDisplayName = (gameType: string) => {
    switch (gameType) {
      case 'standard': return 'Standard Game';
      case 'ranked': return 'Ranked Match';
      case 'tournament': return 'Tournament';
      case 'custom': return 'Custom Game';
      default: return gameType;
    }
  };

  if (validInvitations.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {validInvitations.slice(0, 3).map((invitation) => (
          <div
            key={invitation.id}
            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
                  Game Invitation
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {getGameTypeDisplayName(invitation.gameMode)} • {getTimeRemaining(invitation)}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleAcceptInvitation(invitation.id)}
                  disabled={processingInvitations.has(invitation.id)}
                  className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs rounded transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleDeclineInvitation(invitation.id)}
                  disabled={processingInvitations.has(invitation.id)}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs rounded transition-colors"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {validInvitations.length > 3 && (
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            +{validInvitations.length - 3} more invitations
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {validInvitations.map((invitation) => (
          <div
            key={invitation.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              {/* Game Type Icon */}
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {getGameTypeDisplayName(invitation.gameMode)}
                  </h4>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                    {getTimeRemaining(invitation)}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Invite from {invitation.fromDisplayName || 'a friend'}
                </p>

                {/* Show message if available */}
                {invitation.message && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Message:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                      "{invitation.message}"
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAcceptInvitation(invitation.id)}
                    disabled={processingInvitations.has(invitation.id)}
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500
                             text-black text-sm font-bold py-3 px-4 rounded-lg
                             transition-all duration-200 font-audiowide tracking-wide
                             shadow-lg shadow-yellow-500/30 hover:shadow-yellow-400/40
                             border border-yellow-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingInvitations.has(invitation.id) ? (
                      <>
                        <svg className="animate-spin w-4 h-4 mr-1 inline-block" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        ACCEPTING...
                      </>
                    ) : (
                      'ACCEPT'
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleDeclineInvitation(invitation.id)}
                    disabled={processingInvitations.has(invitation.id)}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600
                             text-white text-sm font-bold py-3 px-4 rounded-lg
                             transition-all duration-200 font-audiowide tracking-wide
                             shadow-lg shadow-red-600/30 hover:shadow-red-500/40
                             border border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingInvitations.has(invitation.id) ? (
                      <>
                        <svg className="animate-spin w-4 h-4 mr-1 inline-block" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        DECLINING...
                      </>
                    ) : (
                      'DECLINE'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
