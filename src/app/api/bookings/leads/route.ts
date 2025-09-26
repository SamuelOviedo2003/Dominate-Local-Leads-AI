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

    // Fetch leads with clients and call windows data - only show stage 3 leads (bookings) from all time periods
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select(`
        *,
        clients!inner(
          full_address,
          house_value,
          house_url,
          distance_meters,
          duration_seconds
        ),
        call_windows!left (
          call_window,
          window_start_at,
          window_end_at,
          called_at,
          status
        )
      `)
      .eq('business_id', businessId)
      .eq('stage', 3)
      .order('created_at', { ascending: false })

    if (leadsError) {
      console.error('Database error:', leadsError)
      return Response.json(
        { error: 'Failed to fetch bookings leads data' },
        { status: 500 }
      )
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
      const { clients, call_windows, ...lead } = leadData

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
          calledOut: null
        }))
        .sort((a: CallWindow, b: CallWindow) => a.callNumber - b.callNumber)

      return {
        ...lead,
        // next_step comes directly from leads table, no need to override
        created_at: formatDateTimeWithTime(lead.created_at),
        client: Array.isArray(clients) ? clients[0] : clients,
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