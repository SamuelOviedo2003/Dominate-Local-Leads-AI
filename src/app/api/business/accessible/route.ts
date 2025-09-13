import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateRequest(request)

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