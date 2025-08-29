'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProfilePictureUpload } from '@/components/ui/ProfilePictureUpload';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/context/NavigationContext';
import { useBackground } from '@/context/BackgroundContext';
import { useUserStats } from '@/hooks/useUserStats';
import { validateDisplayName } from '@/utils/contentModeration';

// CSS for custom button styling
const buttonStyles = `
  .custom-inventory-button {
    background: var(--ui-inventory-button-bg, linear-gradient(135deg, #2a1810 0%, #1a0f08 100%));
    border: 2px solid var(--ui-inventory-button-border, #8b7355);
    color: var(--ui-inventory-button-text, #f4f1eb);
    transition: all 0.3s ease;
    font-family: 'Audiowide', monospace;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  }
  
  .custom-inventory-button:hover {
    background: var(--ui-inventory-button-hover-bg, linear-gradient(135deg, #3a2420 0%, #2a1810 100%));
    border-color: var(--ui-inventory-button-hover-border, #a68b5b);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 115, 85, 0.3);
  }
  
  .custom-inventory-button.active {
    background: var(--ui-inventory-button-active-bg, linear-gradient(135deg, #4a3020 0%, #3a2420 100%));
    border-color: var(--ui-inventory-button-active-border, #c9a96e);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  /* Inventory-style navigation button hover effects */
  .nav-button {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .nav-button:hover {
    animation: navPulse 0.6s ease-in-out;
    box-shadow: 0 8px 25px rgba(255, 0, 128, 0.3);
    transform: scale(1.05);
  }
  .nav-button:active {
    animation: navClick 0.2s ease-in-out;
    transform: scale(0.95);
  }
  .nav-button.active {
    box-shadow: 0 6px 20px rgba(255, 0, 128, 0.4);
  }
  @keyframes navPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  @keyframes navClick {
    0% { transform: scale(1); }
    50% { transform: scale(0.95); }
    100% { transform: scale(1); }
  }
`;

// Inline form hook
const useForm = <T extends Record<string, string>>(initialValues: T) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof T, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const setError = (field: keyof T, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  };

  const handleSubmit = (onSubmit: (values: T) => Promise<void> | void) => {
    return async (e: React.FormEvent) => {
      e.preventDefault();
      setErrors({});
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    };
  };

  return { values, errors, isSubmitting, handleChange, handleSubmit, setError };
};

