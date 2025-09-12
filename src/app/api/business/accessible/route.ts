import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest, getAvailableBusinessesWithToken } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

/**
 * Get businesses accessible to the current user
 * Enhanced to handle super admins and use JWT token authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user authentication with JWT token support
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get JWT token from Authorization header for consistent auth
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    // Get accessible businesses with full details, handling super admins properly
    const businesses = await getAvailableBusinessesWithToken(user.id, token)

    if (businesses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No businesses associated with your account' },
        { status: 403 }
      )
    }

    // Convert to BusinessSwitcherData format
    const formattedBusinesses = businesses.map(b => ({
      business_id: b.id,
      company_name: b.name,
      permalink: b.permalink,
      avatar_url: b.avatar_url || null,
      city: b.city || null,
      state: b.state || null
    }))

    return NextResponse.json({
      success: true,
      data: formattedBusinesses
    })

  } catch (error) {
    console.error('Error fetching accessible businesses:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}