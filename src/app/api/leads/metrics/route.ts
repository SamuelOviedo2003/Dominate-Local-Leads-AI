import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createCookieClient } from '@/lib/supabase/server'
import { LeadMetrics } from '@/types/leads'

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

    // Fetch all leads for metrics calculation
    const { data: leads, error } = await supabase
      .from('leads')
      .select('lead_id, contacted, start_time, created_at')
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
    const contacted = leads.filter(lead => lead.contacted).length
    const booked = leads.filter(lead => lead.start_time !== null).length
    
    const contactRate = total > 0 ? (contacted / total) * 100 : 0
    const bookingRate = contacted > 0 ? (booked / contacted) * 100 : 0

    const metrics: LeadMetrics = {
      total,
      contacted,
      booked,
      contactRate: Math.round(contactRate * 100) / 100,
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