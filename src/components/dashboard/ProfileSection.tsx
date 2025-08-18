'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/context/NavigationContext';
import { useBackground } from '@/context/BackgroundContext';
import { useUserStats } from '@/hooks/useUserStats';
import { validateDisplayName } from '@/utils/contentModeration';

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
  const { DisplayBackgroundEquip } = useBackground();
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
      <div className="w-full max-w-[60rem] flex flex-row items-center justify-center gap-[1rem] mb-8 flex-shrink-0">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-[20px] transition-all duration-300"
            style={getNavButtonStyle(tab, activeTab === tab.id)}
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 6px 20px rgba(255, 255, 255, 0.3)" 
            }}
            whileTap={{ scale: 0.95 }}
          >
            <span
              style={{
                color: DisplayBackgroundEquip?.name === 'On A Mission' ? "#FFF" : "#FFF",
                fontFamily: "Audiowide",
                fontSize: "16px",
                fontWeight: 400,
                textTransform: "uppercase",
              }}
            >
              {tab.label}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Content */}
      <div className="w-full max-w-[80rem] flex-1 overflow-y-auto scrollbar-hide px-4">

        {/* Profile Tab Content */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Information */}
            <Card className="bg-black bg-opacity-60 border-gray-600 text-white">
              <CardHeader>
                <CardTitle className="text-white font-audiowide">Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl text-white font-bold">
                    {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold font-audiowide text-white">{user?.displayName || 'Unknown User'}</h3>
                    <p className="text-gray-300 font-montserrat">Member since {user?.createdAt?.toLocaleDateString()}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 font-montserrat">
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
                  <label className="block text-sm font-medium text-gray-300 mb-2 font-montserrat">
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

          {/* Account Stats */}
          <Card className="bg-black bg-opacity-60 border-gray-600 text-white">
            <CardHeader>
              <CardTitle className="text-white font-audiowide">Account Statistics</CardTitle>
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
      )}

        {/* Settings Tab Content */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
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
                  <div className="font-medium font-audiowide text-white">Sound Effects</div>
                  <div className="text-sm text-gray-300 font-montserrat">Enable game sound effects</div>
                </div>
                <button
                  onClick={() => handleToggle('soundEffects')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.soundEffects ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.soundEffects ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium font-audiowide">Auto-Save</div>
                  <div className="text-sm text-gray-600 font-montserrat">Automatically save game progress</div>
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

          {/* Audio Settings */}
          <Card className="bg-black bg-opacity-60 border-gray-600 text-white">
            <CardHeader>
              <CardTitle className="text-white font-audiowide">Audio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-medium font-audiowide text-white">Music Volume</label>
                  <span className="text-sm text-gray-300 font-audiowide">{settings.musicVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.musicVolume}
                  onChange={(e) => handleSliderChange('musicVolume', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-medium font-audiowide text-white">Sound Effects Volume</label>
                  <span className="text-sm text-gray-300 font-audiowide">{settings.sfxVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.sfxVolume}
                  onChange={(e) => handleSliderChange('sfxVolume', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card className="bg-black bg-opacity-60 border-gray-600 text-white">
            <CardHeader>
              <CardTitle className="text-white font-audiowide">Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block font-medium mb-2 font-audiowide text-white">Theme</label>
                <select
                  value={settings.theme}
                  onChange={(e) => handleSelectChange('theme', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-montserrat"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-2 font-audiowide text-white">Animation Speed</label>
                <select
                  value={settings.animationSpeed}
                  onChange={(e) => handleSelectChange('animationSpeed', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-montserrat"
                >
                  <option value="slow">Slow</option>
                  <option value="normal">Normal</option>
                  <option value="fast">Fast</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-2 font-audiowide text-white">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => handleSelectChange('language', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-montserrat"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
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
  );
};

export default ProfileSection;
