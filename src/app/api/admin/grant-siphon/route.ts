import { NextRequest, NextResponse } from 'next/server';
import { AbilitiesService } from '@/services/abilitiesService';

/**
 * Grant Siphon ability to a user (for testing)
 * POST /api/admin/grant-siphon
 * Body: { userId: "user-id", secret: "admin-secret" }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, secret } = await request.json();
    
    // Simple security check
    if (secret !== 'admin-secret-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    console.log('🔮 Granting Siphon ability to user:', userId);
    
    // Grant Siphon ability
    await AbilitiesService.unlockAbility(userId, 'siphon');
    
    console.log('✅ Siphon ability granted successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Siphon ability granted successfully',
      abilityId: 'siphon',
      userId
    });
    
  } catch (error) {
    console.error('❌ Error granting Siphon ability:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Grant Siphon Ability API',
    usage: 'POST with { "userId": "your-user-id", "secret": "admin-secret-2025" }'
  });
}