# Friends System Implementation Guide

## Overview
This README outlines the implementation of a comprehensive friends system for DashDice, allowing users to connect through friend codes, track online status, and invite friends to games.

## Core Features
- **Friend Codes**: Unique identifiers for adding friends
- **Online Status**: Real-time friend presence tracking
- **Game Invitations**: Direct friend-to-friend game invites
- **Friend Management**: Add, remove, and block friends
- **Activity Feed**: See what friends are playing

## Database Schema

### Firestore Collections

#### Users Collection Enhancement
```typescript
// src/types/index.ts
interface User {
  uid: string;
  username: string;
  email: string;
  friendCode: string; // Unique 8-character code
  isOnline: boolean;
  lastSeen: Timestamp;
  currentGame?: string; // Game session ID if in game
  status: 'online' | 'away' | 'busy' | 'offline';
  privacy: {
    allowFriendRequests: boolean;
    showOnlineStatus: boolean;
    allowGameInvites: boolean;
  };
}
```

#### Friends Collection
```typescript
interface FriendRelationship {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
  nickname?: string; // Custom nickname for friend
}
```

#### Friend Requests Collection
```typescript
interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp; // Auto-expire after 30 days
}
```

#### Game Invitations Collection
```typescript
interface GameInvitation {
  id: string;
  fromUserId: string;
  toUserId: string;
  gameType: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Timestamp;
  expiresAt: Timestamp; // Auto-expire after 5 minutes
  gameSettings?: Record<string, any>;
}
```

## Implementation Architecture

### 1. Friend Code System

#### Friend Code Generation Service
```typescript
// src/services/friendCodeService.ts
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export class FriendCodeService {
  private static generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static async generateUniqueFriendCode(): Promise<string> {
    let code: string;
    let isUnique = false;
    
    do {
      code = this.generateCode();
      const q = query(
        collection(db, 'users'),
        where('friendCode', '==', code)
      );
      const snapshot = await getDocs(q);
      isUnique = snapshot.empty;
    } while (!isUnique);
    
    return code;
  }

  static async findUserByFriendCode(friendCode: string): Promise<User | null> {
    const q = query(
      collection(db, 'users'),
      where('friendCode', '==', friendCode.toUpperCase())
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
  }
}
```

### 2. Friends Service

