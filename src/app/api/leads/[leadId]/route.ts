import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserForAPI } from '@/lib/auth-helpers'
import { LeadDetails, Lead, PropertyInfo, Communication, CallWindow } from '@/types/leads'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ leadId: string }>
}

/**
 * Format response time in minutes to human-readable string
 */
function formatResponseTime(minutes: number): string {
  if (minutes < 1) {
    return '< 1 min'
  } else if (minutes < 60) {
    return `${Math.round(minutes)} min`
  } else {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.round(minutes % 60)
    if (remainingMinutes === 0) {
      return `${hours}h`
    }
    return `${hours}h ${remainingMinutes}m`
  }
}

/**
 * Process call windows with simplified structure
 * Only returns actual scheduled/made calls, filters out empty placeholders
 */
function processCallWindows(rawData: any[], leadId: string): CallWindow[] {
  // Filter out unscheduled call windows (ones without created_at or that are just placeholders)
  const actualCalls = rawData.filter(window => 
    window.created_at && 
    window.call_window && 
    window.call_window >= 1 && 
    window.call_window <= 6
  )
  
  // Sort by call_window number (1-6) to ensure proper ordering
  const sortedData = actualCalls.sort((a, b) => (a.call_window || 0) - (b.call_window || 0))
  
  const processedWindows: CallWindow[] = sortedData.map(window => {
    const callNumber = window.call_window
    const calledAt = window.called_at
    
    if (callNumber === 1) {
      // Special processing for Call 1 - include medal tier and response time
      let responseTimeMinutes: number | null = null
      let medalTier: 'gold' | 'silver' | 'bronze' | null = null
      
      if (window.created_at && window.called_at) {
        const createdTime = new Date(window.created_at).getTime()
        const calledTime = new Date(window.called_at).getTime()
        const diffMs = calledTime - createdTime
        responseTimeMinutes = Math.max(0, diffMs / (1000 * 60)) // Convert to minutes, ensure non-negative
        
        // Determine medal tier based on response time
        if (responseTimeMinutes < 1) {
          medalTier = 'gold' // < 1 minute = Gold
        } else if (responseTimeMinutes < 2) {
          medalTier = 'silver' // 1-2 minutes = Silver  
        } else if (responseTimeMinutes < 5) {
          medalTier = 'bronze' // 2-5 minutes = Bronze
        }
        // >= 5 minutes = No medal (null)
      }
      
      return {
        callNumber: callNumber as 1,
        medalTier,
        responseTime: responseTimeMinutes !== null ? formatResponseTime(responseTimeMinutes) : undefined,
        calledAt
      }
    } else {
      // Processing for Calls 2-6 - show call status and time
      const status = calledAt ? 'called' : 'No call'
      
      return {
        callNumber,
        status,
        calledAt
      }
    }
  })
  
  // Log business metrics for monitoring
  const call1Windows = processedWindows.filter(w => w.callNumber === 1)
  const otherCallWindows = processedWindows.filter(w => w.callNumber !== 1)
  const missedCallsCount = processedWindows.filter(w => !w.calledAt).length
  const respondedCallsCount = processedWindows.filter(w => w.calledAt).length
  
  // Medal distribution for Call 1 only
  const goldMedals = call1Windows.filter(w => 'medalTier' in w && w.medalTier === 'gold').length
  const silverMedals = call1Windows.filter(w => 'medalTier' in w && w.medalTier === 'silver').length
  const bronzeMedals = call1Windows.filter(w => 'medalTier' in w && w.medalTier === 'bronze').length
  
  console.log(`[SIMPLIFIED_CALL_WINDOWS] Lead ${leadId} call performance:`, {
    totalActualCalls: processedWindows.length,
    call1Count: call1Windows.length,
    otherCallsCount: otherCallWindows.length,
    missedCalls: missedCallsCount,
    respondedCalls: respondedCallsCount,
    call1Performance: {
      gold: goldMedals,
      silver: silverMedals, 
      bronze: bronzeMedals,
      noMedal: call1Windows.length - goldMedals - silverMedals - bronzeMedals
    }
  })
  
  return processedWindows
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    // Check authentication
    const user = await getAuthenticatedUserForAPI()
    if (!user || !user.profile?.business_id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const { leadId } = await context.params
    const { searchParams } = new URL(request.url)
    const businessIdParam = searchParams.get('businessId')

    if (!leadId || !businessIdParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: leadId and businessId' },
        { status: 400 }
      )
    }

    // Convert leadId to number since database expects smallint
    const leadIdNumber = parseInt(leadId, 10)
    if (isNaN(leadIdNumber)) {
      return NextResponse.json(
        { error: 'leadId must be a valid number' },
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

    // Fetch lead details
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('lead_id', leadIdNumber)
      .eq('business_id', requestedBusinessId)
      .single()

    if (leadError || !leadData) {
      console.error('Lead fetch error:', leadError)
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    const lead: Lead = leadData

    // Fetch property information using account_id from lead
    const { data: propertyData, error: propertyError } = await supabase
      .from('clients')
      .select('house_value, distance_meters, house_url, full_address, duration_seconds')
      .eq('account_id', lead.account_id)
      .single()

    let property: PropertyInfo | null = null
    if (propertyData && !propertyError) {
      property = propertyData
    }

    // Fetch communications history
    const { data: communicationsData, error: communicationsError } = await supabase
      .from('communications')
      .select('communication_id, created_at, message_type, summary, recording_url')
      .eq('account_id', lead.account_id)
      .order('created_at', { ascending: true })

    const communications: Communication[] = communicationsData || []

    if (communicationsError) {
      console.warn('Communications fetch warning:', communicationsError)
      // Don't fail the entire request for communications errors
    }

    // Fetch call windows with business logic implementation
    console.log(`[INFO] Fetching call windows for account_id: ${lead.account_id}, business_id: ${requestedBusinessId}`)
    
    const { data: rawCallWindowsData, error: callWindowsError } = await supabase
      .from('call_windows')
      .select('call_window, window_start_at, window_end_at, created_at, called_at, called_out, business_id, account_id')
      .eq('account_id', lead.account_id)
      .order('call_window', { ascending: true })
    
    let callWindows: CallWindow[] = []
    
    if (callWindowsError) {
      console.error(`[ERROR] Call windows fetch failed:`, {
        error: callWindowsError,
        accountId: lead.account_id,
        businessId: requestedBusinessId,
        errorDetails: {
          message: callWindowsError.message,
          code: callWindowsError.code,
          hint: callWindowsError.hint
        }
      })
      // Continue with empty call windows rather than failing the entire request
      callWindows = []
    } else if (rawCallWindowsData) {
      console.log(`[INFO] Raw call windows data retrieved: ${rawCallWindowsData.length} records`)
      
      // Apply business logic to process call windows
      callWindows = processCallWindows(rawCallWindowsData, lead.lead_id)
      
      console.log(`[INFO] Processed call windows: ${callWindows.length} records with business logic applied`)
    } else {
      console.log(`[INFO] No call windows found for account_id: ${lead.account_id}`)
      callWindows = []
    }


    const leadDetails: LeadDetails = {
      lead,
      property,
      communications,
      callWindows
    }

    console.log(`[INFO] Final response for lead ${leadId}:`, {
      leadId: lead.lead_id,
      accountId: lead.account_id,
      callWindowsCount: callWindows.length,
      simplifiedStructure: {
        hasMissedCalls: callWindows.some(w => !w.calledAt),
        hasCall1: callWindows.some(w => w.callNumber === 1),
        medalDistribution: {
          gold: callWindows.filter(w => 'medalTier' in w && w.medalTier === 'gold').length,
          silver: callWindows.filter(w => 'medalTier' in w && w.medalTier === 'silver').length,
          bronze: callWindows.filter(w => 'medalTier' in w && w.medalTier === 'bronze').length
        }
      }
    })

    return NextResponse.json({
      data: leadDetails,
      callWindows: callWindows,
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