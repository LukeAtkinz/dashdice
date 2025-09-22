// Quick Firebase connection test
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

// Firebase config from environment or config file
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBxLAYfPqOPGcnvY5Q9Z2wOFE7Rq3XSuWE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dashdice-d1b86.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dashdice-d1b86",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dashdice-d1b86.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "816081934821",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:816081934821:web:8e4a6c6f0b8c1e2f4d5a6b"
};

try {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  console.log('✅ Firebase connection successful');
  console.log('Project ID:', firebaseConfig.projectId);
  console.log('Auth Domain:', firebaseConfig.authDomain);
} catch (error) {
  console.error('❌ Firebase connection failed:', error.message);
}
