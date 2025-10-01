import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndAuthorizeApiRequest } from '@/lib/api-auth-optimized'
import { SourceDistribution } from '@/types/leads'

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

    // Fetch source distribution data using cached business ID
    const { data: sourceData, error } = await supabase
      .from('calls_incoming')
      .select('source')
      .gte('created_at', startDate)
      .eq('business_id', businessId)
      .not('source', 'is', null)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch source distribution data' },
        { status: 500 }
      )
    }

    // Process and group the data
    const sourceCount = new Map<string, number>()
    sourceData.forEach(call => {
      if (call.source) {
        sourceCount.set(call.source, (sourceCount.get(call.source) || 0) + 1)
      }
    })

    // Convert to array format sorted by count
    const sourceDistribution: SourceDistribution[] = Array.from(sourceCount.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      data: sourceDistribution,
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