/**
 * Test Railway Backend Connection
 */

const RAILWAY_URL = 'https://go-backend-production-448a.up.railway.app';

async function testRailwayBackend() {
  console.log('🚂 Testing Railway backend connection...');
  console.log(`🔗 Backend URL: ${RAILWAY_URL}`);
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${RAILWAY_URL}/health`);
    console.log(`🏥 Health check status: ${healthResponse.status}`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.text();
      console.log(`✅ Health response: ${healthData}`);
    } else {
      console.log(`❌ Health check failed: ${healthResponse.statusText}`);
    }
    
    // Test matches endpoint
    const matchesResponse = await fetch(`${RAILWAY_URL}/api/matches`);
    console.log(`🎮 Matches endpoint status: ${matchesResponse.status}`);
    
    if (matchesResponse.ok) {
      const matchesData = await matchesResponse.json();
      console.log(`✅ Matches response:`, matchesData);
    } else {
      console.log(`❌ Matches endpoint failed: ${matchesResponse.statusText}`);
    }
    
  } catch (error) {
    console.error('💥 Error testing Railway backend:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('🔧 This might be a CORS issue or the backend is down');
      console.log('💡 Try testing directly in browser: ' + RAILWAY_URL + '/health');
    }
  }
}

testRailwayBackend();