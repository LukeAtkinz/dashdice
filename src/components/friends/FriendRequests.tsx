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
      <div className="space-y-3">
        {pendingRequests.slice(0, 3).map((request) => (
          <div
            key={request.id}
            className="backdrop-blur-lg bg-black/40 rounded-2xl p-4 border border-white/20 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.8) 100%)',
              backdropFilter: 'blur(20px)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p 
                  className="text-sm font-bold text-white mb-1"
                  style={{ fontFamily: "Audiowide" }}
                >
                  FRIEND REQUEST
                </p>
                <p className="text-xs text-white/70">
                  {getTimeAgo(request)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAcceptRequest(request.id)}
                  disabled={processingRequests.has(request.id)}
                  className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-green-400 disabled:to-green-500 text-white text-xs font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:cursor-not-allowed"
                  style={{ fontFamily: "Audiowide" }}
                >
                  ACCEPT
                </button>
                <button
                  onClick={() => handleDeclineRequest(request.id)}
                  disabled={processingRequests.has(request.id)}
                  className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-red-400 disabled:to-red-500 text-white text-xs font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:cursor-not-allowed"
                  style={{ fontFamily: "Audiowide" }}
                >
                  DECLINE
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {pendingRequests.length > 3 && (
          <p 
            className="text-xs text-center text-white/60"
            style={{ fontFamily: "Audiowide" }}
          >
            +{pendingRequests.length - 3} MORE REQUESTS
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 
          className="text-lg font-bold text-white"
          style={{ fontFamily: "Audiowide" }}
        >
          FRIEND REQUESTS
        </h3>
      </div>

      <div className="space-y-4">
        {pendingRequests.map((request) => (
          <div
            key={request.id}
            className="backdrop-blur-lg bg-black/40 rounded-3xl p-6 border border-white/20 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.8) 100%)',
              backdropFilter: 'blur(20px)'
            }}
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden bg-white/10">
                <img 
                  src="/Design Elements/lost connection.webp" 
                  alt="Friend Request" 
                  className="w-12 h-12 object-contain opacity-80"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 
                    className="font-bold text-white text-lg"
                    style={{ fontFamily: "Audiowide" }}
                  >
                    FRIEND REQUEST
                  </h4>
                  <span className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded-full backdrop-blur-sm">
                    {getTimeAgo(request)}
                  </span>
                </div>
                
                <p className="text-sm text-white/80 mb-3">
                  Someone wants to be your friend
                </p>

                {/* Message */}
                {request.message && (
                  <div className="mb-4 p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                    <p className="text-sm text-white/90">
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
                      <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-400/40 rounded-xl backdrop-blur-sm">
                        <p className="text-xs text-yellow-200 font-medium">
                          ⚠️ This request expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAcceptRequest(request.id)}
                    disabled={processingRequests.has(request.id)}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-green-400 disabled:to-green-500 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ fontFamily: "Audiowide" }}
                  >
                    {processingRequests.has(request.id) ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        ACCEPTING...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        ACCEPT
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleDeclineRequest(request.id)}
                    disabled={processingRequests.has(request.id)}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-red-400 disabled:to-red-500 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ fontFamily: "Audiowide" }}
                  >
                    {processingRequests.has(request.id) ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        DECLINING...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        DECLINE
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
