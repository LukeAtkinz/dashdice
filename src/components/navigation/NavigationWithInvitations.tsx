'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    currentSection !== 'waiting-room' &&
    !processingInvitations.has(activeInvitation.id); // Hide immediately when processing

  const handleAcceptInvitation = async (invitationId: string) => {
    console.log('🎯 NavigationWithInvitations: Accept button clicked for invitation:', invitationId);
    
    // ✅ USER INTERACTION: Grant autoplay permission for all videos
    if (typeof window !== 'undefined') {
      const { videoPlaybackManager } = await import('@/utils/videoPlaybackManager');
      videoPlaybackManager.triggerPlayback();
    }
    
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
        console.log('🎯 NavigationWithInvitations: Friend invitation accepted - navigating directly to match:', { 
          matchId: result.gameId,
          gameMode: invitation?.gameMode || 'classic'
        });
        
        // Navigate directly to the match since it's already created by the invitation acceptance
        setCurrentSection('match', { 
          matchId: result.gameId,
          roomId: result.gameId,
          gameMode: invitation?.gameMode || 'classic'
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
    <>
      <div className="relative w-full">
        {/* Desktop Navigation - always shows, invitation appears as modal */}
        <div className="hidden md:flex flex-row items-center justify-between rounded-[30px] px-[20px] md:px-[30px] py-[15px] w-full max-w-none">
          {children}
        </div>

        {/* Mobile Navigation - invitation replaces navigation entirely when present */}
        <div className="md:hidden flex flex-row items-center justify-between w-full">
          <AnimatePresence mode="wait">
            {shouldShowInvitations ? (
              <div key="mobile-invitation" className="w-full bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-purple-800/20 border border-purple-400/60 rounded-xl shadow-2xl backdrop-blur-lg">
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

      {/* Desktop Modal Invitation - centered popup */}
      <AnimatePresence>
        {shouldShowInvitations && (
          <div className="hidden md:flex fixed inset-0 z-[100] items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => handleDeclineInvitation(activeInvitation.id)}
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative z-10 bg-gradient-to-br from-purple-900/95 via-blue-900/95 to-purple-800/95 border-2 border-purple-400/60 rounded-2xl shadow-2xl backdrop-blur-xl p-8 max-w-md w-full mx-4"
            >
              <NavGameInvitationButton
                invitation={activeInvitation}
                onAccept={handleAcceptInvitation}
                onDecline={handleDeclineInvitation}
                isProcessing={processingInvitations.has(activeInvitation.id)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};