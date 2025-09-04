import { NextResponse } from 'next/server'
import { getAuthenticatedUserForAPI, getUserAccessibleBusinesses } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

/**
 * Get businesses accessible to the current user
 * Uses RLS policies to determine accessible businesses based on user role and profile_businesses table
 */
export async function GET() {
  try {
    // Verify user authentication
    const user = await getAuthenticatedUserForAPI()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get accessible businesses using RLS policies
    const businesses = await getUserAccessibleBusinesses()

    if (businesses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No businesses associated with your account' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: businesses
    })

  } catch (error) {
    console.error('Error fetching accessible businesses:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}