import { NextRequest, NextResponse } from 'next/server'
import { createCookieClient } from '@/lib/supabase/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth-helpers-simple'
import { BookingsPerformance } from '@/types/leads'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check authentication using cookie-based auth
    const user = await getAuthenticatedUserFromRequest()
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

    // Validate business access permissions using user's accessible businesses
    const hasAccess = user.accessibleBusinesses?.some(
      business => business.business_id === businessIdParam
    )
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied - You do not have permission to access this business' },
        { status: 403 }
      )
    }

    const supabase = createCookieClient()

    // Fetch leads data with salesperson information
    // Note: Assuming salesperson info is in a field like 'assigned_salesperson' or similar
    // For now, we'll use a mock structure until the exact field name is confirmed
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select(`
        lead_id, 
        show, 
        closed_amount, 
        created_at,
        next_step
      `)
      .gte('created_at', startDate)
      .eq('business_id', requestedBusinessId)
      .order('created_at', { ascending: false })

    if (leadsError) {
      console.error('Database error fetching leads:', leadsError)
      return NextResponse.json(
        { error: 'Failed to fetch leads data' },
        { status: 500 }
      )
    }

    // Fetch leads_calls data to get salesperson assignments
    const leadIds = leads.map(lead => lead.lead_id)
    const { data: leadCalls, error: callsError } = await supabase
      .from('leads_calls')
      .select('lead_id, assigned, duration, created_at')
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

    // Group performance by salesperson
    const salespersonMap = new Map<string, {
      shows: number
      closes: number
      totalRevenue: number
      leadsWorked: Set<string>
    }>()

    // Initialize salesperson data from calls
    leadCalls.forEach(call => {
      if (call.assigned && !salespersonMap.has(call.assigned)) {
        salespersonMap.set(call.assigned, {
          shows: 0,
          closes: 0,
          totalRevenue: 0,
          leadsWorked: new Set()
        })
      }
    })

    // Process leads and associate with salespeople
    leads.forEach(lead => {
      // Find the salesperson assigned to this lead
      const assignedCall = leadCalls.find(call => call.lead_id === lead.lead_id)
      if (assignedCall && assignedCall.assigned) {
        const salesperson = assignedCall.assigned
        const salespersonData = salespersonMap.get(salesperson)
        
        if (salespersonData) {
          salespersonData.leadsWorked.add(lead.lead_id)
          
          if (lead.show) {
            salespersonData.shows++
          }
          
          if (lead.closed_amount !== null && lead.closed_amount > 0) {
            salespersonData.closes++
            salespersonData.totalRevenue += lead.closed_amount
          }
        }
      }
    })

    // Convert to performance array
    const performance: BookingsPerformance[] = Array.from(salespersonMap.entries())
      .map(([salesperson, data]) => {
        const closeRate = data.shows > 0 ? (data.closes / data.shows) * 100 : 0
        const averageOrderValue = data.closes > 0 ? data.totalRevenue / data.closes : 0
        
        return {
          salesperson,
          shows: data.shows,
          closes: data.closes,
          totalRevenue: Math.round(data.totalRevenue * 100) / 100,
          closeRate: Math.round(closeRate * 100) / 100,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          leadsWorked: data.leadsWorked.size
        }
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue) // Sort by revenue descending

    return NextResponse.json({
      data: performance,
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