import { NextRequest } from 'next/server'
import { authenticateApiRequest } from '@/lib/api-auth-optimized'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leads/waiting-to-call-count
 *
 * Fetches the count of leads in "waiting to call" status
 * - Filters by stage=1 and call_now_status=1
 * - Filters by accessible businesses based on user permissions
 * - Returns count of leads matching criteria
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

    // Query leads table for waiting to call leads
    // stage = 1 AND call_now_status = 1
    const { count, error: countError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .in('business_id', accessibleBusinessIds)
      .eq('stage', 1)
      .eq('call_now_status', 1)

    if (countError) {
      console.error('Database error fetching waiting to call count:', countError)
      return Response.json(
        { error: 'Failed to fetch waiting to call count' },
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
