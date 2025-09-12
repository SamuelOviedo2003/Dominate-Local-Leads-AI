import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserFromRequest, validateBusinessAccessWithToken } from '@/lib/auth-utils'
import { RevenueTrendData } from '@/types/leads'

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
    const startDateParam = searchParams.get('startDate')
    const businessIdParam = searchParams.get('businessId')
    const timePeriodParam = searchParams.get('timePeriod')

    if (!startDateParam || !businessIdParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: startDate and businessId' },
        { status: 400 }
      )
    }

    // Now we know these are strings, not null
    const startDate: string = startDateParam
    const timePeriod: string = timePeriodParam || '30'

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

    // Fetch leads data for trend analysis
    const { data: leads, error } = await supabase
      .from('leads')
      .select('lead_id, show, closed_amount, created_at')
      .gte('created_at', startDate)
      .eq('business_id', requestedBusinessId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leads data' },
        { status: 500 }
      )
    }

    // Group data by date for trends
    const trendsMap = new Map<string, {
      revenue: number
      shows: number
      closes: number
    }>()

    leads?.forEach(lead => {
      const date = new Date(lead.created_at).toISOString().split('T')[0]! // Get YYYY-MM-DD format
      
      if (!trendsMap.has(date)) {
        trendsMap.set(date, {
          revenue: 0,
          shows: 0,
          closes: 0
        })
      }
      
      const dayData = trendsMap.get(date)!
      
      if (lead.show) {
        dayData.shows++
      }
      
      if (lead.closed_amount !== null && lead.closed_amount > 0) {
        dayData.closes++
        dayData.revenue += lead.closed_amount
      }
    })

    // Convert to trend array and fill missing dates
    const startDateObj = new Date(startDate)
    const endDateObj = new Date()
    const trends: RevenueTrendData[] = []

    // Generate all dates in range
    const currentDate = new Date(startDateObj)
    while (currentDate <= endDateObj) {
      const dateStr = currentDate.toISOString().split('T')[0]!
      const dayData = trendsMap.get(dateStr) || { revenue: 0, shows: 0, closes: 0 }
      
      trends.push({
        date: dateStr,
        revenue: Math.round(dayData.revenue * 100) / 100,
        shows: dayData.shows,
        closes: dayData.closes
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // For shorter periods, we might want to aggregate by hour or keep daily
    // For longer periods, we might want to aggregate by week
    let processedTrends = trends

    if (parseInt(timePeriod) <= 7) {
      // For 7 days or less, keep daily granularity
      processedTrends = trends
    } else if (parseInt(timePeriod) <= 30) {
      // For 8-30 days, keep daily granularity
      processedTrends = trends
    } else {
      // For longer periods, aggregate by week
      const weeklyTrends: RevenueTrendData[] = []
      for (let i = 0; i < trends.length; i += 7) {
        const weekData = trends.slice(i, i + 7)
        const weekRevenue = weekData.reduce((sum, day) => sum + day.revenue, 0)
        const weekShows = weekData.reduce((sum, day) => sum + day.shows, 0)
        const weekCloses = weekData.reduce((sum, day) => sum + day.closes, 0)
        
        if (weekData.length > 0) {
          weeklyTrends.push({
            date: weekData[0]?.date || '', // Use first day of week as label
            revenue: Math.round(weekRevenue * 100) / 100,
            shows: weekShows,
            closes: weekCloses
          })
        }
      }
      processedTrends = weeklyTrends
    }

    return NextResponse.json({
      data: processedTrends,
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