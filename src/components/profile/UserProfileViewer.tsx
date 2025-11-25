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
import { ProfilePicture } from '@/components/ui/ProfilePicture';
import { usePlayerCardBackground } from '@/hooks/useOptimizedBackground';
import { resolveBackgroundPath } from '@/config/backgrounds';

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

  // Get optimized background for profile card display
  const viewingOwnProfile = user?.uid === userId;
  const profileBackground = userProfile?.inventory?.displayBackgroundEquipped || userProfile?.inventory?.matchBackgroundEquipped;
  const { backgroundPath: profileBgPath, isVideo: profileBgIsVideo } = usePlayerCardBackground(
    (viewingOwnProfile ? DisplayBackgroundEquip : profileBackground) as any
  );

  // Check if this user is already a friend
  const isAlreadyFriend = friends.some(friend => friend.friendId === userId);
  const isOwnProfile = user?.uid === userId;
  
  // Check if there's a pending outgoing friend request to this user
  const hasPendingRequest = outgoingRequests.some(request => 
    request.fromUserId === user?.uid && request.toUserId === userId && request.status === 'pending'
  );

  // Load user profile data with real-time updates
  useEffect(() => {
    if (!userId) {
      setUserProfile(null);
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const setupProfileSubscription = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Import Firebase dependencies
        const { doc, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('@/services/firebase');

        const userRef = doc(db, 'users', userId);
        
        unsubscribe = onSnapshot(
          userRef,
          (docSnapshot) => {
            if (docSnapshot.exists()) {
              const userData = docSnapshot.data();
              
              // Process the data using the same logic as UserService
              const profile: UserProfile = {
                uid: userData.uid || userId,
                email: userData.email || '',
                displayName: userData.displayName || null,
                profilePicture: userData.profilePicture || null,
                photoURL: userData.photoURL || null,
                createdAt: userData.createdAt,
                lastLoginAt: userData.lastLoginAt,
                userTag: userData.userTag || userData.email?.split('@')[0] || 'Anonymous',
                rankedStatus: userData.rankedStatus || 'Ranked - Active',
                inventory: {
                  displayBackgroundEquipped: userData.inventory?.displayBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
                  matchBackgroundEquipped: userData.inventory?.matchBackgroundEquipped || { name: 'Relax', file: '/backgrounds/Relax.png', type: 'image' },
                  turnDeciderBackgroundEquipped: userData.inventory?.turnDeciderBackgroundEquipped || null,
                  victoryBackgroundEquipped: userData.inventory?.victoryBackgroundEquipped || null,
                  ownedBackgrounds: userData.inventory?.ownedBackgrounds || userData.ownedBackgrounds || ['Relax']
                },
                stats: {
                  bestStreak: userData.stats?.bestStreak || 0,
                  currentStreak: userData.stats?.currentStreak || 0,
                  gamesPlayed: userData.stats?.gamesPlayed || 0,
                  matchWins: userData.stats?.matchWins || 0
                },
                settings: {
                  notificationsEnabled: userData.settings?.notificationsEnabled ?? true,
                  soundEnabled: userData.settings?.soundEnabled ?? true,
                  theme: userData.settings?.theme || 'auto'
                },
                updatedAt: userData.updatedAt
              };
              
              setUserProfile(profile);
              setError(null);
            } else {
              setError('User profile not found');
              setUserProfile(null);
            }
            setLoading(false);
          },
          (err) => {
            console.error('Error loading user profile:', err);
            setError('Failed to load user profile');
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Error setting up profile subscription:', err);
        setError('Failed to load user profile');
        setLoading(false);
      }
    };

    setupProfileSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
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
            className="transition-all duration-300 hover:scale-105"
            style={{ 
              display: 'flex', 
              width: 'fit-content', 
              height: '48px', 
              padding: '4px 30px', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '10px', 
              borderRadius: '18px', 
              background: '#FF0080', 
              border: 'none', 
              cursor: 'pointer',
              fontFamily: 'Audiowide',
              color: '#FFF',
              fontSize: '14px',
              fontWeight: 400,
              textTransform: 'uppercase'
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col mt-[7vh] md:mt-0">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between gap-4 mb-6 px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 transition-all duration-300 hover:text-blue-400"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer',
              fontFamily: 'Audiowide',
              color: '#FFF',
              fontSize: '12px',
              fontWeight: 400,
              textTransform: 'uppercase'
            }}
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
                className="transition-all duration-300 hover:text-green-400"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  background: 'transparent', 
                  border: 'none', 
                  cursor: sendingRequest ? 'not-allowed' : 'pointer',
                  fontFamily: 'Audiowide',
                  color: '#FFF',
                  fontSize: '12px',
                  fontWeight: 400,
                  textTransform: 'uppercase',
                  opacity: sendingRequest ? 0.5 : 1
                }}
              >
                {sendingRequest ? 'Sending...' : 'Add Friend'}
              </button>
            )}
            
            {hasPendingRequest && (
              <button
                disabled
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  background: 'transparent', 
                  border: 'none', 
                  cursor: 'not-allowed',
                  fontFamily: 'Audiowide',
                  color: '#FF8000',
                  fontSize: '12px',
                  fontWeight: 400,
                  textTransform: 'uppercase',
                  opacity: 0.7
                }}
              >
                Invite Sent
              </button>
            )}
            
            {isAlreadyFriend && (
              <button
                onClick={handleRemoveFriend}
                disabled={removing}
                className="transition-all duration-300 hover:text-red-400"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  background: 'transparent', 
                  border: 'none', 
                  cursor: removing ? 'not-allowed' : 'pointer',
                  fontFamily: 'Audiowide',
                  color: '#FFF',
                  fontSize: '12px',
                  fontWeight: 400,
                  textTransform: 'uppercase',
                  opacity: removing ? 0.5 : 1
                }}
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
          {/* Profile Card Container - Matching ProfileSection Design */}
          <motion.div 
            className="relative w-full md:w-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Profile Header Section with Flexin (Match) Background */}
            <div 
              className="relative overflow-hidden touch-manipulation rounded-t-[20px]"
              style={{
                background: !(userProfile.inventory as any)?.matchBackgroundEquipped?.id 
                  ? 'linear-gradient(135deg, #667eea, #764ba2)'
                  : 'transparent',
                width: 'calc(100vw - 2rem)',
                maxWidth: '100%'
              }}
            >
              {/* Flexin Background Video or Image */}
              {(userProfile.inventory as any)?.matchBackgroundEquipped?.id && (() => {
                const resolved = resolveBackgroundPath((userProfile.inventory as any).matchBackgroundEquipped.id, 'dashboard-display');
                if (resolved?.type === 'video') {
                  return (
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      webkit-playsinline="true"
                      x5-playsinline="true"
                      x5-video-player-type="h5-page"
                      x5-video-player-fullscreen="false"
                      preload="auto"
                      controls={false}
                      disablePictureInPicture
                      disableRemotePlayback
                      onLoadedMetadata={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.muted = true;
                        video.play().catch(() => {});
                      }}
                      onCanPlay={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.muted = true;
                        if (video.paused) video.play().catch(() => {});
                      }}
                      onLoadedData={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.muted = true;
                        if (video.paused) video.play().catch(() => {});
                      }}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ zIndex: 0 }}
                    >
                      <source src={resolved.path} type="video/mp4" />
                    </video>
                  );
                } else if (resolved?.type === 'image') {
                  return (
                    <img
                      src={resolved.path}
                      alt={resolved.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ zIndex: 0 }}
                    />
                  );
                }
                return null;
              })()}
              
              {/* Dark overlay gradient for text readability */}
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to right, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.3) 50%, rgba(0, 0, 0, 0.2) 100%)',
                  zIndex: 1
                }}
              ></div>

              <div className="relative z-10 p-6">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <ProfilePicture
                      src={userProfile.profilePicture || userProfile.photoURL}
                      alt={`${userProfile.displayName || 'Player'}'s profile picture`}
                      size="lg"
                      fallbackInitials={userProfile.displayName?.charAt(0)?.toUpperCase() || '?'}
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-gray-800"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white text-2xl font-semibold font-audiowide truncate">
                      {userProfile.displayName || 'Player'}
                    </h2>
                    <p className="text-white/90 text-lg font-montserrat">Online</p>
                    <p className="text-white/70 text-sm font-montserrat">
                      Member since {userProfile.createdAt?.toDate?.() ? userProfile.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Victory Screen Section */}
            <div className="relative bg-black/60 backdrop-blur-sm border-x border-gray-700/50 p-6" style={{ width: 'calc(100vw - 2rem)', maxWidth: '100%' }}>
              <h3 className="text-white text-lg uppercase mb-3 text-center" style={{ fontFamily: 'Audiowide' }}>VICTORY</h3>
              <div className="relative rounded-xl overflow-hidden flex items-center justify-center border border-gray-700/50" style={{ height: '220px' }}>
                {(() => {
                  const victoryBg = (userProfile.inventory as any)?.victoryBackgroundEquipped;
                  const victoryBgId = victoryBg?.id || victoryBg;
                  const victoryPath = victoryBgId ? resolveBackgroundPath(victoryBgId, 'waiting-room')?.path : '/Victory Screens/Wind Blade.mp4';
                  console.log('🎬 VICTORY - victoryBg:', victoryBg, 'victoryBgId:', victoryBgId, 'victoryPath:', victoryPath);
                  return (
                    <video
                      key={victoryPath}
                      autoPlay
                      loop
                      muted
                      playsInline
                      webkit-playsinline="true"
                      x5-playsinline="true"
                      x5-video-player-type="h5-page"
                      x5-video-player-fullscreen="false"
                      preload="auto"
                      controls={false}
                      disablePictureInPicture
                      disableRemotePlayback
                      onLoadedMetadata={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.muted = true;
                        video.play().catch(() => {});
                      }}
                      onCanPlay={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.muted = true;
                        if (video.paused) video.play().catch(() => {});
                      }}
                      onLoadedData={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.muted = true;
                        if (video.paused) video.play().catch(() => {});
                      }}
                      onSuspend={(e) => {
                        const video = e.target as HTMLVideoElement;
                        if (video.paused) video.play().catch(() => {});
                      }}
                      onPause={(e) => {
                        const video = e.target as HTMLVideoElement;
                        setTimeout(() => {
                          if (video.paused) video.play().catch(() => {});
                        }, 100);
                      }}
                      onClick={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.muted = true;
                        if (video.paused) video.play().catch(() => {});
                      }}
                      onError={(e) => console.error('🎬 VICTORY VIDEO ERROR:', e, 'src:', victoryPath)}
                      className="w-full h-full object-cover"
                      src={victoryPath}
                    />
                  );
                })()}
              </div>
            </div>

            {/* Turn Decider Section */}
            <div className="relative bg-black/60 backdrop-blur-sm border-x border-b border-gray-700/50 rounded-b-[20px] p-6" style={{ width: 'calc(100vw - 2rem)', maxWidth: '100%' }}>
              <h3 className="text-white text-lg uppercase mb-3 text-center" style={{ fontFamily: 'Audiowide' }}>TURN DECIDER</h3>
              <div className="relative rounded-xl overflow-hidden flex items-center justify-center border border-gray-700/50" style={{ height: '220px' }}>
                {(() => {
                  const deciderBg = (userProfile.inventory as any)?.turnDeciderBackgroundEquipped;
                  const deciderBgId = deciderBg?.id || deciderBg;
                  const deciderPath = deciderBgId ? resolveBackgroundPath(deciderBgId, 'waiting-room')?.path : '/Game Backgrounds/Turn Decider/Videos/Best Quality/Crazy Cough.mp4';
                  console.log('🎬 TURN DECIDER - deciderBg:', deciderBg, 'deciderBgId:', deciderBgId, 'deciderPath:', deciderPath);
                  return (
                    <video
                      key={deciderPath}
                      autoPlay
                      loop
                      muted
                      playsInline
                      webkit-playsinline="true"
                      x5-playsinline="true"
                      x5-video-player-type="h5-page"
                      x5-video-player-fullscreen="false"
                      preload="auto"
                      controls={false}
                      disablePictureInPicture
                      disableRemotePlayback
                      onLoadedMetadata={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.muted = true;
                        video.play().catch(() => {});
                      }}
                      onCanPlay={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.muted = true;
                        if (video.paused) video.play().catch(() => {});
                      }}
                      onLoadedData={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.muted = true;
                        if (video.paused) video.play().catch(() => {});
                      }}
                      onSuspend={(e) => {
                        const video = e.target as HTMLVideoElement;
                        if (video.paused) video.play().catch(() => {});
                      }}
                      onPause={(e) => {
                        const video = e.target as HTMLVideoElement;
                        setTimeout(() => {
                          if (video.paused) video.play().catch(() => {});
                        }, 100);
                      }}
                      onClick={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.muted = true;
                        if (video.paused) video.play().catch(() => {});
                      }}
                      onError={(e) => console.error('🎬 TURN DECIDER VIDEO ERROR:', e, 'src:', deciderPath)}
                      className="w-full h-full object-cover"
                      src={deciderPath}
                    />
                  );
                })()}
              </div>
            </div>
          </motion.div>

          {/* Statistics Section - Now Separate Card */}
          <motion.div 
            className="relative overflow-hidden rounded-[20px] bg-black/40 backdrop-blur-sm border border-gray-700/50"
            style={{ width: 'calc(100vw - 2rem)', maxWidth: '100%' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="p-6">

              {/* Statistics Grid - Individual Black Cards Like Profile */}
              <div className="rounded-xl p-6 -mx-4 md:-mx-4">
                <h3 className="text-white text-xl mb-4 uppercase text-center md:text-left" style={{ fontFamily: 'Audiowide' }}>STATISTICS</h3>

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
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Games</span>
                      <span className="hidden md:inline">Games Played</span>
                    </div>
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
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Won</span>
                      <span className="hidden md:inline">Games Won</span>
                    </div>
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
                        // Calculate items collected from inventory - handle both old and new formats
                        const inventory = userProfile.inventory as any || {};
                        const ownedBackgrounds = inventory.ownedBackgrounds || (userProfile as any).ownedBackgrounds || [];
                        const inventoryItems = (userProfile as any).inventoryItems || [];
                        return ownedBackgrounds.length + inventoryItems.length;
                      })()}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Items</span>
                      <span className="hidden md:inline">Items Collected</span>
                    </div>
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
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Streak</span>
                      <span className="hidden md:inline">Current Streak</span>
                    </div>
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
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Best</span>
                      <span className="hidden md:inline">Best Streak</span>
                    </div>
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
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Rate</span>
                      <span className="hidden md:inline">Win Rate</span>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Ranked Statistics Section */}
              <div className="bg-transparent rounded-xl p-6 mt-6 -mx-4 md:-mx-4">
                <h3 className="text-white text-xl mb-4 uppercase text-center md:text-left" style={{ fontFamily: 'Audiowide' }}>RANKED</h3>

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
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Points</span>
                      <span className="hidden md:inline">Rank Points</span>
                    </div>
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
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Rank</span>
                      <span className="hidden md:inline">Current Rank</span>
                    </div>
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
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Peak</span>
                      <span className="hidden md:inline">Peak Rank</span>
                    </div>
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
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Wins</span>
                      <span className="hidden md:inline">Season Wins</span>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Tournament Statistics Section */}
              <div className="bg-transparent rounded-xl p-6 mt-6 -mx-4 md:-mx-4">
                <h3 className="text-white text-xl mb-4 uppercase text-center md:text-left" style={{ fontFamily: 'Audiowide' }}>TOURNAMENT</h3>

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
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Played</span>
                      <span className="hidden md:inline">Tournaments Played</span>
                    </div>
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
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Won</span>
                      <span className="hidden md:inline">Tournaments Won</span>
                    </div>
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
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Best</span>
                      <span className="hidden md:inline">Best Placement</span>
                    </div>
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
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Points</span>
                      <span className="hidden md:inline">Tournament Points</span>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Cosmetic Statistics Section */}
              <div className="bg-transparent rounded-xl p-6 mt-6 -mx-4 md:-mx-4">
                <h3 className="text-white text-xl mb-4 uppercase text-center md:text-left" style={{ fontFamily: 'Audiowide' }}>COSMETIC</h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <motion.div
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="text-2xl font-bold text-pink-400 font-audiowide">
                      {(userProfile.inventory?.ownedBackgrounds || (userProfile as any).ownedBackgrounds || []).length}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Backgrounds</span>
                      <span className="hidden md:inline">Backgrounds Owned</span>
                    </div>
                  </motion.div>

                  <motion.div
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="text-2xl font-bold text-indigo-400 font-audiowide">
                      {(() => {
                        const ownedBackgrounds = (userProfile.inventory?.ownedBackgrounds || (userProfile as any).ownedBackgrounds || []).length;
                        const inventoryItems = (userProfile as any).inventoryItems?.length || 0;
                        return ownedBackgrounds + inventoryItems;
                      })()}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Items</span>
                      <span className="hidden md:inline">Total Items</span>
                    </div>
                  </motion.div>

                  <motion.div
                    className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="text-2xl font-bold text-orange-400 font-audiowide">
                      {(() => {
                        // Count masterpiece items in user's inventory - handle both old and new formats
                        // For now, we'll count video backgrounds as masterpieces
                        const inventory = userProfile.inventory;
                        const ownedBackgrounds = inventory?.ownedBackgrounds || (userProfile as any).ownedBackgrounds || [];
                        
                        if (Array.isArray(ownedBackgrounds)) {
                          // Count video backgrounds as masterpieces
                          const videoBackgrounds = ['New Day', 'On A Mission', 'Underwater', 'As They Fall', 'End Of The Dragon'];
                          return ownedBackgrounds.filter((bg: string) => videoBackgrounds.includes(bg)).length;
                        } else {
                          // Legacy array format - can't determine rarity
                          return 0;
                        }
                      })()}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Master</span>
                      <span className="hidden md:inline">Masterpieces</span>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Friends Statistics Section */}
              <div className="bg-transparent rounded-xl p-6 mt-6 -mx-4 md:-mx-4">
                <h3 className="text-white text-xl mb-4 uppercase text-center md:text-left" style={{ fontFamily: 'Audiowide' }}>FRIENDS</h3>

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
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Friends</span>
                      <span className="hidden md:inline">Friends</span>
                    </div>
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
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Matches</span>
                      <span className="hidden md:inline">Friend Matches</span>
                    </div>
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
                    <div className="text-sm text-gray-300 font-montserrat">
                      <span className="md:hidden">Win Rate</span>
                      <span className="hidden md:inline">Friend Win Rate</span>
                    </div>
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
