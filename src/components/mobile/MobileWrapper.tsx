/**
 * Mobile Enhancement Wrapper
 * Safely wraps existing components with mobile-specific enhancements
 * Fallback to original components ensures zero risk
 */

'use client';

import React, { useEffect, useState } from 'react';
import { getPlatform, getPlatformClasses, isMobileApp } from '@/utils/platformDetection';

interface MobileWrapperProps {
  children: React.ReactNode;
  enableMobileFeatures?: boolean; // Feature flag for safety
  fallback?: React.ReactNode; // Fallback if mobile features fail
}

export const MobileWrapper: React.FC<MobileWrapperProps> = ({
  children,
  enableMobileFeatures = true,
  fallback
}) => {
  const [isClient, setIsClient] = useState(false);
  const [platformClasses, setPlatformClasses] = useState('');

  useEffect(() => {
    setIsClient(true);
    if (enableMobileFeatures) {
      setPlatformClasses(getPlatformClasses());
      
      // Load mobile CSS only when needed
      if (isMobileApp() || window.innerWidth <= 768) {
        // Dynamically load mobile styles
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/styles/mobile.css';
        link.id = 'mobile-styles';
        if (!document.getElementById('mobile-styles')) {
          document.head.appendChild(link);
        }
      }
    }
  }, [enableMobileFeatures]);

  // Server-side or disabled - return children as-is
  if (!isClient || !enableMobileFeatures) {
    return <>{children}</>;
  }

  try {
    return (
      <div className={`mobile-wrapper ${platformClasses}`}>
        {children}
      </div>
    );
  } catch (error) {
    console.warn('Mobile features failed, falling back to default:', error);
    return <>{fallback || children}</>;
  }
};

/**
 * PWA Install Button Component
 * Only shows when PWA can be installed
 */
export const PWAInstallButton: React.FC = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA installed successfully');
    }
    
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  if (!canInstall || isMobileApp()) {
    return null;
  }

  return (
    <div className="install-banner show">
      <div>
        <strong>Install DashDice App</strong>
        <p>Get the full app experience with offline play!</p>
      </div>
      <button onClick={handleInstall}>Install</button>
      <button onClick={() => setCanInstall(false)}>×</button>
    </div>
  );
};

/**
 * Mobile Navigation Component
 * Only renders on mobile, doesn't affect desktop
 */
interface MobileNavProps {
  onQuickMatch?: () => void;
  onRankedMatch?: () => void;
  onProfile?: () => void;
  onFriends?: () => void;
}

export const MobileNavigation: React.FC<MobileNavProps> = ({
  onQuickMatch,
  onRankedMatch,
  onProfile,
  onFriends
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
    
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isMobile) {
    return null; // Don't render on desktop
  }

  return (
    <nav className="mobile-nav">
      <div className="nav-grid grid grid-cols-4 gap-2 p-2">
        <button 
          onClick={onQuickMatch}
          className="nav-item flex flex-col items-center p-2 rounded"
        >
          <span className="text-2xl">⚡</span>
          <span className="text-xs">Quick</span>
        </button>
        
        <button 
          onClick={onRankedMatch}
          className="nav-item flex flex-col items-center p-2 rounded"
        >
          <span className="text-2xl">🏆</span>
          <span className="text-xs">Ranked</span>
        </button>
        
        <button 
          onClick={onFriends}
          className="nav-item flex flex-col items-center p-2 rounded"
        >
          <span className="text-2xl">👥</span>
          <span className="text-xs">Friends</span>
        </button>
        
        <button 
          onClick={onProfile}
          className="nav-item flex flex-col items-center p-2 rounded"
        >
          <span className="text-2xl">👤</span>
          <span className="text-xs">Profile</span>
        </button>
      </div>
    </nav>
  );
};

/**
 * Safe Mobile Features Hook
 * Provides mobile-specific functionality with error handling
 */
export const useMobileFeatures = () => {
  const [platform, setPlatform] = useState<string>('web');
  const [capabilities, setCapabilities] = useState<any>({});

  useEffect(() => {
    try {
      const platformInfo = getPlatform();
      setPlatform(platformInfo);
      
      // Get mobile capabilities safely
      setCapabilities({
        vibration: 'vibrate' in navigator,
        notifications: 'Notification' in window,
        fullscreen: 'requestFullscreen' in document.documentElement,
        share: 'share' in navigator,
      });
    } catch (error) {
      console.warn('Error detecting mobile features:', error);
    }
  }, []);

  const vibrate = (pattern: number | number[]) => {
    try {
      if (capabilities.vibration) {
        navigator.vibrate(pattern);
      }
    } catch (error) {
      console.warn('Vibration failed:', error);
    }
  };

  const share = async (data: ShareData) => {
    try {
      if (capabilities.share) {
        await navigator.share(data);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Share failed:', error);
      return false;
    }
  };

  return {
    platform,
    capabilities,
    vibrate,
    share,
    isMobile: platform !== 'web',
    isApp: platform === 'mobile-app',
  };
};
