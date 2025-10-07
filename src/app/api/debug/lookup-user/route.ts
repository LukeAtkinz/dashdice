import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/services/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 });
    }
    
    console.log(`🔍 Looking up user: ${userId}`);
    
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    
    return NextResponse.json({
      userId,
      username: userData?.username || 'Not set',
      displayName: userData?.displayName || 'Not set',
      email: userData?.email || 'Not set',
      createdAt: userData?.createdAt || 'Not set',
      found: true
    });
    
  } catch (error) {
    console.error('Error looking up user:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}