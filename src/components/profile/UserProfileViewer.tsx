'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Target, Users, Clock } from 'lucide-react';
import { UserService, UserProfile } from '@/services/userService';
import { useNavigation } from '@/context/NavigationContext';
import { useUserStats } from '@/hooks/useUserStats';
import { useFriends } from '@/context/FriendsContext';
import { useAuth } from '@/context/AuthContext';
import { useBackground } from '@/context/BackgroundContext';
import { MatchHistory } from '@/components/profile/MatchHistory';

interface UserProfileViewerProps {
  userId: string;
  onClose: () => void;
}

export const UserProfileViewer: React.FC<UserProfileViewerProps> = ({ userId, onClose }) => {
  const { user } = useAuth();
  const { DisplayBackgroundEquip } = useBackground(); // For current user's background
  const { sendFriendRequest, removeFriend, friends, pendingRequests } = useFriends();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);

  // Check if this user is already a friend
  const isAlreadyFriend = friends.some(friend => friend.friendId === userId);
  const isOwnProfile = user?.uid === userId;
  
  // Check if there's a pending outgoing friend request to this user
  const hasPendingRequest = outgoingRequests.some(request => 
    request.fromUserId === user?.uid && request.toUserId === userId && request.status === 'pending'
  );

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const profile = await UserService.getUserProfile(userId);
        if (profile) {
          setUserProfile(profile);
        } else {
          setError('User profile not found');
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadUserProfile();
    }
  }, [userId]);

  // Subscribe to outgoing friend requests - only if user is authenticated
  useEffect(() => {
    if (!user?.uid) {
      setOutgoingRequests([]);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const subscribeToOutgoingRequests = async () => {
      try {
        const { collection, query, where, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('@/services/firebase');

        const requestsQuery = query(
          collection(db, 'friendRequests'),
          where('fromUserId', '==', user.uid),
          where('status', '==', 'pending')
        );

        unsubscribe = onSnapshot(
          requestsQuery, 
          (snapshot) => {
            const requests = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setOutgoingRequests(requests);
          },
          (error) => {
            console.error('Error subscribing to outgoing friend requests:', error);
            // Handle permission errors gracefully
            if (error.code === 'permission-denied') {
              console.warn('Permission denied for friend requests. User may not be authenticated properly.');
              setOutgoingRequests([]);
            }
          }
        );
      } catch (error) {
        console.error('Error setting up friend request subscription:', error);
        setOutgoingRequests([]);
      }
    };

    subscribeToOutgoingRequests();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid]);

  const handleSendFriendRequest = async () => {
    if (!userProfile || isAlreadyFriend || isOwnProfile || hasPendingRequest) return;

    setSendingRequest(true);
    try {
      // Create friend request directly with userIds instead of using friend code
      const result = await sendFriendRequestByUserId(userId);
      if (result.success) {
        // Show success or handle success state
        console.log('Friend request sent successfully');
      } else {
        console.error('Failed to send friend request:', result.error);
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setSendingRequest(false);
    }
  };

  // Helper function to send friend request by userId instead of friend code
  const sendFriendRequestByUserId = async (targetUserId: string) => {
    if (!user?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      // Import the necessary Firebase functions locally to avoid dependency issues
      const { collection, addDoc, serverTimestamp, Timestamp } = await import('firebase/firestore');
      const { db } = await import('@/services/firebase');

      // Check if trying to add self
      if (targetUserId === user.uid) {
        return { success: false, error: 'Cannot add yourself as a friend' };
      }

      // Check if already friends
      const existingFriend = friends.find(friend => friend.friendId === targetUserId);
      if (existingFriend) {
        return { success: false, error: 'Already friends with this user' };
      }

      // Check if there's already a pending request
      if (hasPendingRequest) {
        return { success: false, error: 'Friend request already pending' };
      }

      // Create friend request
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Expire in 30 days

      await addDoc(collection(db, 'friendRequests'), {
        fromUserId: user.uid,
        toUserId: targetUserId,
        status: 'pending',
        message: '',
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt)
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending friend request:', error);
      return { success: false, error: 'Failed to send friend request' };
    }
  };

  const handleRemoveFriend = async () => {
    if (!userProfile || !isAlreadyFriend || isOwnProfile) return;

    const displayName = userProfile.displayName || 'this user';
    if (window.confirm(`Are you sure you want to remove ${displayName} from your friends list?`)) {
      setRemoving(true);
      try {
        await removeFriend(userId);
        // Show success message or handle success state
      } catch (error) {
        console.error('Error removing friend:', error);
        // Show error message
      } finally {
        setRemoving(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white font-montserrat">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="text-6xl mb-4">😞</div>
          <p className="text-white font-montserrat text-lg">
            {error || 'Profile not found'}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-blue-600/60 hover:bg-blue-700/60 text-white rounded-lg font-audiowide transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between gap-4 mb-6 px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600/60 hover:bg-gray-700/60 text-white rounded-xl font-audiowide transition-colors"
          >
            <ArrowLeft size={18} />
            Back
          </button>
        </div>
        
        {/* Friend Action Buttons */}
        {!isOwnProfile && (
          <div className="flex gap-3">
            {!isAlreadyFriend && !hasPendingRequest && (
              <button
                onClick={handleSendFriendRequest}
                disabled={sendingRequest}
                className="px-6 py-2 bg-green-600/60 hover:bg-green-700/60 disabled:bg-gray-600/60 disabled:cursor-not-allowed text-white rounded-xl font-audiowide transition-colors"
              >
                {sendingRequest ? 'Sending...' : 'Add Friend'}
              </button>
            )}
            
            {hasPendingRequest && (
              <button
                disabled
                className="px-6 py-2 bg-orange-600/60 text-white rounded-xl font-audiowide cursor-not-allowed"
              >
                Invite Sent
              </button>
            )}
            
            {isAlreadyFriend && (
              <button
                onClick={handleRemoveFriend}
                disabled={removing}
                className="px-6 py-2 bg-red-600/60 hover:bg-red-700/60 disabled:bg-gray-600/60 disabled:cursor-not-allowed text-white rounded-xl font-audiowide transition-colors"
              >
                {removing ? 'Removing...' : 'Remove Friend'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Profile Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4">
        <div className="space-y-6">
          {/* User Profile Card - Similar to current ProfileSection */}
          <motion.div
            className="relative overflow-hidden touch-manipulation"
            style={{
              ...(() => {
                // For viewing the current user's own profile, use the background context
                if (isOwnProfile && DisplayBackgroundEquip) {
                  if (DisplayBackgroundEquip.type === 'video') {
                    // For videos, use a fallback gradient for CSS background
                    return {
                      background: 'linear-gradient(135deg, #667eea, #764ba2)'
                    };
                  }
                  return {
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("${DisplayBackgroundEquip.file}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  };
                }
                
                // For viewing other users' profiles, try both match and display backgrounds
                const matchBg = userProfile.inventory?.matchBackgroundEquipped;
                const displayBg = userProfile.inventory?.displayBackgroundEquipped;
                const bgEquipped = matchBg || displayBg;
                
                if (bgEquipped) {
                  // Handle background object with name, file, and type properties
                  if (typeof bgEquipped === 'object' && bgEquipped.file) {
                    // For video backgrounds, use a themed gradient
                    if (bgEquipped.type === 'video') {
                      // Use different gradients based on background name for video backgrounds
                      switch (bgEquipped.name) {
                        case 'New Day':
                          return { background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' };
                        case 'On A Mission':
                          return { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
                        case 'Underwater':
                          return { background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' };
                        default:
                          return { background: 'linear-gradient(135deg, #667eea, #764ba2)' };
                      }
                    }
                    
                    // For image backgrounds, use the file path with proper path fixing
                    if (bgEquipped.type === 'image' || !bgEquipped.type) {
                      let backgroundPath = bgEquipped.file;
                      
                      // Fix common background paths (same logic as FriendCard)
                      if (backgroundPath === 'All For Glory.jpg' || backgroundPath === '/backgrounds/All For Glory.jpg') {
                        backgroundPath = '/backgrounds/All For Glory.jpg';
                      } else if (backgroundPath === 'Long Road Ahead.jpg' || backgroundPath === '/backgrounds/Long Road Ahead.jpg') {
                        backgroundPath = '/backgrounds/Long Road Ahead.jpg';
                      } else if (backgroundPath === 'Relax.png' || backgroundPath === '/backgrounds/Relax.png') {
                        backgroundPath = '/backgrounds/Relax.png';
                      } else if (!backgroundPath.startsWith('/') && !backgroundPath.startsWith('http')) {
                        // If it's a filename without path, prepend /backgrounds/
                        backgroundPath = `/backgrounds/${backgroundPath}`;
                      }
                      
                      return {
                        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("${backgroundPath}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      };
                    }
                  }
                  
                  // Handle string file path (legacy format)
                  if (typeof bgEquipped === 'string') {
                    let backgroundPath: string = bgEquipped;
                    
                    // Fix paths for legacy format
                    if (!backgroundPath.startsWith('/') && !backgroundPath.startsWith('http')) {
                      backgroundPath = `/backgrounds/${backgroundPath}`;
                    }
                    
                    return {
                      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("${backgroundPath}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    };
                  }
                }
                
                // Fallback gradient
                return {
                  background: 'linear-gradient(135deg, #667eea, #764ba2)'
                };
              })(),
              borderRadius: '20px'
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Dark overlay gradient for text readability */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to right, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 50%, transparent 100%)',
                borderRadius: '20px',
                zIndex: 1
              }}
            ></div>

            <div className="relative z-10 p-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-2xl font-bold font-audiowide">
                      {userProfile.displayName?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-gray-800"></div>
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-white text-2xl font-semibold font-audiowide truncate">
                    {userProfile.displayName || 'Player'}
                  </h2>
                  <p className="text-white/80 text-lg font-montserrat">
                    {userProfile.rankedStatus || 'Ranked - Active'}
                  </p>
                  <p className="text-white/60 text-sm font-montserrat">
                    Member since {userProfile.createdAt?.toDate?.() ? userProfile.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="bg-transparent backdrop-blur-[0.5px] rounded-xl p-6">
                <h3 className="text-white text-xl font-audiowide mb-4 uppercase">Player Statistics</h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <motion.div
                    key="games-played-stat"
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="text-2xl font-bold text-blue-400 font-audiowide">
                      {userProfile.stats?.gamesPlayed || 0}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Games Played</div>
                  </motion.div>

                  <motion.div
                    key="games-won-stat"
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="text-2xl font-bold text-green-400 font-audiowide">
                      {userProfile.stats?.matchWins || 0}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Games Won</div>
                  </motion.div>

                  <motion.div
                    key="items-collected-stat"
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="text-2xl font-bold text-purple-400 font-audiowide">
                      {(() => {
                        // Calculate items collected from inventory
                        const inventory = userProfile.inventory || {};
                        const ownedBackgrounds = inventory.ownedBackgrounds || [];
                        const inventoryItems = (userProfile as any).inventoryItems || [];
                        return ownedBackgrounds.length + inventoryItems.length;
                      })()}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Items Collected</div>
                  </motion.div>

                  <motion.div
                    key="current-streak-stat"
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="text-2xl font-bold text-orange-400 font-audiowide">
                      {userProfile.stats?.currentStreak || 0}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Current Streak</div>
                  </motion.div>

                  <motion.div
                    key="best-streak-stat"
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="text-2xl font-bold text-yellow-400 font-audiowide">
                      {userProfile.stats?.bestStreak || 0}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Best Streak</div>
                  </motion.div>

                  <motion.div
                    key="win-rate-stat"
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <div className="text-2xl font-bold text-cyan-400 font-audiowide">
                      {userProfile.stats?.gamesPlayed > 0
                        ? Math.round(((userProfile.stats.matchWins || 0) / userProfile.stats.gamesPlayed) * 100)
                        : 0}%
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Win Rate</div>
                  </motion.div>
                </div>
              </div>

              {/* Ranked Statistics */}
              <div className="bg-transparent backdrop-blur-[0.5px] rounded-xl p-6 mt-6">
                <h3 className="text-white text-xl font-audiowide mb-4 uppercase">Ranked</h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <motion.div
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="text-2xl font-bold text-yellow-400 font-audiowide">
                      {(userProfile as any).rankedStats?.rankPoints || '--'}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Rank Points</div>
                  </motion.div>

                  <motion.div
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="text-2xl font-bold text-amber-400 font-audiowide">
                      {(userProfile as any).rankedStats?.currentRank || '--'}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Current Rank</div>
                  </motion.div>

                  <motion.div
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="text-2xl font-bold text-purple-400 font-audiowide">
                      {(userProfile as any).rankedStats?.peakRank || '--'}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Peak Rank</div>
                  </motion.div>

                  <motion.div
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="text-2xl font-bold text-green-400 font-audiowide">
                      {(userProfile as any).rankedStats?.seasonWins || 0}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Season Wins</div>
                  </motion.div>
                </div>
              </div>

              {/* Tournament Statistics */}
              <div className="bg-transparent backdrop-blur-[0.5px] rounded-xl p-6 mt-6">
                <h3 className="text-white text-xl font-audiowide mb-4 uppercase">Tournament</h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <motion.div
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="text-2xl font-bold text-purple-400 font-audiowide">
                      {(userProfile as any).tournamentStats?.tournamentsPlayed || 0}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Tournaments Played</div>
                  </motion.div>

                  <motion.div
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="text-2xl font-bold text-yellow-400 font-audiowide">
                      {(userProfile as any).tournamentStats?.tournamentsWon || 0}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Tournaments Won</div>
                  </motion.div>

                  <motion.div
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="text-2xl font-bold text-orange-400 font-audiowide">
                      {(userProfile as any).tournamentStats?.bestPlacement || '--'}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Best Placement</div>
                  </motion.div>

                  <motion.div
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="text-2xl font-bold text-emerald-400 font-audiowide">
                      {(userProfile as any).tournamentStats?.tournamentPoints || 0}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Tournament Points</div>
                  </motion.div>
                </div>
              </div>

              {/* Cosmetic Statistics */}
              <div className="bg-transparent backdrop-blur-[0.5px] rounded-xl p-6 mt-6">
                <h3 className="text-white text-xl font-audiowide mb-4 uppercase">Cosmetic</h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <motion.div
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="text-2xl font-bold text-pink-400 font-audiowide">
                      {userProfile.inventory?.ownedBackgrounds?.length || 0}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Backgrounds Owned</div>
                  </motion.div>

                  <motion.div
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="text-2xl font-bold text-indigo-400 font-audiowide">
                      {(() => {
                        const ownedBackgrounds = userProfile.inventory?.ownedBackgrounds?.length || 0;
                        const inventoryItems = (userProfile as any).inventoryItems?.length || 0;
                        return ownedBackgrounds + inventoryItems;
                      })()}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Total Items</div>
                  </motion.div>

                  <motion.div
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="text-2xl font-bold text-orange-400 font-audiowide">
                      {(() => {
                        // Count rare items (this would need to be calculated based on item rarity)
                        const inventoryItems = (userProfile as any).inventoryItems || [];
                        return inventoryItems.filter((item: any) => item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary').length || 0;
                      })()}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Rare Items</div>
                  </motion.div>
                </div>
              </div>

              {/* Friends Statistics */}
              <div className="bg-transparent backdrop-blur-[0.5px] rounded-xl p-6 mt-6">
                <h3 className="text-white text-xl font-audiowide mb-4 uppercase">Friends</h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <motion.div
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="text-2xl font-bold text-blue-400 font-audiowide">
                      {(userProfile as any).friendsStats?.totalFriends || '--'}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Friends</div>
                  </motion.div>

                  <motion.div
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="text-2xl font-bold text-green-400 font-audiowide">
                      {(userProfile as any).friendsStats?.friendMatches || '--'}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Friend Matches</div>
                  </motion.div>

                  <motion.div
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="text-2xl font-bold text-cyan-400 font-audiowide">
                      {(userProfile as any).friendsStats?.friendWinRate || '--'}%
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Friend Win Rate</div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileViewer;
