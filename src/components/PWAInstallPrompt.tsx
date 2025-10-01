'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  if (!showInstallButton) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:max-w-sm">
      <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black p-4 rounded-lg shadow-2xl border border-yellow-400">
        <div className="flex items-center gap-3">
          <div className="text-2xl">📱</div>
          <div className="flex-1">
            <h3 className="font-bold text-sm">Install DashDice</h3>
            <p className="text-xs opacity-90">Get the full app experience!</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowInstallButton(false)}
              className="px-2 py-1 text-xs bg-black/20 rounded"
            >
              ✕
            </button>
            <button
              onClick={handleInstallClick}
              className="px-3 py-1 text-xs bg-black/20 rounded font-bold hover:bg-black/30 transition-colors"
            >
              Install
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;