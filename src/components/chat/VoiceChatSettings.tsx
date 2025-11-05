/**
 * Voice Chat Settings Component
 * Allows users to configure voice chat preferences
 */

import React, { useState, useEffect } from 'react';
import SpeechRecognitionService from '../../services/speechRecognitionService';

export interface VoiceChatSettings {
  enabled: boolean;
  language: string;
  autoSend: boolean;
  voiceActivityDetection: boolean;
  silenceThreshold: number; // milliseconds
  minConfidence: number; // 0-1
  minWordCount: number;
  showTranscript: boolean;
}

export interface VoiceChatSettingsProps {
  settings: VoiceChatSettings;
  onSettingsChange: (settings: VoiceChatSettings) => void;
  onClose?: () => void;
  className?: string;
}

const DEFAULT_SETTINGS: VoiceChatSettings = {
  enabled: true,
  language: 'en-US',
  autoSend: true,
  voiceActivityDetection: false,
  silenceThreshold: 2000,
  minConfidence: 0.7,
  minWordCount: 2,
  showTranscript: true
};

// Settings persistence key
const SETTINGS_KEY = 'dashdice_voice_chat_settings';

export const VoiceChatSettingsComponent: React.FC<VoiceChatSettingsProps> = ({
  settings,
  onSettingsChange,
  onClose,
  className = ''
}) => {
  const [localSettings, setLocalSettings] = useState<VoiceChatSettings>(settings);
  const [isSupported, setIsSupported] = useState(false);
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>([]);

  // Initialize component
  useEffect(() => {
    const service = SpeechRecognitionService.getInstance();
    setIsSupported(service.getIsSupported());
    setSupportedLanguages(service.getSupportedLanguages());
  }, []);

  // Language display names
  const getLanguageDisplay = (code: string): string => {
    const languageNames: Record<string, string> = {
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'es-ES': 'Spanish (Spain)',
      'es-MX': 'Spanish (Mexico)',
      'fr-FR': 'French',
      'de-DE': 'German',
      'it-IT': 'Italian',
      'pt-BR': 'Portuguese (Brazil)',
      'ja-JP': 'Japanese',
      'ko-KR': 'Korean',
      'zh-CN': 'Chinese (Simplified)',
      'zh-TW': 'Chinese (Traditional)',
      'ru-RU': 'Russian',
      'ar-SA': 'Arabic',
      'hi-IN': 'Hindi',
      'th-TH': 'Thai',
      'vi-VN': 'Vietnamese',
      'nl-NL': 'Dutch',
      'sv-SE': 'Swedish',
      'da-DK': 'Danish',
      'no-NO': 'Norwegian',
      'fi-FI': 'Finnish',
      'pl-PL': 'Polish',
      'cs-CZ': 'Czech',
      'hu-HU': 'Hungarian',
      'ro-RO': 'Romanian',
      'bg-BG': 'Bulgarian',
      'hr-HR': 'Croatian',
      'sk-SK': 'Slovak',
      'sl-SI': 'Slovenian',
      'et-EE': 'Estonian',
      'lv-LV': 'Latvian',
      'lt-LT': 'Lithuanian',
      'mt-MT': 'Maltese',
      'tr-TR': 'Turkish',
      'uk-UA': 'Ukrainian'
    };
    return languageNames[code] || code;
  };

  // Handle setting changes
  const handleSettingChange = (key: keyof VoiceChatSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  // Save settings
  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(localSettings));
    onClose?.();
  };

  // Reset to defaults
  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
    onSettingsChange(DEFAULT_SETTINGS);
  };

  if (!isSupported) {
    return (
      <div className={`voice-chat-settings ${className}`}>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
            <span className="text-yellow-800 dark:text-yellow-200 font-medium">
              Voice chat not supported
            </span>
          </div>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
            Voice chat is not supported in this browser. Please use Chrome, Edge, or Safari for voice functionality.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`voice-chat-settings ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            🎤 Voice Chat Settings
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          )}
        </div>

        {/* Settings Form */}
        <div className="space-y-6">
          {/* Enable Voice Chat */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900 dark:text-white">
                Enable Voice Chat
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Allow voice-to-text functionality in chat
              </p>
            </div>
            <button
              onClick={() => handleSettingChange('enabled', !localSettings.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localSettings.enabled
                  ? 'bg-blue-600'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {localSettings.enabled && (
            <>
              {/* Language Selection */}
              <div>
                <label className="block font-medium text-gray-900 dark:text-white mb-2">
                  Language
                </label>
                <select
                  value={localSettings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {supportedLanguages.map(lang => (
                    <option key={lang} value={lang}>
                      {getLanguageDisplay(lang)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto Send */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900 dark:text-white">
                    Auto Send Messages
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Automatically send messages when speech is complete
                  </p>
                </div>
                <button
                  onClick={() => handleSettingChange('autoSend', !localSettings.autoSend)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    localSettings.autoSend
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      localSettings.autoSend ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Voice Activity Detection */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900 dark:text-white">
                    Voice Activity Detection
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Automatically stop recording after silence
                  </p>
                </div>
                <button
                  onClick={() => handleSettingChange('voiceActivityDetection', !localSettings.voiceActivityDetection)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    localSettings.voiceActivityDetection
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      localSettings.voiceActivityDetection ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Silence Threshold */}
              {localSettings.voiceActivityDetection && (
                <div>
                  <label className="block font-medium text-gray-900 dark:text-white mb-2">
                    Silence Threshold: {localSettings.silenceThreshold / 1000}s
                  </label>
                  <input
                    type="range"
                    min="1000"
                    max="5000"
                    step="500"
                    value={localSettings.silenceThreshold}
                    onChange={(e) => handleSettingChange('silenceThreshold', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>1s</span>
                    <span>5s</span>
                  </div>
                </div>
              )}

              {/* Minimum Confidence */}
              <div>
                <label className="block font-medium text-gray-900 dark:text-white mb-2">
                  Minimum Confidence: {Math.round(localSettings.minConfidence * 100)}%
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.1"
                  value={localSettings.minConfidence}
                  onChange={(e) => handleSettingChange('minConfidence', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>30%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Minimum Word Count */}
              <div>
                <label className="block font-medium text-gray-900 dark:text-white mb-2">
                  Minimum Word Count: {localSettings.minWordCount}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={localSettings.minWordCount}
                  onChange={(e) => handleSettingChange('minWordCount', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>1 word</span>
                  <span>10 words</span>
                </div>
              </div>

              {/* Show Transcript */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900 dark:text-white">
                    Show Live Transcript
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Display real-time transcription as you speak
                  </p>
                </div>
                <button
                  onClick={() => handleSettingChange('showTranscript', !localSettings.showTranscript)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    localSettings.showTranscript
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      localSettings.showTranscript ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200"
          >
            Save Settings
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

// Utility functions for settings management
export const loadVoiceChatSettings = (): VoiceChatSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load voice chat settings:', error);
  }
  return DEFAULT_SETTINGS;
};

export const saveVoiceChatSettings = (settings: VoiceChatSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save voice chat settings:', error);
  }
};

export default VoiceChatSettingsComponent;