import { NextRequest, NextResponse } from 'next/server'
import { createCookieClient } from '@/lib/supabase/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth-helpers-simple'
import { IncomingCall } from '@/types/leads'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check authentication using cookie-based auth
    const user = await getAuthenticatedUserFromRequest()
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

    // Validate business access permissions using user's accessible businesses
    const hasAccess = user.accessibleBusinesses?.some(
      business => business.business_id === businessIdParam
    )
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied - You do not have permission to access this business' },
        { status: 403 }
      )
    }

    const supabase = createCookieClient()

    // Fetch recent calls data (last 20 calls within the time period)
    const { data: recentCalls, error } = await supabase
      .from('incoming_calls')
      .select('incoming_call_id, source, caller_type, duration, assigned_id, assigned, created_at, business_id, recording_url, call_summary')
      .gte('created_at', startDate)
      .eq('business_id', requestedBusinessId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch recent calls data' },
        { status: 500 }
      )
    }

    // Ensure the data matches the IncomingCall interface
    const formattedCalls: IncomingCall[] = recentCalls.map(call => ({
      incoming_call_id: call.incoming_call_id,
      source: call.source,
      caller_type: call.caller_type,
      duration: call.duration || 0,
      assigned_id: call.assigned_id || null,
      assigned_name: call.assigned || null,
      created_at: call.created_at,
      business_id: call.business_id,
      recording_url: call.recording_url || null,
      call_summary: call.call_summary || null
    }))

    return NextResponse.json({
      data: formattedCalls,
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