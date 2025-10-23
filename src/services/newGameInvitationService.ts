// Rebuilt Friend Invitation Service - Clean implementation focused on reliability
import { 
  collection, 
  doc, 
  query, 
  where, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  orderBy,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { UserService } from './userService';
import { toUserBackground, getBackgroundById } from '@/config/backgrounds';

// Game Invitation interface
export interface GameInvitation {
  id?: string;
  fromUserId: string;
  toUserId: string;
  fromUserName: string;
  gameType: string;
  gameSettings: Record<string, any>;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: any;
  expiresAt: any;
}

// User interface for reference
export interface User {
  uid: string;
  displayName?: string;
  isOnline?: boolean;
  currentGame?: string;
}

export class NewGameInvitationService {
  // Core method: Send game invitation with robust validation
  static async sendGameInvitation(
    fromUserId: string,
    toUserId: string,
    gameMode: string,
    gameSettings?: Record<string, any>
  ): Promise<{ success: boolean; error?: string; invitationId?: string }> {
    try {
      console.log('🚀 NewGameInvitationService: Starting invitation process', { 
        fromUserId, 
        toUserId, 
        gameMode,
        gameSettings 
      });

      // Step 0: Check authentication state
      const { auth: firebaseAuth } = await import('./firebase');
      const currentUser = firebaseAuth.currentUser;
      
      if (!currentUser) {
        console.error('❌ No authenticated user found');
        return { success: false, error: 'Authentication required. Please sign in again.' };
      }

      if (currentUser.uid !== fromUserId) {
        console.error('❌ User ID mismatch', { currentUserId: currentUser.uid, fromUserId });
        return { success: false, error: 'Authentication mismatch. Please refresh and try again.' };
      }

      console.log('✅ Authentication verified for user:', currentUser.uid);

      // Step 1: Validate inputs
      if (!fromUserId || !toUserId || !gameMode) {
        return { success: false, error: 'Missing required parameters' };
      }

      if (fromUserId === toUserId) {
        return { success: false, error: 'Cannot invite yourself' };
      }

      // Step 2: Validate game mode
      const validGameModes = ['classic', 'quickfire', 'zero-hour', 'last-line', 'tag-team'];
      if (!validGameModes.includes(gameMode.toLowerCase())) {
        return { success: false, error: `Invalid game mode: ${gameMode}` };
      }

      // Step 3: Check friendship status
      const areFriends = await this.validateFriendship(fromUserId, toUserId);
      if (!areFriends) {
        return { success: false, error: 'Can only invite friends to games' };
      }

      // Step 4: Get and validate both users
      const [fromUser, toUser] = await Promise.all([
        this.getUserData(fromUserId),
        this.getUserData(toUserId)
      ]);

      if (!fromUser || !toUser) {
        return { success: false, error: 'User data not found' };
      }

      // Step 5: Check if target user is available
      const availability = await this.checkUserAvailability(toUserId);
      if (!availability.available) {
        return { success: false, error: availability.reason };
      }

      // Step 6: Check for existing pending invitations
      const existingInvitation = await this.findExistingInvitation(fromUserId, toUserId);
      if (existingInvitation) {
        return { success: false, error: 'Game invitation already pending between these users' };
      }

      // Step 7: Create the invitation
      const invitationData = {
        fromUserId,
        toUserId,
        fromUserName: fromUser.displayName || fromUser.email || 'Unknown Player',
        gameType: gameMode.toLowerCase(), // Use gameType to match interface
        gameSettings: gameSettings || {},
        status: 'pending',
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)) // 5 minutes
      };

      console.log('📝 Creating invitation document with data:', {
        ...invitationData,
        createdAt: '[ServerTimestamp]',
        expiresAt: '[Timestamp]'
      });

      // Ensure user is still authenticated before writing
      const { auth: authInstance } = await import('./firebase');
      if (!authInstance.currentUser) {
        return { success: false, error: 'Authentication lost. Please sign in again.' };
      }

      const invitationRef = await addDoc(collection(db, 'gameInvitations'), invitationData);
      
      console.log('✅ NewGameInvitationService: Invitation created successfully', {
        invitationId: invitationRef.id,
        gameMode
      });

      return { 
        success: true, 
        invitationId: invitationRef.id 
      };

    } catch (error: any) {
      console.error('❌ NewGameInvitationService: Error sending invitation:', error);
      
      // Provide more specific error messages based on Firebase error codes
      if (error?.code === 'permission-denied') {
        return { 
          success: false, 
          error: 'Permission denied. Please check your authentication and try again.' 
        };
      } else if (error?.code === 'unauthenticated') {
        return { 
          success: false, 
          error: 'Authentication required. Please sign in and try again.' 
        };
      } else if (error?.code === 'network-request-failed') {
        return { 
          success: false, 
          error: 'Network error. Please check your connection and try again.' 
        };
      }
      
      return { 
        success: false, 
        error: `Failed to send game invitation: ${error.message || 'Unknown error'}` 
      };
    }
  }

  // Core method: Accept game invitation and create direct match
  static async acceptGameInvitation(invitationId: string, acceptingUserId: string): Promise<{ 
    success: boolean; 
    matchId?: string; 
    error?: string 
  }> {
    try {
      console.log('🎯 NewGameInvitationService: Accepting invitation', { invitationId, acceptingUserId });

      // Step 1: Get and validate invitation
      const invitationRef = doc(db, 'gameInvitations', invitationId);
      const invitationDoc = await getDoc(invitationRef);
      
      if (!invitationDoc.exists()) {
        return { success: false, error: 'Invitation not found or has expired' };
      }

      const invitation = invitationDoc.data() as GameInvitation;
      
      // Step 2: Validate invitation status and expiry
      if (invitation.status !== 'pending') {
        return { success: false, error: 'Invitation is no longer valid' };
      }

      if (invitation.expiresAt.toDate() < new Date()) {
        await updateDoc(invitationRef, { status: 'expired' });
        return { success: false, error: 'Invitation has expired' };
      }

      if (invitation.toUserId !== acceptingUserId) {
        return { success: false, error: 'Not authorized to accept this invitation' };
      }

      // Step 3: Mark invitation as accepted
      await updateDoc(invitationRef, { 
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });

      // Step 4: Create direct match instead of waiting room
      const matchId = await this.createDirectMatch(invitation);
      
      // Step 5: Update both users' currentGame status
      await Promise.all([
        this.updateUserGameStatus(invitation.fromUserId, matchId),
        this.updateUserGameStatus(invitation.toUserId, matchId)
      ]);

      // Step 6: Clean up invitation
      await deleteDoc(invitationRef);
      
      console.log('✅ NewGameInvitationService: Match created successfully', { matchId });

      return { 
        success: true, 
        matchId 
      };

    } catch (error) {
      console.error('❌ NewGameInvitationService: Error accepting invitation:', error);
      return { 
        success: false, 
        error: 'Failed to accept invitation. Please try again.' 
      };
    }
  }

  // Core method: Decline invitation
  static async declineGameInvitation(invitationId: string, decliningUserId: string): Promise<boolean> {
    try {
      console.log('❌ NewGameInvitationService: Declining invitation', { invitationId, decliningUserId });

      const invitationRef = doc(db, 'gameInvitations', invitationId);
      const invitationDoc = await getDoc(invitationRef);
      
      if (!invitationDoc.exists()) {
        console.warn('Invitation not found for decline:', invitationId);
        return false;
      }
      
      const invitation = invitationDoc.data() as GameInvitation;
      
      if (invitation.toUserId !== decliningUserId) {
        console.error('User not authorized to decline this invitation');
        return false;
      }

      // Mark as declined
      await updateDoc(invitationRef, { 
        status: 'declined',
        declinedAt: serverTimestamp()
      });

      // Send notification to inviter
      await this.sendDeclineNotification(invitation, decliningUserId);
      
      // Clean up invitation
      await deleteDoc(invitationRef);
      
      console.log('✅ NewGameInvitationService: Invitation declined successfully');
      return true;

    } catch (error) {
      console.error('❌ NewGameInvitationService: Error declining invitation:', error);
      return false;
    }
  }

  // Helper: Validate friendship between users
  private static async validateFriendship(userId1: string, userId2: string): Promise<boolean> {
    try {
      const friendshipQuery = query(
        collection(db, 'friends'),
        where('userId', '==', userId1),
        where('friendId', '==', userId2),
        where('status', '==', 'accepted')
      );
      
      const snapshot = await getDocs(friendshipQuery);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error validating friendship:', error);
      return false;
    }
  }

  // Helper: Get user data
  private static async getUserData(userId: string): Promise<any | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // Helper: Check user availability
  private static async checkUserAvailability(userId: string): Promise<{ available: boolean; reason?: string }> {
    try {
      const userData = await this.getUserData(userId);
      
      if (!userData) {
        return { available: false, reason: 'User not found' };
      }

      if (!userData.isOnline) {
        return { available: false, reason: 'User is currently offline' };
      }

      // For friend invitations, we allow users to accept even if they have a current game
      // The system will handle session cleanup automatically
      console.log('🔧 DEBUG: User availability check passed for friend invitations (current game ignored)');
      return { available: true };
      
    } catch (error) {
      console.error('Error checking user availability:', error);
      return { available: false, reason: 'Unable to verify user availability' };
    }
  }

  // Helper: Find existing invitation between users
  private static async findExistingInvitation(fromUserId: string, toUserId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'gameInvitations'),
        where('fromUserId', '==', fromUserId),
        where('toUserId', '==', toUserId),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking existing invitations:', error);
      return false;
    }
  }

  // Helper: Create direct match from invitation
  private static async createDirectMatch(invitation: GameInvitation): Promise<string> {
    try {
      // Get user profiles for both players
      const [fromProfile, toProfile] = await Promise.all([
        UserService.getUserProfile(invitation.fromUserId),
        UserService.getUserProfile(invitation.toUserId)
      ]);

      if (!fromProfile || !toProfile) {
        throw new Error('Unable to load player profiles');
      }

      // Get game mode configuration
      const gameConfig = this.getGameModeConfig(invitation.gameType);
      
      // Create match data with correct MatchData structure
      const matchData = {
        // Basic info
        createdAt: serverTimestamp(),
        gameMode: invitation.gameType,
        gameType: 'friend-invitation',
        
        // Host player data (invitation sender)
        hostData: {
          displayBackgroundEquipped: fromProfile.inventory?.displayBackgroundEquipped || this.getDefaultBackground(),
          matchBackgroundEquipped: fromProfile.inventory?.matchBackgroundEquipped || this.getDefaultBackground(),
          playerDisplayName: fromProfile.displayName || 'Player 1',
          playerId: invitation.fromUserId,
          playerStats: {
            bestStreak: fromProfile.stats?.bestStreak || 0,
            currentStreak: fromProfile.stats?.currentStreak || 0,
            gamesPlayed: fromProfile.stats?.gamesPlayed || 0,
            matchWins: fromProfile.stats?.matchWins || 0
          },
          turnActive: false,
          playerScore: gameConfig.startingScore,
          roundScore: 0,
          isConnected: true,
          lastHeartbeat: serverTimestamp(),
          matchStats: {
            banks: 0,
            doubles: 0,
            biggestTurnScore: 0,
            lastDiceSum: 0
          }
        },
        
        // Opponent player data (invitation recipient)
        opponentData: {
          displayBackgroundEquipped: toProfile.inventory?.displayBackgroundEquipped || this.getDefaultBackground(),
          matchBackgroundEquipped: toProfile.inventory?.matchBackgroundEquipped || this.getDefaultBackground(),
          playerDisplayName: toProfile.displayName || 'Player 2',
          playerId: invitation.toUserId,
          playerStats: {
            bestStreak: toProfile.stats?.bestStreak || 0,
            currentStreak: toProfile.stats?.currentStreak || 0,
            gamesPlayed: toProfile.stats?.gamesPlayed || 0,
            matchWins: toProfile.stats?.matchWins || 0
          },
          turnActive: false,
          playerScore: gameConfig.startingScore,
          roundScore: 0,
          isConnected: true,
          lastHeartbeat: serverTimestamp(),
          matchStats: {
            banks: 0,
            doubles: 0,
            biggestTurnScore: 0,
            lastDiceSum: 0
          }
        },
        
        // Game state data
        gameData: {
          type: invitation.gameType,
          settings: invitation.gameSettings || {},
          turnDecider: Math.floor(Math.random() * 2) + 1, // 1 = host, 2 = opponent
          chooserPlayerIndex: Math.floor(Math.random() * 2) + 1, // FIXED: Add missing chooserPlayerIndex field for turn decider logic
          turnScore: 0,
          diceOne: 0,
          diceTwo: 0,
          roundObjective: gameConfig.roundObjective,
          startingScore: gameConfig.startingScore,
          status: 'active',
          startedAt: serverTimestamp(),
          gamePhase: 'turnDecider',
          isRolling: false
        }
      };

      const matchRef = await addDoc(collection(db, 'matches'), matchData);
      
      console.log('✅ NewGameInvitationService: Direct match created', {
        matchId: matchRef.id,
        gameMode: invitation.gameType
      });

      return matchRef.id;
    } catch (error) {
      console.error('❌ NewGameInvitationService: Error creating direct match:', error);
      throw error;
    }
  }

  // Helper: Get game mode configuration
  private static getGameModeConfig(gameMode: string): any {
    const configs: { [key: string]: any } = {
      'classic': {
        startingScore: 100,
        roundObjective: 21,
        winCondition: 'reach_zero'
      },
      'quickfire': {
        startingScore: 50,
        roundObjective: 15,
        winCondition: 'reach_zero'
      },
      'zero-hour': {
        startingScore: 75,
        roundObjective: 18,
        winCondition: 'reach_zero'
      },
      'last-line': {
        startingScore: 100,
        roundObjective: 21,
        winCondition: 'elimination'
      },
      'tag-team': {
        startingScore: 150,
        roundObjective: 25,
        winCondition: 'reach_zero'
      }
    };

    return configs[gameMode] || configs['classic'];
  }

  // Helper: Get default background
  private static getDefaultBackground(): any {
    const relaxBackground = getBackgroundById('relax');
    return relaxBackground ? toUserBackground(relaxBackground) : {
      name: 'Relax',
      file: '/backgrounds/Relax.png',
      type: 'image'
    };
  }

  // Helper: Update user game status
  private static async updateUserGameStatus(userId: string, gameId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        currentGame: gameId,
        lastActivity: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user game status:', error);
    }
  }

  // Helper: Send decline notification
  private static async sendDeclineNotification(invitation: GameInvitation, decliningUserId: string): Promise<void> {
    try {
      const decliningUser = await this.getUserData(decliningUserId);
      const decliningUserName = decliningUser?.displayName || 'Someone';
      
      await addDoc(collection(db, 'notifications'), {
        userId: invitation.fromUserId,
        type: 'game_invitation_declined',
        message: `${decliningUserName} declined your ${invitation.gameType} game invitation`,
        fromUserName: decliningUserName,
        gameMode: invitation.gameType, // Use gameType from invitation
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (error) {
      console.error('Error sending decline notification:', error);
    }
  }

  // Utility: Listen to user's invitations
  static listenToUserInvitations(
    userId: string, 
    callback: (invitations: GameInvitation[]) => void
  ): () => void {
    const q = query(
      collection(db, 'gameInvitations'),
      where('toUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const invitations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GameInvitation[];

      callback(invitations);
    });
  }

  // Utility: Clean expired invitations
  static async cleanExpiredInvitations(): Promise<void> {
    try {
      const expiredQuery = query(
        collection(db, 'gameInvitations'),
        where('expiresAt', '<', Timestamp.now())
      );

      const snapshot = await getDocs(expiredQuery);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      
      await Promise.all(deletePromises);
      
      if (snapshot.docs.length > 0) {
        console.log(`🧹 Cleaned ${snapshot.docs.length} expired invitations`);
      }
    } catch (error) {
      console.error('Error cleaning expired invitations:', error);
    }
  }
}
