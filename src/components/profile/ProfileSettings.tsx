'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Settings, Save, X, Mail } from 'lucide-react';
import { updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/services/firebase';
import { UserService, UserProfile } from '@/services/userService';
import { ProfilePictureUpload } from './ProfilePictureUpload';
import { ProfilePicture } from '@/components/ui/ProfilePicture';
import { EmailChangeModal } from './EmailChangeModal';

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
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showEmailModal, setShowEmailModal] = useState(false);

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
      // Update display name if changed
      if (displayName !== userProfile.displayName) {
        await UserService.updateProfile(user.uid, { displayName });
      }
      
      setSuccessMessage('Updated Profile!');
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      console.log('✅ Profile settings saved');
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = async (newEmail: string, password: string) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !user) throw new Error('No user logged in');

    try {
      // Re-authenticate user with their password
      const credential = EmailAuthProvider.credential(firebaseUser.email!, password);
      await reauthenticateWithCredential(firebaseUser, credential);
      
      // Update email
      await updateEmail(firebaseUser, newEmail);
      
      setSuccessMessage('Email updated successfully! Please check your new email for verification.');
      setShowEmailModal(false);
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      
    } catch (error: any) {
      console.error('Error updating email:', error);
      if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already in use by another account.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address.');
      } else {
        throw new Error('Failed to update email. Please try again.');
      }
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
    <React.Fragment>
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white font-[var(--font-audiowide)]">Profile Settings</h2>
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
        <h3 className="text-lg font-medium text-white mb-3 font-[var(--font-audiowide)]">Current Profile</h3>
        <div className="flex items-center gap-4">
          <ProfilePicture
            src={currentProfilePicture}
            alt="Current profile picture"
            size="lg"
            fallbackInitials={userProfile?.displayName?.charAt(0)?.toUpperCase() || userProfile?.userTag?.charAt(0)?.toUpperCase()}
          />
          <div>
            <p className="text-white font-medium font-[var(--font-montserrat)]">
              {userProfile?.displayName || 'No display name'}
            </p>
            <p className="text-gray-400 text-sm font-[var(--font-montserrat)]">
              {userProfile?.userTag || 'No user tag'}
            </p>
            <p className="text-gray-500 text-xs font-[var(--font-montserrat)]">
              {userProfile?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Picture Upload */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-white mb-3 font-[var(--font-audiowide)]">Update Profile Picture</h3>
        <ProfilePictureUpload
          currentImageUrl={currentProfilePicture || undefined}
          onUploadSuccess={handleProfilePictureSuccess}
          onUploadError={(error) => console.error('Upload error:', error)}
        />
      </div>

      {/* Display Name */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2 font-[var(--font-montserrat)]">
          Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-3 py-2 bg-[#121212] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-400 transition-colors font-[var(--font-montserrat)]"
          placeholder="Enter your display name"
        />
      </div>

      {/* Email Address */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-300 font-[var(--font-montserrat)]">
            Email Address
          </label>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowEmailModal(true)}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors font-[var(--font-montserrat)]"
          >
            Change Email
          </motion.button>
        </div>
        <div className="bg-gray-700 px-3 py-2 rounded-lg text-gray-300 font-[var(--font-montserrat)]">
          {userProfile?.email || 'No email set'}
        </div>
      </div>

      {/* Profile Statistics */}
      <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium text-white mb-3 font-[var(--font-audiowide)]">Profile Statistics</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 font-[var(--font-montserrat)]">Games Played</p>
            <p className="text-white font-medium font-[var(--font-montserrat)]">{userProfile?.stats?.gamesPlayed || 0}</p>
          </div>
          <div>
            <p className="text-gray-400 font-[var(--font-montserrat)]">Wins</p>
            <p className="text-white font-medium font-[var(--font-montserrat)]">{userProfile?.stats?.matchWins || 0}</p>
          </div>
          <div>
            <p className="text-gray-400 font-[var(--font-montserrat)]">Best Streak</p>
            <p className="text-white font-medium font-[var(--font-montserrat)]">{userProfile?.stats?.bestStreak || 0}</p>
          </div>
          <div>
            <p className="text-gray-400 font-[var(--font-montserrat)]">Ranked Status</p>
            <p className="text-white font-medium font-[var(--font-montserrat)]">{userProfile?.rankedStatus || 'Unranked'}</p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <motion.div 
          className="p-4 bg-green-900/30 border border-green-500/50 text-green-400 rounded-lg backdrop-blur-sm mb-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {successMessage}
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSaveProfile}
          disabled={saving}
          className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 font-[var(--font-montserrat)]"
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
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors font-[var(--font-montserrat)]"
          >
            Cancel
          </motion.button>
        )}
      </div>
    </div>
    
    {/* Email Change Modal */}
    {showEmailModal && (
      <EmailChangeModal
        currentEmail={userProfile?.email || ''}
        onSave={handleEmailChange}
        onCancel={() => setShowEmailModal(false)}
      />
    )}
    </React.Fragment>
  );
};
