import { NextRequest } from 'next/server'
import { authenticateAndAuthorizeApiRequest } from '@/lib/api-auth-optimized'
import { LeadWithClient, CallWindow } from '@/types/leads'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessIdParam = searchParams.get('businessId')

    if (!businessIdParam) {
      return Response.json(
        { error: 'Missing required parameter: businessId' },
        { status: 400 }
      )
    }

    // Use optimized authentication and authorization
    const authResult = await authenticateAndAuthorizeApiRequest(request, businessIdParam)
    if (authResult instanceof Response) {
      return authResult
    }

    const { user, supabase, businessId } = authResult

    // Fetch leads with call windows data - only show stage 30 leads (bookings) from all time periods
    const { data: leadsData, error: leadsError } = await supabase
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
      .eq('business_id', businessId)
      .eq('stage', 30)
      .order('created_at', { ascending: false })

    if (leadsError) {
      console.error('Database error:', leadsError)
      return Response.json(
        { error: 'Failed to fetch bookings leads data' },
        { status: 500 }
      )
    }

    // Manually fetch clients data for leads that have account_id
    const leadAccountIds = leadsData?.filter(l => l.account_id).map(l => l.account_id) || []
    let clientsMap: Record<string, any> = {}

    if (leadAccountIds.length > 0) {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('account_id, business_id, full_address, house_value, house_url, distance_meters, duration_seconds')
        .in('account_id', leadAccountIds)
        .eq('business_id', businessId)

      if (clientsError) {
        console.error('Error fetching clients:', clientsError)
      } else {
        clientsData?.forEach(client => {
          if (client.account_id) {
            clientsMap[client.account_id] = client
          }
        })
      }
    }

    // No need to fetch calls data since next_step comes directly from leads table

    // Helper function to format datetime with hours and minutes
    const formatDateTimeWithTime = (dateString: string): string => {
      const date = new Date(dateString)
      // Format as ISO string but keep the original timezone information
      return date.toISOString()
    }

    // Transform the data to match our expected structure with call windows
    const leads: LeadWithClient[] = leadsData.map(leadData => {
      const { call_windows, ...lead } = leadData

      // Process call windows - filter for non-null status and transform to CallWindow interface
      const processedCallWindows: CallWindow[] = (call_windows || [])
        .filter((cw: any) => cw.status !== null && cw.status !== undefined)
        .map((cw: any) => ({
          callNumber: cw.call_window,
          active: true, // For table display, we show all as active
          window_start_at: cw.window_start_at,
          window_end_at: cw.window_end_at,
          status: cw.status,
          calledAt: cw.called_at,
          calledOut: null,
          working_hours: cw.working_hours
        }))
        .sort((a: CallWindow, b: CallWindow) => a.callNumber - b.callNumber)

      // Get client data from the manually fetched clientsMap
      const clientData = lead.account_id ? clientsMap[lead.account_id] : null

      return {
        ...lead,
        // next_step comes directly from leads table, no need to override
        created_at: formatDateTimeWithTime(lead.created_at),
        client: clientData,
        callWindows: processedCallWindows
      }
    })

    return Response.json({
      data: leads,
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