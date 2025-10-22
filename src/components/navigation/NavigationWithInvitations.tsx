'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { NavGameInvitationButton } from './NavGameInvitationButton';
import { useFriends } from '@/context/FriendsContext';
import { useNavigation } from '@/context/NavigationContext';

interface NavigationWithInvitationsProps {
  currentSection: string;
  isGameOver: boolean;
  onSectionChange: (section: string) => void;
  children: React.ReactNode;
}

export const NavigationWithInvitations: React.FC<NavigationWithInvitationsProps> = ({
  currentSection,
  isGameOver,
  onSectionChange,
  children
}) => {
  const { gameInvitations, acceptGameInvitation, declineGameInvitation } = useFriends();
  const { setCurrentSection } = useNavigation();
  const [processingInvitations, setProcessingInvitations] = useState<Set<string>>(new Set());

  // Filter for valid, pending invitations
  const validInvitations = gameInvitations.filter(invitation => {
    if (invitation.status !== 'pending') return false;
    if (!invitation.expiresAt) return true;
    return invitation.expiresAt.toDate() > new Date();
  });

  // Get the most recent invitation if any
  const activeInvitation = validInvitations.length > 0 ? validInvitations[0] : null;

  // Should show invitations on all pages except match and waiting room
  const shouldShowInvitations = activeInvitation && 
    currentSection !== 'match' && 
    currentSection !== 'waiting-room';

  const handleAcceptInvitation = async (invitationId: string) => {
    console.log('🎯 NavigationWithInvitations: Accept button clicked for invitation:', invitationId);
    
    // Find the invitation to get the game mode
    const invitation = validInvitations.find(inv => inv.id === invitationId);
    console.log('🎯 NavigationWithInvitations: Found invitation:', invitation);
    
    // Immediately remove the invitation from processing to hide the UI
    setProcessingInvitations(prev => new Set(prev).add(invitationId));
    
    try {
      console.log('🎯 NavigationWithInvitations: Calling acceptGameInvitation...');
      const result = await acceptGameInvitation(invitationId);
      console.log('🎯 NavigationWithInvitations: acceptGameInvitation result:', result);
      
      if (result.success && result.gameId) {
        console.log('🎯 NavigationWithInvitations: Friend invitation accepted - navigating to waiting room first:', { 
          sessionId: result.gameId,
          gameMode: invitation?.gameMode || 'classic'
        });
        
        // Navigate to waiting room first, then the system will automatically navigate to match
        setCurrentSection('waiting-room', { 
          roomId: result.gameId,
          gameMode: invitation?.gameMode || 'classic',
          actionType: 'live',
          gameType: 'quick'
        });
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      // Re-enable the processing state on error
      setProcessingInvitations(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitationId);
        return newSet;
      });
    }
    // Note: We don't clear processing state on success to keep UI hidden
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    console.log('🎯 NavigationWithInvitations: Decline button clicked for invitation:', invitationId);
    setProcessingInvitations(prev => new Set(prev).add(invitationId));
    
    try {
      console.log('🎯 NavigationWithInvitations: Calling declineGameInvitation...');
      const result = await declineGameInvitation(invitationId);
      console.log('🎯 NavigationWithInvitations: declineGameInvitation result:', result);
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

  return (
    <div className="relative w-full">
      {/* Desktop Navigation - replaces navigation when invitation is present */}
      <div className="hidden md:flex flex-row items-center justify-between rounded-[30px] px-[20px] md:px-[30px] py-[15px] w-full max-w-none">
        <AnimatePresence mode="wait">
          {shouldShowInvitations ? (
            <NavGameInvitationButton
              key="desktop-invitation"
              invitation={activeInvitation}
              onAccept={handleAcceptInvitation}
              onDecline={handleDeclineInvitation}
              isProcessing={processingInvitations.has(activeInvitation.id)}
            />
          ) : (
            <div key="normal-nav" className="flex flex-row items-center justify-between w-full">
              {children}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Navigation - invitation replaces navigation entirely when present */}
      <div className="md:hidden flex flex-row items-center justify-between w-full">
        <AnimatePresence mode="wait">
          {shouldShowInvitations ? (
            <div key="mobile-invitation" className="w-full bg-gradient-to-br from-purple-900/95 via-blue-900/95 to-purple-800/95 border border-purple-400/60 rounded-xl shadow-2xl backdrop-blur-lg">
              <NavGameInvitationButton
                invitation={activeInvitation}
                onAccept={handleAcceptInvitation}
                onDecline={handleDeclineInvitation}
                isProcessing={processingInvitations.has(activeInvitation.id)}
              />
            </div>
          ) : (
            <div key="normal-mobile-nav" className="flex flex-row items-center justify-between w-full">
              {children}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};