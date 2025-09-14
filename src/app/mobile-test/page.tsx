/**
 * Mobile Test Page
 * Safe testing environment for mobile features
 * Access via /mobile-test (hidden from main navigation)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { MobileWrapper, PWAInstallButton, MobileNavigation, useMobileFeatures } from '@/components/mobile/MobileWrapper';
import { getPlatform, isMobileApp, getMobileCapabilities } from '@/utils/platformDetection';

export default function MobileTestPage() {
  const [testResults, setTestResults] = useState<any>({});
  const [isClient, setIsClient] = useState(false);
  const { platform, capabilities, vibrate, share, isMobile, isApp } = useMobileFeatures();

  useEffect(() => {
    setIsClient(true);
    
    // Run safe tests
    const runTests = async () => {
      const results = {
        platform: getPlatform(),
        isMobileApp: isMobileApp(),
        capabilities: getMobileCapabilities(),
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: navigator.userAgent,
        standalone: (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches,
        hasNotch: window.innerHeight !== window.screen.height,
        safeAreaSupport: CSS.supports('padding: env(safe-area-inset-top)'),
        timestamp: new Date().toISOString()
      };
      
      setTestResults(results);
    };

    runTests();
  }, []);

  const testVibration = () => {
    vibrate([100, 50, 100]);
  };

  const testShare = async () => {
    const success = await share({
      title: 'DashDice Mobile Test',
      text: 'Testing mobile sharing functionality',
      url: window.location.href
    });
    
    alert(success ? 'Share successful!' : 'Share not supported');
  };

  const testFullscreen = () => {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    } catch (error) {
      alert('Fullscreen not supported');
    }
  };

  if (!isClient) {
    return <div>Loading mobile tests...</div>;
  }

  return (
    <MobileWrapper enableMobileFeatures={true}>
      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Mobile Test Environment</h1>
          <div className="text-sm text-gray-500">
            Safe testing zone - no impact on main app
          </div>
        </div>

        <PWAInstallButton />

        {/* Platform Detection Results */}
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3">Platform Detection</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Platform:</strong> {platform}
            </div>
            <div>
              <strong>Is Mobile:</strong> {isMobile ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Is App:</strong> {isApp ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Screen:</strong> {testResults.screenSize}
            </div>
            <div>
              <strong>Standalone:</strong> {testResults.standalone ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Safe Area Support:</strong> {testResults.safeAreaSupport ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        {/* Mobile Capabilities */}
        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3">Mobile Capabilities</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {Object.entries(capabilities).map(([key, value]) => (
              <div key={key} className="flex items-center">
                <span className={`w-3 h-3 rounded-full mr-2 ${value ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="capitalize">{key}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Tests */}
        <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3">Interactive Tests</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={testVibration}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              disabled={!capabilities.vibration}
            >
              Test Vibration
            </button>
            
            <button
              onClick={testShare}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              disabled={!capabilities.share}
            >
              Test Share
            </button>
            
            <button
              onClick={testFullscreen}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
              disabled={!capabilities.fullscreen}
            >
              Test Fullscreen
            </button>
          </div>
        </div>

        {/* Mobile Navigation Test */}
        <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3">Mobile Navigation Test</h2>
          <p className="text-sm text-gray-600 mb-4">
            This navigation only appears on mobile screens (width ≤ 768px)
          </p>
          <MobileNavigation
            onQuickMatch={() => alert('Quick Match clicked!')}
            onRankedMatch={() => alert('Ranked Match clicked!')}
            onProfile={() => alert('Profile clicked!')}
            onFriends={() => alert('Friends clicked!')}
          />
        </div>

        {/* Raw Test Data */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Raw Test Data</h2>
          <details>
            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
              View Technical Details
            </summary>
            <pre className="mt-3 text-xs overflow-auto bg-black text-green-400 p-3 rounded">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </details>
        </div>

        {/* Back to Main App */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 inline-block"
          >
            ← Back to DashDice
          </a>
        </div>
      </div>
    </MobileWrapper>
  );
}
