/**
 * Call our own admin API to initialize abilities
 * This should work since our API endpoints are working
 */

const https = require('https');

async function callAdminAPI(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'dashdice-1dib-git-development-dash-dice.vercel.app',
      port: 443,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function initializeAbilities() {
  console.log('🚀 Calling admin API to initialize abilities...');
  
  try {
    const result = await callAdminAPI('/api/admin/initialize-abilities', {
      secret: 'initialize-abilities-admin-2025'
    });
    
    console.log('📡 API Response Status:', result.status);
    console.log('📄 API Response:', result.data);
    
    if (result.status === 200 && result.data.success) {
      console.log('✅ Abilities initialized successfully!');
      console.log(`📊 Added: ${result.data.data.added} abilities`);
      console.log(`🔄 Updated: ${result.data.data.updated} abilities`);
      
      // Now unlock Hero1 abilities
      console.log('\n👑 Unlocking abilities for Hero1...');
      const unlockResult = await callAdminAPI('/api/admin/unlock-abilities', {
        username: 'Hero1',
        secret: 'unlock-abilities-admin-2025'
      });
      
      console.log('📡 Unlock Response Status:', unlockResult.status);
      console.log('📄 Unlock Response:', unlockResult.data);
      
      if (unlockResult.status === 200 && unlockResult.data.success) {
        console.log('\n🎉 SUCCESS! Hero1 now has all abilities unlocked!');
        console.log(`⭐ Level: ${unlockResult.data.data.level}`);
        console.log(`🌟 Star Points: ${unlockResult.data.data.starPoints}`);
        console.log(`🎮 Total Abilities: ${unlockResult.data.data.totalAbilities}`);
      } else {
        console.log('❌ Failed to unlock Hero1 abilities');
      }
    } else {
      console.log('❌ Failed to initialize abilities');
    }
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

initializeAbilities();