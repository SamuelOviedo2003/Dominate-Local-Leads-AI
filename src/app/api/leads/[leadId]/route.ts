import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserForAPI } from '@/lib/auth-helpers'
import { LeadDetails, Lead, PropertyInfo, Communication, CallWindow } from '@/types/leads'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ leadId: string }>
}

/**
 * Process call windows with business logic implementation
 * Implements all required business rules for call tracking
 */
function processCallWindows(rawData: any[], leadId: string): CallWindow[] {
  // Sort by call_window number (1-6) to ensure proper ordering
  const sortedData = rawData.sort((a, b) => (a.call_window || 0) - (b.call_window || 0))
  
  const processedWindows: CallWindow[] = sortedData.map(window => {
    // Calculate response time if both timestamps are available
    let responseTimeMinutes: number | null = null
    if (window.created_at && window.called_at) {
      const createdTime = new Date(window.created_at).getTime()
      const calledTime = new Date(window.called_at).getTime()
      const diffMs = calledTime - createdTime
      responseTimeMinutes = Math.max(0, diffMs / (1000 * 60)) // Convert to minutes, ensure non-negative
    }
    
    // Determine medal tier based on response time
    let medalTier: 'gold' | 'silver' | 'bronze' | null = null
    if (responseTimeMinutes !== null) {
      if (responseTimeMinutes < 1) {
        medalTier = 'gold' // < 1 minute = Gold
      } else if (responseTimeMinutes < 2) {
        medalTier = 'silver' // 1-2 minutes = Silver  
      } else if (responseTimeMinutes < 5) {
        medalTier = 'bronze' // 2-5 minutes = Bronze
      }
      // >= 5 minutes = No medal (null)
    }
    
    // Check if call was missed (called_at is null)
    const isMissed = !window.called_at
    
    // Ensure call_window number is available, fallback to index + 1
    const callNumber = window.call_window || 1
    
    return {
      // Database fields
      call_window: window.call_window || 1,
      window_start_at: window.window_start_at,
      window_end_at: window.window_end_at,
      created_at: window.created_at,
      called_at: window.called_at,
      called_out: window.called_out,
      business_id: window.business_id,
      account_id: window.account_id,
      
      // Business logic calculated fields
      responseTimeMinutes,
      medalTier,
      isMissed,
      callNumber
    }
  })
  
  // Validate business rule: Each lead should have exactly 6 calls
  const expectedCalls = [1, 2, 3, 4, 5, 6]
  const presentCalls = processedWindows.map(w => w.call_window)
  const missingCalls = expectedCalls.filter(num => !presentCalls.includes(num))
  
  if (missingCalls.length > 0) {
    console.warn(`[BUSINESS_RULE_WARNING] Lead ${leadId} is missing call windows:`, {
      expectedCalls,
      presentCalls,
      missingCalls,
      totalFound: processedWindows.length,
      expectedTotal: 6
    })
  }
  
  if (processedWindows.length > 6) {
    console.warn(`[BUSINESS_RULE_WARNING] Lead ${leadId} has more than 6 call windows:`, {
      totalFound: processedWindows.length,
      expectedTotal: 6
    })
  }
  
  // Log business metrics for monitoring
  const missedCallsCount = processedWindows.filter(w => w.isMissed).length
  const respondedCallsCount = processedWindows.filter(w => !w.isMissed).length
  const goldMedals = processedWindows.filter(w => w.medalTier === 'gold').length
  const silverMedals = processedWindows.filter(w => w.medalTier === 'silver').length
  const bronzeMedals = processedWindows.filter(w => w.medalTier === 'bronze').length
  
  console.log(`[BUSINESS_METRICS] Lead ${leadId} call performance:`, {
    totalCalls: processedWindows.length,
    missedCalls: missedCallsCount,
    respondedCalls: respondedCallsCount,
    performance: {
      gold: goldMedals,
      silver: silverMedals, 
      bronze: bronzeMedals,
      noMedal: respondedCallsCount - goldMedals - silverMedals - bronzeMedals
    },
    averageResponseTime: respondedCallsCount > 0 ? 
      processedWindows
        .filter(w => w.responseTimeMinutes !== null)
        .reduce((sum, w) => sum + (w.responseTimeMinutes || 0), 0) / respondedCallsCount 
      : null
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
      businessLogicApplied: {
        hasMissedCalls: callWindows.some(w => w.isMissed),
        hasResponseTimes: callWindows.some(w => w.responseTimeMinutes !== null),
        medalDistribution: {
          gold: callWindows.filter(w => w.medalTier === 'gold').length,
          silver: callWindows.filter(w => w.medalTier === 'silver').length,
          bronze: callWindows.filter(w => w.medalTier === 'bronze').length
        }
      }
    })

    return NextResponse.json({
      data: leadDetails,
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