#### Core Friends Management
```typescript
// src/services/friendsService.ts
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export class FriendsService {
  // Send friend request by friend code
  static async sendFriendRequest(
    fromUserId: string, 
    friendCode: string, 
    message?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find user by friend code
      const targetUser = await FriendCodeService.findUserByFriendCode(friendCode);
      if (!targetUser) {
        return { success: false, error: 'Friend code not found' };
      }

      if (targetUser.uid === fromUserId) {
        return { success: false, error: 'Cannot add yourself as a friend' };
      }

      // Check if already friends
      const existingRelationship = await this.getFriendshipStatus(fromUserId, targetUser.uid);
      if (existingRelationship) {
        return { success: false, error: 'Already friends or request pending' };
      }

      // Check privacy settings
      if (!targetUser.privacy.allowFriendRequests) {
        return { success: false, error: 'User is not accepting friend requests' };
      }

      // Create friend request
      await addDoc(collection(db, 'friendRequests'), {
        fromUserId,
        toUserId: targetUser.uid,
        status: 'pending',
        message: message || '',
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) // 30 days
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending friend request:', error);
      return { success: false, error: 'Failed to send friend request' };
    }
  }

  // Accept friend request
  static async acceptFriendRequest(requestId: string): Promise<boolean> {
    try {
      const requestRef = doc(db, 'friendRequests', requestId);
      
      // Update request status
      await updateDoc(requestRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });

      // Get request data to create friendship
      const requestDoc = await getDocs(query(
        collection(db, 'friendRequests'),
        where('__name__', '==', requestId)
      ));

      if (!requestDoc.empty) {
        const requestData = requestDoc.docs[0].data();
        
        // Create mutual friendship records
        await Promise.all([
          addDoc(collection(db, 'friends'), {
            userId: requestData.fromUserId,
            friendId: requestData.toUserId,
            status: 'accepted',
            createdAt: requestData.createdAt,
            acceptedAt: serverTimestamp()
          }),
          addDoc(collection(db, 'friends'), {
            userId: requestData.toUserId,
            friendId: requestData.fromUserId,
            status: 'accepted',
            createdAt: requestData.createdAt,
            acceptedAt: serverTimestamp()
          })
        ]);
      }

      return true;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return false;
    }
  }

  // Get user's friends with online status
  static async getFriends(userId: string): Promise<FriendWithStatus[]> {
    try {
      const q = query(
        collection(db, 'friends'),
        where('userId', '==', userId),
        where('status', '==', 'accepted')
      );
      
      const snapshot = await getDocs(q);
      const friends: FriendWithStatus[] = [];

      for (const doc of snapshot.docs) {
        const friendData = doc.data();
        const friendUserData = await this.getUserData(friendData.friendId);
        
        if (friendUserData) {
          friends.push({
            ...friendData,
            friendData: friendUserData,
            id: doc.id
          });
        }
      }

      return friends;
    } catch (error) {
      console.error('Error getting friends:', error);
      return [];
    }
  }

  // Real-time friends listener
  static subscribeToFriends(
    userId: string, 
    callback: (friends: FriendWithStatus[]) => void
  ): () => void {
    const q = query(
      collection(db, 'friends'),
      where('userId', '==', userId),
      where('status', '==', 'accepted')
    );

    return onSnapshot(q, async (snapshot) => {
      const friends: FriendWithStatus[] = [];
      
      for (const doc of snapshot.docs) {
        const friendData = doc.data();
        const friendUserData = await this.getUserData(friendData.friendId);
        
        if (friendUserData) {
          friends.push({
            ...friendData,
            friendData: friendUserData,
            id: doc.id
          });
        }
      }
      
      callback(friends);
    });
  }

  // Remove friend
  static async removeFriend(userId: string, friendId: string): Promise<boolean> {
    try {
      // Remove both friendship records
      const queries = [
        query(
          collection(db, 'friends'),
          where('userId', '==', userId),
          where('friendId', '==', friendId)
        ),
        query(
          collection(db, 'friends'),
          where('userId', '==', friendId),
          where('friendId', '==', userId)
        )
      ];

      for (const q of queries) {
        const snapshot = await getDocs(q);
        for (const doc of snapshot.docs) {
          await deleteDoc(doc.ref);
        }
      }

      return true;
    } catch (error) {
      console.error('Error removing friend:', error);
      return false;
    }
  }

  private static async getUserData(userId: string): Promise<User | null> {
    // Implementation to get user data
    // This would integrate with existing user service
    return null; // Placeholder
  }

  private static async getFriendshipStatus(userId1: string, userId2: string): Promise<string | null> {
    // Check existing friendship or pending requests
    // Return null if no relationship exists
    return null; // Placeholder
  }
}

interface FriendWithStatus extends FriendRelationship {
  friendData: User;
}
```

### 3. Online Presence System

