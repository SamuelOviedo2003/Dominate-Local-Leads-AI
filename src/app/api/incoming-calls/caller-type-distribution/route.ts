import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserFromRequest, validateBusinessAccessWithToken } from '@/lib/auth-utils'
import { CallerTypeDistribution } from '@/types/leads'

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
    const hasAccess = await validateBusinessAccessWithToken(user.id, businessIdParam, token)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied - You do not have access to this business data' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Fetch caller type distribution data (excluding "Unknown" values as per requirements)
    const { data: callerTypeData, error } = await supabase
      .from('incoming_calls')
      .select('caller_type')
      .gte('created_at', startDate)
      .eq('business_id', requestedBusinessId)
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