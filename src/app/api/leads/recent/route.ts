import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserForAPI, validateBusinessAccessForAPI } from '@/lib/auth-helpers'
import { LeadWithClient } from '@/types/leads'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUserForAPI()
    if (!user || !user.profile) {
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

    // Validate business access using RLS system (for both super admins and regular users)
    if (businessIdParam) {
      const hasAccess = await validateBusinessAccessForAPI(user, businessIdParam)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied - You do not have access to this business data' },
          { status: 403 }
        )
      }
    }

    const supabase = await createClient()

    // Fetch leads with clients data - separate queries for stage 1 and stage 2
    // RLS policies will automatically filter results based on user's accessible businesses
    
    // Build base query structure
    const baseSelectQuery = `
      *,
      clients!inner(
        full_address,
        house_value,
        house_url,
        distance_meters,
        duration_seconds
      )
    `
    
    // Query for stage 1 leads
    let stage1Query = supabase
      .from('leads')
      .select(baseSelectQuery)
      .gte('created_at', startDate)
      .eq('stage', 1)
      .order('created_at', { ascending: false })
    
    if (businessIdParam) {
      stage1Query = stage1Query.eq('business_id', requestedBusinessId)
    }
    
    // Query for stage 2 leads
    let stage2Query = supabase
      .from('leads')
      .select(baseSelectQuery)
      .gte('created_at', startDate)
      .eq('stage', 2)
      .order('created_at', { ascending: false })
    
    if (businessIdParam) {
      stage2Query = stage2Query.eq('business_id', requestedBusinessId)
    }
    
    // Execute both queries in parallel
    const [stage1Result, stage2Result] = await Promise.all([
      stage1Query,
      stage2Query
    ])
    
    // Check for errors in either query
    if (stage1Result.error || stage2Result.error) {
      console.error('Database error:', stage1Result.error || stage2Result.error)
      return NextResponse.json(
        { error: 'Failed to fetch leads data' },
        { status: 500 }
      )
    }
    
    // Combine data for processing
    const stage1Data = stage1Result.data || []
    const stage2Data = stage2Result.data || []
    const leadsData = [...stage1Data, ...stage2Data]


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

    // Helper function to transform lead data
    const transformLeadData = (leadData: any): LeadWithClient => {
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
    }

    // Transform stage 1 and stage 2 leads separately
    const stage1Leads: LeadWithClient[] = stage1Data.map(transformLeadData)
    const stage2Leads: LeadWithClient[] = stage2Data.map(transformLeadData)

    return NextResponse.json({
      data: {
        stage1Leads,
        stage2Leads
      },
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