import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndAuthorizeApiRequest } from '@/lib/api-auth-optimized'
import { SankeyData } from '@/types/leads'

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

    // Fetch Sankey relationship data using cached business ID
    const { data: sankeyRawData, error } = await supabase
      .from('incoming_calls')
      .select('source, caller_type')
      .gte('created_at', startDate)
      .eq('business_id', businessId)
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