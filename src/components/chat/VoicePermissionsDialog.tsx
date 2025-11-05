/**
 * Voice Permissions Dialog Component
 * Handles microphone permission requests with platform-specific instructions
 */

import React, { useState, useEffect } from 'react';
import SpeechRecognitionService from '../../services/speechRecognitionService';

export interface VoicePermissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGranted: () => void;
  onDenied: () => void;
}

export const VoicePermissionsDialog: React.FC<VoicePermissionsDialogProps> = ({
  isOpen,
  onClose,
  onGranted,
  onDenied
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  // Detect platform
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, []);

  // Request microphone permission
  const handleRequestPermission = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      const service = SpeechRecognitionService.getInstance();
      const granted = await service.requestMicrophonePermission();

      if (granted) {
        onGranted();
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        setError('Microphone permission was denied. Please enable it in your browser settings.');
        onDenied();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request microphone permission.');
      onDenied();
    } finally {
      setIsRequesting(false);
    }
  };

  // Platform-specific instructions
  const getInstructions = () => {
    switch (platform) {
      case 'ios':
        return {
          title: 'Enable Microphone on iOS',
          steps: [
            'Open Settings app',
            'Scroll down and tap Safari',
            'Tap Microphone',
            'Make sure it is set to "Ask" or "Allow"',
            'Refresh this page and try again'
          ],
          icon: '🍎'
        };
      case 'android':
        return {
          title: 'Enable Microphone on Android',
          steps: [
            'Tap the lock icon or info icon in the address bar',
            'Tap "Site Settings" or "Permissions"',
            'Find "Microphone" and set to "Allow"',
            'Refresh this page and try again'
          ],
          icon: '🤖'
        };
      default:
        return {
          title: 'Enable Microphone Access',
          steps: [
            'Click the lock icon in the address bar',
            'Find "Microphone" in the permissions list',
            'Set it to "Allow"',
            'Refresh this page if needed'
          ],
          icon: '🖥️'
        };
    }
  };

  const instructions = getInstructions();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden mic-permission-dialog">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🎤</div>
              <div>
                <h2 className="text-xl font-bold">Microphone Access</h2>
                <p className="text-blue-100 text-sm">Required for voice chat</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!error ? (
            <>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                DashDice needs access to your microphone to enable voice-to-text chat. 
                Your voice data is processed locally and never stored.
              </p>

              {/* Request Button */}
              <button
                onClick={handleRequestPermission}
                disabled={isRequesting}
                className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
                  isRequesting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 active:scale-95 shadow-md hover:shadow-lg'
                }`}
              >
                {isRequesting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Requesting Permission...
                  </span>
                ) : (
                  '🎤 Enable Microphone'
                )}
              </button>

              {/* Privacy Notice */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">🔒</span>
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-medium">Privacy First</p>
                    <p className="text-blue-700 dark:text-blue-200 mt-1">
                      Voice recognition is processed by your browser. No audio is sent to our servers.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Error Message */}
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-2">
                  <span className="text-red-500 text-xl">⚠️</span>
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-100">
                      Permission Denied
                    </p>
                    <p className="text-red-700 dark:text-red-200 text-sm mt-1">
                      {error}
                    </p>
                  </div>
                </div>
              </div>

              {/* Platform-Specific Instructions */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="text-2xl">{instructions.icon}</span>
                  {instructions.title}
                </h3>
                <ol className="space-y-2">
                  {instructions.steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 text-sm pt-0.5">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Retry Button */}
              <div className="flex gap-3">
                <button
                  onClick={handleRequestPermission}
                  disabled={isRequesting}
                  className="flex-1 py-2.5 px-4 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-lg font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            You can always change this in your browser settings later
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoicePermissionsDialog;