const ProfileSection: React.FC = () => {
  const { user, signOut, updateUserProfile } = useAuth();
  const { currentSection } = useNavigation();
  const { DisplayBackgroundEquip, MatchBackgroundEquip } = useBackground();
  const { stats, loading: statsLoading, error: statsError } = useUserStats();
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  
  // Navigation tabs for profile/settings
  const tabs = [
    {
      id: 'profile' as const,
      label: 'Profile',
      color: 'linear-gradient(135deg, #667eea, #764ba2)'
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      color: 'linear-gradient(135deg, #FF0080, #FF4DB8)'
    }
  ];

  // Get background-specific styling for navigation buttons (matching inventory)
  const getNavButtonStyle = (tab: any, isSelected: boolean) => {
    if (DisplayBackgroundEquip?.name === 'On A Mission') {
      return {
        background: isSelected 
          ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.8) 0%, rgba(14, 165, 233, 0.4) 50%, rgba(14, 165, 233, 0.2) 100%)'
          : 'linear-gradient(135deg, rgba(14, 165, 233, 0.6) 0%, rgba(14, 165, 233, 0.3) 50%, rgba(14, 165, 233, 0.1) 100%)',
        boxShadow: isSelected 
          ? "0 4px 15px rgba(14, 165, 233, 0.4)" 
          : "0 2px 8px rgba(0, 0, 0, 0.2)",
        minWidth: "140px",
        minHeight: "100px",
        border: isSelected ? '2px solid rgba(14, 165, 233, 0.6)' : '2px solid transparent',
        backdropFilter: 'blur(6px)'
      };
    }
    
    return {
      background: isSelected ? tab.color : 'rgba(255, 255, 255, 0.1)',
      boxShadow: isSelected 
        ? "0 4px 15px rgba(255, 255, 255, 0.2)" 
        : "0 2px 8px rgba(0, 0, 0, 0.2)",
      minWidth: "140px",
      minHeight: "100px",
      border: isSelected ? '2px solid #FFD700' : '2px solid transparent'
    };
  };
  
  // Set active tab based on current section
  useEffect(() => {
    if (currentSection === 'settings') {
      setActiveTab('settings');
    } else if (currentSection === 'profile') {
      setActiveTab('profile');
    }
  }, [currentSection]);
  
  const profileForm = useForm({
    displayName: user?.displayName || '',
    email: user?.email || ''
  });

  // Settings state
  const [settings, setSettings] = useState({
    notifications: true,
    soundEffects: true,
    musicVolume: 70,
    sfxVolume: 80,
    autoSave: true,
    theme: 'light',
    language: 'en',
    animationSpeed: 'normal'
  });

  const handleUpdateProfile = profileForm.handleSubmit(async (values) => {
    try {
      setSuccessMessage(''); // Clear previous success message
      
      // Only update if displayName actually changed
      if (values.displayName !== user?.displayName) {
        // Validate display name
        const validation = validateDisplayName(values.displayName);
        if (!validation.isValid) {
          profileForm.setError('displayName', validation.error || 'Invalid display name');
          return;
        }

        // Update profile
        await updateUserProfile({ displayName: values.displayName });
        setSuccessMessage('Profile updated successfully!');
      } else {
        setSuccessMessage('No changes to save.');
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      profileForm.setError('displayName', error.message || 'Failed to update profile. Please try again.');
    }
  });

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleToggle = (key: 'notifications' | 'soundEffects' | 'autoSave') => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSliderChange = (key: 'musicVolume' | 'sfxVolume', value: number) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSelectChange = (key: 'theme' | 'language' | 'animationSpeed', value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = () => {
    console.log('Saving settings:', settings);
    // TODO: Implement settings save logic
    alert('Settings saved! (Implementation needed)');
  };

  const handleResetSettings = () => {
    setSettings({
      notifications: true,
      soundEffects: true,
      musicVolume: 70,
      sfxVolume: 80,
      autoSave: true,
      theme: 'light',
      language: 'en',
      animationSpeed: 'normal'
    });
  };

  const achievements = [
    { name: 'First Win', description: 'Win your first game', completed: true, icon: '🏆' },
    { name: 'Lucky Seven', description: 'Roll seven 7s in a row', completed: true, icon: '🍀' },
    { name: 'Collection Master', description: 'Collect 50 items', completed: false, icon: '📦' },
    { name: 'Win Streak', description: 'Win 10 games in a row', completed: false, icon: '🔥' },
    { name: 'Social Player', description: 'Play with 20 different players', completed: false, icon: '👥' }
  ];

  return (
    <>
      <style jsx>{buttonStyles}</style>
      <div className="w-full flex flex-col items-center justify-start gap-[2rem] py-[2rem] min-h-full">
      {/* Header */}
      <div className="text-center mb-8 flex-shrink-0">
        <h1 
          className="text-5xl font-bold text-white mb-4"
          style={{
            fontFamily: "Audiowide",
            textTransform: "uppercase",
            textShadow: "0 0 20px rgba(255, 215, 0, 0.5)"
          }}
        >
          {activeTab === 'profile' ? 'Profile' : 'Settings'}
        </h1>
      </div>

      {/* Navigation Tabs - Matching Inventory Style */}
      <div className="w-full px-4 md:px-8 py-2 md:py-4 pb-[0.5rem] md:pb-[1rem]">
        <div className="flex items-center justify-center gap-2 md:gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-button ${activeTab === tab.id ? 'active' : ''} h-12 md:h-16 px-6 md:px-10`}
              style={{
                display: 'flex',
                width: 'fit-content',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                border: 0,
                borderRadius: '18px',
                background: activeTab === tab.id ? 'var(--ui-inventory-button-bg, var(--ui-button-bg))' : 'rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
              }}
            >
              <span className="text-base md:text-4xl" style={{ 
                color: activeTab === tab.id ? 'var(--ui-inventory-button-text, var(--ui-button-text))' : '#FFF', 
                fontFamily: 'Audiowide', 
                fontWeight: 400, 
                textTransform: 'uppercase' 
              }}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-[80rem] flex-1 overflow-y-auto scrollbar-hide px-4">

        {/* Profile Tab Content */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Account Stats */}
            <div 
              className="relative overflow-hidden rounded-2xl"
              style={{
                background: MatchBackgroundEquip?.file 
                  ? `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${MatchBackgroundEquip.file})`
                  : 'rgba(0, 0, 0, 0.6)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <Card className="bg-transparent border-gray-600 text-white">
                <CardHeader>
                  <CardTitle className="text-white font-audiowide">
                    {user?.displayName || 'Player'}'s Statistics
                  </CardTitle>
                </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400 font-audiowide">
                      {statsLoading ? '...' : (stats?.gamesPlayed || 0)}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Games Played</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400 font-audiowide">
                      {statsLoading ? '...' : (stats?.matchWins || 0)}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Games Won</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400 font-audiowide">
                      {statsLoading ? '...' : (stats?.itemsCollected || 0)}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Items Collected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400 font-audiowide">
                      {statsLoading ? '...' : (stats?.currentStreak || 0)}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Current Streak</div>
                  </div>
                </div>
                
                {/* Additional stats row */}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-600">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400 font-audiowide">
                      {statsLoading ? '...' : (stats?.bestStreak || 0)}
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Best Streak</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400 font-audiowide">
                      {statsLoading ? '...' : (
                        stats?.gamesPlayed 
                          ? Math.round(((stats.matchWins || 0) / stats.gamesPlayed) * 100)
                          : 0
                      )}%
                    </div>
                    <div className="text-sm text-gray-300 font-montserrat">Win Rate</div>
                  </div>
                </div>
                
                {statsError && (
                  <div className="mt-4 text-center text-red-400 text-sm font-montserrat">
                    {statsError}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
        </div>
      )}

        {/* Settings Tab Content */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Profile Information - Moved to Settings Tab */}
            <Card className="bg-black bg-opacity-60 border-gray-600 text-white">
              <CardHeader>
                <CardTitle className="text-white font-audiowide">Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="flex items-center space-x-6 mb-6">
                  <div className="relative">
                    <ProfilePictureUpload 
                      currentPhotoURL={user?.photoURL}
                      onUploadComplete={(newPhotoURL) => {
                        console.log('Profile picture updated:', newPhotoURL);
                        // The user context will automatically update when the document changes
                      }}
                      className="enhanced-profile-upload"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold font-audiowide text-white mb-2">{user?.displayName || 'Unknown User'}</h3>
                    <p className="text-gray-300 font-montserrat mb-1">Member since {user?.createdAt?.toLocaleDateString()}</p>
                    <p className="text-sm text-gray-400 font-montserrat">{user?.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2 font-montserrat">
                    Display Name
                  </label>
                  <Input
                    type="text"
                    value={profileForm.values.displayName}
                    onChange={(e) => profileForm.handleChange('displayName', e.target.value)}
                    error={profileForm.errors.displayName}
                    placeholder="Enter your display name"
                    maxLength={12}
                    helperText="2-12 characters, no inappropriate content"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2 font-montserrat">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={profileForm.values.email}
                    onChange={(e) => profileForm.handleChange('email', e.target.value)}
                    placeholder="Enter your email"
                    disabled
                  />
                  <p className="text-xs text-gray-400 mt-1 font-montserrat">
                    Email cannot be changed at this time
                  </p>
                </div>

                {successMessage && (
                  <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
                    {successMessage}
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button
                    type="submit"
                    disabled={profileForm.isSubmitting}
                  >
                    {profileForm.isSubmitting ? 'Updating...' : 'Update Profile'}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

            {/* General Settings */}
            <Card className="bg-black bg-opacity-60 border-gray-600 text-white">
              <CardHeader>
                <CardTitle className="text-white font-audiowide">General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium font-audiowide text-white">Notifications</div>
                  <div className="text-sm text-gray-300 font-montserrat">Receive game alerts and updates</div>
                </div>
                <button
                  onClick={() => handleToggle('notifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.notifications ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium font-audiowide">Auto-Save</div>
                  <div className="text-sm text-gray-300 font-montserrat">Automatically save game progress</div>
                </div>
                <button
                  onClick={() => handleToggle('autoSave')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.autoSave ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoSave ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card className="bg-black bg-opacity-60 border-gray-600 text-white">
            <CardContent className="flex space-x-3">
              <Button
                onClick={handleSaveSettings}
                className="flex-1"
              >
                Save Settings
              </Button>
              <Button
                variant="secondary"
                onClick={handleResetSettings}
                className="flex-1"
              >
                Reset to Defaults
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
    </>
  );
};

export default ProfileSection;