#### Presence Service
```typescript
// src/services/presenceService.ts
import { doc, updateDoc, serverTimestamp, onDisconnect } from 'firebase/firestore';
import { db } from './firebase';

export class PresenceService {
  private static presenceRef: any = null;
  private static heartbeatInterval: NodeJS.Timeout | null = null;

  // Initialize user presence
  static async initializePresence(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      
      // Set user as online
      await updateDoc(userRef, {
        isOnline: true,
        lastSeen: serverTimestamp(),
        status: 'online'
      });

      // Set up disconnect handler
      this.presenceRef = onDisconnect(userRef);
      await this.presenceRef.update({
        isOnline: false,
        lastSeen: serverTimestamp(),
        status: 'offline'
      });

      // Start heartbeat
      this.startHeartbeat(userId);
    } catch (error) {
      console.error('Error initializing presence:', error);
    }
  }

  // Update user status
  static async updateStatus(userId: string, status: 'online' | 'away' | 'busy'): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status,
        lastSeen: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  // Update current game
  static async updateCurrentGame(userId: string, gameId?: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const updateData: any = {
        lastSeen: serverTimestamp()
      };

      if (gameId) {
        updateData.currentGame = gameId;
        updateData.status = 'busy';
      } else {
        updateData.currentGame = null;
        updateData.status = 'online';
      }

      await updateDoc(userRef, updateData);
    } catch (error) {
      console.error('Error updating current game:', error);
    }
  }

  // Cleanup presence
  static async cleanup(userId: string): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isOnline: false,
        lastSeen: serverTimestamp(),
        status: 'offline',
        currentGame: null
      });
    } catch (error) {
      console.error('Error cleaning up presence:', error);
    }
  }

  private static startHeartbeat(userId: string): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          lastSeen: serverTimestamp()
        });
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    }, 30000); // Update every 30 seconds
  }
}
```

### 4. Game Invitations System

#### Game Invitation Service
```typescript
// src/services/gameInvitationService.ts
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export class GameInvitationService {
  // Send game invitation
  static async sendGameInvitation(
    fromUserId: string,
    toUserId: string,
    gameType: string,
    gameSettings?: Record<string, any>
  ): Promise<{ success: boolean; invitationId?: string; error?: string }> {
    try {
      // Check if users are friends
      const areFriends = await this.checkFriendship(fromUserId, toUserId);
      if (!areFriends) {
        return { success: false, error: 'Can only invite friends to games' };
      }

      // Check if target user allows game invites
      const targetUser = await this.getUserData(toUserId);
      if (!targetUser?.privacy.allowGameInvites) {
        return { success: false, error: 'User is not accepting game invitations' };
      }

      // Check if target user is available
      if (targetUser.currentGame) {
        return { success: false, error: 'User is currently in a game' };
      }

      // Create invitation
      const invitationRef = await addDoc(collection(db, 'gameInvitations'), {
        fromUserId,
        toUserId,
        gameType,
        gameSettings: gameSettings || {},
        status: 'pending',
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)) // 5 minutes
      });

      return { success: true, invitationId: invitationRef.id };
    } catch (error) {
      console.error('Error sending game invitation:', error);
      return { success: false, error: 'Failed to send invitation' };
    }
  }

  // Accept game invitation
  static async acceptGameInvitation(invitationId: string): Promise<{ success: boolean; gameId?: string; error?: string }> {
    try {
      // Update invitation status
      const invitationRef = doc(db, 'gameInvitations', invitationId);
      await updateDoc(invitationRef, {
        status: 'accepted'
      });

      // Get invitation data
      const invitationDoc = await getDocs(query(
        collection(db, 'gameInvitations'),
        where('__name__', '==', invitationId)
      ));

      if (!invitationDoc.empty) {
        const invitationData = invitationDoc.docs[0].data();
        
        // Create game session
        const gameId = await this.createGameSession(
          invitationData.fromUserId,
          invitationData.toUserId,
          invitationData.gameType,
          invitationData.gameSettings
        );

        return { success: true, gameId };
      }

      return { success: false, error: 'Invitation not found' };
    } catch (error) {
      console.error('Error accepting game invitation:', error);
      return { success: false, error: 'Failed to accept invitation' };
    }
  }

  // Decline game invitation
  static async declineGameInvitation(invitationId: string): Promise<boolean> {
    try {
      const invitationRef = doc(db, 'gameInvitations', invitationId);
      await updateDoc(invitationRef, {
        status: 'declined'
      });
      return true;
    } catch (error) {
      console.error('Error declining game invitation:', error);
      return false;
    }
  }

  // Get pending invitations for user
  static async getPendingInvitations(userId: string): Promise<GameInvitation[]> {
    try {
      const q = query(
        collection(db, 'gameInvitations'),
        where('toUserId', '==', userId),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GameInvitation[];
    } catch (error) {
      console.error('Error getting pending invitations:', error);
      return [];
    }
  }

  // Real-time invitations listener
  static subscribeToInvitations(
    userId: string,
    callback: (invitations: GameInvitation[]) => void
  ): () => void {
    const q = query(
      collection(db, 'gameInvitations'),
      where('toUserId', '==', userId),
      where('status', '==', 'pending')
    );

    return onSnapshot(q, (snapshot) => {
      const invitations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GameInvitation[];
      
      callback(invitations);
    });
  }

  private static async checkFriendship(userId1: string, userId2: string): Promise<boolean> {
    // Implementation to check if users are friends
    return true; // Placeholder
  }

  private static async getUserData(userId: string): Promise<User | null> {
    // Implementation to get user data
    return null; // Placeholder
  }

  private static async createGameSession(
    player1Id: string,
    player2Id: string,
    gameType: string,
    settings: Record<string, any>
  ): Promise<string> {
    // Implementation to create game session
    return 'game-session-id'; // Placeholder
  }
}
```

