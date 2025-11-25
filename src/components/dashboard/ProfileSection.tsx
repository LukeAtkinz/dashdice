'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProfilePictureUpload } from '@/components/ui/ProfilePictureUpload';
import { ProfilePicture } from '@/components/ui/ProfilePicture';
import { MatchHistory } from '@/components/profile/MatchHistory';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/context/NavigationContext';
import { useBackground } from '@/context/BackgroundContext';
import { useUserStats } from '@/hooks/useUserStats';
import { FriendStatsService, FriendStats } from '@/services/friendStatsService';
import { validateDisplayName } from '@/utils/contentModeration';
import { resolveBackgroundPath } from '@/config/backgrounds';

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
  
  /* Tab Button Animations */
  @keyframes borderLoad {
    0% {
      background: linear-gradient(90deg, 
        #FFD700 0%, 
        #FFD700 0%, 
        transparent 0%, 
        transparent 100%);
    }
    100% {
      background: linear-gradient(90deg, 
        #FFD700 0%, 
        #FFD700 100%, 
        transparent 100%, 
        transparent 100%);
    }
  }
  
  .tab-button {
    position: relative;
    border: 2px solid transparent;
    transition: all 0.3s ease;
    background: transparent !important;
  }
  
  .tab-button::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(90deg, transparent 0%, transparent 100%);
    border-radius: inherit;
    z-index: -1;
    transition: all 0.3s ease;
  }
  
  .tab-button.active {
    border-color: #FFD700;
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
    background: transparent !important;
  }
  
  .tab-button.active::before {
    background: linear-gradient(90deg, #FFD700 0%, #FFD700 100%);
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
  const { DisplayBackgroundEquip, MatchBackgroundEquip, TurnDeciderBackgroundEquip, VictoryBackgroundEquip } = useBackground();
  const { stats, loading: statsLoading, error: statsError } = useUserStats();
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [friendStats, setFriendStats] = useState<FriendStats | null>(null);
  const [friendStatsLoading, setFriendStatsLoading] = useState(false);
  
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
      background: 'transparent',
      boxShadow: isSelected 
        ? "0 4px 15px rgba(255, 215, 0, 0.4)" 
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

  // Fetch friend statistics
  useEffect(() => {
    const fetchFriendStats = async () => {
      if (!user?.uid) return;
      
      setFriendStatsLoading(true);
      try {
        const stats = await FriendStatsService.getFriendStats(user.uid);
        setFriendStats(stats);
      } catch (error) {
        console.error('Error fetching friend stats:', error);
      } finally {
        setFriendStatsLoading(false);
      }
    };

    fetchFriendStats();
  }, [user?.uid]);
  
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
        setSuccessMessage('Updated Profile!');
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
      {/* CSS Animations for Tab Buttons */}
      <style jsx>{`
        @keyframes borderLoad {
          0% {
            background: linear-gradient(90deg, 
              #FFD700 0%, 
              #FFD700 0%, 
              transparent 0%, 
              transparent 100%);
          }
          100% {
            background: linear-gradient(90deg, 
              #FFD700 0%, 
              #FFD700 100%, 
              transparent 100%, 
              transparent 100%);
          }
        }
        
        .tab-button {
          position: relative;
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }
        
        .tab-button::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(90deg, transparent 0%, transparent 100%);
          border-radius: inherit;
          z-index: -1;
          transition: all 0.3s ease;
        }
        
        .tab-button.active {
          border-color: #FFD700;
          box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
        }
        
        .tab-button.active::before {
          background: linear-gradient(90deg, #FFD700 0%, #FFD700 100%);
        }
        
        /* Tab button hover effects - keep text white */
        .tab-button:hover span {
          color: #FFF !important;
        }
        .tab-button.active:hover span {
          color: #FFD700 !important;
        }
        
        /* Disable hover effects for profile section tabs */
        .profile-section-tab:hover::before {
          animation: none !important;
          background: transparent !important;
        }
        
        .profile-section-tab:hover {
          transform: none !important;
        }
        
        /* Remove gold background for profile section tabs */
        .profile-section-tab.active::before {
          background: transparent !important;
        }
      `}</style>
      
      <div className="w-full flex flex-col items-center justify-start gap-[2rem] py-[2rem] mt-[7vh] md:mt-0">
        {/* Header - Desktop Only */}
        <div className="hidden md:block text-center mb-8 flex-shrink-0">
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

        {/* Navigation Tabs - Desktop Only (top) */}
        <div className="hidden md:block w-full px-4 md:px-8 py-2 md:py-4 pb-[0.5rem] md:pb-[1rem]">
          <div className="flex items-center justify-center gap-2 md:gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button nav-button ${activeTab === tab.id ? 'active' : ''} h-12 md:h-16 px-4 md:px-6 min-w-[120px] md:min-w-[140px] ${tab.id === 'profile' ? 'profile-tab' : ''} ${tab.id === 'settings' ? 'settings-tab' : ''} profile-section-tab`}
                style={{
                  display: 'flex',
                  width: 'fit-content',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px',
                  border: activeTab === tab.id ? '2px solid #FFD700' : '2px solid transparent',
                  borderRadius: '18px',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <span className="text-base md:text-lg" style={{ 
                  color: activeTab === tab.id ? '#FFF' : '#FFF', 
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
        <div 
          className="w-full max-w-[80rem] flex-1 overflow-y-auto scrollbar-hide" 
          style={{
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          }}
        >

          {/* Profile Tab Content */}
          {activeTab === 'profile' && (
            <div className="space-y-6 px-4 md:px-4">
              {/* Profile Card Container */}
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
                    background: !MatchBackgroundEquip?.id 
                      ? 'linear-gradient(135deg, #667eea, #764ba2)'
                      : 'transparent',
                    width: 'calc(100vw - 2rem)',
                    maxWidth: '100%'
                  }}
                >
                  {/* Flexin Background Video or Image */}
                  {MatchBackgroundEquip?.id && (() => {
                    const resolved = resolveBackgroundPath(MatchBackgroundEquip.id, 'dashboard-display');
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
                          src={user?.profilePicture || user?.photoURL}
                          alt={`${user?.displayName || 'Player'}'s profile picture`}
                          size="lg"
                          fallbackInitials={user?.displayName?.charAt(0)?.toUpperCase() || '?'}
                        />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-gray-800"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-white text-2xl font-semibold font-audiowide truncate">
                          {user?.displayName || 'Player'}
                        </h2>
                        <p className="text-white/90 text-lg font-montserrat">Online</p>
                        <p className="text-white/70 text-sm font-montserrat">
                          Member since {user?.createdAt?.toLocaleDateString() || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Victory Screen Section */}
                <div className="relative bg-black/60 backdrop-blur-sm border-x border-gray-700/50 p-6" style={{ width: 'calc(100vw - 2rem)', maxWidth: '100%' }}>
                  <h3 className="text-white text-lg uppercase mb-3 text-center" style={{ fontFamily: 'Audiowide' }}>Victory Screen</h3>
                  <div className="relative rounded-xl overflow-hidden flex items-center justify-center border border-gray-700/50" style={{ height: '300px' }}>
                    <video
                      key={VictoryBackgroundEquip?.id || 'victory-screen-video'}
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
                      className="w-full h-full object-contain"
                      src={VictoryBackgroundEquip ? resolveBackgroundPath(VictoryBackgroundEquip.id, 'dashboard-display')?.path : '/Victory Screens/Wind Blade.mp4'}
                    />
                  </div>
                </div>

                {/* Match Decider Section */}
                <div className="relative bg-black/60 backdrop-blur-sm border-x border-b border-gray-700/50 rounded-b-[20px] p-6" style={{ width: 'calc(100vw - 2rem)', maxWidth: '100%' }}>
                  <h3 className="text-white text-lg uppercase mb-3 text-center" style={{ fontFamily: 'Audiowide' }}>Turn Decider</h3>
                  <div className="relative rounded-xl overflow-hidden flex items-center justify-center border border-gray-700/50" style={{ height: '300px' }}>
                    <video
                      key={TurnDeciderBackgroundEquip?.id || 'turn-decider-video'}
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
                      className="w-full h-full object-contain"
                      src={TurnDeciderBackgroundEquip ? resolveBackgroundPath(TurnDeciderBackgroundEquip.id, 'dashboard-display')?.path : '/Game Backgrounds/Turn Decider/Videos/Best Quality/Crazy Cough.mp4'}
                    />
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
                  {/* Statistics Grid - Friends Card Style */}
                  <div className="rounded-xl p-6 -mx-4 md:-mx-4">
                    <h3 className="text-white text-xl font-audiowide mb-4 uppercase text-center md:text-left">Player Statistics</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <motion.div 
                        className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="text-2xl font-bold text-blue-400 font-audiowide">
                          {statsLoading ? '...' : (stats?.gamesPlayed || 0)}
                        </div>
                        <div className="text-sm text-gray-300 font-montserrat">
                          <span className="md:hidden">Games</span>
                          <span className="hidden md:inline">Games Played</span>
                        </div>
                      </motion.div>
                      
                      <motion.div 
                        className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="text-2xl font-bold text-green-400 font-audiowide">
                          {statsLoading ? '...' : (stats?.matchWins || 0)}
                        </div>
                        <div className="text-sm text-gray-300 font-montserrat">
                          <span className="md:hidden">Won</span>
                          <span className="hidden md:inline">Games Won</span>
                        </div>
                      </motion.div>
                      
                      <motion.div 
                        className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <div className="text-2xl font-bold text-purple-400 font-audiowide">
                          {statsLoading ? '...' : (() => {
                            // Count backgrounds owned from user's inventory - handle both old and new formats
                            const inventory = user?.inventory;
                            if (Array.isArray(inventory)) {
                              // Legacy array format
                              return inventory.length;
                            } else if (inventory && 'ownedBackgrounds' in inventory) {
                              // New object format with ownedBackgrounds array
                              return inventory.ownedBackgrounds?.length || 0;
                            } else if (user?.ownedBackgrounds) {
                              // Legacy direct property format
                              return user.ownedBackgrounds.length;
                            }
                            return 0;
                          })()}
                        </div>
                        <div className="text-sm text-gray-300 font-montserrat">
                          <span className="md:hidden">Items</span>
                          <span className="hidden md:inline">Items Collected</span>
                        </div>
                      </motion.div>
                      
                      <motion.div 
                        className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        <div className="text-2xl font-bold text-orange-400 font-audiowide">
                          {statsLoading ? '...' : (stats?.currentStreak || 0)}
                        </div>
                        <div className="text-sm text-gray-300 font-montserrat">
                          <span className="md:hidden">Streak</span>
                          <span className="hidden md:inline">Current Streak</span>
                        </div>
                      </motion.div>
                    </div>
                    
                    {/* Additional stats row */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-600/50">
                      <motion.div 
                        className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <div className="text-2xl font-bold text-yellow-400 font-audiowide">
                          {statsLoading ? '...' : (stats?.bestStreak || 0)}
                        </div>
                        <div className="text-sm text-gray-300 font-montserrat">Best Streak</div>
                      </motion.div>
                      
                      <motion.div 
                        className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                      >
                        <div className="text-2xl font-bold text-cyan-400 font-audiowide">
                          {statsLoading ? '...' : (
                            stats?.gamesPlayed 
                              ? Math.round(((stats.matchWins || 0) / stats.gamesPlayed) * 100)
                              : 0
                          )}%
                        </div>
                        <div className="text-sm text-gray-300 font-montserrat">Win Rate</div>
                      </motion.div>
                    </div>
                    
                    {statsError && (
                      <div className="mt-4 text-center text-red-400 text-sm font-montserrat bg-red-900/20 p-3 rounded-lg border border-red-500/50">
                        {statsError}
                      </div>
                    )}
                  </div>
                  
                  {/* Ranked Statistics Section */}
                  <div className="bg-transparent  rounded-xl p-6 mt-6 -mx-4 md:-mx-4">
                    <h3 className="text-white text-xl font-audiowide mb-4 uppercase text-center md:text-left">Ranked</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <motion.div 
                        className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="text-lg font-bold text-purple-400 font-audiowide">
                          Coming Soon
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
                        <div className="text-lg font-bold text-yellow-400 font-audiowide">
                          Coming Soon
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
                        <div className="text-lg font-bold text-orange-400 font-audiowide">
                          Coming Soon
                        </div>
                        <div className="text-sm text-gray-300 font-montserrat">Peak Rank</div>
                      </motion.div>
                      
                      <motion.div 
                        className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        <div className="text-lg font-bold text-blue-400 font-audiowide">
                          Coming Soon
                        </div>
                        <div className="text-sm text-gray-300 font-montserrat">
                          <span className="md:hidden">Wins</span>
                          <span className="hidden md:inline">Season Wins</span>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                  
                  {/* Tournament Statistics Section */}
                  <div className="bg-transparent  rounded-xl p-6 mt-6 -mx-4 md:-mx-4">
                    <h3 className="text-white text-xl font-audiowide mb-4 uppercase text-center md:text-left">Tournament</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <motion.div 
                        className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="text-lg font-bold text-yellow-400 font-audiowide">
                          Coming Soon
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
                        <div className="text-lg font-bold text-orange-400 font-audiowide">
                          Coming Soon
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
                        <div className="text-lg font-bold text-red-400 font-audiowide">
                          Coming Soon
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
                        <div className="text-lg font-bold text-emerald-400 font-audiowide">
                          Coming Soon
                        </div>
                        <div className="text-sm text-gray-300 font-montserrat">
                          <span className="md:hidden">Points</span>
                          <span className="hidden md:inline">Tournament Points</span>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                  
                  {/* Cosmetic Statistics Section */}
                  <div className="bg-transparent  rounded-xl p-6 mt-6 -mx-4 md:-mx-4">
                    <h3 className="text-white text-xl font-audiowide mb-4 uppercase text-center md:text-left">Cosmetic</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <motion.div 
                        className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="text-2xl font-bold text-pink-400 font-audiowide">
                          {statsLoading ? '...' : (() => {
                            // Count backgrounds owned from user's inventory - handle both old and new formats
                            const inventory = user?.inventory;
                            if (Array.isArray(inventory)) {
                              // Legacy array format
                              return inventory.length;
                            } else if (inventory && 'ownedBackgrounds' in inventory) {
                              // New object format with ownedBackgrounds array
                              return inventory.ownedBackgrounds?.length || 0;
                            } else if (user?.ownedBackgrounds) {
                              // Legacy direct property format
                              return user.ownedBackgrounds.length;
                            }
                            return 0;
                          })()}
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
                        <div className="text-2xl font-bold text-teal-400 font-audiowide">
                          {statsLoading ? '...' : (() => {
                            // Count total items in user's inventory - handle both old and new formats
                            const inventory = user?.inventory;
                            if (Array.isArray(inventory)) {
                              // Legacy array format
                              return inventory.length;
                            } else if (inventory && 'ownedBackgrounds' in inventory) {
                              // New object format - count all inventory items
                              const backgroundCount = inventory.ownedBackgrounds?.length || 0;
                              // Add other inventory types when implemented (dice, avatars, effects)
                              return backgroundCount;
                            } else if (user?.ownedBackgrounds) {
                              // Legacy direct property format
                              return user.ownedBackgrounds.length;
                            }
                            return 0;
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
                        transition={{ delay: 0.4 }}
                      >
                        <div className="text-2xl font-bold text-amber-400 font-audiowide">
                          {statsLoading ? '...' : (() => {
                            // Count masterpiece items in user's inventory - handle both old and new formats
                            // For now, we'll count video backgrounds as masterpieces
                            const inventory = user?.inventory;
                            if (Array.isArray(inventory)) {
                              // Legacy array format - can't determine rarity
                              return 0;
                            } else if (inventory && 'ownedBackgrounds' in inventory) {
                              // New object format - count video backgrounds as masterpieces
                              const ownedBackgrounds = inventory.ownedBackgrounds || [];
                              const videoBackgrounds = ['New Day', 'On A Mission', 'Underwater', 'As They Fall', 'End Of The Dragon'];
                              return ownedBackgrounds.filter(bg => videoBackgrounds.includes(bg)).length;
                            } else if (user?.ownedBackgrounds) {
                              // Legacy direct property format - count video backgrounds
                              const ownedBackgrounds = user.ownedBackgrounds || [];
                              const videoBackgrounds = ['New Day', 'On A Mission', 'Underwater', 'As They Fall', 'End Of The Dragon'];
                              return ownedBackgrounds.filter(bg => videoBackgrounds.includes(bg)).length;
                            }
                            return 0;
                          })()}
                        </div>
                        <div className="text-sm text-gray-300 font-montserrat">Masterpieces</div>
                      </motion.div>
                    </div>
                  </div>
                  
                  {/* Friends Statistics Section */}
                  <div className="bg-transparent  rounded-xl p-6 mt-6 -mx-4 md:-mx-4">
                    <h3 className="text-white text-xl font-audiowide mb-4 uppercase text-center md:text-left">Friends</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <motion.div 
                        className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="text-2xl font-bold text-green-400 font-audiowide">
                          {friendStatsLoading ? '...' : (friendStats?.totalFriends || 0)}
                        </div>
                        <div className="text-sm text-gray-300 font-montserrat">Friends</div>
                      </motion.div>
                      
                      <motion.div 
                        className="text-center p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="text-2xl font-bold text-blue-400 font-audiowide">
                          {friendStatsLoading ? '...' : (friendStats?.friendMatches || 0)}
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
                        transition={{ delay: 0.4 }}
                      >
                        <div className="text-2xl font-bold text-cyan-400 font-audiowide">
                          {friendStatsLoading ? '...' : `${friendStats?.friendWinRate || 0}%`}
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

              {/* Match History Card - Friends Style */}
              <motion.div 
                className="relative overflow-hidden rounded-[20px] bg-black/40 backdrop-blur-sm border border-gray-700/50 -mx-4 md:-mx-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white text-xl font-audiowide uppercase flex items-center gap-3 md:flex-1 text-center w-full md:text-left">
                      Recent Matches
                    </h3>
                    <span className="hidden md:inline-block text-sm text-gray-400 font-montserrat bg-black/80 px-3 py-1 rounded-lg border border-gray-600/50">
                      Last 10 games
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <MatchHistory className="space-y-3" />
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Settings Tab Content */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Profile Information - Friends Style */}
              <motion.div 
                className="relative overflow-hidden rounded-[20px]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="p-6">
                  <h3 className="text-white text-xl font-audiowide uppercase mb-6">
                    Profile Information
                  </h3>
                  
                  <div className="p-6">
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:space-x-6 space-y-4 md:space-y-0">
                        <div className="relative">
                          <ProfilePictureUpload 
                            currentPhotoURL={user?.profilePicture || user?.photoURL}
                            onUploadComplete={(newPhotoURL) => {
                              console.log('Profile picture updated:', newPhotoURL);
                              // The profile picture will update automatically via real-time subscriptions
                            }}
                            className="enhanced-profile-upload"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold font-audiowide text-white mb-2">
                            {user?.displayName || 'Unknown User'}
                          </h3>
                          <p className="text-gray-300 font-montserrat mb-1">
                            Member since {user?.createdAt?.toLocaleDateString() || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-400 font-montserrat">{user?.email}</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-white mb-3 font-montserrat">
                            Display Name
                          </label>
                          <Input
                            type="text"
                            value={profileForm.values.displayName}
                            onChange={(e) => profileForm.handleChange('displayName', e.target.value)}
                            error={profileForm.errors.displayName}
                            placeholder="Enter your display name"
                            maxLength={12}
                            textColor="#ffffff"
                            className="placeholder-white [&::placeholder]:text-white bg-[#121212] border-gray-600 focus:border-blue-400"
                            style={{ backgroundColor: '#121212' }}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white mb-3 font-montserrat">
                            Email Address
                          </label>
                          <Input
                            type="email"
                            value={profileForm.values.email}
                            onChange={(e) => profileForm.handleChange('email', e.target.value)}
                            placeholder="Enter your email"
                            disabled
                            textColor="#ffffff"
                            className="placeholder-white [&::placeholder]:text-white bg-[#121212] border-gray-600"
                            style={{ backgroundColor: '#121212' }}
                          />
                        </div>
                      </div>

                      {successMessage && (
                        <motion.div 
                          className="p-4 bg-green-900/30 border border-green-500/50 text-green-400 rounded-lg backdrop-blur-sm"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          {successMessage}
                        </motion.div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex-1"
                        >
                          <Button
                            type="submit"
                            disabled={profileForm.isSubmitting}
                            className="w-full bg-blue-600/60 hover:bg-blue-700/60 border border-blue-500/50 font-audiowide"
                          >
                            {profileForm.isSubmitting ? 'Updating...' : 'Update Profile'}
                          </Button>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex-1"
                        >
                          <Button
                            type="button"
                            variant="danger"
                            onClick={handleSignOut}
                            className="w-full bg-red-600/60 hover:bg-red-700/60 border border-red-500/50 font-audiowide"
                          >
                            Sign Out
                          </Button>
                        </motion.div>
                      </div>
                    </form>
                  </div>
                </div>
              </motion.div>

              {/* General Settings - Hidden */}
              <motion.div 
                className="hidden relative overflow-hidden rounded-[20px] bg-black/40 backdrop-blur-sm border border-gray-700/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="p-6">
                  <h3 className="text-white text-xl font-audiowide uppercase mb-6">
                    General Settings
                  </h3>
                  
                  <div className="bg-transparent  border border-gray-700/50 rounded-xl p-6 space-y-6">
                    <motion.div 
                      className="flex items-center justify-between p-4 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                      whileHover={{ scale: 1.02, y: -2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div>
                        <div className="font-medium font-audiowide text-white text-lg">Notifications</div>
                        <div className="text-sm text-gray-300 font-montserrat">Receive game alerts and updates</div>
                      </div>
                      <motion.button
                        onClick={() => handleToggle('notifications')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.notifications ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.notifications ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </motion.button>
                    </motion.div>

                    <motion.div 
                      className="flex items-center justify-between p-4 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                      whileHover={{ scale: 1.02, y: -2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div>
                        <div className="font-medium font-audiowide text-white text-lg">Sound Effects</div>
                        <div className="text-sm text-gray-300 font-montserrat">Enable game sound effects</div>
                      </div>
                      <motion.button
                        onClick={() => handleToggle('soundEffects')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.soundEffects ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.soundEffects ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </motion.button>
                    </motion.div>

                    <motion.div 
                      className="flex items-center justify-between p-4 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                      whileHover={{ scale: 1.02, y: -2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div>
                        <div className="font-medium font-audiowide text-white text-lg">Auto-Save</div>
                        <div className="text-sm text-gray-300 font-montserrat">Automatically save game progress</div>
                      </div>
                      <motion.button
                        onClick={() => handleToggle('autoSave')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.autoSave ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.autoSave ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </motion.button>
                    </motion.div>

                    {/* Volume Controls */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <motion.div 
                        className="p-4 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                        whileHover={{ scale: 1.02, y: -2 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="font-medium font-audiowide text-white text-lg mb-3">Music Volume</div>
                        <div className="space-y-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={settings.musicVolume}
                            onChange={(e) => handleSliderChange('musicVolume', parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                          />
                          <div className="text-sm text-gray-300 font-montserrat text-center">
                            {settings.musicVolume}%
                          </div>
                        </div>
                      </motion.div>

                      <motion.div 
                        className="p-4 rounded-lg bg-black/80 backdrop-blur-sm border border-gray-600/50"
                        whileHover={{ scale: 1.02, y: -2 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="font-medium font-audiowide text-white text-lg mb-3">SFX Volume</div>
                        <div className="space-y-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={settings.sfxVolume}
                            onChange={(e) => handleSliderChange('sfxVolume', parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                          />
                          <div className="text-sm text-gray-300 font-montserrat text-center">
                            {settings.sfxVolume}%
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons - Hidden */}
              <motion.div 
                className="hidden relative overflow-hidden rounded-[20px] bg-black/40 backdrop-blur-sm border border-gray-700/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="p-6">
                  <div className="bg-transparent  border border-gray-700/50 rounded-xl p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1"
                      >
                        <Button
                          onClick={handleSaveSettings}
                          className="w-full bg-green-600/60 hover:bg-green-700/60 border border-green-500/50 font-audiowide text-white py-3"
                        >
                          💾 Save Settings
                        </Button>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1"
                      >
                        <Button
                          variant="secondary"
                          onClick={handleResetSettings}
                          className="w-full bg-gray-600/60 hover:bg-gray-700/60 border border-gray-500/50 font-audiowide text-white py-3"
                        >
                          🔄 Reset to Defaults
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Mobile Tab Navigation - Fixed Above Bottom Nav */}
        <div className="md:hidden fixed bottom-[70px] left-0 right-0 z-[60] px-4 py-3" style={{ 
          background: DisplayBackgroundEquip?.name === 'On A Mission' 
            ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.6) 0%, rgba(14, 165, 233, 0.3) 50%, rgba(14, 165, 233, 0.1) 100%)'
            : (DisplayBackgroundEquip?.name === 'Long Road Ahead' || DisplayBackgroundEquip?.name === 'As They Fall' || DisplayBackgroundEquip?.name === 'End Of The Dragon')
            ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.6) 0%, rgba(76, 29, 149, 0.4) 25%, rgba(30, 27, 75, 0.3) 50%, rgba(30, 58, 138, 0.4) 75%, rgba(59, 130, 246, 0.3) 100%)'
            : DisplayBackgroundEquip?.name === 'New Day'
            ? 'linear-gradient(0deg, #5a7579 0%, transparent 100%)'
            : DisplayBackgroundEquip?.name === 'Relax'
            ? 'linear-gradient(0deg, #407080 0%, transparent 100%)'
            : DisplayBackgroundEquip?.name === 'Underwater'
            ? 'linear-gradient(0deg, #00518c 0%, transparent 100%)'
            : 'rgba(0, 0, 0, 0.95)',
          backdropFilter: DisplayBackgroundEquip?.name === 'On A Mission' || DisplayBackgroundEquip?.name === 'Long Road Ahead' || DisplayBackgroundEquip?.name === 'As They Fall' || DisplayBackgroundEquip?.name === 'End Of The Dragon' ? 'blur(8px)' : 'blur(10px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)' 
        }}>
          <div className="flex items-center justify-center gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button profile-section-tab flex items-center justify-center gap-2 px-6 py-2.5 rounded-[18px] transition-all duration-300 ${
                  activeTab === tab.id ? 'active' : ''
                }`}
                style={{
                  border: activeTab === tab.id ? '2px solid #FFD700' : '2px solid rgba(255, 255, 255, 0.1)',
                  background: activeTab === tab.id ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                  boxShadow: activeTab === tab.id ? '0 0 15px rgba(255, 215, 0, 0.3)' : 'none',
                }}
              >
                <span style={{
                  color: activeTab === tab.id ? '#FFD700' : '#FFF',
                  fontFamily: 'Audiowide', 
                  fontSize: '14px', 
                  fontWeight: 400, 
                  textTransform: 'uppercase' 
                }}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileSection;
