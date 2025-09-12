import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth-utils'
import { withAuthenticatedApiDebug } from '@/lib/api-debug-middleware'

export const GET = withAuthenticatedApiDebug(
  async (request: NextRequest, context, user) => {
    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        currentBusinessId: user.businessId,
        accessibleBusinesses: user.accessibleBusinesses,
        role: user.role
      }
    })
  },
  getAuthenticatedUserFromRequest
)