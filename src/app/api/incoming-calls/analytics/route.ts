import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndAuthorizeApiRequest } from '@/lib/api-auth-optimized'
import {
  SourceDistribution,
  CallerTypeDistribution,
  IncomingCall,
  SankeyData
} from '@/types/leads'

export const dynamic = 'force-dynamic'

interface IncomingCallsAnalyticsResponse {
  sourceDistribution: SourceDistribution[]
  callerTypeDistribution: CallerTypeDistribution[]
  recentCalls: IncomingCall[]
  sankeyData: SankeyData[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const businessIdParam = searchParams.get('businessId')

    if (!startDate) {
      return NextResponse.json(
        { error: 'Missing required parameter: startDate' },
        { status: 400 }
      )
    }

    // Use optimized authentication and authorization
    const authResult = await authenticateAndAuthorizeApiRequest(request, businessIdParam)
    if (authResult instanceof Response) {
      return authResult
    }

    const { user, supabase, businessId: requestedBusinessId } = authResult

    // Single database query to get all required data
    const { data: rawCalls, error } = await supabase
      .from('incoming_calls')
      .select(`
        incoming_call_id,
        source,
        caller_type,
        duration,
        assigned_id,
        assigned,
        created_at,
        business_id,
        recording_url,
        call_summary
      `)
      .gte('created_at', startDate)
      .eq('business_id', requestedBusinessId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch incoming calls data' },
        { status: 500 }
      )
    }

    // Process data for different analytics
    const sourceCount = new Map<string, number>()
    const callerTypeCount = new Map<string, number>()

    // Source and caller type distribution
    rawCalls.forEach(call => {
      if (call.source) {
        sourceCount.set(call.source, (sourceCount.get(call.source) || 0) + 1)
      }
      if (call.caller_type) {
        callerTypeCount.set(call.caller_type, (callerTypeCount.get(call.caller_type) || 0) + 1)
      }
    })

    // Format distributions
    const sourceDistribution: SourceDistribution[] = Array.from(sourceCount.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)

    const callerTypeDistribution: CallerTypeDistribution[] = Array.from(callerTypeCount.entries())
      .map(([caller_type, count]) => ({ caller_type, count }))
      .sort((a, b) => b.count - a.count)

    // Recent calls (limit to 20 most recent)
    const recentCalls: IncomingCall[] = rawCalls.slice(0, 20).map(call => ({
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

    // Generate sankey data (source -> caller_type relationships)
    const sankeyMap = new Map<string, number>()
    rawCalls.forEach(call => {
      if (call.source && call.caller_type) {
        const key = `${call.source}->${call.caller_type}`
        sankeyMap.set(key, (sankeyMap.get(key) || 0) + 1)
      }
    })

    const sankeyData: SankeyData[] = Array.from(sankeyMap.entries())
      .map(([flow, count]) => {
        const [source, caller_type] = flow.split('->')
        return {
          source: source || 'Unknown',
          caller_type: caller_type || 'Unknown',
          value: count
        }
      })
      .sort((a, b) => b.value - a.value)

    const response: IncomingCallsAnalyticsResponse = {
      sourceDistribution,
      callerTypeDistribution,
      recentCalls,
      sankeyData
    }

    return NextResponse.json({
      data: response,
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