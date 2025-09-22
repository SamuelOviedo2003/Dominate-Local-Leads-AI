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
 * Process call windows with simplified structure
 * Only returns active call windows as specified in requirements
 */
function processCallWindows(rawData: any[]): CallWindow[] {
  // Filter only active call windows
  const activeWindows = rawData.filter(window =>
    window.active === true &&
    window.call_window &&
    window.call_window >= 1 &&
    window.call_window <= 6
  )

  // Sort by call_window number (1-6) to ensure proper ordering
  const sortedData = activeWindows.sort((a, b) => (a.call_window || 0) - (b.call_window || 0))

  // Simplified processing - only required fields
  const processedWindows: CallWindow[] = sortedData.map(window => ({
    callNumber: window.call_window,
    active: window.active,
    window_start_at: window.window_start_at,
    window_end_at: window.window_end_at,
    status_name: window.status_name || '', // Use empty string if no status
    calledAt: window.called_at,
    calledOut: window.called_out
  }))

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

    // Fetch business timezone and dialpad phone information
    const { data: businessData, error: businessError } = await supabase
      .from('business_clients')
      .select('time_zone, dialpad_phone')
      .eq('business_id', requestedBusinessId)
      .single()

    let businessTimezone = 'UTC' // Default fallback
    let dialpadPhone: string | null = null
    if (businessData && !businessError) {
      businessTimezone = businessData.time_zone || 'UTC'
      dialpadPhone = businessData.dialpad_phone || null
      logger.dbDebug('Business data fetch', 'business_clients', { businessId: requestedBusinessId, timezone: businessTimezone, dialpadPhone: dialpadPhone })
    } else {
      logger.warn('Business data fetch failed, using fallback', { businessId: requestedBusinessId, error: businessError, fallback: businessTimezone })
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
      .select('call_window, window_start_at, window_end_at, created_at, called_at, called_out, business_id, account_id, active, status_name')
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
      // Process only active call windows as specified in requirements
      callWindows = processCallWindows(rawCallWindowsData)
    } else {
      callWindows = []
    }


    const leadDetails: LeadDetails = {
      lead,
      property,
      communications,
      callWindows,
      businessTimezone,
      dialpadPhone
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