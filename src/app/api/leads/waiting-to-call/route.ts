import { NextRequest } from 'next/server'
import { authenticateApiRequest } from '@/lib/api-auth-optimized'
import { logger } from '@/lib/logging'
import { CallWindow } from '@/types/leads'

export const dynamic = 'force-dynamic'

interface BusinessClient {
  company_name: string
  business_id: number
  permalink: string
}

/**
 * GET /api/leads/waiting-to-call
 *
 * Fetches all "Speed to Lead" leads (stage=1) for businesses the user has access to.
 * - Super admins (role = 0): See all Speed to Lead leads from all businesses
 * - Regular users: See Speed to Lead leads only for businesses they have access to via profile_businesses
 *
 * This endpoint does NOT filter by a single business_id - it returns all leads across accessible businesses.
 * Stage 1 = Speed to Lead (highest priority, cross-business view)
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
        data: [],
        success: true
      })
    }

    // Fetch leads with stage=1 (Speed to Lead - highest priority)
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select(`
        *,
        call_windows (
          call_window,
          window_start_at,
          window_end_at,
          called_at,
          status,
          working_hours
        )
      `)
      .in('business_id', accessibleBusinessIds)
      .eq('stage', 1)  // Speed to Lead
      .order('created_at', { ascending: false })
      .limit(100)

    if (leadsError) {
      console.error('Database error fetching speed to lead leads:', leadsError)
      return Response.json(
        { error: 'Failed to fetch speed to lead leads' },
        { status: 500 }
      )
    }

    // Fetch business info for the leads
    const businessIds = [...new Set(leads?.map((lead: any) => lead.business_id) || [])]
    const { data: businesses } = await supabase
      .from('business_clients')
      .select('business_id, company_name, permalink')
      .in('business_id', businessIds)

    // Create a map of business_id -> business info
    const businessMap: Record<number, BusinessClient> = {}
    businesses?.forEach((business: BusinessClient) => {
      businessMap[business.business_id] = business
    })

    // Manually fetch clients data for leads that have account_id
    const leadAccountIds = leads
      ?.filter((lead: any) => lead.account_id)
      .map((lead: any) => lead.account_id) || []

    let clientsMap: Record<string, any> = {}

    if (leadAccountIds.length > 0) {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('account_id, business_id, full_address, house_value, house_url, distance_meters, duration_seconds')
        .in('account_id', leadAccountIds)

      // Create a map of account_id -> client data
      clientsData?.forEach((client: any) => {
        if (client.account_id) {
          clientsMap[client.account_id] = client
        }
      })
    }

    // Helper function to format datetime
    const formatDateTimeWithTime = (dateString: string): string => {
      const date = new Date(dateString)
      return date.toISOString()
    }

    // Transform the data to match the expected structure with business name
    const transformedLeads = leads?.map((leadData: any) => {
      const { call_windows, ...lead } = leadData
      const businessInfo = businessMap[lead.business_id]

      // Get client data from the map if lead has account_id
      const clientData = lead.account_id ? clientsMap[lead.account_id] : null

      // Process call windows - filter for non-null status and transform to CallWindow interface
      const processedCallWindows: CallWindow[] = (call_windows || [])
        .filter((cw: any) => cw.status !== null && cw.status !== undefined)
        .map((cw: any) => ({
          callNumber: cw.call_window,
          active: true,
          window_start_at: cw.window_start_at,
          window_end_at: cw.window_end_at,
          status: cw.status,
          calledAt: cw.called_at,
          calledOut: null,
          working_hours: cw.working_hours
        }))
        .sort((a: CallWindow, b: CallWindow) => a.callNumber - b.callNumber)

      return {
        ...lead,
        created_at: formatDateTimeWithTime(lead.created_at),
        client: clientData || null,
        callWindows: processedCallWindows,
        // Add business name and permalink for cross-business display
        business_name: businessInfo?.company_name || 'Unknown Business',
        business_permalink: businessInfo?.permalink || 'unknown'
      }
    }) || []

    return Response.json({
      data: transformedLeads,
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
