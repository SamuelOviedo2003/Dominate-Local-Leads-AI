import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndAuthorizeApiRequest } from '@/lib/api-auth-optimized'
import { CallerTypeDistribution } from '@/types/leads'

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

    // Fetch caller type distribution data using cached business ID
    const { data: callerTypeData, error } = await supabase
      .from('incoming_calls')
      .select('caller_type')
      .gte('created_at', startDate)
      .eq('business_id', businessId)
      .not('caller_type', 'is', null)
      .neq('caller_type', 'Unknown')

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch caller type distribution data' },
        { status: 500 }
      )
    }

    // Process and group the data
    const callerTypeCount = new Map<string, number>()
    callerTypeData.forEach(call => {
      if (call.caller_type) {
        callerTypeCount.set(call.caller_type, (callerTypeCount.get(call.caller_type) || 0) + 1)
      }
    })

    // Convert to array format sorted by count
    const callerTypeDistribution: CallerTypeDistribution[] = Array.from(callerTypeCount.entries())
      .map(([caller_type, count]) => ({ caller_type, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      data: callerTypeDistribution,
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