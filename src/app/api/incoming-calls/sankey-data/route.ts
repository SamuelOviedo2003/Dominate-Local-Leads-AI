import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserForAPI } from '@/lib/auth-helpers'
import { SankeyData } from '@/types/leads'

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

    // Fetch Sankey relationship data (excluding "Unknown" values as per requirements)
    const { data: sankeyRawData, error } = await supabase
      .from('incoming_calls')
      .select('source, caller_type')
      .gte('created_at', startDate)
      .eq('business_id', requestedBusinessId)
      .not('source', 'is', null)
      .neq('source', 'Unknown')
      .not('caller_type', 'is', null)
      .neq('caller_type', 'Unknown')

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch Sankey data' },
        { status: 500 }
      )
    }

    // Process and group the data by source-caller_type pairs
    const sankeyMap = new Map<string, number>()
    sankeyRawData.forEach(call => {
      if (call.source && call.caller_type) {
        const key = `${call.source}|${call.caller_type}`
        sankeyMap.set(key, (sankeyMap.get(key) || 0) + 1)
      }
    })

    // Convert to array format for Sankey diagram
    const sankeyData: SankeyData[] = Array.from(sankeyMap.entries())
      .map(([key, value]) => {
        const [source, caller_type] = key.split('|')
        return { source: source || '', caller_type: caller_type || '', value }
      })
      .sort((a, b) => b.value - a.value)

    return NextResponse.json({
      data: sankeyData,
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