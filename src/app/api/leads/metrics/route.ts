import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserForAPI } from '@/lib/auth-helpers'
import { LeadMetrics } from '@/types/leads'

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

    // Fetch all leads for metrics calculation
    const { data: leads, error } = await supabase
      .from('leads')
      .select('lead_id, contacted, start_time, created_at')
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