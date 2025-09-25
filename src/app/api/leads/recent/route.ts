import { NextRequest } from 'next/server'
import { authenticateAndAuthorizeApiRequest } from '@/lib/api-auth-optimized'
import { logger } from '@/lib/logging'
import { CallWindow } from '@/types/leads'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    logger.debug('Recent leads API call started')

    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const businessIdParam = searchParams.get('businessId')

    // Use optimized authentication and authorization
    const authResult = await authenticateAndAuthorizeApiRequest(request, businessIdParam)
    if (authResult instanceof Response) {
      return authResult
    }

    const { user, supabase, businessId: requestedBusinessId } = authResult

    logger.debug('Recent leads query params', { businessId: businessIdParam, userId: user.id })

    // Fetch recent leads with call windows - all leads for the business, ordered by creation date
    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        *,
        clients!inner (
          account_id,
          business_id,
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
          called_out,
          status
        )
      `)
      .eq('business_id', requestedBusinessId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Database error:', error)
      return Response.json(
        { error: 'Failed to fetch recent leads data' },
        { status: 500 }
      )
    }

    logger.debug('Recent leads fetched successfully', {
      count: leads?.length || 0,
      businessId: businessIdParam
    })

    // Helper function to format datetime with hours and minutes
    const formatDateTimeWithTime = (dateString: string): string => {
      const date = new Date(dateString)
      return date.toISOString()
    }

    // Transform the data to match the expected LeadWithClient structure with call windows
    const transformedLeads = leads?.map(leadData => {
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
          calledOut: cw.called_out
        }))
        .sort((a: CallWindow, b: CallWindow) => a.callNumber - b.callNumber)

      return {
        ...lead,
        created_at: formatDateTimeWithTime(lead.created_at),
        client: Array.isArray(clients) ? clients[0] : clients,
        callWindows: processedCallWindows
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