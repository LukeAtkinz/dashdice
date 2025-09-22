const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'dashdice-d1b86.firebasestorage.app'
});

const bucket = admin.storage().bucket();

async function uploadBackgrounds() {
  const backgroundsDir = path.join(__dirname, 'public', 'backgrounds');
  const files = fs.readdirSync(backgroundsDir);
  
  console.log('Starting background upload...');
  
  for (const file of files) {
    if (file === 'desktop.ini') continue; // Skip system files
    
    const filePath = path.join(backgroundsDir, file);
    const destination = `backgrounds/${file}`;
    
    try {
      console.log(`Uploading ${file}...`);
      
      await bucket.upload(filePath, {
        destination: destination,
        metadata: {
          cacheControl: 'public, max-age=31536000', // Cache for 1 year
        },
      });
      
      // Make the file publicly readable
      await bucket.file(destination).makePublic();
      
      console.log(`✅ Successfully uploaded ${file}`);
    } catch (error) {
      console.error(`❌ Error uploading ${file}:`, error);
    }
  }
  
  console.log('Background upload complete!');
  process.exit(0);
}

uploadBackgrounds().catch(console.error);
