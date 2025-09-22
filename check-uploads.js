const fs = require('fs');
const path = require('path');
const https = require('https');

// List of background files to upload
const backgroundFiles = [
  'All For Glory.jpg',
  'Long Road Ahead.jpg', 
  'Relax.png',
  'New Day.mp4',
  'On A Mission.mp4',
  'Underwater.mp4'
];

console.log('Creating upload URLs for background images...');
console.log('Please upload these files manually to Firebase Storage:');
console.log('');
console.log('Go to https://console.firebase.google.com/project/dashdice-d1b86/storage');
console.log('Navigate to the "backgrounds" folder (create if it doesn\'t exist)');
console.log('Upload the following files from public/backgrounds/:');
console.log('');

backgroundFiles.forEach((file, index) => {
  console.log(`${index + 1}. ${file}`);
});

console.log('');
console.log('After uploading, the URLs should be:');
console.log('');

backgroundFiles.forEach(file => {
  const encodedFile = encodeURIComponent(file);
  const url = `https://firebasestorage.googleapis.com/v0/b/dashdice-d1b86.firebasestorage.app/o/backgrounds%2F${encodedFile}?alt=media`;
  console.log(`${file}: ${url}`);
});

console.log('');
console.log('Make sure to set the files as publicly readable in Firebase Storage rules!');
