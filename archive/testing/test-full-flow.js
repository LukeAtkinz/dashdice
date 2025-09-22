/**
 * Test Go Backend Matchmaking Flow End-to-End
 * This simulates the complete user experience
 */

const API_BASE = 'https://dashdice-production.up.railway.app/api/v1';

async function makeRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://dashdice.gg'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function simulateUserFlow() {
  console.log('🎮 Simulating Complete User Matchmaking Flow');
  console.log('============================================');
  
  // Clear any existing matches first
  console.log('\n🧹 Clearing existing matches...');
  const existingMatches = await makeRequest('/matches');
  console.log('Current matches:', existingMatches.data?.matches?.length || 0);
  
  // Simulate User A joining
  console.log('\n👤 User A: Creating/joining match...');
  const userAMatch = await makeRequest('/matches/', 'POST', {
    game_mode: 'quickfire',
    max_players: 2,
    settings: {
      hostId: 'user_a_test',
      gameType: 'quick'
    }
  });
  
  if (!userAMatch.success) {
    console.log('❌ User A failed:', userAMatch);
    return;
  }
  
  console.log('✅ User A result:', {
    matchId: userAMatch.data.matchId,
    status: userAMatch.data.status,
    players: userAMatch.data.players
  });
  
  // Wait a moment (simulating user in waiting room)
  console.log('\n⏳ User A waiting in room...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate User B joining
  console.log('\n👤 User B: Creating/joining match...');
  const userBMatch = await makeRequest('/matches/', 'POST', {
    game_mode: 'quickfire',
    max_players: 2,
    settings: {
      hostId: 'user_b_test',
      gameType: 'quick'
    }
  });
  
  if (!userBMatch.success) {
    console.log('❌ User B failed:', userBMatch);
    return;
  }
  
  console.log('✅ User B result:', {
    matchId: userBMatch.data.matchId,
    status: userBMatch.data.status,
    players: userBMatch.data.players
  });
  
  // Check if they joined the same match
  if (userAMatch.data.matchId === userBMatch.data.matchId) {
    console.log('\n🎉 SUCCESS: Both users joined the same match!');
    console.log('👥 Players:', userBMatch.data.players);
    console.log('🏆 Status:', userBMatch.data.status);
    console.log('💬 Message:', userBMatch.data.message);
    
    if (userBMatch.data.status === 'ready') {
      console.log('✨ Match is ready to start - frontend polling should detect this!');
    }
  } else {
    console.log('\n❌ ISSUE: Users got different matches');
    console.log('User A match:', userAMatch.data.matchId);
    console.log('User B match:', userBMatch.data.matchId);
  }
  
  // Simulate frontend polling (what the GameWaitingRoom component does)
  console.log('\n🔄 Simulating frontend polling...');
  const readyMatches = await makeRequest('/matches?status=ready&limit=10');
  
  if (readyMatches.success && readyMatches.data?.matches) {
    const ourMatch = readyMatches.data.matches.find(match => 
      match.matchId === userAMatch.data.matchId
    );
    
    if (ourMatch && ourMatch.status === 'ready' && ourMatch.players?.length >= 2) {
      console.log('✅ Frontend polling would detect ready match:', {
        matchId: ourMatch.matchId,
        status: ourMatch.status,
        players: ourMatch.players
      });
      console.log('🚀 Frontend would now transition users to the game!');
    } else {
      console.log('⚠️ Frontend polling would not find ready match');
    }
  }
  
  console.log('\n🏁 Test completed!');
}

// Run the test
simulateUserFlow().catch(console.error);