## Frontend Components

### 1. Friends Context

```typescript
// src/context/FriendsContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FriendsService, GameInvitationService } from '@/services';
import { useAuth } from './AuthContext';

interface FriendsContextType {
  friends: FriendWithStatus[];
  pendingRequests: FriendRequest[];
  gameInvitations: GameInvitation[];
  isLoading: boolean;
  sendFriendRequest: (friendCode: string, message?: string) => Promise<{ success: boolean; error?: string }>;
  acceptFriendRequest: (requestId: string) => Promise<boolean>;
  removeFriend: (friendId: string) => Promise<boolean>;
  sendGameInvitation: (friendId: string, gameType: string) => Promise<{ success: boolean; error?: string }>;
  acceptGameInvitation: (invitationId: string) => Promise<{ success: boolean; gameId?: string; error?: string }>;
  declineGameInvitation: (invitationId: string) => Promise<boolean>;
}

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendWithStatus[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [gameInvitations, setGameInvitations] = useState<GameInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);

    // Subscribe to friends updates
    const unsubscribeFriends = FriendsService.subscribeToFriends(user.uid, (updatedFriends) => {
      setFriends(updatedFriends);
      setIsLoading(false);
    });

    // Subscribe to game invitations
    const unsubscribeInvitations = GameInvitationService.subscribeToInvitations(user.uid, (invitations) => {
      setGameInvitations(invitations);
    });

    return () => {
      unsubscribeFriends();
      unsubscribeInvitations();
    };
  }, [user]);

  const sendFriendRequest = async (friendCode: string, message?: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    return await FriendsService.sendFriendRequest(user.uid, friendCode, message);
  };

  const acceptFriendRequest = async (requestId: string) => {
    return await FriendsService.acceptFriendRequest(requestId);
  };

  const removeFriend = async (friendId: string) => {
    if (!user) return false;
    return await FriendsService.removeFriend(user.uid, friendId);
  };

  const sendGameInvitation = async (friendId: string, gameType: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    return await GameInvitationService.sendGameInvitation(user.uid, friendId, gameType);
  };

  const acceptGameInvitation = async (invitationId: string) => {
    return await GameInvitationService.acceptGameInvitation(invitationId);
  };

  const declineGameInvitation = async (invitationId: string) => {
    return await GameInvitationService.declineGameInvitation(invitationId);
  };

  const value: FriendsContextType = {
    friends,
    pendingRequests,
    gameInvitations,
    isLoading,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
    sendGameInvitation,
    acceptGameInvitation,
    declineGameInvitation
  };

  return (
    <FriendsContext.Provider value={value}>
      {children}
    </FriendsContext.Provider>
  );
}

export function useFriends() {
  const context = useContext(FriendsContext);
  if (context === undefined) {
    throw new Error('useFriends must be used within a FriendsProvider');
  }
  return context;
}
```

### 2. Add Friend Component

```typescript
// src/components/friends/AddFriend.tsx
'use client';

import React, { useState } from 'react';
import { useFriends } from '@/context/FriendsContext';

export default function AddFriend() {
  const [friendCode, setFriendCode] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  
  const { sendFriendRequest } = useFriends();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendCode.trim()) return;

    setIsLoading(true);
    setResult(null);

    const response = await sendFriendRequest(friendCode.trim(), message.trim());
    setResult(response);
    
    if (response.success) {
      setFriendCode('');
      setMessage('');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Add Friend</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Friend Code
          </label>
          <input
            type="text"
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
            placeholder="Enter 8-character friend code"
            maxLength={8}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Message (Optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say hello to your friend!"
            rows={3}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !friendCode.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {isLoading ? 'Sending...' : 'Send Friend Request'}
        </button>
      </form>

      {result && (
        <div className={`mt-4 p-3 rounded-md ${result.success ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
          {result.success ? 'Friend request sent!' : result.error}
        </div>
      )}
    </div>
  );
}
```

### 3. Friends List Component

```typescript
// src/components/friends/FriendsList.tsx
'use client';

import React from 'react';
import { useFriends } from '@/context/FriendsContext';
import FriendCard from './FriendCard';

export default function FriendsList() {
  const { friends, isLoading } = useFriends();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No friends yet. Add some friends to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {friends.map((friend) => (
        <FriendCard key={friend.id} friend={friend} />
      ))}
    </div>
  );
}
```

### 4. Friend Card Component

```typescript
// src/components/friends/FriendCard.tsx
'use client';

import React, { useState } from 'react';
import { useFriends } from '@/context/FriendsContext';

interface FriendCardProps {
  friend: FriendWithStatus;
}

