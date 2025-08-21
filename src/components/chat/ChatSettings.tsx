'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useChat } from '@/context/ChatContext';
import { UserChatSettings } from '@/types/chat';
import { X, Settings } from 'lucide-react';

interface ChatSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatSettings({ isOpen, onClose }: ChatSettingsProps) {
  const { userSettings, updateSettings } = useChat();
  const [localSettings, setLocalSettings] = useState<UserChatSettings | null>(null);

  useEffect(() => {
    if (userSettings) {
      setLocalSettings({ ...userSettings });
    }
  }, [userSettings]);

  const handleSave = async () => {
    if (localSettings) {
      await updateSettings(localSettings);
      onClose();
    }
  };

  const handleSettingChange = (key: keyof UserChatSettings, value: any) => {
    if (localSettings) {
      setLocalSettings({
        ...localSettings,
        [key]: value
      });
    }
  };

  const handleNotificationChange = (key: keyof UserChatSettings['notificationSettings'], value: boolean) => {
    if (localSettings) {
      setLocalSettings({
        ...localSettings,
        notificationSettings: {
          ...localSettings.notificationSettings,
          [key]: value
        }
      });
    }
  };

  if (!isOpen || !localSettings) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-blue-400" />
            <h2 className="text-xl font-bold text-white">Chat Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Settings */}
        <div className="space-y-6">
          {/* Chat Preferences */}
          <div>
            <h3 className="text-white font-medium mb-3">Chat Preferences</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-gray-300">Global Chat</span>
                <input
                  type="checkbox"
                  checked={localSettings.globalChatEnabled}
                  onChange={(e) => handleSettingChange('globalChatEnabled', e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-gray-300">Friend Messages</span>
                <input
                  type="checkbox"
                  checked={localSettings.friendMessagesEnabled}
                  onChange={(e) => handleSettingChange('friendMessagesEnabled', e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-gray-300">Game Messages</span>
                <input
                  type="checkbox"
                  checked={localSettings.gameMessagesEnabled}
                  onChange={(e) => handleSettingChange('gameMessagesEnabled', e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
              </label>
            </div>
          </div>

          {/* Notifications */}
          <div>
            <h3 className="text-white font-medium mb-3">Notifications</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-gray-300">Sound Notifications</span>
                <input
                  type="checkbox"
                  checked={localSettings.soundNotifications}
                  onChange={(e) => handleSettingChange('soundNotifications', e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-gray-300">Show Typing Indicators</span>
                <input
                  type="checkbox"
                  checked={localSettings.showTypingIndicators}
                  onChange={(e) => handleSettingChange('showTypingIndicators', e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-gray-300">Mention Notifications</span>
                <input
                  type="checkbox"
                  checked={localSettings.notificationSettings.mentions}
                  onChange={(e) => handleNotificationChange('mentions', e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
              </label>
            </div>
          </div>

          {/* Profanity Filter */}
          <div>
            <h3 className="text-white font-medium mb-3">Content Filter</h3>
            <select
              value={localSettings.profanityFilter}
              onChange={(e) => handleSettingChange('profanityFilter', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="off">Off</option>
              <option value="moderate">Moderate</option>
              <option value="strict">Strict</option>
            </select>
            <p className="text-gray-400 text-sm mt-1">
              Controls automatic filtering of inappropriate content
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
