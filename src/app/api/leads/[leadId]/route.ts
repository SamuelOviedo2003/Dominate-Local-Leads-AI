import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndAuthorizeApiRequest } from '@/lib/api-auth-optimized'
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
    status: window.status || null, // Use numeric status directly
    calledAt: window.called_at,
    calledOut: null,
    working_hours: window.working_hours
  }))

  return processedWindows
}

export async function GET(request: NextRequest, context: RouteParams) {
  const { leadId } = await context.params
  let leadIdNumber: number | undefined

  try {
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

    // Use optimized authentication and authorization
    const authResult = await authenticateAndAuthorizeApiRequest(request, businessIdParam)
    if (authResult instanceof Response) {
      return authResult
    }

    const { user, supabase, businessId } = authResult

    // OPTIMIZATION: Parallel queries for lead details and related data
    const [
      { data: leadData, error: leadError },
      { data: businessData, error: businessError }
    ] = await Promise.all([
      // Fetch lead details
      supabase
        .from('leads')
        .select('*')
        .eq('lead_id', leadIdNumber)
        .eq('business_id', businessId)
        .single(),

      // Fetch business timezone and dialpad phone
      supabase
        .from('business_clients')
        .select('time_zone, dialpad_phone')
        .eq('business_id', businessId)
        .single()
    ])

    if (leadError || !leadData) {
      logger.error('Lead fetch failed', { leadId: leadIdNumber, businessId: businessId, error: leadError })
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    const lead: Lead = leadData

    // Process business data
    let businessTimezone = 'UTC'
    let dialpadPhone: string | null = null
    if (businessData && !businessError) {
      businessTimezone = businessData.time_zone || 'UTC'
      dialpadPhone = businessData.dialpad_phone || null
    }

    // OPTIMIZATION: Parallel queries for property, communications, and call windows
    const [
      { data: propertyData },
      { data: communicationsData, error: communicationsError },
      { data: rawCallWindowsData, error: callWindowsError }
    ] = await Promise.all([
      // Fetch property information
      supabase
        .from('clients')
        .select('house_value, distance_meters, house_url, full_address, duration_seconds')
        .eq('account_id', lead.account_id)
        .single(),

      // Fetch communications history
      supabase
        .from('communications')
        .select('communication_id, created_at, message_type, summary, recording_url, call_window, ai_response')
        .eq('account_id', lead.account_id)
        .order('created_at', { ascending: true }),

      // Fetch call windows
      supabase
        .from('call_windows')
        .select('call_window, window_start_at, window_end_at, created_at, called_at, business_id, account_id, active, status, working_hours')
        .eq('account_id', lead.account_id)
        .not('status', 'is', null)
        .in('status', [1, 2, 3, 4, 10, 11, 12, 13])
        .order('call_window', { ascending: true })
    ])

    const property: PropertyInfo | null = propertyData || null
    const communications: Communication[] = communicationsData || []

    if (communicationsError) {
      logger.warn('Communications fetch failed', { accountId: lead.account_id, error: communicationsError })
    }
    
    let callWindows: CallWindow[] = []
    
    if (callWindowsError) {
      logger.error('Call windows fetch failed', {
        accountId: lead.account_id,
        businessId: businessId,
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

    // Use optimized authentication and authorization
    const authResult = await authenticateAndAuthorizeApiRequest(request, businessIdParam)
    if (authResult instanceof Response) {
      return authResult
    }

    const { user, supabase, businessId } = authResult

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

    // OPTIMIZATION: Update directly, single query validates existence and updates
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update({ caller_type })
      .eq('lead_id', leadIdNumber)
      .eq('business_id', businessId)
      .select('lead_id, caller_type')
      .single()

    if (updateError || !updatedLead) {
      logger.error('Lead caller_type update failed', { leadId: leadIdNumber, businessId: businessId, error: updateError })
      return NextResponse.json(
        { error: updateError ? 'Failed to update lead caller_type' : 'Lead not found or access denied' },
        { status: updateError ? 500 : 404 }
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