import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserFromRequest, validateBusinessAccessWithToken } from '@/lib/auth-utils'
import { LeadWithClient } from '@/types/leads'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUserFromRequest(request)
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

    // Get JWT token from Authorization header for consistent auth
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    // Validate business access permissions with token
    if (businessIdParam) {
      const hasAccess = await validateBusinessAccessWithToken(user.id, businessIdParam, token)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied - You do not have access to this business data' },
          { status: 403 }
        )
      }
    }

    const supabase = await createClient()

    // Fetch leads with clients data - filter for stage = 1 OR stage = 2 (Recent Leads)
    // RLS policies will automatically filter results based on user's accessible businesses
    let query = supabase
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
      .in('stage', [1, 2])
      .order('created_at', { ascending: false })
    
    // If a specific business ID is requested, filter by it (in addition to RLS filtering)
    if (businessIdParam) {
      query = query.eq('business_id', requestedBusinessId)
    }
    
    const { data: leadsData, error: leadsError } = await query

    if (leadsError) {
      console.error('Database error:', leadsError)
      return NextResponse.json(
        { error: 'Failed to fetch leads data' },
        { status: 500 }
      )
    }

    // Get account IDs for fetching communications counts and call windows
    const accountIds = leadsData.map(lead => lead.account_id)

    // Fetch dynamic communications count for each lead
    let communicationsCounts: Record<string, number> = {}
    if (accountIds.length > 0) {
      const { data: communicationsData, error: communicationsCountError } = await supabase
        .from('communications')
        .select('account_id')
        .in('account_id', accountIds)

      if (!communicationsCountError && communicationsData) {
        // Count communications per account_id
        communicationsCounts = communicationsData.reduce((acc, comm) => {
          acc[comm.account_id] = (acc[comm.account_id] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      } else if (communicationsCountError) {
        console.warn('Communications count fetch warning:', communicationsCountError)
      }
    }

    // Fetch call windows for each lead
    let callWindowsData: any[] = []
    if (accountIds.length > 0) {
      
      // Build call windows query with RLS filtering
      let callWindowsQuery = supabase
        .from('call_windows')
        .select('account_id, window_start_at, window_end_at, called_at, called_out, business_id')
        .in('account_id', accountIds)
        .order('window_start_at', { ascending: true })
      
      // If a specific business ID is requested, filter by it (in addition to RLS filtering)
      if (businessIdParam) {
        callWindowsQuery = callWindowsQuery.eq('business_id', requestedBusinessId)
      }
      
      const { data: fetchedCallWindows, error: callWindowsError } = await callWindowsQuery


      if (callWindowsError) {
        // Log RLS policy errors for debugging
        if (callWindowsError.code === '42501' || callWindowsError.message?.includes('policy')) {
          console.error('RLS Policy Error: User cannot access call_windows table. Check RLS policies.')
        }
        
        // Continue without call windows data rather than failing
      } else {
        callWindowsData = fetchedCallWindows || []
      }
    }

    // No need to create next_step map since it comes directly from leads table

    // Create a map of account_id to call windows
    const callWindowsMap = new Map<string, any[]>()
    callWindowsData.forEach(window => {
      if (!callWindowsMap.has(window.account_id)) {
        callWindowsMap.set(window.account_id, [])
      }
      callWindowsMap.get(window.account_id)?.push({
        window_start_at: window.window_start_at,
        window_end_at: window.window_end_at,
        called_at: window.called_at,
        called_out: window.called_out
      })
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
        // Use cached communications_count if available, otherwise use dynamically fetched count
        communications_count: lead.communications_count !== undefined 
          ? lead.communications_count 
          : (communicationsCounts[lead.account_id] || 0),
        // next_step comes directly from leads table, no need to override
        created_at: formatDateTimeWithTime(lead.created_at),
        client: Array.isArray(clients) ? clients[0] : clients,
        // Include call windows for this lead's account
        callWindows: callWindowsMap.get(lead.account_id) || []
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