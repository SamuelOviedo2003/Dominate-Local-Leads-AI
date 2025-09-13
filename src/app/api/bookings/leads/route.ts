import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createCookieClient } from '@/lib/supabase/server'
import { LeadWithClient } from '@/types/leads'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateRequest(request)

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const businessIdParam = searchParams.get('businessId')

    if (!startDate || !businessIdParam) {
      return Response.json(
        { error: 'Missing required parameters: startDate and businessId' },
        { status: 400 }
      )
    }

    const requestedBusinessId = parseInt(businessIdParam, 10)
    if (isNaN(requestedBusinessId)) {
      return Response.json(
        { error: 'businessId must be a valid number' },
        { status: 400 }
      )
    }

    // Validate business access permissions using user's accessible businesses
    const hasAccess = user.accessibleBusinesses?.some(
      business => business.business_id === businessIdParam
    )
    if (!hasAccess) {
      return Response.json(
        { error: 'Access denied - You do not have access to this business data' },
        { status: 403 }
      )
    }

    const supabase = createCookieClient()

    // Fetch leads with clients data - get all leads for bookings analysis
    // (Bookings metrics work with all leads regardless of stage)
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
        )
      `)
      .gte('created_at', startDate)
      .eq('business_id', requestedBusinessId)
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

    // Transform the data to match our expected structure
    const leads: LeadWithClient[] = leadsData.map(leadData => {
      const { clients, ...lead } = leadData
      return {
        ...lead,
        // next_step comes directly from leads table, no need to override
        created_at: formatDateTimeWithTime(lead.created_at),
        client: Array.isArray(clients) ? clients[0] : clients
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