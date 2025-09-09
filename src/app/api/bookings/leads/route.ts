import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserForAPI, validateBusinessAccessForAPI } from '@/lib/auth-helpers'
import { LeadWithClient } from '@/types/leads'

export const dynamic = 'force-dynamic'

/**
 * GET /api/bookings/leads
 * Fetches leads for bookings analysis with client information
 * 
 * Query Parameters:
 * - startDate: ISO string for filtering leads created after this date
 * - businessId: Business ID to filter leads
 * 
 * @param request - Next.js request object
 * @returns Promise<NextResponse> - JSON response with bookings leads data
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUserForAPI()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const businessIdParam = searchParams.get('businessId')

    if (!startDate || !businessIdParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: startDate and businessId' },
        { status: 400 }
      )
    }

    // Convert businessId to number since database expects smallint
    const requestedBusinessId = parseInt(businessIdParam, 10)
    if (isNaN(requestedBusinessId)) {
      return NextResponse.json(
        { error: 'businessId must be a valid number' },
        { status: 400 }
      )
    }

    // Validate user has access to the requested business using the new profile_businesses system
    const hasAccess = await validateBusinessAccessForAPI(user, businessIdParam)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied - You do not have permission to access this business' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

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
      return NextResponse.json(
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

    return NextResponse.json({
      data: leads,
      success: true
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}