export default function FriendCard({ friend }: FriendCardProps) {
  const [showActions, setShowActions] = useState(false);
  const { sendGameInvitation, removeFriend } = useFriends();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (friend: FriendWithStatus) => {
    if (!friend.friendData.isOnline) return 'Offline';
    if (friend.friendData.currentGame) return 'In Game';
    return friend.friendData.status.charAt(0).toUpperCase() + friend.friendData.status.slice(1);
  };

  const handleInviteToGame = async () => {
    const result = await sendGameInvitation(friend.friendId, 'dice-roll');
    if (result.success) {
      // Show success notification
    }
  };

  const handleRemoveFriend = async () => {
    if (confirm(`Remove ${friend.friendData.username} from your friends list?`)) {
      await removeFriend(friend.friendId);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between hover:bg-gray-750 transition-colors">
      <div className="flex items-center space-x-3">
        {/* Avatar */}
        <div className="relative">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {friend.friendData.username.charAt(0).toUpperCase()}
          </div>
          <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-gray-800 ${getStatusColor(friend.friendData.status)}`}></div>
        </div>

        {/* Friend Info */}
        <div>
          <h4 className="text-white font-medium">{friend.friendData.username}</h4>
          <p className="text-sm text-gray-400">{getStatusText(friend)}</p>
          {friend.friendData.currentGame && (
            <p className="text-xs text-blue-400">Playing DashDice</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="relative">
        <button
          onClick={() => setShowActions(!showActions)}
          className="text-gray-400 hover:text-white p-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        {showActions && (
          <div className="absolute right-0 top-full mt-1 bg-gray-700 rounded-md shadow-lg z-10 min-w-32">
            <button
              onClick={handleInviteToGame}
              disabled={!friend.friendData.isOnline || !!friend.friendData.currentGame}
              className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Invite to Game
            </button>
            <button
              onClick={handleRemoveFriend}
              className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-600"
            >
              Remove Friend
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 5. Game Invitations Component

```typescript
// src/components/friends/GameInvitations.tsx
'use client';

import React from 'react';
import { useFriends } from '@/context/FriendsContext';
import { useRouter } from 'next/navigation';

export default function GameInvitations() {
  const { gameInvitations, acceptGameInvitation, declineGameInvitation } = useFriends();
  const router = useRouter();

  const handleAcceptInvitation = async (invitationId: string) => {
    const result = await acceptGameInvitation(invitationId);
    if (result.success && result.gameId) {
      router.push(`/match/${result.gameId}`);
    }
  };

  if (gameInvitations.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {gameInvitations.map((invitation) => (
        <div key={invitation.id} className="bg-gray-800 border border-blue-500 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {/* Friend's avatar */}
              ?
            </div>
            <div>
              <p className="text-white font-medium">Game Invitation</p>
              <p className="text-sm text-gray-400">From a friend</p>
            </div>
          </div>

          <p className="text-gray-300 text-sm mb-4">
            You've been invited to play {invitation.gameType}!
          </p>

          <div className="flex space-x-2">
            <button
              onClick={() => handleAcceptInvitation(invitation.id)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() => declineGameInvitation(invitation.id)}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
1. **Database Schema Setup**
   - Create Firestore collections and security rules
   - Implement friend code generation system
   - Set up user presence tracking

2. **Backend Services**
   - Implement FriendsService core functionality
   - Create PresenceService for online status
   - Set up GameInvitationService

### Phase 2: Basic UI Components (Week 2)
1. **Add Friend Functionality**
   - Friend code input and validation
   - Friend request sending/receiving
   - Basic friend list display

2. **Online Status Display**
   - Real-time presence indicators
   - Status management (online/away/busy)
   - Last seen timestamps

### Phase 3: Game Integration (Week 3)
1. **Game Invitations**
   - Send/receive game invites
   - Integration with existing game system
   - Real-time invitation notifications

2. **Enhanced UI/UX**
   - Improved friend list with filtering
   - Activity feed showing friend actions
   - Mobile-responsive design

### Phase 4: Advanced Features (Week 4)
1. **Social Features**
   - Friend nicknames and notes
   - Friend groups/categories
   - Block/report functionality

2. **Integration & Polish**
   - Integration with existing dashboard
   - Performance optimization
   - Testing and bug fixes

## Security Considerations

### Privacy Controls
```typescript
// Default privacy settings
const defaultPrivacySettings = {
  allowFriendRequests: true,
  showOnlineStatus: true,
  allowGameInvites: true,
  showActivity: true
};
```

### Firestore Security Rules
```javascript
// Firestore rules for friends system
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Friend requests - users can only see their own
    match /friendRequests/{requestId} {
      allow read, write: if request.auth != null && 
        (resource.data.fromUserId == request.auth.uid || 
         resource.data.toUserId == request.auth.uid);
    }
    
    // Friends - users can only see their own friendships
    match /friends/{friendshipId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Game invitations - users can only see invitations to/from them
    match /gameInvitations/{invitationId} {
      allow read, write: if request.auth != null && 
        (resource.data.fromUserId == request.auth.uid || 
         resource.data.toUserId == request.auth.uid);
    }
  }
}
```

## Testing Strategy

### Unit Tests
- Friend code generation and validation
- Service method functionality
- Privacy setting enforcement

### Integration Tests
- Real-time presence updates
- Friend request workflow
- Game invitation flow

### End-to-End Tests
- Complete friend addition process
- Game invitation and acceptance
- Cross-platform compatibility

## Performance Optimization

### Caching Strategy
- Cache friend lists locally
- Implement optimistic updates
- Use pagination for large friend lists

### Real-time Optimization
- Debounce presence updates
- Batch friend status updates
- Implement connection pooling

## Future Enhancements

### Advanced Social Features
- Friend activity feeds
- Voice/video chat integration
- Friend recommendations
- Social achievements

### Gaming Integration
- Tournament organization with friends
- Team formation
- Spectator mode for friend games
- Friend leaderboards

This implementation provides a comprehensive friends system that enhances the social aspect of DashDice while maintaining security and performance standards.
