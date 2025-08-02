'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
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

export const ProfileSection: React.FC = () => {
  const { user, signOut, updateUserProfile } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  const profileForm = useForm({
    displayName: user?.displayName || '',
    email: user?.email || ''
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

  const achievements = [
    { name: 'First Win', description: 'Win your first game', completed: true, icon: '🏆' },
    { name: 'Lucky Seven', description: 'Roll seven 7s in a row', completed: true, icon: '🍀' },
    { name: 'Collection Master', description: 'Collect 50 items', completed: false, icon: '📦' },
    { name: 'Win Streak', description: 'Win 10 games in a row', completed: false, icon: '🔥' },
    { name: 'Social Player', description: 'Play with 20 different players', completed: false, icon: '👥' }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-orbitron font-bold text-gray-900 mb-2">
          Profile
        </h1>
        <p className="text-gray-600">
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
                <h3 className="text-lg font-semibold">{user?.displayName || 'Unknown User'}</h3>
                <p className="text-gray-600">Member since {user?.createdAt?.toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <Input
                type="email"
                value={profileForm.values.email}
                onChange={(e) => profileForm.handleChange('email', e.target.value)}
                placeholder="Enter your email"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">
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
              <div className="text-2xl font-bold text-blue-600">24</div>
              <div className="text-sm text-gray-600">Games Played</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">16</div>
              <div className="text-sm text-gray-600">Games Won</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">42</div>
              <div className="text-sm text-gray-600">Items Collected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">5</div>
              <div className="text-sm text-gray-600">Current Streak</div>
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
                  <div className={`font-medium ${achievement.completed ? 'text-green-800' : 'text-gray-700'}`}>
                    {achievement.name}
                  </div>
                  <div className={`text-sm ${achievement.completed ? 'text-green-600' : 'text-gray-500'}`}>
                    {achievement.description}
                  </div>
                </div>
                {achievement.completed && (
                  <div className="text-green-600 font-semibold text-sm">
                    ✓ Completed
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
