import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserFromRequest, validateBusinessAccessWithToken } from '@/lib/auth-utils'
import { BookingsMetrics } from '@/types/leads'

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

    // Fetch leads data for bookings metrics
    const { data: leads, error } = await supabase
      .from('leads')
      .select('lead_id, show, closed_amount, start_time, created_at')
      .gte('created_at', startDate)
      .eq('business_id', requestedBusinessId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leads data' },
        { status: 500 }
      )
    }

    // Calculate bookings metrics
    const shows = leads.filter(lead => lead.show === true).length
    const closes = leads.filter(lead => lead.closed_amount !== null && lead.closed_amount > 0).length
    const booked = leads.filter(lead => lead.start_time !== null).length
    const totalRevenue = leads.reduce((sum, lead) => {
      return sum + (lead.closed_amount || 0)
    }, 0)
    
    // Calculate percentages with proper error handling for division by zero
    const closeRate = shows > 0 ? (closes / shows) * 100 : 0
    const averageOrderValue = closes > 0 ? totalRevenue / closes : 0
    const showsPercentage = booked > 0 ? (shows / booked) * 100 : 0
    const closesPercentage = shows > 0 ? (closes / shows) * 100 : 0

    const metrics: BookingsMetrics = {
      shows,
      closes,
      booked,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      closeRate: Math.round(closeRate * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      showsPercentage: Math.round(showsPercentage * 100) / 100,
      closesPercentage: Math.round(closesPercentage * 100) / 100
    }

    return NextResponse.json({
      data: metrics,
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