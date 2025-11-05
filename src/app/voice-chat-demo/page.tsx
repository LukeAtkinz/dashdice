/**
 * Voice Chat Demo Page
 * Demonstration and testing page for voice-to-text functionality
 */

'use client';

import React, { useState } from 'react';
import ChatInput from '../../components/chat/ChatInput';
import VoiceChat from '../../components/chat/VoiceChat';
import VoiceChatSettingsComponent, { 
  VoiceChatSettings, 
  loadVoiceChatSettings, 
  saveVoiceChatSettings 
} from '../../components/chat/VoiceChatSettings';

interface DemoMessage {
  id: string;
  text: string;
  timestamp: Date;
  isVoice: boolean;
}

export default function VoiceChatDemo() {
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [settings, setSettings] = useState<VoiceChatSettings>(loadVoiceChatSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [testMode, setTestMode] = useState<'combined' | 'voice-only' | 'text-only'>('combined');

  // Handle new messages
  const handleMessage = (text: string, isVoice: boolean) => {
    const newMessage: DemoMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      timestamp: new Date(),
      isVoice
    };

    setMessages(prev => [...prev, newMessage]);
    console.log(`📨 ${isVoice ? 'Voice' : 'Text'} message:`, text);
  };

  // Handle settings changes
  const handleSettingsChange = (newSettings: VoiceChatSettings) => {
    setSettings(newSettings);
    saveVoiceChatSettings(newSettings);
  };

  // Clear messages
  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              🎤 Voice Chat Demo
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
              >
                ⚙️ Settings
              </button>
              <button
                onClick={clearMessages}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
              >
                🗑️ Clear
              </button>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Test the voice-to-text chat functionality. Choose between different input modes and test on various devices.
          </p>

          {/* Test Mode Selection */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTestMode('combined')}
              className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                testMode === 'combined'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Combined Input
            </button>
            <button
              onClick={() => setTestMode('voice-only')}
              className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                testMode === 'voice-only'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Voice Only
            </button>
            <button
              onClick={() => setTestMode('text-only')}
              className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                testMode === 'text-only'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Text Only
            </button>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="mb-6 border-t pt-4">
              <VoiceChatSettingsComponent
                settings={settings}
                onSettingsChange={handleSettingsChange}
                onClose={() => setShowSettings(false)}
              />
            </div>
          )}
        </div>

        {/* Messages Display */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            💬 Messages ({messages.length})
          </h2>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                No messages yet. Try sending a message below!
              </div>
            ) : (
              messages.map(message => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${
                    message.isVoice
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">
                      {message.isVoice ? '🎤' : '⌨️'}
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-white">
                        {message.text}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          message.isVoice
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                        }`}>
                          {message.isVoice ? 'Voice' : 'Text'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            💬 Send Message
          </h2>

          {testMode === 'combined' && (
            <ChatInput
              onSendMessage={(text: string) => handleMessage(text, false)}
              placeholder="Type a message or use voice..."
              showVoiceChat={settings.enabled}
              voiceLanguage={settings.language}
              maxLength={500}
              autoFocus={true}
            />
          )}

          {testMode === 'voice-only' && settings.enabled && (
            <VoiceChat
              onMessage={(text: string) => handleMessage(text, true)}
              language={settings.language}
              placeholder="Hold to speak..."
              showTranscript={settings.showTranscript}
              autoSend={settings.autoSend}
              minWordCount={settings.minWordCount}
            />
          )}

          {testMode === 'text-only' && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const target = e.target as HTMLInputElement;
                    if (target.value.trim()) {
                      handleMessage(target.value, false);
                      target.value = '';
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                  if (input?.value.trim()) {
                    handleMessage(input.value, false);
                    input.value = '';
                  }
                }}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
              >
                Send
              </button>
            </div>
          )}

          {!settings.enabled && testMode !== 'text-only' && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              Voice chat is disabled. Enable it in settings to test voice functionality.
            </div>
          )}
        </div>

        {/* Feature Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ✨ Voice Chat Features
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                🎤 Voice Input
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Push-to-talk button</li>
                <li>• Space bar shortcut</li>
                <li>• Real-time transcription</li>
                <li>• Multiple language support</li>
                <li>• Auto-send on completion</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                📱 Device Support
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Desktop browsers</li>
                <li>• iOS Safari</li>
                <li>• Android Chrome</li>
                <li>• Automatic permissions</li>
                <li>• Mobile optimizations</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                ⚙️ Smart Features
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Voice activity detection</li>
                <li>• Confidence filtering</li>
                <li>• Silence detection</li>
                <li>• Minimum word counts</li>
                <li>• Live transcript display</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                🔧 Customization
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Language selection</li>
                <li>• Sensitivity controls</li>
                <li>• Auto-send settings</li>
                <li>• Transcript visibility</li>
                <li>• Persistent preferences</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}