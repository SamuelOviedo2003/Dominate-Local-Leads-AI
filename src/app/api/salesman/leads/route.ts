import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserForAPI } from '@/lib/auth-helpers'
import { LeadWithClient } from '@/types/leads'

export const dynamic = 'force-dynamic'

/**
 * GET /api/salesman/leads
 * Fetches leads in stage 2 (Salesman Leads) with client information
 * 
 * Query Parameters:
 * - startDate: ISO string for filtering leads created after this date
 * - businessId: Business ID to filter leads
 * 
 * @param request - Next.js request object
 * @returns Promise<NextResponse> - JSON response with salesman leads data
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUserForAPI()
    if (!user || !user.profile?.business_id) {
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

    // Ensure user can only access their own business data (unless Super Admin)
    const userBusinessId = parseInt(user.profile.business_id, 10)
    if (user.profile.role !== 0 && requestedBusinessId !== userBusinessId) {
      return NextResponse.json(
        { error: 'Access denied - You can only access your own business data' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Fetch leads with clients data - filter for stage = 2 (Salesman Leads)
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
      .eq('stage', 2)
      .order('created_at', { ascending: false })

    if (leadsError) {
      console.error('Database error:', leadsError)
      return NextResponse.json(
        { error: 'Failed to fetch salesman leads data' },
        { status: 500 }
      )
    }

    // Get lead IDs for fetching most recent calls
    const leadIds = leadsData.map(lead => lead.lead_id)

    // Fetch the most recent call for each lead to get next_step
    let callsData: any[] = []
    if (leadIds.length > 0) {
      const { data: fetchedCalls, error: callsError } = await supabase
        .from('leads_calls')
        .select('lead_id, next_step, created_at')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false })

      if (callsError) {
        console.error('Error fetching calls:', callsError)
        // Continue without calls data rather than failing
      } else {
        callsData = fetchedCalls || []
      }
    }

    // Create a map of lead_id to most recent next_step
    const nextStepMap = new Map<number, string | null>()
    callsData.forEach(call => {
      if (!nextStepMap.has(call.lead_id)) {
        nextStepMap.set(call.lead_id, call.next_step)
      }
    })

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
        // Use next_step from leads_calls table, fallback to null if not available
        next_step: nextStepMap.get(lead.lead_id) || null,
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