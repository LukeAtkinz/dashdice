// Simple Firebase connection test
import { db } from '@/services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const testFirebaseConnection = async (userId: string) => {
  try {
    console.log('🔍 Testing Firebase match creation capability...');
    console.log('Database instance:', !!db);
    console.log('User ID:', userId);

    const testData = {
      createdAt: serverTimestamp(),
      testType: 'connection-test',
      userId: userId,
      timestamp: Date.now()
    };

    console.log('🔄 Attempting to write to matches collection...');
    const docRef = await addDoc(collection(db, 'matches'), testData);
    
    console.log('✅ SUCCESS: Firebase connection working. Document ID:', docRef.id);
    return { success: true, documentId: docRef.id };
    
  } catch (error: any) {
    console.error('❌ FAILURE: Firebase connection failed:', error);
    console.error('Error details:', {
      code: error?.code,
      message: error?.message,
      stack: error?.stack
    });
    return { success: false, error: error.message };
  }
};

export default testFirebaseConnection;