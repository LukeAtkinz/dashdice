// Debug component to test Firebase match creation
'use client';

import React, { useState } from 'react';
import { db } from '@/services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

export const FirebaseDebugTest: React.FC = () => {
  const { user } = useAuth();
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testFirebaseConnection = async () => {
    setIsLoading(true);
    setTestResult('Testing Firebase connection...');

    try {
      // Test basic connection
      console.log('🔍 Testing Firebase match creation');
      console.log('User authenticated:', !!user);
      console.log('Database instance:', !!db);

      if (!user) {
        setTestResult('❌ Error: User not authenticated');
        setIsLoading(false);
        return;
      }

      // Test creating a match document
      const testMatchData = {
        createdAt: serverTimestamp(),
        gameMode: 'debug-test',
        gameType: 'test',
        status: 'active',
        testField: 'debug-test-match',
        hostData: {
          playerId: user.uid,
          playerDisplayName: user.email?.split('@')[0] || 'Test User',
          playerStats: {
            gamesPlayed: 0,
            matchWins: 0,
            bestStreak: 0,
            currentStreak: 0
          }
        },
        authorizedPlayers: [user.uid]
      };

      console.log('🔍 Attempting to create test match...');
      const docRef = await addDoc(collection(db, 'matches'), testMatchData);
      
      console.log('✅ Test match created successfully:', docRef.id);
      setTestResult(`✅ Success! Match document created with ID: ${docRef.id}`);

    } catch (error: any) {
      console.error('❌ Firebase test error:', error);
      setTestResult(`❌ Error: ${error.message || error.toString()}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '20px', 
      right: '20px', 
      zIndex: 9999, 
      background: 'rgba(0,0,0,0.8)', 
      padding: '20px', 
      borderRadius: '10px',
      color: 'white',
      maxWidth: '400px'
    }}>
      <h3>Firebase Debug Test</h3>
      <button
        onClick={testFirebaseConnection}
        disabled={isLoading}
        style={{
          padding: '10px 20px',
          backgroundColor: isLoading ? '#666' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          marginBottom: '10px'
        }}
      >
        {isLoading ? 'Testing...' : 'Test Firebase Match Creation'}
      </button>
      {testResult && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          borderRadius: '5px',
          fontSize: '14px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {testResult}
        </div>
      )}
    </div>
  );
};

export default FirebaseDebugTest;