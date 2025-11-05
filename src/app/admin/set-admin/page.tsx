'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * Set Admin Role Page
 * 
 * Simple page to set the current user as an admin in Firestore
 */
export default function SetAdminPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const setAsAdmin = async () => {
    if (!user) {
      setStatus('error');
      setMessage('❌ No user logged in. Please log in first.');
      return;
    }

    setStatus('processing');
    setMessage('Setting admin role...');

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        role: 'admin'
      });

      setStatus('success');
      setMessage(`✅ Successfully set ${user.email || user.uid} as admin!`);
    } catch (error) {
      setStatus('error');
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error setting admin:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">👑 Set Admin Role</h1>
          <p className="text-gray-400">
            Grant yourself admin permissions to use admin tools
          </p>
        </div>

        {/* Current User Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Current User</h2>
          
          {user ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Email:</span>
                <span className="font-mono">{user.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">UID:</span>
                <span className="font-mono text-sm">{user.uid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Display Name:</span>
                <span>{user.displayName || 'N/A'}</span>
              </div>
            </div>
          ) : (
            <p className="text-yellow-400">⚠️ No user logged in. Please log in first.</p>
          )}
        </div>

        {/* Action Button */}
        <div className="bg-gray-800 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Grant Admin Access</h2>
          <p className="text-gray-300 mb-6">
            Click the button below to add the "admin" role to your user document.
            This will allow you to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
            <li>Unlock abilities for all players</li>
            <li>Modify any playerAbilities document</li>
            <li>Access all admin tools</li>
          </ul>
          
          <button
            onClick={setAsAdmin}
            disabled={!user || status === 'processing'}
            className={`px-8 py-4 rounded-lg font-semibold text-lg transition-colors ${
              !user || status === 'processing'
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {status === 'processing' ? '⏳ Processing...' : '👑 Set as Admin'}
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-6 rounded-lg mb-8 ${
            status === 'success' ? 'bg-green-900/50 text-green-200 border-2 border-green-500' :
            status === 'error' ? 'bg-red-900/50 text-red-200 border-2 border-red-500' :
            status === 'processing' ? 'bg-blue-900/50 text-blue-200 border-2 border-blue-500' :
            'bg-gray-800 text-gray-300'
          }`}>
            <div className="text-lg font-semibold mb-2">Status</div>
            <div>{message}</div>
            
            {status === 'success' && (
              <div className="mt-4 p-4 bg-yellow-900/30 border-2 border-yellow-600 rounded-lg">
                <div className="font-semibold mb-2">🔄 Next Steps:</div>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Refresh this page (F5)</li>
                  <li>Go to <a href="/admin/unlock-abilities" className="underline text-blue-300 hover:text-blue-200">/admin/unlock-abilities</a></li>
                  <li>Click "Unlock All Abilities for All Players"</li>
                  <li>All abilities will be unlocked! 🎉</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="bg-gray-800 rounded-lg p-6 border-2 border-blue-600">
          <h3 className="text-xl font-semibold mb-4">ℹ️ Information</h3>
          <ul className="space-y-2 text-gray-300 text-sm">
            <li>• This sets <code className="bg-gray-700 px-2 py-1 rounded">role: 'admin'</code> on your user document</li>
            <li>• The Firestore security rules check this field to grant admin permissions</li>
            <li>• Only do this for trusted admin accounts</li>
            <li>• You can remove admin access by manually deleting the role field in Firestore</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
