import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndAuthorizeApiRequest } from '@/lib/api-auth-optimized'
import { AppointmentSetter } from '@/types/leads'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // TEMPORARILY DISABLED: Appointment setters functionality commented out due to missing time_speed column
    // This functionality will be restored when the database schema is updated
    console.log('Appointment setters endpoint called but functionality is temporarily disabled')

    const { searchParams } = new URL(request.url)
    const businessIdParam = searchParams.get('businessId')

    // Use optimized authentication and authorization for future use
    const authResult = await authenticateAndAuthorizeApiRequest(request, businessIdParam)
    if (authResult instanceof Response) {
      return authResult
    }

    const { user, supabase, businessId } = authResult

    // Return empty data instead of querying the missing time_speed column
    return NextResponse.json({
      data: [],
      success: true
    })

    /* COMMENTED OUT: Original implementation that queries time_speed column
    // When re-enabled, this endpoint will use the optimized middleware above
    // and fetch data using the cached supabase client from authResult

    const startDate = searchParams.get('startDate')
    if (!startDate) {
      return NextResponse.json(
        { error: 'Missing required parameter: startDate' },
        { status: 400 }
      )
    }

    // Step 1: Get base leads data using cached business ID
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('lead_id, start_time, created_at, working_hours')
      .gte('created_at', startDate)
      .eq('business_id', businessId)

    if (leadsError) {
      console.error('Database error fetching leads:', leadsError)
      return NextResponse.json(
        { error: 'Failed to fetch leads data' },
        { status: 500 }
      )
    }

    if (leads.length === 0) {
      return NextResponse.json({
        data: [],
        success: true
      })
    }

    const leadIds = leads.map(lead => lead.lead_id)

    // Step 2: Get appointment setter call data
    const { data: calls, error: callsError } = await supabase
      .from('leads_calls')
      .select('lead_id, assigned, duration, time_speed, created_at')
      .in('lead_id', leadIds)
      .gte('created_at', startDate)
      .not('assigned', 'is', null)

    if (callsError) {
      console.error('Database error fetching calls:', callsError)
      return NextResponse.json(
        { error: 'Failed to fetch calls data' },
        { status: 500 }
      )
    }

    // Group data by appointment setter
    const setterData = new Map<string, {
      leadIds: Set<string>
      booked: number
      totalCallTime: number
      responseSpeeds: number[]
    }>()

    // Initialize with call data
    calls.forEach(call => {
      if (!setterData.has(call.assigned)) {
        setterData.set(call.assigned, {
          leadIds: new Set(),
          booked: 0,
          totalCallTime: 0,
          responseSpeeds: []
        })
      }
      setterData.get(call.assigned)!.leadIds.add(call.lead_id)
    })

    // Process leads for each setter
    leads.forEach(lead => {
      const setterCall = calls.find(call => call.lead_id === lead.lead_id)
      if (setterCall) {
        const setterStats = setterData.get(setterCall.assigned)!

        if (lead.start_time) {
          setterStats.booked++
        }

        if (lead.working_hours) {
          setterStats.totalCallTime += setterCall.duration || 0
          if (setterCall.time_speed > 0) {
            setterStats.responseSpeeds.push(setterCall.time_speed)
          }
        }
      }
    })

    // Calculate metrics for each setter
    const appointmentSetters: AppointmentSetter[] = Array.from(setterData.entries())
      .map(([name, stats]) => {
        const totalLeads = stats.leadIds.size
        const booked = stats.booked
        const bookingRate = totalLeads > 0 ? (booked / totalLeads) * 100 : 0
        const avgResponseSpeed = stats.responseSpeeds.length > 0
          ? stats.responseSpeeds.reduce((sum, speed) => sum + speed, 0) / stats.responseSpeeds.length
          : 0

        return {
          name,
          totalLeads,
          booked,
          bookingRate: Math.round(bookingRate * 100) / 100,
          totalCallTime: stats.totalCallTime,
          avgResponseSpeed: Math.round(avgResponseSpeed * 100) / 100
        }
      })
      .sort((a, b) => b.booked - a.booked) // Sort by booked appointments descending

    return NextResponse.json({
      data: appointmentSetters,
      success: true
    })
    */

  } catch (error) {
    console.error('Unexpected error in appointment setters endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}