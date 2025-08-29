import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc,
  setDoc,
  deleteDoc,
  query, 
  where, 
  orderBy,
  limit,
  getDocs,
  getDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { ModerationService } from './moderationService';
import { 
  ChatRoom, 
  ChatMessage, 
  ChatParticipant, 
  UserChatSettings,
  TypingIndicator 
} from '@/types/chat';

export class ChatService {
  // Create chat room
  static async createChatRoom(
    type: 'game' | 'friend' | 'global',
    participants: string[],
    name: string,
    gameId?: string
  ): Promise<string> {
    try {
      const roomRef = await addDoc(collection(db, 'chatRooms'), {
        type,
        name,
        participants,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        settings: {
          isActive: true,
          maxParticipants: type === 'global' ? 1000 : (type === 'game' ? 8 : 2),
          isModerated: type === 'global'
        },
        gameId: gameId || null
      });

      // Add participants to the room
      for (const userId of participants) {
        await this.addParticipant(roomRef.id, userId, 'participant');
      }

      // Send welcome message for friend chats
      if (type === 'friend') {
        await this.sendSystemMessage(
          roomRef.id,
          'Chat started! Say hello to your friend.',
          'system'
        );
      }

      return roomRef.id;
    } catch (error) {
      console.error('Error creating chat room:', error);
      if (error instanceof Error && error.message.includes('permission')) {
        throw new Error('You do not have permission to create chat rooms. Please check your authentication.');
      }
      throw new Error('Failed to create chat room. Please try again.');
    }
  }

