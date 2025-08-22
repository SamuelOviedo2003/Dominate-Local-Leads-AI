import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserForAPI } from '@/lib/auth-helpers'
import { LeadWithClient } from '@/types/leads'

export const dynamic = 'force-dynamic'

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

    // Fetch leads with clients data - filter for stage = 1 (Recent Leads)
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
      .eq('stage', 1)
      .order('created_at', { ascending: false })

    if (leadsError) {
      console.error('Database error:', leadsError)
      return NextResponse.json(
        { error: 'Failed to fetch leads data' },
        { status: 500 }
      )
    }

    // Get account IDs for fetching call windows
    const accountIds = leadsData.map(lead => lead.account_id)

    // Fetch call windows for each lead
    let callWindowsData: any[] = []
    if (accountIds.length > 0) {
      
      const { data: fetchedCallWindows, error: callWindowsError } = await supabase
        .from('call_windows')
        .select('account_id, window_start_at, window_end_at, called_at, called_out, business_id')
        .in('account_id', accountIds)
        .eq('business_id', requestedBusinessId)
        .order('window_start_at', { ascending: true })


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