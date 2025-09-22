import React from 'react';
import { useMobileNavigation } from '../../context/MobileNavigationContext';
import { useMobileAuth } from '../../context/MobileAuthContext';
import { MobileDashboardScreen } from '../../screens/mobile/MobileDashboardScreen';
import { MobileInventoryScreen } from '../../screens/mobile/MobileInventoryScreen';
import { MobileAchievementsScreen } from '../../screens/mobile/MobileAchievementsScreen';
import { MobileFriendsScreen } from '../../screens/mobile/MobileFriendsScreen';
import { MobileRankedScreen } from '../../screens/mobile/MobileRankedScreen';
import { MobileProfileScreen } from '../../screens/mobile/MobileProfileScreen';
import { MobileSettingsScreen } from '../../screens/mobile/MobileSettingsScreen';
import { MobileMatchScreen } from '../../screens/mobile/MobileMatchScreen';
import { MobileWaitingRoomScreen } from '../../screens/mobile/MobileWaitingRoomScreen';
import { MobileUserProfileScreen } from '../../screens/mobile/MobileUserProfileScreen';
import { MobileLoadingScreen } from '../../screens/mobile/MobileLoadingScreen';
import { MobileAuthScreen } from '../../screens/mobile/MobileAuthScreen';

export const MobileDashboard: React.FC = () => {
  const { currentSection } = useMobileNavigation();
  const { user, loading } = useMobileAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return <MobileLoadingScreen />;
  }

  // Show auth screen if not logged in
  if (!user) {
    return <MobileAuthScreen />;
  }

  // Render the current section
  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return <MobileDashboardScreen />;
      case 'inventory':
        return <MobileInventoryScreen />;
      case 'achievements':
        return <MobileAchievementsScreen />;
      case 'friends':
        return <MobileFriendsScreen />;
      case 'ranked':
        return <MobileRankedScreen />;
      case 'profile':
        return <MobileProfileScreen />;
      case 'settings':
        return <MobileSettingsScreen />;
      case 'match':
        return <MobileMatchScreen />;
      case 'waiting-room':
        return <MobileWaitingRoomScreen />;
      case 'user-profile':
        return <MobileUserProfileScreen />;
      default:
        return <MobileDashboardScreen />;
    }
  };

  return (
    <div className="mobile-dashboard w-full h-full min-h-screen bg-gray-900 text-white">
      {renderCurrentSection()}
    </div>
  );
};