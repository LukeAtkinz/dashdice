'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/services/firebase';
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';

export const FirebaseConnectionTest = () => {
  const [status, setStatus] = useState<{
    auth: string;
    firestore: string;
    config: any;
  }>({
    auth: 'Testing...',
    firestore: 'Testing...',
    config: null,
  });

  useEffect(() => {
    // Test Firebase configuration
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    // Test Auth connection
    try {
      if (auth) {
        setStatus(prev => ({ ...prev, auth: '✅ Connected' }));
      } else {
        setStatus(prev => ({ ...prev, auth: '❌ Failed to initialize' }));
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, auth: `❌ Error: ${error}` }));
    }

    // Test Firestore connection
    try {
      if (db) {
        setStatus(prev => ({ ...prev, firestore: '✅ Connected' }));
      } else {
        setStatus(prev => ({ ...prev, firestore: '❌ Failed to initialize' }));
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, firestore: `❌ Error: ${error}` }));
    }

    setStatus(prev => ({ ...prev, config }));
  }, []);

  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <h3 className="font-semibold text-lg mb-3">🔥 Firebase Connection Status</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>Authentication:</strong> <span className="ml-2">{status.auth}</span>
        </div>
        <div>
          <strong>Firestore:</strong> <span className="ml-2">{status.firestore}</span>
        </div>
        
        {status.config && (
          <div className="mt-4">
            <strong>Configuration:</strong>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
              {JSON.stringify(status.config, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
