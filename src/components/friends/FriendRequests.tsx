'use client';

import React, { useState } from 'react';
import { useFriends } from '@/context/FriendsContext';
import { FriendRequest } from '@/types/friends';

interface FriendRequestsProps {
  compact?: boolean;
}

export default function FriendRequests({ compact = false }: FriendRequestsProps) {
  const { pendingRequests, acceptFriendRequest, declineFriendRequest } = useFriends();
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());

  const handleAcceptRequest = async (requestId: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    try {
      await acceptFriendRequest(requestId);
    } catch (error) {
      console.error('Error accepting friend request:', error);
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    try {
      await declineFriendRequest(requestId);
    } catch (error) {
      console.error('Error declining friend request:', error);
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const getTimeAgo = (request: FriendRequest) => {
    const now = new Date();
    const created = request.createdAt.toDate();
    const diffMs = now.getTime() - created.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return 'Just now';
  };

  if (pendingRequests.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {pendingRequests.slice(0, 3).map((request) => (
          <div
            key={request.id}
            className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-900 dark:text-green-100 truncate">
                  Friend Request
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  {getTimeAgo(request)}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleAcceptRequest(request.id)}
                  disabled={processingRequests.has(request.id)}
                  className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs rounded transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleDeclineRequest(request.id)}
                  disabled={processingRequests.has(request.id)}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs rounded transition-colors"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {pendingRequests.length > 3 && (
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            +{pendingRequests.length - 3} more requests
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Friend Requests
        </h3>
        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm rounded-full">
          {pendingRequests.length}
        </span>
      </div>

      <div className="space-y-3">
        {pendingRequests.map((request) => (
          <div
            key={request.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center overflow-hidden">
                <img 
                  src="/Design Elements/lost connection.webp" 
                  alt="Friend Request" 
                  className="w-full h-full object-contain opacity-80"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Friend Request
                  </h4>
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                    {getTimeAgo(request)}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Someone wants to be your friend
                </p>

                {/* Message */}
                {request.message && (
                  <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      "{request.message}"
                    </p>
                  </div>
                )}

                {/* Expiry Warning */}
                {(() => {
                  const now = new Date();
                  const expiry = request.expiresAt.toDate();
                  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  
                  if (daysLeft <= 3) {
                    return (
                      <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                        <p className="text-xs text-yellow-800 dark:text-yellow-200">
                          ⚠️ This request expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptRequest(request.id)}
                    disabled={processingRequests.has(request.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm rounded-md transition-colors flex items-center gap-1 disabled:cursor-not-allowed"
                  >
                    {processingRequests.has(request.id) ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Accepting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Accept
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleDeclineRequest(request.id)}
                    disabled={processingRequests.has(request.id)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm rounded-md transition-colors flex items-center gap-1 disabled:cursor-not-allowed"
                  >
                    {processingRequests.has(request.id) ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Declining...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Decline
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
