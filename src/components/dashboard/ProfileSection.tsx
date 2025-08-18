'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/context/NavigationContext';
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
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-audiowide">Profile & Settings</h1>
          <p className="text-gray-600 mt-2 font-montserrat">
            Manage your account and customize your experience
          </p>
        </div>
      </div>

      {/* Navigation Tabs - Exact same style as inventory */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === 'profile' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('profile')}
              className="flex items-center space-x-2"
            >
              <span>👤</span>
              <span className="font-audiowide">Profile</span>
            </Button>
            <Button
              variant={activeTab === 'settings' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('settings')}
              className="flex items-center space-x-2"
            >
              <span>⚙️</span>
              <span className="font-audiowide">Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Tab Content */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-orbitron font-bold text-gray-900 mb-2 font-audiowide">
              Profile
            </h1>
            <p className="text-gray-600 font-montserrat">
              Manage your account and view achievements
            </p>
          </div>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl text-white font-bold">
                    {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold font-audiowide">{user?.displayName || 'Unknown User'}</h3>
                    <p className="text-gray-600 font-montserrat">Member since {user?.createdAt?.toLocaleDateString()}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-montserrat">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-montserrat">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={profileForm.values.email}
                    onChange={(e) => profileForm.handleChange('email', e.target.value)}
                    placeholder="Enter your email"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1 font-montserrat">
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
          <Card>
            <CardHeader>
              <CardTitle>Account Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 font-audiowide">24</div>
                  <div className="text-sm text-gray-600 font-montserrat">Games Played</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 font-audiowide">16</div>
                  <div className="text-sm text-gray-600 font-montserrat">Games Won</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 font-audiowide">42</div>
                  <div className="text-sm text-gray-600 font-montserrat">Items Collected</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 font-audiowide">5</div>
                  <div className="text-sm text-gray-600 font-montserrat">Current Streak</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {achievements.map((achievement, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 p-3 rounded-lg ${
                      achievement.completed ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className={`text-2xl ${achievement.completed ? '' : 'grayscale opacity-50'}`}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium font-audiowide ${achievement.completed ? 'text-green-800' : 'text-gray-700'}`}>
                        {achievement.name}
                      </div>
                      <div className={`text-sm font-montserrat ${achievement.completed ? 'text-green-600' : 'text-gray-500'}`}>
                        {achievement.description}
                      </div>
                    </div>
                    {achievement.completed && (
                      <div className="text-green-600 font-semibold text-sm font-audiowide">
                        ✓ Completed
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Tab Content */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-orbitron font-bold text-gray-900 mb-2 font-audiowide">
              Settings
            </h1>
            <p className="text-gray-600 font-montserrat">
              Customize your gaming experience
            </p>
          </div>

          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium font-audiowide">Notifications</div>
                  <div className="text-sm text-gray-600 font-montserrat">Receive game alerts and updates</div>
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
                  <div className="font-medium font-audiowide">Sound Effects</div>
                  <div className="text-sm text-gray-600 font-montserrat">Enable game sound effects</div>
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
          <Card>
            <CardHeader>
              <CardTitle>Audio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-medium font-audiowide">Music Volume</label>
                  <span className="text-sm text-gray-600 font-audiowide">{settings.musicVolume}%</span>
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
                  <label className="font-medium font-audiowide">Sound Effects Volume</label>
                  <span className="text-sm text-gray-600 font-audiowide">{settings.sfxVolume}%</span>
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
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block font-medium mb-2 font-audiowide">Theme</label>
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
                <label className="block font-medium mb-2 font-audiowide">Animation Speed</label>
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
                <label className="block font-medium mb-2 font-audiowide">Language</label>
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
          <Card>
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
  );
};

export default ProfileSection;
