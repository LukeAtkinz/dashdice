import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin only once













if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };
  
  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const auth = getAuth();

interface AuthRequest {
  token: string;
}

interface AuthResponse {
  valid: boolean;
  user?: {
    uid: string;
    email?: string;
    displayName?: string;
    verified: boolean;
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AuthRequest = await request.json();
    
    if (!body.token) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Missing authentication token',
          code: 'TOKEN_MISSING'
        },
        { status: 400 }
      );
    }
    
    // Verify Firebase ID token
    const decodedToken = await auth.verifyIdToken(body.token);
    
    // Get additional user information
    const userRecord = await auth.getUser(decodedToken.uid);
    
    const authResponse: AuthResponse = {
      valid: true,
      user: {
        uid: decodedToken.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        verified: userRecord.emailVerified || false
      }
    };
    
    return NextResponse.json({
      ...authResponse,
      timestamp: new Date().toISOString(),
      deployment: 'vercel'
    });
    
  } catch (error) {
    console.error('Firebase auth verification error:', error);
    
    let errorMessage = 'Invalid authentication token';
    let statusCode = 401;
    
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        errorMessage = 'Authentication token has expired';
        statusCode = 401;
      } else if (error.message.includes('invalid')) {
        errorMessage = 'Invalid authentication token format';
        statusCode = 400;
      }
    }
    
    return NextResponse.json(
      {
        valid: false,
        error: errorMessage,
        code: 'INVALID_TOKEN'
      },
      { status: statusCode }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Missing or invalid authorization header',
          code: 'AUTH_HEADER_INVALID'
        },
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify Firebase ID token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get additional user information
    const userRecord = await auth.getUser(decodedToken.uid);
    
    return NextResponse.json({
      valid: true,
      user: {
        uid: decodedToken.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        verified: userRecord.emailVerified || false
      },
      timestamp: new Date().toISOString(),
      deployment: 'vercel'
    });
    
  } catch (error) {
    console.error('Firebase auth verification error:', error);
    
    return NextResponse.json(
      {
        valid: false,
        error: 'Authentication verification failed',
        code: 'VERIFICATION_FAILED'
      },
      { status: 401 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
