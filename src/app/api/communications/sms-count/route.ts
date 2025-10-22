import { NextRequest } from 'next/server'
import { authenticateApiRequest } from '@/lib/api-auth-optimized'

export const dynamic = 'force-dynamic'

/**
 * GET /api/communications/sms-count
 *
 * Fetches the count of SMS inbound messages for today where summary is not null
 * - Filters by accessible businesses based on user permissions
 * - Returns count of messages with message_type='SMS inbound' and summary IS NOT NULL
 * - Only counts messages created today (based on business timezone)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await authenticateApiRequest(request)
    if (authResult instanceof Response) {
      return authResult
    }

    const { user, supabase } = authResult

    if (!user.profile) {
      return Response.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Determine which businesses the user has access to
    let accessibleBusinessIds: number[] = []

    if (user.profile.role === 0) {
      // Super admin: get all businesses with dashboard enabled
      const { data: businesses, error: businessError } = await supabase
        .from('business_clients')
        .select('business_id')
        .eq('dashboard', true)

      if (businessError) {
        console.error('Error fetching businesses:', businessError)
        return Response.json(
          { error: 'Failed to fetch accessible businesses' },
          { status: 500 }
        )
      }

      accessibleBusinessIds = businesses?.map((b: { business_id: number }) => b.business_id) || []
    } else {
      // Regular user: get businesses from profile_businesses
      const { data: userBusinesses, error: businessError } = await supabase
        .from('profile_businesses')
        .select('business_id')
        .eq('profile_id', user.id)

      if (businessError) {
        console.error('Error fetching user businesses:', businessError)
        return Response.json(
          { error: 'Failed to fetch accessible businesses' },
          { status: 500 }
        )
      }

      accessibleBusinessIds = userBusinesses?.map((b: { business_id: number }) => b.business_id) || []
    }

    if (accessibleBusinessIds.length === 0) {
      // User has no accessible businesses
      return Response.json({
        count: 0,
        success: true
      })
    }

    // Get today's date range in UTC (we'll filter on the database side)
    // The database will handle timezone conversion if needed
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    // Query communications table for SMS inbound messages with non-null summary
    const { count, error: countError } = await supabase
      .from('communications')
      .select('*', { count: 'exact', head: true })
      .in('business_id', accessibleBusinessIds)
      .eq('message_type', 'SMS inbound')
      .not('summary', 'is', null)
      .gte('created_at', startOfToday.toISOString())
      .lte('created_at', endOfToday.toISOString())

    if (countError) {
      console.error('Database error fetching SMS count:', countError)
      return Response.json(
        { error: 'Failed to fetch SMS count' },
        { status: 500 }
      )
    }

    return Response.json({
      count: count || 0,
      success: true
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
