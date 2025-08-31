'use client';

import React, { useState, useEffect } from 'react';
import { UserService } from '@/services/userService';
import { TournamentService } from '@/services/tournamentService';
import { NewMatchmakingService } from '@/services/newMatchmakingService';
import { PlayerHeartbeatService } from '@/services/playerHeartbeatService';
import { AbandonedMatchService } from '@/services/abandonedMatchService';
import { SeasonService } from '@/services/seasonService';
import { RankedMatchmakingService } from '@/services/rankedMatchmakingService';

/**
 * Enhanced Admin Utilities Component
 * Provides comprehensive admin tools for managing the unified matchmaking system
 */
export default function AdminUtilities() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [systemStats, setSystemStats] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  // Load system statistics
  const loadSystemStats = async () => {
    try {
      const stats = await NewMatchmakingService.getSystemStats();
      setSystemStats(stats);
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  // Auto-refresh system stats
  useEffect(() => {
    loadSystemStats();
    
    if (autoRefresh) {
      const interval = setInterval(loadSystemStats, 5000); // Every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Initialize unified matchmaking system
  const handleInitializeSystem = async () => {
    setIsLoading(true);
    try {
      NewMatchmakingService.initialize();
      showMessage('✅ Unified matchmaking system initialized successfully!', 'success');
      await loadSystemStats();
    } catch (error) {
      console.error('System initialization error:', error);
      showMessage(`❌ System initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Migrate all users to ranked active
  const handleMigrateUsers = async () => {
    if (!confirm('Are you sure you want to set all users to "Ranked - Active" status? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      await UserService.setAllUsersRankedActive();
      showMessage('✅ Successfully migrated all users to Ranked - Active status!', 'success');
    } catch (error) {
      console.error('Migration error:', error);
      showMessage(`❌ Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Create weekly tournaments
  const handleCreateWeeklyTournaments = async () => {
    if (!confirm('Create tournaments for the next 4 weeks? This will create 12 tournaments (3 per week).')) {
      return;
    }

    setIsLoading(true);
    try {
      await TournamentService.createWeeklyTournaments(4);
      showMessage('✅ Successfully created weekly tournaments for the next 4 weeks!', 'success');
    } catch (error) {
      console.error('Tournament creation error:', error);
      showMessage(`❌ Tournament creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Clean up abandoned matches
  const handleCleanupAbandonedMatches = async () => {
    if (!confirm('Clean up all abandoned/inactive matches? This will move them to the abandoned matches collection.')) {
      return;
    }

    setIsLoading(true);
    try {
      await NewMatchmakingService.cleanupAbandonedSessions();
      showMessage('✅ Successfully cleaned up abandoned matches!', 'success');
      await loadSystemStats();
    } catch (error) {
      console.error('Cleanup error:', error);
      showMessage(`❌ Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Test user ranked eligibility
  const handleTestRankedEligibility = async () => {
    const userId = prompt('Enter User ID to test ranked eligibility:');
    if (!userId) return;

    setIsLoading(true);
    try {
      const profile = await UserService.getUserProfile(userId);
      if (profile) {
        showMessage(`✅ User ${profile.displayName || 'Unknown'} has ranked status: ${profile.rankedStatus}`, 'info');
      } else {
        showMessage('❌ User not found', 'error');
      }
    } catch (error) {
      console.error('Test error:', error);
      showMessage(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Update individual user ranked status
  const handleUpdateUserRankedStatus = async () => {
    const userId = prompt('Enter User ID:');
    if (!userId) return;

    const status = prompt('Enter new ranked status (Ranked - Active, Ranked - Inactive, or Unranked):') as 'Ranked - Active' | 'Ranked - Inactive' | 'Unranked';
    if (!status || !['Ranked - Active', 'Ranked - Inactive', 'Unranked'].includes(status)) {
      showMessage('❌ Invalid status. Must be: Ranked - Active, Ranked - Inactive, or Unranked', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await UserService.updateRankedStatus(userId, status);
      showMessage(`✅ Successfully updated user ${userId} to status: ${status}`, 'success');
    } catch (error) {
      console.error('Update error:', error);
      showMessage(`❌ Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Force cleanup inactive players
  const handleCleanupInactivePlayers = async () => {
    if (!confirm('Clean up inactive players? This will mark offline players who haven\'t sent heartbeats recently.')) {
      return;
    }

    setIsLoading(true);
    try {
      await PlayerHeartbeatService.cleanupInactivePlayers();
      showMessage('✅ Successfully cleaned up inactive players!', 'success');
      await loadSystemStats();
    } catch (error) {
      console.error('Player cleanup error:', error);
      showMessage(`❌ Player cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize first season (ending Friday 19/9/2025 at 5:00 PM)
  const handleInitializeFirstSeason = async () => {
    if (!confirm('Initialize the first ranked season? This will create "Dash 1" ending Friday 19/9/2025 at 5:00 PM and initialize ranked stats for all users.')) {
      return;
    }

    setIsLoading(true);
    try {
      // Create custom season with specific end date
      const startDate = new Date();
      const endDate = new Date('2025-09-19T17:00:00+01:00'); // Friday 19/9/2025 at 5:00 PM BST
      
      // Use the SeasonService but with custom timing
      const season = await SeasonService.createFirstSeason(endDate);
      
      // Initialize ranked stats for all users
      await RankedMatchmakingService.initializeAllUsersForSeason(season.dashNumber);
      
      showMessage(`✅ Successfully created Dash 1! Season runs until ${endDate.toLocaleDateString()} at ${endDate.toLocaleTimeString()}`, 'success');
    } catch (error) {
      console.error('Season initialization error:', error);
      showMessage(`❌ Season initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Check current season status
  const handleCheckSeasonStatus = async () => {
    setIsLoading(true);
    try {
      const currentSeason = await SeasonService.getCurrentSeason();
      if (currentSeason) {
        const timeRemaining = await SeasonService.getTimeRemainingInSeason();
        const timeString = SeasonService.formatTimeRemaining(timeRemaining);
        showMessage(`✅ Current Season: ${currentSeason.name} (Dash ${currentSeason.dashNumber}) - Time remaining: ${timeString}`, 'info');
      } else {
        showMessage('❌ No active season found. Click "Initialize First Season" to create Dash 1.', 'error');
      }
    } catch (error) {
      console.error('Season check error:', error);
      showMessage(`❌ Season check failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Force season rotation (for testing)
  const handleForceSeasonRotation = async () => {
    if (!confirm('Force season rotation? This will end the current season and create a new one. This should only be used for testing!')) {
      return;
    }

    setIsLoading(true);
    try {
      const newSeason = await SeasonService.checkAndRotateSeason();
      showMessage(`✅ Season rotated! New season: ${newSeason.name} (Dash ${newSeason.dashNumber})`, 'success');
    } catch (error) {
      console.error('Season rotation error:', error);
      showMessage(`❌ Season rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 font-audiowide">
          🛠️ Admin Utilities - Unified Matchmaking System
        </h1>

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            messageType === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            messageType === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
          }`}>
            {message}
          </div>
        )}

        {/* User Migration Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 font-audiowide">
            👥 User Migration
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Set All Users to Ranked - Active
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                This will update all existing users to have ranked status "Ranked - Active", 
                enabling them to participate in ranked matches and tournaments.
              </p>
              <button
                onClick={handleMigrateUsers}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Migrating...' : 'Migrate All Users'}
              </button>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Update Individual User Status
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                Update a specific user's ranked status.
              </p>
              <button
                onClick={handleUpdateUserRankedStatus}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Update User Status
              </button>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Test User Ranked Eligibility
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                Check a user's current ranked status and eligibility.
              </p>
              <button
                onClick={handleTestRankedEligibility}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Test User Eligibility
              </button>
            </div>
          </div>
        </div>

        {/* Tournament Management Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 font-audiowide">
            🏆 Tournament Management
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Create Weekly Tournaments
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                Automatically create the next 4 weeks of tournaments:
                <br />• Friday 7PM - Classic Mode Tournament
                <br />• Saturday 7PM - Quickfire Tournament  
                <br />• Sunday 7PM - Zero Hour Tournament
              </p>
              <button
                onClick={handleCreateWeeklyTournaments}
                disabled={isLoading}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Creating...' : 'Create Weekly Tournaments'}
              </button>
            </div>
          </div>
        </div>

        {/* Season Management Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 font-audiowide">
            🏆 Season Management (Ranked System)
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                🚀 Initialize First Season (Dash 1)
              </h3>
              <p className="text-purple-700 dark:text-purple-300 text-sm mb-3">
                <strong>Create the first ranked season ending Friday 19/9/2025 at 5:00 PM</strong>
                <br />• Creates "Dash 1" with custom longer duration
                <br />• Initializes ranked stats for all existing users
                <br />• Enables ranked matchmaking system
                <br />• Subsequent seasons will be 2 weeks each
              </p>
              <button
                onClick={handleInitializeFirstSeason}
                disabled={isLoading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Creating Season...' : 'Initialize First Season'}
              </button>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                📅 Check Current Season Status
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                View current active season information and time remaining.
              </p>
              <button
                onClick={handleCheckSeasonStatus}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Checking...' : 'Check Season Status'}
              </button>
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                🔄 Force Season Rotation (Testing Only)
              </h3>
              <p className="text-red-600 dark:text-red-300 text-sm mb-3">
                <strong>⚠️ TESTING ONLY:</strong> Manually end current season and create next one. 
                This will reset all player rankings!
              </p>
              <button
                onClick={handleForceSeasonRotation}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Rotating...' : 'Force Season Rotation'}
              </button>
            </div>
          </div>
        </div>

        {/* System Management Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 font-audiowide">
            ⚙️ System Management
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Initialize Unified Matchmaking System
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                Initialize heartbeat monitoring and abandoned match cleanup services.
              </p>
              <button
                onClick={handleInitializeSystem}
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Initializing...' : 'Initialize System'}
              </button>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Clean Up Abandoned Matches
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                Move inactive matches to abandoned collection and clean up player references.
              </p>
              <button
                onClick={handleCleanupAbandonedMatches}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Cleaning...' : 'Cleanup Abandoned Matches'}
              </button>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Clean Up Inactive Players
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                Mark players as offline if they haven't sent heartbeats recently.
              </p>
              <button
                onClick={handleCleanupInactivePlayers}
                disabled={isLoading}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Cleaning...' : 'Cleanup Inactive Players'}
              </button>
            </div>
          </div>
        </div>

        {/* Real-time System Statistics */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 font-audiowide">
            � Real-time System Statistics
          </h2>
          
          <div className="mb-4 flex items-center gap-4">
            <button
              onClick={loadSystemStats}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {isLoading ? 'Loading...' : 'Refresh Stats'}
            </button>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span className="text-gray-700 dark:text-gray-300">Auto-refresh (5s)</span>
            </label>
          </div>

          {systemStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                  Active Players
                </h3>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {systemStats.activePlayers}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Players currently online
                </p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">
                  Active Sessions
                </h3>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {systemStats.activeSessions}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Games in progress
                </p>
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  Waiting Players
                </h3>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                  {systemStats.waitingPlayers}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Looking for matches
                </p>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-1">
                  Abandoned Matches
                </h3>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {systemStats.abandonedMatches?.total || 0}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  Last 24 hours
                </p>
              </div>
            </div>
          )}

          {systemStats?.abandonedMatches && Object.keys(systemStats.abandonedMatches.byReason).length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Abandonment Reasons (Last 24h)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(systemStats.abandonedMatches.byReason).map(([reason, count]) => (
                  <div key={reason} className="text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{count as number}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">{reason.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* System Information */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 font-audiowide">
            �📊 System Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Supported Game Types
              </h3>
              <ul className="text-gray-600 dark:text-gray-300 text-sm space-y-1">
                <li>• Quick Games (Casual matchmaking)</li>
                <li>• Ranked Games (Competitive with seasons)</li>
                <li>• Friend Invites (Private games) ✅ FIXED</li>
                <li>• Tournaments (Weekly scheduled events)</li>
                <li>• Rematches (Instant replay)</li>
              </ul>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                New Collections & Features
              </h3>
              <ul className="text-gray-600 dark:text-gray-300 text-sm space-y-1">
                <li>• gameSessions (Unified matchmaking) ✅</li>
                <li>• tournaments (Tournament management) ✅</li>
                <li>• abandonedMatches (Cleanup system) ✅ NEW</li>
                <li>• Player heartbeat monitoring ✅ NEW</li>
                <li>• Automated cleanup services ✅ NEW</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            ⚠️ System Status & Important Notes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ul className="text-yellow-700 dark:text-yellow-300 text-sm space-y-1">
              <li>✅ Player heartbeat system implemented</li>
              <li>✅ Abandoned match cleanup system active</li>
              <li>✅ Friend invite system fixed and working</li>
              <li>✅ Unified matchmaking architecture ready</li>
              <li>✅ Real-time statistics and monitoring</li>
            </ul>
            <ul className="text-yellow-700 dark:text-yellow-300 text-sm space-y-1">
              <li>• Initialize system before first use</li>
              <li>• Monitor statistics for system health</li>
              <li>• Run cleanup operations periodically</li>
              <li>• All operations are logged for debugging</li>
              <li>• Test thoroughly after any changes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
