import { NextRequest, NextResponse } from 'next/server'
import { createCookieClient } from '@/lib/supabase/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth-helpers-simple'
import { LeadDetails, Lead, PropertyInfo, Communication, CallWindow } from '@/types/leads'
import { logger } from '@/lib/logging'
import { validateRequest, leadIdSchema, businessIdSchema, updateCallerTypeSchema } from '@/lib/validation'
import { requireValidBusinessId, requireValidLeadId } from '@/lib/type-utils'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ leadId: string }>
}

/**
 * Format response time in minutes to minutes:seconds format for accuracy
 */
function formatResponseTime(minutes: number): string {
  if (minutes >= 60) {
    // Keep existing hour format for times over 60 minutes
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.floor(minutes % 60)
    if (remainingMinutes === 0) {
      return `${hours}h`
    }
    return `${hours}h ${remainingMinutes}m`
  } else {
    // Convert to minutes:seconds format for times under 60 minutes
    const wholeMinutes = Math.floor(minutes)
    const seconds = Math.round((minutes - wholeMinutes) * 60)
    return `${wholeMinutes}:${seconds.toString().padStart(2, '0')}`
  }
}

/**
 * Process call windows with simplified structure
 * Only returns actual scheduled/made calls, filters out empty placeholders
 */
function processCallWindows(rawData: any[], leadId: string, workingHours: boolean = true): CallWindow[] {
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
    const calledOut = window.called_out
    
    if (callNumber === 1) {
      // Special processing for Call 1 - conditional logic based on working_hours
      if (workingHours) {
        // working_hours = true: Keep existing functionality (response time and medals)
        let responseTimeMinutes: number | null = null
        let medalTier: 'diamond' | 'gold' | 'silver' | 'bronze' | null = null
        
        if (window.created_at && window.called_at) {
          const createdTime = new Date(window.created_at).getTime()
          const calledTime = new Date(window.called_at).getTime()
          const diffMs = calledTime - createdTime
          responseTimeMinutes = Math.max(0, diffMs / (1000 * 60)) // Convert to minutes, ensure non-negative
          
          // Determine medal tier based on response time
          if (responseTimeMinutes < 1) {
            medalTier = 'diamond' // < 1 minute = Diamond
          } else if (responseTimeMinutes < 2) {
            medalTier = 'gold' // 1-2 minutes = Gold  
          } else if (responseTimeMinutes < 5) {
            medalTier = 'silver' // 2-5 minutes = Silver
          } else if (responseTimeMinutes < 10) {
            medalTier = 'bronze' // 5-10 minutes = Bronze
          }
          // >= 10 minutes = No medal (null)
        }
        
        const result = {
          callNumber: callNumber as 1,
          medalTier,
          responseTime: responseTimeMinutes !== null ? formatResponseTime(responseTimeMinutes) : undefined,
          calledAt,
          calledOut
        }
        
        logger.businessLogic('Call 1 with working_hours=true', result)
        return result
      } else {
        // working_hours = false: Record just the time when the call was made (like other calls)
        const status: 'called' | 'No call' = calledAt ? 'called' : 'No call'
        
        const result = {
          callNumber: callNumber as 1,
          status,
          calledAt,
          calledOut
        }
        
        logger.businessLogic('Call 1 with working_hours=false', result)
        return result
      }
    } else {
      // Processing for Calls 2-6 - show call status and time
      const status: 'called' | 'No call' = calledAt ? 'called' : 'No call'
      
      return {
        callNumber,
        status,
        calledAt,
        calledOut: null // Only relevant for Call 1
      }
    }
  })
  
  
  return processedWindows
}

