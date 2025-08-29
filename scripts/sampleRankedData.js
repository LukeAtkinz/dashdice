// Simple script to create sample ranked data for testing
// Run this in browser console on localhost:3000

async function createSampleRankedData() {
  console.log('🎮 Creating sample ranked data...');
  
  // Sample players with ranked stats
  const samplePlayers = [
    {
      displayName: 'ProGamer123',
      rankedStats: {
        currentSeason: {
          dashNumber: 1,
          level: 8,
          winsInLevel: 3,
          totalWins: 47,
          totalLosses: 12,
          winStreak: 7,
          longestWinStreak: 12,
          gamesPlayed: 59
        },
        allTime: {
          totalDashes: 1,
          maxLevelReached: 8,
          totalRankedWins: 47,
          totalRankedLosses: 12,
          totalRankedGames: 59,
          longestWinStreak: 12,
          averageLevel: 6.2
        }
      }
    },
    {
      displayName: 'DiceQueen',
      rankedStats: {
        currentSeason: {
          dashNumber: 1,
          level: 7,
          winsInLevel: 1,
          totalWins: 38,
          totalLosses: 15,
          winStreak: 4,
          longestWinStreak: 8,
          gamesPlayed: 53
        },
        allTime: {
          totalDashes: 1,
          maxLevelReached: 7,
          totalRankedWins: 38,
          totalRankedLosses: 15,
          totalRankedGames: 53,
          longestWinStreak: 8,
          averageLevel: 5.8
        }
      }
    },
    {
      displayName: 'RankMaster',
      rankedStats: {
        currentSeason: {
          dashNumber: 1,
          level: 6,
          winsInLevel: 4,
          totalWins: 32,
          totalLosses: 18,
          winStreak: 2,
          longestWinStreak: 6,
          gamesPlayed: 50
        },
        allTime: {
          totalDashes: 1,
          maxLevelReached: 6,
          totalRankedWins: 32,
          totalRankedLosses: 18,
          totalRankedGames: 50,
          longestWinStreak: 6,
          averageLevel: 4.5
        }
      }
    },
    {
      displayName: 'CompPlayer',
      rankedStats: {
        currentSeason: {
          dashNumber: 1,
          level: 5,
          winsInLevel: 2,
          totalWins: 25,
          totalLosses: 20,
          winStreak: 1,
          longestWinStreak: 4,
          gamesPlayed: 45
        },
        allTime: {
          totalDashes: 1,
          maxLevelReached: 5,
          totalRankedWins: 25,
          totalRankedLosses: 20,
          totalRankedGames: 45,
          longestWinStreak: 4,
          averageLevel: 3.8
        }
      }
    },
    {
      displayName: 'NewbieRanked',
      rankedStats: {
        currentSeason: {
          dashNumber: 1,
          level: 3,
          winsInLevel: 1,
          totalWins: 12,
          totalLosses: 15,
          winStreak: 0,
          longestWinStreak: 3,
          gamesPlayed: 27
        },
        allTime: {
          totalDashes: 1,
          maxLevelReached: 3,
          totalRankedWins: 12,
          totalRankedLosses: 15,
          totalRankedGames: 27,
          longestWinStreak: 3,
          averageLevel: 2.1
        }
      }
    }
  ];

  console.log('📊 Sample leaderboard data ready');
  console.log('Players:', samplePlayers);
  
  return samplePlayers;
}

// Instructions
console.log('🚀 To create sample ranked data, run: createSampleRankedData()');
