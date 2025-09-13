import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateRequest(request)
    
    return Response.json({
      success: true,
      data: {
        currentBusinessId: user.currentBusinessId,
        accessibleBusinesses: user.accessibleBusinesses?.map(b => b.business_id) || [],
        role: user.profile?.role ?? 1
      }
    })
  } catch (error) {
    return Response.json(
      { success: false, error: 'Authentication failed' },
      { status: 401 }
    )
  }
}