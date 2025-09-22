import React from 'react';
import { MobileAuthProvider } from './context/MobileAuthContext';
import { MobileInventoryProvider } from './context/MobileInventoryContext';
import { MobileFriendsProvider } from './context/MobileFriendsContext';
import { MobileNavigationProvider } from './context/MobileNavigationContext';
import { MobileDashboard } from './components/mobile/MobileDashboard';

export default function MobileApp() {
  return (
    <MobileAuthProvider>
      <MobileInventoryProvider>
        <MobileFriendsProvider>
          <MobileNavigationProvider>
            <MobileDashboard />
          </MobileNavigationProvider>
        </MobileFriendsProvider>
      </MobileInventoryProvider>
    </MobileAuthProvider>
  );
}