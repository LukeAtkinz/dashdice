'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Settings, Save, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserService, UserProfile } from '@/services/userService';
import { ProfilePictureUpload } from './ProfilePictureUpload';
import { ProfilePicture } from '@/components/ui/ProfilePicture';

interface ProfileSettingsProps {
  onClose?: () => void;
  className?: string;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onClose, className = '' }) => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [currentProfilePicture, setCurrentProfilePicture] = useState<string | null>(null);

  // Load user profile
  useEffect(() => {
    if (!user?.uid) return;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const profile = await UserService.getUserProfile(user.uid);
        if (profile) {
          setUserProfile(profile);
          setDisplayName(profile.displayName || '');
          setCurrentProfilePicture(profile.profilePicture || user.photoURL || null);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleProfilePictureSuccess = (newUrl: string) => {
    setCurrentProfilePicture(newUrl);
    console.log('✅ Profile picture updated successfully');
  };

  const handleSaveProfile = async () => {
    if (!user?.uid || !userProfile) return;

    setSaving(true);
    try {
      // Here you would update other profile fields if needed
      // For now, profile picture updates are handled by the upload component
      console.log('✅ Profile settings saved');
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="h-32 bg-gray-700 rounded mb-4"></div>
          <div className="h-4 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Profile Settings</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Current Profile Overview */}
      <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium text-white mb-3">Current Profile</h3>
        <div className="flex items-center gap-4">
          <ProfilePicture
            src={currentProfilePicture}
            alt="Current profile picture"
            size="lg"
            fallbackInitials={userProfile?.displayName?.charAt(0)?.toUpperCase() || userProfile?.userTag?.charAt(0)?.toUpperCase()}
          />
          <div>
            <p className="text-white font-medium">
              {userProfile?.displayName || 'No display name'}
            </p>
            <p className="text-gray-400 text-sm">
              {userProfile?.userTag || 'No user tag'}
            </p>
            <p className="text-gray-500 text-xs">
              {userProfile?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Picture Upload */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-white mb-3">Update Profile Picture</h3>
        <ProfilePictureUpload
          currentImageUrl={currentProfilePicture || undefined}
          onUploadSuccess={handleProfilePictureSuccess}
          onUploadError={(error) => console.error('Upload error:', error)}
        />
      </div>

      {/* Display Name */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-400 transition-colors"
          placeholder="Enter your display name"
        />
        <p className="text-xs text-gray-500 mt-1">
          This is how other players will see your name
        </p>
      </div>

      {/* Profile Statistics */}
      <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium text-white mb-3">Profile Statistics</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Games Played</p>
            <p className="text-white font-medium">{userProfile?.stats?.gamesPlayed || 0}</p>
          </div>
          <div>
            <p className="text-gray-400">Wins</p>
            <p className="text-white font-medium">{userProfile?.stats?.matchWins || 0}</p>
          </div>
          <div>
            <p className="text-gray-400">Best Streak</p>
            <p className="text-white font-medium">{userProfile?.stats?.bestStreak || 0}</p>
          </div>
          <div>
            <p className="text-gray-400">Ranked Status</p>
            <p className="text-white font-medium">{userProfile?.rankedStatus || 'Unranked'}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSaveProfile}
          disabled={saving}
          className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </motion.button>
        
        {onClose && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </motion.button>
        )}
      </div>
    </div>
  );
};
