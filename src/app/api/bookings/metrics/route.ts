import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createCookieClient } from '@/lib/supabase/server'
import { BookingsMetrics } from '@/types/leads'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateRequest(request)

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const businessIdParam = searchParams.get('businessId')

    if (!startDate || !businessIdParam) {
      return Response.json(
        { error: 'Missing required parameters: startDate and businessId' },
        { status: 400 }
      )
    }

    const requestedBusinessId = parseInt(businessIdParam, 10)
    if (isNaN(requestedBusinessId)) {
      return Response.json(
        { error: 'businessId must be a valid number' },
        { status: 400 }
      )
    }

    // Validate business access permissions using user's accessible businesses
    const hasAccess = user.accessibleBusinesses?.some(
      business => business.business_id === businessIdParam
    )
    if (!hasAccess) {
      return Response.json(
        { error: 'Access denied - You do not have access to this business data' },
        { status: 403 }
      )
    }

    const supabase = createCookieClient()

    // Fetch leads data for bookings metrics
    const { data: leads, error } = await supabase
      .from('leads')
      .select('lead_id, show, closed_amount, start_time, created_at, calls_count')
      .gte('created_at', startDate)
      .eq('business_id', requestedBusinessId)
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