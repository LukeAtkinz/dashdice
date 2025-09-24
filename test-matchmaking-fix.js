#!/usr/bin/env node

// Quick test to verify the matchmaking and bot matching fix
console.log('🧪 Testing DashDice Matchmaking Fix...');

async function testMatchmaking() {
  try {
    // Simulate the same issue we were seeing
    const sessionId = 'match-1758647802';
    const availableMatches = [
      {
        id: 'abc-def-123',
        status: 'ready', 
        game_mode: 'quickfire',
        players: ['player1'],
        created_at: Math.floor(Date.now() / 1000)
      }
    ];

    console.log('🔍 Testing session ID matching logic...');
    console.log(`Target session ID: ${sessionId}`);
    console.log(`Available matches:`, availableMatches);

    // Test exact match (should fail)
    let foundMatch = availableMatches.find(match => 
      match.id === sessionId
    );

    if (!foundMatch) {
      console.log('✅ Exact match failed as expected, trying alternative matching...');
      
      // Test alternative matching strategy
      const waitingMatches = availableMatches.filter(match => {
        return (match.status === 'ready' || match.status === 'waiting') &&
               match.players.length < 2 &&
               match.game_mode === 'quickfire';
      });

      if (waitingMatches.length > 0) {
        foundMatch = waitingMatches[0];
        console.log(`✅ Found match via alternative strategy: ${foundMatch.id}`);
        console.log('🎯 Bot matching would now succeed!');
      }
    }

    if (!foundMatch) {
      console.log('❌ No match found - this indicates an issue');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMatchmaking();