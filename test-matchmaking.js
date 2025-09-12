/**
 * Test script to verify Go backend matchmaking logic
 * Simulates two users trying to find matches
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

async function testMatchmaking() {
  console.log('🧪 Testing Go Backend Matchmaking Logic');
  console.log('=====================================');
  
  // Test 1: Check initial state (should be no matches)
  console.log('\n1️⃣ Checking initial state...');
  const initialMatches = await makeRequest('/matches');
  console.log('Initial matches:', initialMatches.data?.matches?.length || 0);
  
  // Test 2: User 1 creates a match
  console.log('\n2️⃣ User 1 creates a match...');
  const user1Match = await makeRequest('/matches/', 'POST', {
    game_mode: 'quickfire',
    max_players: 2,
    settings: {
      hostId: 'user_test_1',
      gameType: 'quick'
    }
  });
  
  if (user1Match.success) {
    console.log('✅ User 1 match created:', {
      matchId: user1Match.data.matchId,
      status: user1Match.data.status,
      players: user1Match.data.players,
      message: user1Match.data.message
    });
  } else {
    console.log('❌ User 1 match failed:', user1Match);
    return;
  }
  
  // Test 3: Check matches again (should show 1 waiting match)
  console.log('\n3️⃣ Checking matches after User 1...');
  const afterUser1 = await makeRequest('/matches');
  console.log('Matches after User 1:', afterUser1.data?.matches?.length || 0);
  if (afterUser1.data?.matches?.length > 0) {
    console.log('Waiting match:', afterUser1.data.matches[0]);
  }
  
  // Test 4: User 2 creates a match (should join existing match)
  console.log('\n4️⃣ User 2 creates a match (should join existing)...');
  const user2Match = await makeRequest('/matches/', 'POST', {
    game_mode: 'quickfire',
    max_players: 2,
    settings: {
      hostId: 'user_test_2',
      gameType: 'quick'
    }
  });
  
  if (user2Match.success) {
    console.log('✅ User 2 match result:', {
      matchId: user2Match.data.matchId,
      status: user2Match.data.status,
      players: user2Match.data.players,
      message: user2Match.data.message
    });
    
    // Check if User 2 joined User 1's match
    if (user2Match.data.matchId === user1Match.data.matchId) {
      console.log('🎉 SUCCESS: User 2 joined User 1\'s match!');
      console.log('🤝 Players in match:', user2Match.data.players);
    } else {
      console.log('⚠️ ISSUE: User 2 got a different match ID');
    }
  } else {
    console.log('❌ User 2 match failed:', user2Match);
  }
  
  // Test 5: Check final state
  console.log('\n5️⃣ Checking final state...');
  const finalMatches = await makeRequest('/matches');
  console.log('Final matches count:', finalMatches.data?.matches?.length || 0);
  if (finalMatches.data?.matches) {
    finalMatches.data.matches.forEach((match, index) => {
      console.log(`Match ${index + 1}:`, {
        id: match.matchId,
        status: match.status,
        players: match.players,
        message: match.message
      });
    });
  }
  
  console.log('\n🏁 Test completed!');
}

// Run the test
testMatchmaking().catch(console.error);
