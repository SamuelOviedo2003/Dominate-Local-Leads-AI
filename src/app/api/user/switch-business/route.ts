import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest, validateBusinessAccessWithToken, updateUserBusinessContextWithToken } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { businessId } = await request.json()

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'Business ID required' },
        { status: 400 }
      )
    }

    // Get JWT token from Authorization header for consistent auth
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    // Validate business access permissions with token
    const hasAccess = await validateBusinessAccessWithToken(user.id, businessId, token)
    
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this business' },
        { status: 403 }
      )
    }

    // Atomic update to profiles.business_id with token
    const success = await updateUserBusinessContextWithToken(user.id, businessId, token)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to switch business' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { businessId }
    })
  } catch (error) {
    console.error('Business switch API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}