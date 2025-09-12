import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        currentBusinessId: user.businessId,
        accessibleBusinesses: user.accessibleBusinesses,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Business context error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get business context' },
      { status: 500 }
    )
  }
}