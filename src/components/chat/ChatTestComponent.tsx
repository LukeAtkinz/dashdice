'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';

export default function ChatTestComponent() {
  const { user } = useAuth();
  const { 
    getGlobalChatRoom, 
    getFriendChatRoom, 
    joinRoom, 
    sendMessage,
    messages 
  } = useChat();
  
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, result]);
  };

  const testGlobalChat = async () => {
    if (!user?.uid) {
      addResult('❌ User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      addResult('🔄 Getting global chat room...');
      const roomId = await getGlobalChatRoom();
      addResult(`✅ Global chat room ID: ${roomId}`);
      
      addResult('🔄 Joining global chat room...');
      const joined = await joinRoom(roomId);
      addResult(joined ? '✅ Successfully joined global chat' : '❌ Failed to join global chat');
      
      if (joined) {
        addResult('🔄 Sending test message...');
        const sent = await sendMessage(roomId, 'Hello from chat test! 🎲');
        addResult(sent ? '✅ Test message sent' : '❌ Failed to send message');
        
        // Check if messages are received
        setTimeout(() => {
          const roomMessages = messages.get(roomId);
          addResult(`📧 Messages in room: ${roomMessages?.length || 0}`);
        }, 1000);
      }
    } catch (error) {
      addResult(`❌ Error: ${error}`);
    }
    setIsLoading(false);
  };

  const testFriendChat = async () => {
    if (!user?.uid) {
      addResult('❌ User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      // Use a test friend ID (could be another user or a dummy ID)
      const testFriendId = 'test-friend-123';
      
      addResult('🔄 Getting friend chat room...');
      const roomId = await getFriendChatRoom(testFriendId);
      addResult(`✅ Friend chat room ID: ${roomId}`);
      
      addResult('🔄 Joining friend chat room...');
      const joined = await joinRoom(roomId);
      addResult(joined ? '✅ Successfully joined friend chat' : '❌ Failed to join friend chat');
      
      if (joined) {
        addResult('🔄 Sending test message...');
        const sent = await sendMessage(roomId, 'Hello friend! This is a test message.');
        addResult(sent ? '✅ Test message sent' : '❌ Failed to send message');
      }
    } catch (error) {
      addResult(`❌ Error: ${error}`);
    }
    setIsLoading(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  if (!user) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-600">
        <p className="text-white">Please log in to test chat functionality</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-gray-800 rounded-lg border border-gray-600 max-w-md"
    >
      <h3 className="text-white font-bold text-lg mb-4">Chat System Test</h3>
      
      <div className="space-y-3 mb-4">
        <button
          onClick={testGlobalChat}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Test Global Chat
        </button>
        
        <button
          onClick={testFriendChat}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Test Friend Chat
        </button>
        
        <button
          onClick={clearResults}
          className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Clear Results
        </button>
      </div>

      {/* Test Results */}
      <div className="bg-gray-900 rounded-lg p-3 max-h-60 overflow-y-auto">
        <h4 className="text-gray-300 font-medium text-sm mb-2">Test Results:</h4>
        {testResults.length === 0 ? (
          <p className="text-gray-400 text-sm">No tests run yet</p>
        ) : (
          <div className="space-y-1">
            {testResults.map((result, index) => (
              <div key={index} className="text-sm text-gray-200 font-mono">
                {result}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {isLoading && (
        <div className="mt-3 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-300 text-sm">Testing...</span>
        </div>
      )}
    </motion.div>
  );
}
