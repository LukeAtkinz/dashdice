import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MobileAuthProvider } from './context/MobileAuthContext';
import { MobileInventoryProvider } from './context/MobileInventoryContext';
import { MobileFriendsProvider } from './context/MobileFriendsContext';
import { MobileNavigationProvider } from './context/MobileNavigationContext';
import { GlobalBackgroundWrapper } from './context/BackgroundContext';
import { MobileApp } from './MobileApp';

export default function MobileIndex() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#1F2937" />
      <MobileAuthProvider>
        <MobileInventoryProvider>
          <MobileFriendsProvider>
            <MobileNavigationProvider>
              <GlobalBackgroundWrapper>
                <MobileApp />
              </GlobalBackgroundWrapper>
            </MobileNavigationProvider>
          </MobileFriendsProvider>
        </MobileInventoryProvider>
      </MobileAuthProvider>
    </SafeAreaProvider>
  );
}