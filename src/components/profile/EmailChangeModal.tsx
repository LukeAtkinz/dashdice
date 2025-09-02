'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, X } from 'lucide-react';

interface EmailChangeModalProps {
  currentEmail: string;
  onSave: (newEmail: string, password: string) => Promise<void>;
  onCancel: () => void;
}

export const EmailChangeModal: React.FC<EmailChangeModalProps> = ({
  currentEmail,
  onSave,
  onCancel,
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newEmail || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (newEmail === currentEmail) {
      setError('New email must be different from current email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(newEmail, password);
    } catch (err: any) {
      setError(err.message || 'Failed to update email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-800 rounded-lg p-6 max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white font-[var(--font-audiowide)]">Change Email Address</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Email Display */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 font-[var(--font-montserrat)]">
              Current Email
            </label>
            <div className="bg-gray-700 px-3 py-2 rounded-lg text-gray-400 font-[var(--font-montserrat)]">
              {currentEmail}
            </div>
          </div>

          {/* New Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 font-[var(--font-montserrat)]">
              <Mail className="w-4 h-4 inline mr-1" />
              New Email Address
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-[var(--font-montserrat)]"
              placeholder="Enter your new email address"
              required
            />
          </div>

          {/* Password Confirmation */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 font-[var(--font-montserrat)]">
              <Lock className="w-4 h-4 inline mr-1" />
              Confirm with Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-[var(--font-montserrat)]"
              placeholder="Enter your current password"
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm font-[var(--font-montserrat)]">{error}</p>
            </div>
          )}

          {/* Security Notice */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-blue-400 text-sm font-[var(--font-montserrat)]">
              You will need to verify your new email address before the change takes effect.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCancel}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors font-[var(--font-montserrat)]"
              disabled={isLoading}
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center font-[var(--font-montserrat)] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Confirming...' : 'Confirm'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
