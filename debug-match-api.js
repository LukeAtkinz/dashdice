/**
 * Debug script to test match API endpoints
 */

const GO_BACKEND_URL = 'https://dashdice-production.up.railway.app';

async function testMatchAPI() {
  console.log('🔍 Testing Match API endpoints...');
  
  try {
    // Test 1: List matches
    console.log('\n1. Testing list matches...');
    const listResponse = await fetch(`${GO_BACKEND_URL}/api/v1/matches?status=waiting&limit=10`);
    console.log(`List matches status: ${listResponse.status}`);
    
    if (listResponse.ok) {
      const data = await listResponse.json();
      console.log('List matches response:', JSON.stringify(data, null, 2));
    } else {
      const text = await listResponse.text();
      console.log('List matches error:', text.substring(0, 500));
    }
    
    // Test 2: Create a match
    console.log('\n2. Testing create match...');
    const createResponse = await fetch(`${GO_BACKEND_URL}/api/v1/matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        game_mode: 'quickfire',
        max_players: 2,
        host_player_id: 'test-player-123',
        host_player_name: 'TestPlayer'
      })
    });
    
    console.log(`Create match status: ${createResponse.status}`);
    
    let createdMatchId = null;
    if (createResponse.ok) {
      const data = await createResponse.json();
      console.log('Create match response:', JSON.stringify(data, null, 2));
      createdMatchId = data.matchId || data.match_id || data.id;
      console.log('Extracted match ID:', createdMatchId);
    } else {
      const text = await createResponse.text();
      console.log('Create match error:', text.substring(0, 500));
    }
    
    // Test 3: Get specific match (if we created one)
    if (createdMatchId) {
      console.log(`\n3. Testing get specific match: ${createdMatchId}...`);
      const getResponse = await fetch(`${GO_BACKEND_URL}/api/v1/matches/${createdMatchId}`);
      console.log(`Get specific match status: ${getResponse.status}`);
      
      if (getResponse.ok) {
        const data = await getResponse.json();
        console.log('Get specific match response:', JSON.stringify(data, null, 2));
      } else {
        const text = await getResponse.text();
        console.log('Get specific match error:', text.substring(0, 500));
        console.log('Is HTML response?', text.includes('<!DOCTYPE html>'));
      }
    }
    
    // Test 4: Health check
    console.log('\n4. Testing health endpoint...');
    const healthResponse = await fetch(`${GO_BACKEND_URL}/health`);
    console.log(`Health status: ${healthResponse.status}`);
    
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log('Health response:', JSON.stringify(data, null, 2));
    } else {
      const text = await healthResponse.text();
      console.log('Health error:', text.substring(0, 500));
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testMatchAPI();