  // Send message
  static async sendMessage(
    roomId: string,
    userId: string,
    username: string,
    content: string,
    replyTo?: string
  ): Promise<boolean> {
    try {
      // Validate inputs
      if (!roomId || !userId || !username || !content) {
        console.error('Invalid message parameters:', { roomId, userId, username, content });
        return false;
      }

      // Get user's moderation settings
      const userSettings = await this.getUserChatSettings(userId);
      const filterLevel = userSettings?.profanityFilter || 'moderate';

      // Moderate content
      const moderation = ModerationService.moderateContent(content, filterLevel);
      
      // Check real-time filtering
      const realtimeCheck = ModerationService.filterRealTimeContent(content);
      if (realtimeCheck.shouldBlock) {
        console.warn('Message blocked:', realtimeCheck.reason);
        return false;
      }

      // Check if user can send messages (skip for global chat or if participant check fails)
      try {
        // For global chat, skip participant check as it's open to all users
        const roomDoc = await getDoc(doc(db, 'chatRooms', roomId));
        const roomData = roomDoc.data();
        
        if (roomData?.type === 'global') {
          // Global chat is open to all authenticated users
          console.log('Global chat access - no participant check needed');
        } else {
          // For other room types, check participant permissions
          const participant = await this.getParticipant(roomId, userId);
          if (participant && (participant.isMuted || !participant.permissions?.canSendMessages)) {
            console.warn('User cannot send messages - muted or no permission');
            return false;
          }
        }
      } catch (error) {
        console.warn('Could not check room/participant status, allowing message:', error);
        // Continue sending message even if participant check fails
      }

      // Create message with validated data
      const messageData: any = {
        roomId: roomId,
        userId: userId,
        username: username,
        content: moderation.moderatedContent || content,
        messageType: 'text',
        timestamp: serverTimestamp(),
        isModerated: moderation.isModerated || false,
        moderationFlags: moderation.flags || [],
        replyTo: replyTo || null,
        reactions: {},
        mentions: this.extractMentions(content) || []
      };

      // Only add originalContent if message was moderated and different from original
      if (moderation.isModerated && content !== moderation.moderatedContent) {
        messageData.originalContent = content;
      } else {
        // Ensure originalContent is never undefined
        messageData.originalContent = null;
      }

      const messageRef = await addDoc(collection(db, 'chatMessages'), messageData);

      // Log moderation if applied
      if (moderation.isModerated) {
        await ModerationService.logModerationAction(
          messageRef.id,
          roomId,
          userId,
          'flagged',
          `Auto-moderated: ${moderation.flags.join(', ')}`,
          content,
          moderation.moderatedContent
        );
      }

      // Update room last activity
      await updateDoc(doc(db, 'chatRooms', roomId), {
        lastActivity: serverTimestamp()
      });

      // Clear typing indicator
      await this.setTypingIndicator(roomId, userId, false);

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  // Send system message
  static async sendSystemMessage(
    roomId: string,
    content: string,
    messageType: 'system' | 'text' = 'system'
  ): Promise<boolean> {
    try {
      await addDoc(collection(db, 'chatMessages'), {
        roomId,
        userId: 'system',
        username: 'System',
        content,
        messageType,
        timestamp: serverTimestamp(),
        isModerated: false,
        reactions: {}
      });
      return true;
    } catch (error) {
      console.error('Error sending system message:', error);
      return false;
    }
  }

  // Get messages for a room
  static subscribeToMessages(
    roomId: string,
    callback: (messages: ChatMessage[]) => void,
    limitCount: number = 50
  ): () => void {
    const q = query(
      collection(db, 'chatMessages'),
      where('roomId', '==', roomId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      // Reverse to show oldest first
      callback(messages.reverse());
    }, (error) => {
      console.error('❌ Error listening to chat messages:', error);
      // Call callback with empty array to prevent UI issues
      callback([]);
    });
  }

  // Get friend chat room (create if doesn't exist)
  static async getFriendChatRoom(userId1: string, userId2: string): Promise<string> {
    try {
      const participants = [userId1, userId2].sort(); // Consistent ordering
      
      // Check if room already exists
      const q = query(
        collection(db, 'chatRooms'),
        where('type', '==', 'friend'),
        where('participants', '==', participants)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }

      // Create new friend chat room
      return await this.createChatRoom('friend', participants, 'Friend Chat');
    } catch (error) {
      console.error('Error getting/creating friend chat:', error);
      throw error;
    }
  }

  // Get global chat room (singleton)
  static async getGlobalChatRoom(): Promise<string> {
    try {
      const q = query(
        collection(db, 'chatRooms'),
        where('type', '==', 'global')
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }

      // Create global chat room if it doesn't exist
      return await this.createChatRoom('global', [], 'Global Chat');
    } catch (error) {
      console.error('Error getting global chat room:', error);
      if (error instanceof Error && error.message.includes('permission')) {
        throw new Error('You do not have permission to access chat rooms. Please check your authentication.');
      }
      throw new Error('Failed to access global chat room. Please try again.');
    }
  }

  // Get game chat room
  static async getGameChatRoom(gameId: string): Promise<string> {
    try {
      const q = query(
        collection(db, 'chatRooms'),
        where('type', '==', 'game'),
        where('gameId', '==', gameId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }

      // Create game chat room if it doesn't exist
      // Get game participants from match document
      const participants: string[] = [];
      
      try {
        const matchRef = doc(db, 'matches', gameId);
        const matchDoc = await getDoc(matchRef);
        
        if (matchDoc.exists()) {
          const matchData = matchDoc.data();
          // Add host and opponent as participants
          if (matchData.hostData?.playerId) {
            participants.push(matchData.hostData.playerId);
          }
          if (matchData.opponentData?.playerId) {
            participants.push(matchData.opponentData.playerId);
          }
        }
      } catch (matchError) {
        console.warn('Could not fetch match participants, creating room without participants:', matchError);
      }
      
      return await this.createChatRoom('game', participants, `Game Chat - ${gameId}`, gameId);
    } catch (error) {
      console.error('Error getting game chat room:', error);
      if (error instanceof Error && error.message.includes('permission')) {
        throw new Error('You do not have permission to access game chat rooms. Please check your authentication.');
      }
      throw new Error('Failed to access game chat room. Please try again.');
    }
  }

  // Join chat room
  static async joinChatRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      // Check if user is already a participant
      const existingParticipant = await this.getParticipant(roomId, userId);
      if (existingParticipant) {
        // Update last seen
        await updateDoc(doc(db, 'chatParticipants', existingParticipant.id), {
          lastSeen: serverTimestamp()
        });
        return true;
      }

      await this.addParticipant(roomId, userId, 'participant');
      
      // Add user to room participants list
      const roomRef = doc(db, 'chatRooms', roomId);
      const roomDoc = await getDoc(roomRef);

      if (roomDoc.exists()) {
        const roomData = roomDoc.data() as ChatRoom;
        const updatedParticipants = [...roomData.participants, userId];
        await updateDoc(roomRef, { participants: updatedParticipants });
      }

      return true;
    } catch (error) {
      console.error('Error joining chat room:', error);
      return false;
    }
  }

  // Leave chat room
  static async leaveChatRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      const participant = await this.getParticipant(roomId, userId);
      if (participant) {
        await deleteDoc(doc(db, 'chatParticipants', participant.id));
        
        // Remove from room participants
        const roomRef = doc(db, 'chatRooms', roomId);
        const roomDoc = await getDoc(roomRef);
        
        if (roomDoc.exists()) {
          const roomData = roomDoc.data() as ChatRoom;
          const updatedParticipants = roomData.participants.filter(id => id !== userId);
          await updateDoc(roomRef, { participants: updatedParticipants });
        }
      }
      return true;
    } catch (error) {
      console.error('Error leaving chat room:', error);
      return false;
    }
  }

  // Set typing indicator
  static async setTypingIndicator(roomId: string, userId: string, isTyping: boolean): Promise<void> {
    try {
      const participant = await this.getParticipant(roomId, userId);
      if (participant) {
        await updateDoc(doc(db, 'chatParticipants', participant.id), {
          isTyping,
          typingTimestamp: isTyping ? serverTimestamp() : null
        });
      }
    } catch (error) {
      console.error('Error setting typing indicator:', error);
    }
  }

  // Add reaction to message
  static async addReaction(messageId: string, userId: string, emoji: string): Promise<boolean> {
    try {
      const messageRef = doc(db, 'chatMessages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists()) {
        const messageData = messageDoc.data() as ChatMessage;
        const reactions = messageData.reactions || {};
        
        if (!reactions[emoji]) {
          reactions[emoji] = [];
        }
        
        if (!reactions[emoji].includes(userId)) {
          reactions[emoji].push(userId);
          await updateDoc(messageRef, { reactions });
        }
      }
      return true;
    } catch (error) {
      console.error('Error adding reaction:', error);
      return false;
    }
  }

  // Remove reaction from message
  static async removeReaction(messageId: string, userId: string, emoji: string): Promise<boolean> {
    try {
      const messageRef = doc(db, 'chatMessages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists()) {
        const messageData = messageDoc.data() as ChatMessage;
        const reactions = messageData.reactions || {};
        
        if (reactions[emoji]) {
          reactions[emoji] = reactions[emoji].filter(id => id !== userId);
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
          await updateDoc(messageRef, { reactions });
        }
      }
      return true;
    } catch (error) {
      console.error('Error removing reaction:', error);
      return false;
    }
  }

  // Mute user in room
  static async muteUser(roomId: string, userId: string, duration?: number): Promise<boolean> {
    try {
      const participant = await this.getParticipant(roomId, userId);
      if (participant) {
        const muteExpiresAt = duration 
          ? new Date(Date.now() + duration * 60 * 1000) // duration in minutes
          : undefined;
          
        await updateDoc(doc(db, 'chatParticipants', participant.id), {
          isMuted: true,
          muteExpiresAt: muteExpiresAt ? Timestamp.fromDate(muteExpiresAt) : null
        });
        
        // Send system message
        await this.sendSystemMessage(roomId, `User has been muted${duration ? ` for ${duration} minutes` : ''}.`);
      }
      return true;
    } catch (error) {
      console.error('Error muting user:', error);
      return false;
    }
  }

  // Get user chat settings
  static async getUserChatSettings(userId: string): Promise<UserChatSettings | null> {
    try {
      const settingsDoc = await getDoc(doc(db, 'userChatSettings', userId));
      if (settingsDoc.exists()) {
        return settingsDoc.data() as UserChatSettings;
      }
      
      // Create default settings if none exist
      const defaultSettings: UserChatSettings = {
        userId,
        globalChatEnabled: true,
        friendMessagesEnabled: true,
        gameMessagesEnabled: true,
        soundNotifications: true,
        showTypingIndicators: true,
        profanityFilter: 'moderate',
        blockedUsers: [],
        mutedRooms: [],
        notificationSettings: {
          mentions: true,
          friendMessages: true,
          gameMessages: true
        }
      };
      
      await this.updateUserChatSettings(userId, defaultSettings);
      return defaultSettings;
    } catch (error) {
      console.error('Error getting user chat settings:', error);
      if (error instanceof Error && error.message.includes('permission')) {
        // Return default settings if permissions are missing
        return {
          userId,
          globalChatEnabled: true,
          friendMessagesEnabled: true,
          gameMessagesEnabled: true,
          soundNotifications: true,
          showTypingIndicators: true,
          profanityFilter: 'moderate',
          blockedUsers: [],
          mutedRooms: [],
          notificationSettings: {
            mentions: true,
            friendMessages: true,
            gameMessages: true
          }
        } as UserChatSettings;
      }
      return null;
    }
  }

  // Update user chat settings
  static async updateUserChatSettings(userId: string, settings: Partial<UserChatSettings>): Promise<boolean> {
    try {
      await setDoc(doc(db, 'userChatSettings', userId), settings, { merge: true });
      return true;
    } catch (error) {
      console.error('Error updating user chat settings:', error);
      return false;
    }
  }

  // Private helper methods
  private static async addParticipant(
    roomId: string, 
    userId: string, 
    role: 'participant' | 'moderator' | 'admin'
  ): Promise<void> {
    await addDoc(collection(db, 'chatParticipants'), {
      roomId,
      userId,
      role,
      joinedAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      isTyping: false,
      isMuted: false,
      permissions: {
        canSendMessages: true,
        canReact: true,
        canMention: true
      }
    });
  }

  private static async getParticipant(roomId: string, userId: string): Promise<ChatParticipant | null> {
    try {
      const q = query(
        collection(db, 'chatParticipants'),
        where('roomId', '==', roomId),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ChatParticipant;
      }
      return null;
    } catch (error) {
      console.error('Error getting participant:', error);
      return null;
    }
  }

  private static extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  }

  // Helper function to get username from user ID
  static async getUserDisplayName(userId: string): Promise<string> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        return userData.displayName || userData.email?.split('@')[0] || 'Unknown User';
      }
      return 'Unknown User';
    } catch (error) {
      console.error('Error getting user display name:', error);
      return 'Unknown User';
    }
  }

  // Subscribe to typing indicators
  static subscribeToTypingIndicators(
    roomId: string,
    callback: (indicators: TypingIndicator[]) => void
  ): () => void {
    const q = query(
      collection(db, 'chatParticipants'),
      where('roomId', '==', roomId),
      where('isTyping', '==', true)
    );

    return onSnapshot(q, async (snapshot) => {
      const indicators: TypingIndicator[] = [];
      
      // Collect all typing participants first
      const typingUsers: { userId: string; timestamp: any }[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as ChatParticipant;
        if (data.isTyping && data.typingTimestamp) {
          typingUsers.push({
            userId: data.userId,
            timestamp: data.typingTimestamp
          });
        }
      });

      // Get usernames for all typing users
      for (const typingUser of typingUsers) {
        const username = await this.getUserDisplayName(typingUser.userId);
        indicators.push({
          userId: typingUser.userId,
          username: username,
          timestamp: typingUser.timestamp
        });
      }

      callback(indicators);
    }, (error) => {
      console.error('❌ Error listening to typing indicators:', error);
      // Call callback with empty array to prevent UI issues
      callback([]);
    });
  }

  // Clean up old typing indicators (call periodically)
  static async cleanupTypingIndicators(): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - 30000); // 30 seconds ago
      const q = query(
        collection(db, 'chatParticipants'),
        where('isTyping', '==', true)
      );
      
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.forEach((doc) => {
        const data = doc.data() as ChatParticipant;
        if (data.typingTimestamp && data.typingTimestamp.toDate() < cutoffTime) {
          batch.update(doc.ref, { 
            isTyping: false, 
            typingTimestamp: null 
          });
        }
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error cleaning up typing indicators:', error);
    }
  }
}
