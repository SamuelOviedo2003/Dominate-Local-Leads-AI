import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserForAPI } from '@/lib/auth-helpers'
import { LeadDetails, Lead, PropertyInfo, Communication, CallWindow } from '@/types/leads'

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
        
        return {
          callNumber: callNumber as 1,
          medalTier,
          responseTime: responseTimeMinutes !== null ? formatResponseTime(responseTimeMinutes) : undefined,
          calledAt
        }
      } else {
        // working_hours = false: Record just the time when the call was made (like other calls)
        const status = calledAt ? 'called' : 'No call'
        
        return {
          callNumber: callNumber as 1,
          status,
          calledAt
        }
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
      // Apply business logic to process call windows with working_hours context
      callWindows = processCallWindows(rawCallWindowsData, lead.lead_id, lead.working_hours)
    } else {
      callWindows = []
    }


    const leadDetails: LeadDetails = {
      lead,
      property,
      communications,
      callWindows
    }


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