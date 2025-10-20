import { NextRequest } from 'next/server'
import { authenticateAndAuthorizeApiRequest } from '@/lib/api-auth-optimized'
import { LeadMetrics } from '@/types/leads'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const businessIdParam = searchParams.get('businessId')

    if (!startDate) {
      return Response.json(
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

    // Fetch all leads for metrics calculation
    const { data: leads, error } = await supabase
      .from('leads')
      .select('lead_id, start_time, created_at')
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

    // Calculate metrics
    const total = leads.length
    const booked = leads.filter(lead => lead.start_time !== null).length

    const bookingRate = total > 0 ? (booked / total) * 100 : 0

    const metrics: LeadMetrics = {
      total,
      booked,
      bookingRate: Math.round(bookingRate * 100) / 100
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