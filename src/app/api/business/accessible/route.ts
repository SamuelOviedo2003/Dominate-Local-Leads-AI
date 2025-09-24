import { NextRequest } from 'next/server'
import { authenticateApiRequest } from '@/lib/api-auth-optimized'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateApiRequest(request)

    return Response.json({
      success: true,
      data: user.accessibleBusinesses
    })

  } catch (error) {
    return Response.json(
      { success: false, error: 'Authentication failed' },
      { status: 401 }
    )
  }
}