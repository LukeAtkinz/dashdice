/**
 * Platform Detection Utilities
 * Safe utilities to detect mobile app vs web browser
 * These don't modify existing functionality, only provide information
 */

export type Platform = 'web' | 'mobile-app' | 'mobile-browser';

/**
 * Detect if running as a mobile app (PWA installed or native app)
 */
export const isMobileApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // PWA standalone mode
  const isStandalone = (window.navigator as any).standalone === true;
  
  // PWA display mode
  const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Native app via Capacitor
  const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;
  
  return isStandalone || isDisplayStandalone || isCapacitor;
};

/**
 * Detect if on mobile device (regardless of app vs browser)
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Get current platform
 */
export const getPlatform = (): Platform => {
  if (isMobileApp()) return 'mobile-app';
  if (isMobileDevice()) return 'mobile-browser';
  return 'web';
};

/**
 * Check if PWA can be installed
 */
export const canInstallPWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check if browser supports PWA installation
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Safe feature detection for mobile-specific features
 */
export const getMobileCapabilities = () => {
  const platform = getPlatform();
  
  return {
    platform,
    canInstall: canInstallPWA(),
    hasNotifications: 'Notification' in window,
    hasVibration: 'vibrate' in navigator,
    hasGeolocation: 'geolocation' in navigator,
    hasCamera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    hasShare: 'share' in navigator,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 768,
  };
};

/**
 * Safe CSS classes for platform-specific styling
 */
export const getPlatformClasses = (): string => {
  const platform = getPlatform();
  const isMobile = isMobileDevice();
  
  const classes = [
    `platform-${platform}`,
    isMobile ? 'mobile-device' : 'desktop-device',
    isMobileApp() ? 'app-mode' : 'browser-mode'
  ];
  
  return classes.join(' ');
};

/**
 * Viewport utilities for mobile optimization
 */
export const getViewportInfo = () => {
  if (typeof window === 'undefined') {
    return {
      width: 1024,
      height: 768,
      aspectRatio: 1024 / 768,
      isPortrait: false,
      isLandscape: true,
    };
  }
  
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspectRatio = width / height;
  
  return {
    width,
    height,
    aspectRatio,
    isPortrait: height > width,
    isLandscape: width > height,
  };
};

/**
 * Safe Area Insets (for notched devices)
 */
export const getSafeAreaInsets = () => {
  if (typeof window === 'undefined' || !CSS.supports) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  
  return {
    top: CSS.supports('padding-top', 'env(safe-area-inset-top)') ? 'env(safe-area-inset-top)' : '0px',
    right: CSS.supports('padding-right', 'env(safe-area-inset-right)') ? 'env(safe-area-inset-right)' : '0px',
    bottom: CSS.supports('padding-bottom', 'env(safe-area-inset-bottom)') ? 'env(safe-area-inset-bottom)' : '0px',
    left: CSS.supports('padding-left', 'env(safe-area-inset-left)') ? 'env(safe-area-inset-left)' : '0px',
  };
};
