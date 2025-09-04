import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserForAPI, validateBusinessAccessForAPI } from '@/lib/auth-helpers'
import { SalesmanPerformance } from '@/types/leads'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUserForAPI()
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

    // Validate user has access to the requested business using the new profile_businesses system
    const hasAccess = await validateBusinessAccessForAPI(user, businessIdParam)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied - You do not have permission to access this business' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Fetch leads data with salesman information
    // Note: Assuming salesman info is in a field like 'assigned_salesman' or similar
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

    // Fetch leads_calls data to get salesman assignments
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

    // Group performance by salesman
    const salesmanMap = new Map<string, {
      shows: number
      closes: number
      totalRevenue: number
      leadsWorked: Set<string>
    }>()

    // Initialize salesman data from calls
    leadCalls.forEach(call => {
      if (call.assigned && !salesmanMap.has(call.assigned)) {
        salesmanMap.set(call.assigned, {
          shows: 0,
          closes: 0,
          totalRevenue: 0,
          leadsWorked: new Set()
        })
      }
    })

    // Process leads and associate with salesmen
    leads.forEach(lead => {
      // Find the salesman assigned to this lead
      const assignedCall = leadCalls.find(call => call.lead_id === lead.lead_id)
      if (assignedCall && assignedCall.assigned) {
        const salesman = assignedCall.assigned
        const salesmanData = salesmanMap.get(salesman)
        
        if (salesmanData) {
          salesmanData.leadsWorked.add(lead.lead_id)
          
          if (lead.show) {
            salesmanData.shows++
          }
          
          if (lead.closed_amount !== null && lead.closed_amount > 0) {
            salesmanData.closes++
            salesmanData.totalRevenue += lead.closed_amount
          }
        }
      }
    })

    // Convert to performance array
    const performance: SalesmanPerformance[] = Array.from(salesmanMap.entries())
      .map(([salesman, data]) => {
        const closeRate = data.shows > 0 ? (data.closes / data.shows) * 100 : 0
        const averageOrderValue = data.closes > 0 ? data.totalRevenue / data.closes : 0
        
        return {
          salesman,
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