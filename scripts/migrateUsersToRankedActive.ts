/**
 * Migration Script: Set All Users to Ranked - Active
 * 
 * This script updates all existing users to have rankedStatus: 'Ranked - Active'
 * Run this once to prepare the system for the new ranked matchmaking system.
 */

import { UserService } from '../src/services/userService';

async function migrateUsersToRankedActive() {
  try {
    console.log('🚀 Starting user migration to Ranked - Active status...');
    console.log('⏰ This may take a few moments depending on the number of users...');
    
    await UserService.setAllUsersRankedActive();
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 All users now have rankedStatus: "Ranked - Active"');
    console.log('🎮 The ranked matchmaking system is ready to use.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('🔧 Please check the error and try again.');
    console.log('💡 Make sure Firebase is properly configured and accessible.');
  }
}

// Run the migration
migrateUsersToRankedActive();
