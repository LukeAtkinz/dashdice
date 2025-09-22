// Test script to debug bot data structure
console.log('🧪 Testing Bot Data Structure...');

// Sample bot data based on the JSON files
const sampleBotData = {
  "uid": "bot_1758028255316_bz9duqijt",
  "displayName": "Hayden Wilson",
  "email": "hayden.wilson@dashdice.bot",
  "createdAt": "2025-09-16T13:10:55.316Z",
  "updatedAt": "2025-09-16T13:10:55.318Z",
  "isBot": true,
  "isActive": true,
  "stats": {
    "gamesPlayed": 94,
    "matchWins": 28,
    "currentStreak": 2,
    "bestStreak": 6,
    "totalScore": 94859,
    "averageScore": 1009,
    "elo": 1587
  },
  "inventory": {
    "displayBackgroundEquipped": null,
    "matchBackgroundEquipped": null,
    "items": []
  },
  "personality": {
    "aggressiveness": 0.71,
    "bankingTendency": 0.72,
    "riskTolerance": 0.17,
    "pressureResistance": 0.6,
    "skillLevel": "beginner",
    "archetypeCategory": "aggressive"
  }
};

// Test the bot data structure
console.log('🤖 Sample bot structure:');
console.log('- displayName:', sampleBotData.displayName);
console.log('- stats.elo:', sampleBotData.stats?.elo);
console.log('- stats.bestStreak:', sampleBotData.stats?.bestStreak);
console.log('- personality.skillLevel:', sampleBotData.personality?.skillLevel);
console.log('- inventory.displayBackgroundEquipped:', sampleBotData.inventory?.displayBackgroundEquipped);

// Test SessionPlayerData creation
const botPlayerData = {
  playerId: sampleBotData.uid,
  playerDisplayName: sampleBotData.displayName,
  playerStats: {
    bestStreak: sampleBotData.stats?.bestStreak || 0,
    currentStreak: sampleBotData.stats?.currentStreak || 0,
    gamesPlayed: sampleBotData.stats?.gamesPlayed || 0,
    matchWins: sampleBotData.stats?.matchWins || 0
  },
  displayBackgroundEquipped: sampleBotData.inventory?.displayBackgroundEquipped || null,
  matchBackgroundEquipped: sampleBotData.inventory?.matchBackgroundEquipped || null,
  ready: true,
  joinedAt: new Date(),
  isConnected: true
};

console.log('✅ SessionPlayerData structure:');
console.log(JSON.stringify(botPlayerData, null, 2));

console.log('🎯 Test completed - structure looks good!');

module.exports = { sampleBotData, botPlayerData };