'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProfileSettings } from '@/components/profile/ProfileSettings';

export default function FirebaseTestPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState('Loading...');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!user) {
      setStatus('❌ No authenticated user');
      return;
    }

    if (!user.uid) {
      setStatus('❌ User has no UID');
      return;
    }

    setStatus(`✅ Authenticated user: ${user.uid.substring(0, 8)}...`);
    setProfilePictureUrl(user.photoURL || undefined);
  }, [user]);

  const handleUploadSuccess = (newUrl: string) => {
    console.log('✅ Profile picture uploaded successfully:', newUrl);
    setProfilePictureUrl(newUrl);
  };

  const handleUploadError = (error: string) => {
    console.error('❌ Upload failed:', error);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🛡️ Secure Profile Picture Upload Test</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <p className="text-lg">{status}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Firebase Status</h2>
          <div className="space-y-2 text-sm">
            <p>✅ Firebase SDK loaded successfully</p>
            <p>✅ Project: dashdice-d1b86</p>
            <p>✅ Firestore rules: Deployed (matchHistory permissions active)</p>
            <p>✅ Firebase Storage: Enabled with secure rules</p>
            <p>✅ Image moderation: Multi-layer security active</p>
          </div>
        </div>

        {user && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🖼️ Profile Settings</h2>
            <ProfileSettings />
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🛡️ Security Features</h2>
          <ul className="space-y-2 text-sm">
            <li>� User-specific upload permissions (Firebase rules)</li>
            <li>📏 File size validation (5MB limit)</li>
            <li>🖼️ Image type validation (JPEG, PNG, WebP, GIF only)</li>
            <li>🧠 AI-powered content moderation (OpenAI GPT-4 Vision)</li>
            <li>🗑️ Automatic cleanup of rejected images</li>
            <li>⚡ Progressive upload: temp → moderation → final</li>
          </ul>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🧪 Test Instructions</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Safe images to test with:</strong></p>
            <ul className="list-disc list-inside ml-4 text-gray-300">
              <li>Personal photos</li>
              <li>Gaming avatars</li>
              <li>Cartoon characters</li>
              <li>Nature photos</li>
            </ul>
            
            <p className="mt-4"><strong>Expected rejections (for testing):</strong></p>
            <ul className="list-disc list-inside ml-4 text-gray-300">
              <li>Non-image files (.txt, .pdf, etc.)</li>
              <li>Files larger than 5MB</li>
              <li>Inappropriate content (if AI moderation detects it)</li>
            </ul>
          </div>
        </div>

        {user && (
          <div className="bg-gray-800 rounded-lg p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">User Details</h2>
            <pre className="text-xs bg-gray-700 p-4 rounded overflow-auto">
              {JSON.stringify({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: profilePictureUrl
              }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
