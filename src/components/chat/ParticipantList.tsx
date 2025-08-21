'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ParticipantListProps } from '@/types/chat';

export default function ParticipantList({ 
  roomId, 
  participants, 
  currentUserId, 
  showModerationActions = false,
  onMute,
  onUnmute,
  onKick 
}: ParticipantListProps) {
  
  const getStatusColor = (participant: any) => {
    if (participant.isMuted) return 'bg-red-400';
    if (participant.isTyping) return 'bg-yellow-400';
    return 'bg-green-400';
  };

  const getStatusText = (participant: any) => {
    if (participant.isMuted) return 'Muted';
    if (participant.isTyping) return 'Typing...';
    return 'Online';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-red-400';
      case 'moderator': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const formatLastSeen = (timestamp: any) => {
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } catch (error) {
      return 'Unknown';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <h3 className="text-white font-medium text-sm">
          Participants ({participants.length})
        </h3>
      </div>

      {/* Participant list */}
      <div className="flex-1 overflow-y-auto p-2">
        {participants.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-4">
            No participants
          </div>
        ) : (
          <div className="space-y-2">
            {participants.map((participant, index) => (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-2 rounded-lg transition-colors ${
                  participant.userId === currentUserId 
                    ? 'bg-blue-600/20' 
                    : 'hover:bg-gray-700/50'
                }`}
              >
                {/* User info */}
                <div className="flex items-center gap-2">
                  {/* Status indicator */}
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(participant)}`} />
                  
                  {/* Avatar */}
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {participant.userId.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  {/* Name and role */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-white text-sm font-medium truncate">
                        {participant.userId === currentUserId ? 'You' : participant.userId}
                      </span>
                      {participant.role !== 'participant' && (
                        <span className={`text-xs ${getRoleColor(participant.role)}`}>
                          {participant.role}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {getStatusText(participant)}
                    </div>
                  </div>
                </div>

                {/* Last seen */}
                <div className="text-xs text-gray-500 mt-1 ml-6">
                  Last seen: {formatLastSeen(participant.lastSeen)}
                </div>

                {/* Moderation actions */}
                {showModerationActions && participant.userId !== currentUserId && (
                  <div className="flex gap-1 mt-2 ml-6">
                    {participant.isMuted ? (
                      <button
                        onClick={() => onUnmute?.(participant.userId)}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded transition-colors"
                      >
                        Unmute
                      </button>
                    ) : (
                      <button
                        onClick={() => onMute?.(participant.userId)}
                        className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded transition-colors"
                      >
                        Mute
                      </button>
                    )}
                    
                    <button
                      onClick={() => onKick?.(participant.userId)}
                      className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded transition-colors"
                    >
                      Kick
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
