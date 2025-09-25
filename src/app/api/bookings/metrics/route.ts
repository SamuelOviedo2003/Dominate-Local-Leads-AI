import { NextRequest } from 'next/server'
import { authenticateAndAuthorizeApiRequest } from '@/lib/api-auth-optimized'
import { BookingsMetrics } from '@/types/leads'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessIdParam = searchParams.get('businessId')

    if (!businessIdParam) {
      return Response.json(
        { error: 'Missing required parameter: businessId' },
        { status: 400 }
      )
    }

    // Use optimized authentication and authorization
    const authResult = await authenticateAndAuthorizeApiRequest(request, businessIdParam)
    if (authResult instanceof Response) {
      return authResult
    }

    const { user, supabase, businessId } = authResult

    // Fetch leads data for bookings metrics (all time) using cached business ID
    const { data: leads, error } = await supabase
      .from('leads')
      .select('lead_id, show, closed_amount, start_time, created_at, calls_count')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return Response.json(
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
    const totalCalls = leads.reduce((sum, lead) => {
      return sum + (lead.calls_count || 0)
    }, 0)

    // Calculate percentages with proper error handling for division by zero
    const closeRate = shows > 0 ? (closes / shows) * 100 : 0
    const showsPercentage = booked > 0 ? (shows / booked) * 100 : 0
    const closesPercentage = shows > 0 ? (closes / shows) * 100 : 0

    const metrics: BookingsMetrics = {
      shows,
      closes,
      booked,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      closeRate: Math.round(closeRate * 100) / 100,
      totalCalls,
      showsPercentage: Math.round(showsPercentage * 100) / 100,
      closesPercentage: Math.round(closesPercentage * 100) / 100
    }

    return Response.json({
      data: metrics,
      success: true
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}