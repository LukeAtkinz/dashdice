// Client-side achievement initialization
// This should be run from the browser console or integrated into the app

const initializeClientAchievements = async () => {
  console.log('🎯 Initializing achievements client-side...');
  
  // This would need to be run with proper Firebase client initialization
  // For now, let's document the achievements that need to be added
  
  const newAchievements = [
    {
      id: 'dice_gremlin',
      name: 'Dice Gremlin',
      description: 'Roll the dice 1,000 times total',
      category: 'progression',
      type: 'counter',
      difficulty: 'common',
      requirements: {
        metric: 'total_dice_rolled',
        operator: 'greater_than_equal',
        value: 1000
      },
      rewards: {
        points: 30,
        badge: 'Gremlin'
      },
      icon: '🎲',
      rarity_color: '#6b7280',
      isActive: true,
      isHidden: false,
      order: 5
    },
    {
      id: 'dice_dragon',
      name: 'Dice Dragon',
      description: 'Roll the dice 10,000 times total',
      category: 'progression',
      type: 'counter',
      difficulty: 'epic',
      requirements: {
        metric: 'total_dice_rolled',
        operator: 'greater_than_equal',
        value: 10000
      },
      rewards: {
        points: 100,
        badge: 'Dragon',
        title: 'Dragon'
      },
      icon: '🐉',
      rarity_color: '#8b5cf6',
      isActive: true,
      isHidden: false,
      prerequisites: ['dice_gremlin'],
      order: 6
    },
    {
      id: 'dice_god',
      name: 'Dice God',
      description: 'Roll the dice 100,000 times total',
      category: 'progression',
      type: 'counter',
      difficulty: 'mythic',
      requirements: {
        metric: 'total_dice_rolled',
        operator: 'greater_than_equal',
        value: 100000
      },
      rewards: {
        points: 500,
        badge: 'Deity',
        title: 'Dice God',
        specialPrivileges: ['golden_dice', 'god_mode_cosmetics']
      },
      icon: '⚡',
      rarity_color: '#dc2626',
      isActive: true,
      isHidden: false,
      prerequisites: ['dice_dragon'],
      order: 7
    },
    {
      id: 'rollception',
      name: 'Rollception',
      description: 'Roll the same number 3 times in a row',
      category: 'special',
      type: 'streak',
      difficulty: 'rare',
      requirements: {
        metric: 'same_number_streak',
        operator: 'streak',
        value: 3
      },
      rewards: {
        points: 50,
        badge: 'Triple Roll'
      },
      icon: '🔄',
      rarity_color: '#3b82f6',
      isActive: true,
      isHidden: false,
      order: 8
    },
    {
      id: 'the_clockbreaker',
      name: 'The Clockbreaker',
      description: 'Play at least one game every hour for 24 hours',
      category: 'special',
      type: 'time_based',
      difficulty: 'legendary',
      requirements: {
        metric: 'hourly_game_streak',
        operator: 'greater_than_equal',
        value: 24
      },
      rewards: {
        points: 200,
        badge: 'Clockbreaker',
        title: 'The Clockbreaker',
        specialPrivileges: ['time_master']
      },
      icon: '⏰',
      rarity_color: '#f59e0b',
      isActive: true,
      isHidden: false,
      order: 9
    },
    {
      id: 'iron_will',
      name: 'Iron Will',
      description: 'Play 10 games in a row without logging off',
      category: 'progression',
      type: 'streak',
      difficulty: 'rare',
      requirements: {
        metric: 'consecutive_games_streak',
        operator: 'streak',
        value: 10
      },
      rewards: {
        points: 75,
        badge: 'Iron Will'
      },
      icon: '🛡️',
      rarity_color: '#3b82f6',
      isActive: true,
      isHidden: false,
      order: 10
    },
    {
      id: 'marathoner',
      name: 'Marathoner',
      description: 'Play 25 games in a single day',
      category: 'progression',
      type: 'time_based',
      difficulty: 'epic',
      requirements: {
        metric: 'daily_games_played',
        operator: 'greater_than_equal',
        value: 25
      },
      rewards: {
        points: 100,
        badge: 'Marathoner',
        title: 'Marathoner'
      },
      icon: '🏃',
      rarity_color: '#8b5cf6',
      isActive: true,
      isHidden: false,
      order: 11
    },
    {
      id: 'the_challenger',
      name: 'The Challenger',
      description: 'Invite your first friend',
      category: 'social',
      type: 'milestone',
      difficulty: 'common',
      requirements: {
        metric: 'friends_added',
        operator: 'greater_than_equal',
        value: 1
      },
      rewards: {
        points: 25,
        badge: 'Challenger'
      },
      icon: '🤝',
      rarity_color: '#6b7280',
      isActive: true,
      isHidden: false,
      order: 12
    },
    {
      id: 'circle_of_fate',
      name: 'Circle of Fate',
      description: 'Play 10 games with friends',
      category: 'social',
      type: 'counter',
      difficulty: 'common',
      requirements: {
        metric: 'games_with_friends',
        operator: 'greater_than_equal',
        value: 10
      },
      rewards: {
        points: 50,
        badge: 'Circle Member'
      },
      icon: '⭕',
      rarity_color: '#6b7280',
      isActive: true,
      isHidden: false,
      prerequisites: ['the_challenger'],
      order: 13
    },
    {
      id: 'guildmaster',
      name: 'Guildmaster',
      description: 'Play 100 games with friends',
      category: 'social',
      type: 'counter',
      difficulty: 'epic',
      requirements: {
        metric: 'games_with_friends',
        operator: 'greater_than_equal',
        value: 100
      },
      rewards: {
        points: 150,
        badge: 'Guildmaster',
        title: 'Guildmaster',
        specialPrivileges: ['guild_leader']
      },
      icon: '🏛️',
      rarity_color: '#8b5cf6',
      isActive: true,
      isHidden: false,
      prerequisites: ['circle_of_fate'],
      order: 14
    },
    {
      id: 'duelist',
      name: 'Duelist',
      description: 'Beat a friend for the first time',
      category: 'social',
      type: 'milestone',
      difficulty: 'common',
      requirements: {
        metric: 'friend_wins',
        operator: 'greater_than_equal',
        value: 1
      },
      rewards: {
        points: 30,
        badge: 'Duelist'
      },
      icon: '⚔️',
      rarity_color: '#6b7280',
      isActive: true,
      isHidden: false,
      prerequisites: ['the_challenger'],
      order: 15
    },
    {
      id: 'nemesis',
      name: 'Nemesis',
      description: 'Beat the same friend 10 times',
      category: 'social',
      type: 'counter',
      difficulty: 'rare',
      requirements: {
        metric: 'max_wins_against_single_friend',
        operator: 'greater_than_equal',
        value: 10
      },
      rewards: {
        points: 75,
        badge: 'Nemesis',
        title: 'Nemesis'
      },
      icon: '😈',
      rarity_color: '#3b82f6',
      isActive: true,
      isHidden: false,
      prerequisites: ['duelist'],
      order: 16
    },
    {
      id: 'unlucky_pal',
      name: 'Unlucky Pal',
      description: 'Lose 10 times in a row to the same friend',
      category: 'social',
      type: 'streak',
      difficulty: 'rare',
      requirements: {
        metric: 'max_losses_to_single_friend_streak',
        operator: 'streak',
        value: 10
      },
      rewards: {
        points: 50,
        badge: 'Unlucky Pal'
      },
      icon: '😅',
      rarity_color: '#3b82f6',
      isActive: true,
      isHidden: false,
      prerequisites: ['duelist'],
      order: 17
    }
  ];
  
  console.log('📋 New Achievements to Add:');
  newAchievements.forEach(achievement => {
    console.log(`   ${achievement.icon} ${achievement.name} - ${achievement.description}`);
  });
  
  console.log('');
  console.log('🔧 To complete the setup:');
  console.log('1. Add these achievements to the database manually or via admin panel');
  console.log('2. The tracking system is already implemented and ready');
  console.log('3. All metrics are being tracked automatically during gameplay');
  
  return newAchievements;
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeClientAchievements };
}
