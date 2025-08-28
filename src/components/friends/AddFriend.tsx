'use client';

import React, { useState } from 'react';
import { useFriends } from '@/context/FriendsContext';
import { useAuth } from '@/context/AuthContext';

interface AddFriendProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function AddFriend({ onClose, onSuccess }: AddFriendProps) {
  const { sendFriendRequest } = useFriends();
  const { user } = useAuth();
  const [friendCode, setFriendCode] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendCode.trim()) {
      setError('Please enter a friend code');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await sendFriendRequest(friendCode.trim().toUpperCase(), message.trim());
      
      if (result.success) {
        setSuccess('Friend request sent successfully!');
        setFriendCode('');
        setMessage('');
        setTimeout(() => {
          onSuccess?.();
          onClose?.();
        }, 2000);
      } else {
        setError(result.error || 'Failed to send friend request');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFriendCode = (value: string) => {
    // Remove any non-alphanumeric characters and convert to uppercase
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    // Limit to 8 characters
    return cleaned.slice(0, 8);
  };

  const handleFriendCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatFriendCode(e.target.value);
    setFriendCode(formatted);
    setError('');
    setSuccess('');
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {onClose && (
        <div className="flex justify-end mb-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* User's Friend Code Display */}
      {user?.friendCode && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your Friend Code:</p>
          <div className="flex items-center gap-2">
            <code className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">
              {user.friendCode}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(user.friendCode || '')}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              title="Copy to clipboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="friendCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Friend Code
          </label>
          <input
            type="text"
            id="friendCode"
            value={friendCode}
            onChange={handleFriendCodeChange}
            placeholder="Enter 8-character code"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                     placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 
                     text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 
                     focus:border-blue-500 font-mono text-lg tracking-widest"
            disabled={isLoading}
            maxLength={8}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Enter your friend's 8-character code
          </p>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Message (Optional)
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say hello to your friend..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                     placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 
                     text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 
                     focus:border-blue-500 resize-none"
            disabled={isLoading}
            maxLength={200}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {message.length}/200 characters
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        <div className="flex gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 
                       hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !friendCode.trim()}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 
                     disabled:from-gray-400 disabled:to-gray-500 text-white rounded-md transition-all 
                     disabled:cursor-not-allowed flex items-center justify-center gap-2 font-audiowide"
          >
            {isLoading && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isLoading ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