export async function GET(request: NextRequest, context: RouteParams) {
  const { leadId } = await context.params
  let leadIdNumber: number | undefined
  
  try {
    // Check authentication
    const user = await getAuthenticatedUserFromRequest()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const businessIdParam = searchParams.get('businessId')

    if (!leadId || !businessIdParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: leadId and businessId' },
        { status: 400 }
      )
    }

    // Validate and convert parameters using type-safe utilities
    let requestedBusinessId: number

    try {
      leadIdNumber = requireValidLeadId(leadId, 'GET /api/leads/[leadId]')
      requestedBusinessId = requireValidBusinessId(businessIdParam, 'GET /api/leads/[leadId]')
    } catch (error) {
      logger.error('Parameter validation failed', { leadId, businessIdParam, error: error instanceof Error ? error.message : error })
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid parameters' },
        { status: 400 }
      )
    }

    // Validate business access permissions using cookie-based auth
    const hasBusinessAccess = user.accessibleBusinesses?.some(business =>
      business.business_id === businessIdParam
    )

    if (!hasBusinessAccess) {
      return NextResponse.json(
        { error: 'Access denied - You do not have access to this business data' },
        { status: 403 }
      )
    }

    const supabase = createCookieClient()

    // Fetch lead details
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('lead_id', leadIdNumber)
      .eq('business_id', requestedBusinessId)
      .single()

    if (leadError || !leadData) {
      logger.error('Lead fetch failed', { leadId: leadIdNumber, businessId: requestedBusinessId, error: leadError })
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    const lead: Lead = leadData

    // Fetch business timezone information
    const { data: businessData, error: businessError } = await supabase
      .from('business_clients')
      .select('time_zone')
      .eq('business_id', requestedBusinessId)
      .single()

    let businessTimezone = 'UTC' // Default fallback
    if (businessData && !businessError) {
      businessTimezone = businessData.time_zone || 'UTC'
      logger.dbDebug('Business timezone fetch', 'business_clients', { businessId: requestedBusinessId, timezone: businessTimezone })
    } else {
      logger.warn('Business timezone fetch failed, using fallback', { businessId: requestedBusinessId, error: businessError, fallback: businessTimezone })
    }

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
      .select('communication_id, created_at, message_type, summary, recording_url, call_window')
      .eq('account_id', lead.account_id)
      .order('created_at', { ascending: true })

    const communications: Communication[] = communicationsData || []

    if (communicationsError) {
      logger.warn('Communications fetch failed', { accountId: lead.account_id, error: communicationsError })
      // Don't fail the entire request for communications errors
    }

    // Fetch call windows with business logic implementation
    
    const { data: rawCallWindowsData, error: callWindowsError } = await supabase
      .from('call_windows')
      .select('call_window, window_start_at, window_end_at, created_at, called_at, called_out, business_id, account_id')
      .eq('account_id', lead.account_id)
      .order('call_window', { ascending: true })
    
    let callWindows: CallWindow[] = []
    
    if (callWindowsError) {
      logger.error('Call windows fetch failed', {
        accountId: lead.account_id,
        businessId: requestedBusinessId,
        error: {
          message: callWindowsError.message,
          code: callWindowsError.code,
          hint: callWindowsError.hint
        }
      })
      // Continue with empty call windows rather than failing the entire request
      callWindows = []
    } else if (rawCallWindowsData) {
      // Apply business logic to process call windows with working_hours context
      callWindows = processCallWindows(rawCallWindowsData, lead.lead_id, lead.working_hours)
    } else {
      callWindows = []
    }


    const leadDetails: LeadDetails = {
      lead,
      property,
      communications,
      callWindows,
      businessTimezone
    }

    logger.apiDebug('/api/leads/[leadId]', 'GET', {
      leadId,
      businessTimezone,
      callWindowsCount: callWindows.length,
      hasBusinessTimezone: !!leadDetails.businessTimezone
    })

    return NextResponse.json({
      data: leadDetails,
      callWindows: callWindows,
      success: true
    })

  } catch (error) {
    logger.error('Unexpected error in GET /api/leads/[leadId]', { error, leadId: leadIdNumber })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH handler for updating lead caller_type
 */
export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    // Check authentication
    const user = await getAuthenticatedUserFromRequest()
    if (!user) {
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

    // Validate business access permissions using cookie-based auth
    const hasBusinessAccess = user.accessibleBusinesses?.some(business =>
      business.business_id === businessIdParam
    )

    if (!hasBusinessAccess) {
      return NextResponse.json(
        { error: 'Access denied - You do not have access to this business data' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { caller_type } = body

    // Validate caller_type
    const validCallerTypes = ['Client', 'Sales person', 'Other', 'Looking for job']
    if (caller_type !== null && !validCallerTypes.includes(caller_type)) {
      return NextResponse.json(
        { 
          error: 'Invalid caller_type. Must be one of: Client, Sales person, Other, Looking for job, or null' 
        },
        { status: 400 }
      )
    }

    const supabase = createCookieClient()

    // First verify the lead exists and belongs to the business
    const { data: leadExists, error: leadCheckError } = await supabase
      .from('leads')
      .select('lead_id')
      .eq('lead_id', leadIdNumber)
      .eq('business_id', requestedBusinessId)
      .single()

    if (leadCheckError || !leadExists) {
      return NextResponse.json(
        { error: 'Lead not found or access denied' },
        { status: 404 }
      )
    }

    // Update the caller_type
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update({ caller_type })
      .eq('lead_id', leadIdNumber)
      .eq('business_id', requestedBusinessId)
      .select('lead_id, caller_type')
      .single()

    if (updateError) {
      logger.error('Lead caller_type update failed', { leadId: leadIdNumber, businessId: requestedBusinessId, error: updateError })
      return NextResponse.json(
        { error: 'Failed to update lead caller_type' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        lead_id: updatedLead.lead_id,
        caller_type: updatedLead.caller_type
      },
      message: 'Caller type updated successfully'
    })

  } catch (error) {
    logger.error('Unexpected error in PATCH /api/leads/[leadId]', { error, leadId: context.params })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}