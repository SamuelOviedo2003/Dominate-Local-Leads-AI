import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndAuthorizeApiRequest } from '@/lib/api-auth-optimized'
import { IncomingCall } from '@/types/leads'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const businessIdParam = searchParams.get('businessId')

    if (!startDate || !businessIdParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: startDate and businessId' },
        { status: 400 }
      )
    }

    // Use optimized authentication and authorization
    const authResult = await authenticateAndAuthorizeApiRequest(request, businessIdParam)
    if (authResult instanceof Response) {
      return authResult
    }

    const { user, supabase, businessId } = authResult

    // Fetch recent calls data using cached business ID
    const { data: recentCalls, error } = await supabase
      .from('calls_incoming')
      .select('incoming_call_id, source, caller_type, duration, assigned_id, created_at, business_id, recording_url, recap_summary')
      .gte('created_at', startDate)
      .eq('business_id', businessId)
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
      assigned_name: null, // assigned column no longer exists in calls_incoming
      created_at: call.created_at,
      business_id: call.business_id,
      recording_url: call.recording_url || null,
      call_summary: call.recap_summary || null
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