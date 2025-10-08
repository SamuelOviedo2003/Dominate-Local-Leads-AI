import { NextRequest, NextResponse } from 'next/server'
import { createCookieClient } from '@/lib/supabase/server'

/**
 * GET /api/leads/next-lead
 *
 * Fetches the next lead to call based on priority rules:
 *
 * Priority 1: Leads with active countdown (callNumber=1, working_hours=true,
 *             within window, <30min elapsed), ordered by window_start_at ASC
 *
 * Priority 2: Leads with stage=1 and call_now_status in (1,2,3),
 *             ordered by call_now_status ASC
 *
 * Query params:
 * - businessId: The business ID to filter leads
 * - currentLeadId: The current lead ID to exclude from results
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createCookieClient()
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('businessId')
    const currentLeadId = searchParams.get('currentLeadId')

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      )
    }

    // Get current timestamp for window calculations
    const now = new Date().toISOString()

    // Priority 1: Leads with active countdown
    // Find leads where:
    // - call_window = 1
    // - working_hours = true
    // - current time is within window range
    // - less than 30 minutes elapsed since window_start_at
    const { data: countdownLeads, error: countdownError } = await supabase
      .from('call_windows')
      .select(`
        lead_id,
        window_start_at,
        window_end_at,
        working_hours,
        call_window,
        leads!inner (
          lead_id,
          first_name,
          last_name,
          phone,
          stage,
          call_now_status,
          business_id
        )
      `)
      .eq('leads.business_id', businessId)
      .eq('call_window', 1)
      .eq('working_hours', true)
      .lte('window_start_at', now)
      .gte('window_end_at', now)
      .neq('lead_id', currentLeadId || '')
      .order('window_start_at', { ascending: true })

    if (countdownError) {
      console.error('Error fetching countdown leads:', countdownError)
    }

    // Filter for leads with less than 30 minutes elapsed
    const validCountdownLeads = countdownLeads?.filter(window => {
      const startTime = new Date(window.window_start_at!)
      const currentTime = new Date()
      const elapsedMs = currentTime.getTime() - startTime.getTime()
      const thirtyMinutesMs = 30 * 60 * 1000

      return elapsedMs < thirtyMinutesMs
    }) || []

    // If we have a countdown lead, return the first one
    if (validCountdownLeads.length > 0) {
      const nextWindow = validCountdownLeads[0]
      if (!nextWindow) {
        return NextResponse.json({
          success: true,
          lead: null,
          message: 'No next lead available'
        })
      }

      const lead = Array.isArray(nextWindow.leads) ? nextWindow.leads[0] : nextWindow.leads

      if (!lead) {
        return NextResponse.json({
          success: true,
          lead: null,
          message: 'No next lead available'
        })
      }

      // Construct full name from first_name and last_name
      const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'

      return NextResponse.json({
        success: true,
        lead: {
          id: lead.lead_id,
          name: fullName,
          phone: lead.phone,
          dialpad_phone: null, // Not in schema, will be null
          stage: lead.stage,
          call_now_status: lead.call_now_status,
          priority: 'countdown'
        }
      })
    }

    // Priority 2: Leads with stage=1 and call_now_status in (1,2,3)
    const { data: callNowLeads, error: callNowError } = await supabase
      .from('leads')
      .select('lead_id, first_name, last_name, phone, stage, call_now_status')
      .eq('business_id', businessId)
      .eq('stage', 1)
      .in('call_now_status', [1, 2, 3])
      .neq('lead_id', currentLeadId || '')
      .order('call_now_status', { ascending: true })
      .limit(1)

    if (callNowError) {
      console.error('Error fetching call now leads:', callNowError)
      return NextResponse.json(
        { error: 'Failed to fetch next lead' },
        { status: 500 }
      )
    }

    if (callNowLeads && callNowLeads.length > 0) {
      const lead = callNowLeads[0]

      if (!lead) {
        return NextResponse.json({
          success: true,
          lead: null,
          message: 'No next lead available'
        })
      }

      const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'

      return NextResponse.json({
        success: true,
        lead: {
          id: lead.lead_id,
          name: fullName,
          phone: lead.phone,
          dialpad_phone: null, // Not in schema
          stage: lead.stage,
          call_now_status: lead.call_now_status,
          priority: 'call_now_status'
        }
      })
    }

    // No next lead found
    return NextResponse.json({
      success: true,
      lead: null,
      message: 'No next lead available'
    })

  } catch (error) {
    console.error('Error in next-lead API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
