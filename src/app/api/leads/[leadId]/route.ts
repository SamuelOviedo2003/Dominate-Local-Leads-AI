import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserForAPI } from '@/lib/auth-helpers'
import { LeadDetails, Lead, PropertyInfo, Communication, CallWindow } from '@/types/leads'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ leadId: string }>
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

    // Fetch call windows with comprehensive debugging
    const debugStartTime = performance.now()
    console.log(`[DEBUG] === COMPREHENSIVE CALL WINDOWS DEBUGGING START ===`)
    console.log(`[DEBUG] Timestamp: ${new Date().toISOString()}`)
    
    // Authentication and Context Logging
    console.log(`[DEBUG] Authentication Context:`, {
      userId: user.id,
      userEmail: user.email,
      userBusinessId: userBusinessId,
      userRole: user.profile.role,
      requestedBusinessId: requestedBusinessId,
      isSupperAdmin: user.profile.role === 0,
      businessAccessGranted: user.profile.role === 0 || requestedBusinessId === userBusinessId
    })
    
    console.log(`[DEBUG] Lead Context:`, {
      leadId: leadIdNumber,
      accountId: lead.account_id,
      leadBusinessId: lead.business_id,
      businessIdMatch: lead.business_id === requestedBusinessId.toString()
    })
    
    // Initialize debugging results object
    const debugResults: any = {
      queryStrategies: [],
      timings: {},
      errors: [],
      successfulQueries: []
    }
    
    // Strategy 1: Count total call_windows (basic connectivity test)
    console.log(`[DEBUG] Strategy 1: Testing basic connectivity to call_windows table...`)
    const strategy1Start = performance.now()
    try {
      const { count: totalCount, error: countError } = await supabase
        .from('call_windows')
        .select('*', { count: 'exact', head: true })
      
      const strategy1Time = performance.now() - strategy1Start
      debugResults.timings.strategy1 = `${strategy1Time.toFixed(2)}ms`
      
      if (countError) {
        console.log(`[DEBUG] Strategy 1 FAILED:`, {
          error: countError,
          timing: debugResults.timings.strategy1,
          errorType: countError.code === '42501' ? 'RLS_POLICY_VIOLATION' : 'OTHER'
        })
        debugResults.errors.push({ strategy: 1, error: countError, type: 'COUNT_QUERY' })
      } else {
        console.log(`[DEBUG] Strategy 1 SUCCESS:`, {
          totalRecords: totalCount,
          timing: debugResults.timings.strategy1
        })
        debugResults.successfulQueries.push({ strategy: 1, type: 'COUNT_QUERY', result: totalCount })
      }
    } catch (error) {
      debugResults.errors.push({ strategy: 1, error, type: 'COUNT_QUERY_EXCEPTION' })
      console.log(`[DEBUG] Strategy 1 EXCEPTION:`, error)
    }
    
    // Strategy 2: Sample data without filters
    console.log(`[DEBUG] Strategy 2: Getting sample data without filters...`)
    const strategy2Start = performance.now()
    let allCallWindows: any[] = []
    try {
      const { data: sampleData, error: sampleError } = await supabase
        .from('call_windows')
        .select('*')
        .limit(5)
      
      const strategy2Time = performance.now() - strategy2Start
      debugResults.timings.strategy2 = `${strategy2Time.toFixed(2)}ms`
      
      if (sampleError) {
        console.log(`[DEBUG] Strategy 2 FAILED:`, {
          error: sampleError,
          timing: debugResults.timings.strategy2
        })
        debugResults.errors.push({ strategy: 2, error: sampleError, type: 'SAMPLE_QUERY' })
      } else {
        allCallWindows = sampleData || []
        console.log(`[DEBUG] Strategy 2 SUCCESS:`, {
          recordsReturned: allCallWindows.length,
          timing: debugResults.timings.strategy2,
          sampleStructure: allCallWindows[0] || 'NO_RECORDS',
          uniqueAccountIds: [...new Set(allCallWindows.map(cw => cw.account_id))],
          uniqueBusinessIds: [...new Set(allCallWindows.map(cw => cw.business_id))]
        })
        debugResults.successfulQueries.push({ 
          strategy: 2, 
          type: 'SAMPLE_QUERY', 
          result: {
            count: allCallWindows.length,
            sample: allCallWindows[0]
          }
        })
      }
    } catch (error) {
      debugResults.errors.push({ strategy: 2, error, type: 'SAMPLE_QUERY_EXCEPTION' })
      console.log(`[DEBUG] Strategy 2 EXCEPTION:`, error)
    }
    
    // Strategy 3: Filter by account_id (primary query)
    console.log(`[DEBUG] Strategy 3: Filtering by account_id (${lead.account_id})...`)
    const strategy3Start = performance.now()
    let callWindowsData: any[] = []
    let callWindowsError: any = null
    try {
      const result = await supabase
        .from('call_windows')
        .select('window_start_at, window_end_at, called_at, called_out, business_id, account_id')
        .eq('account_id', lead.account_id)
        .order('window_start_at', { ascending: true })
      
      const strategy3Time = performance.now() - strategy3Start
      debugResults.timings.strategy3 = `${strategy3Time.toFixed(2)}ms`
      
      callWindowsData = result.data || []
      callWindowsError = result.error
      
      if (callWindowsError) {
        console.log(`[DEBUG] Strategy 3 FAILED:`, {
          accountIdUsed: lead.account_id,
          error: callWindowsError,
          timing: debugResults.timings.strategy3,
          errorDetails: {
            message: callWindowsError.message,
            code: callWindowsError.code,
            hint: callWindowsError.hint,
            details: callWindowsError.details
          }
        })
        debugResults.errors.push({ strategy: 3, error: callWindowsError, type: 'ACCOUNT_FILTER_QUERY' })
      } else {
        console.log(`[DEBUG] Strategy 3 SUCCESS:`, {
          accountIdUsed: lead.account_id,
          recordsFound: callWindowsData.length,
          timing: debugResults.timings.strategy3,
          dataPreview: callWindowsData.slice(0, 2)
        })
        debugResults.successfulQueries.push({ 
          strategy: 3, 
          type: 'ACCOUNT_FILTER_QUERY', 
          result: {
            count: callWindowsData.length,
            preview: callWindowsData.slice(0, 2)
          }
        })
      }
    } catch (error) {
      debugResults.errors.push({ strategy: 3, error, type: 'ACCOUNT_FILTER_QUERY_EXCEPTION' })
      console.log(`[DEBUG] Strategy 3 EXCEPTION:`, error)
    }
    
    // Strategy 4: Filter by business_id
    console.log(`[DEBUG] Strategy 4: Filtering by business_id (${requestedBusinessId})...`)
    const strategy4Start = performance.now()
    try {
      const { data: businessCallWindows, error: businessCallWindowsError } = await supabase
        .from('call_windows')
        .select('*')
        .eq('business_id', requestedBusinessId)
        .limit(10)
      
      const strategy4Time = performance.now() - strategy4Start
      debugResults.timings.strategy4 = `${strategy4Time.toFixed(2)}ms`
      
      if (businessCallWindowsError) {
        console.log(`[DEBUG] Strategy 4 FAILED:`, {
          businessIdUsed: requestedBusinessId,
          error: businessCallWindowsError,
          timing: debugResults.timings.strategy4
        })
        debugResults.errors.push({ strategy: 4, error: businessCallWindowsError, type: 'BUSINESS_FILTER_QUERY' })
      } else {
        console.log(`[DEBUG] Strategy 4 SUCCESS:`, {
          businessIdUsed: requestedBusinessId,
          recordsFound: businessCallWindows?.length || 0,
          timing: debugResults.timings.strategy4,
          matchingAccountIds: businessCallWindows?.map(cw => cw.account_id) || []
        })
        debugResults.successfulQueries.push({ 
          strategy: 4, 
          type: 'BUSINESS_FILTER_QUERY', 
          result: {
            count: businessCallWindows?.length || 0,
            accountIds: businessCallWindows?.map(cw => cw.account_id) || []
          }
        })
      }
    } catch (error) {
      debugResults.errors.push({ strategy: 4, error, type: 'BUSINESS_FILTER_QUERY_EXCEPTION' })
      console.log(`[DEBUG] Strategy 4 EXCEPTION:`, error)
    }
    
    // Strategy 5: Combined filters (account_id AND business_id)
    console.log(`[DEBUG] Strategy 5: Combined filters (account_id AND business_id)...`)
    const strategy5Start = performance.now()
    try {
      const { data: combinedData, error: combinedError } = await supabase
        .from('call_windows')
        .select('*')
        .eq('account_id', lead.account_id)
        .eq('business_id', requestedBusinessId)
      
      const strategy5Time = performance.now() - strategy5Start
      debugResults.timings.strategy5 = `${strategy5Time.toFixed(2)}ms`
      
      if (combinedError) {
        console.log(`[DEBUG] Strategy 5 FAILED:`, {
          filters: { account_id: lead.account_id, business_id: requestedBusinessId },
          error: combinedError,
          timing: debugResults.timings.strategy5
        })
        debugResults.errors.push({ strategy: 5, error: combinedError, type: 'COMBINED_FILTER_QUERY' })
      } else {
        console.log(`[DEBUG] Strategy 5 SUCCESS:`, {
          filters: { account_id: lead.account_id, business_id: requestedBusinessId },
          recordsFound: combinedData?.length || 0,
          timing: debugResults.timings.strategy5,
          data: combinedData
        })
        debugResults.successfulQueries.push({ 
          strategy: 5, 
          type: 'COMBINED_FILTER_QUERY', 
          result: {
            count: combinedData?.length || 0,
            data: combinedData
          }
        })
      }
    } catch (error) {
      debugResults.errors.push({ strategy: 5, error, type: 'COMBINED_FILTER_QUERY_EXCEPTION' })
      console.log(`[DEBUG] Strategy 5 EXCEPTION:`, error)
    }
    
    const debugTotalTime = performance.now() - debugStartTime
    debugResults.totalDebugTime = `${debugTotalTime.toFixed(2)}ms`
    
    console.log(`[DEBUG] === DEBUGGING SUMMARY ===`)
    console.log(`[DEBUG] Total Debug Time: ${debugResults.totalDebugTime}`)
    console.log(`[DEBUG] Successful Queries: ${debugResults.successfulQueries.length}/5`)
    console.log(`[DEBUG] Failed Queries: ${debugResults.errors.length}/5`)
    console.log(`[DEBUG] Error Summary:`, debugResults.errors.map((e: any) => ({ strategy: e.strategy, type: e.type, code: e.error?.code })))
    console.log(`[DEBUG] === COMPREHENSIVE CALL WINDOWS DEBUGGING END ===`)

    const callWindows: CallWindow[] = callWindowsData || []

    // Enhanced error handling and diagnostics
    if (callWindowsError) {
      console.error(`[ERROR] Call windows fetch failed:`, {
        primaryError: callWindowsError,
        context: {
          accountId: lead.account_id,
          businessId: requestedBusinessId,
          leadId: leadIdNumber,
          userId: user.id,
          userRole: user.profile.role
        },
        errorAnalysis: {
          isRLSError: callWindowsError.code === '42501' || callWindowsError.message?.includes('policy'),
          isAuthError: callWindowsError.code === '401' || callWindowsError.message?.includes('unauthorized'),
          isNotFoundError: callWindowsError.code === '404',
          isServerError: callWindowsError.code?.toString().startsWith('5')
        },
        debugResults: {
          totalErrors: debugResults.errors.length,
          successfulQueries: debugResults.successfulQueries.length,
          hasAnyData: debugResults.successfulQueries.some((q: any) => q.result.count > 0)
        }
      })
      
      // Specific error type handling
      if (callWindowsError.code === '42501' || callWindowsError.message?.includes('policy')) {
        console.error(`[RLS_ERROR] Row Level Security policy is blocking access to call_windows table.`)
        console.error(`[RLS_ERROR] User ${user.id} with role ${user.profile.role} cannot access business ${requestedBusinessId} data.`)
        console.error(`[RLS_ERROR] Check RLS policies for call_windows table and ensure proper business_id matching.`)
      } else if (callWindowsError.code === '401') {
        console.error(`[AUTH_ERROR] Authentication failed for call_windows query.`)
      } else {
        console.error(`[QUERY_ERROR] Database query error: ${callWindowsError.message}`)
      }
    } else {
      console.log(`[SUCCESS] Call windows query succeeded:`, {
        recordsReturned: callWindows.length,
        accountId: lead.account_id,
        businessId: requestedBusinessId,
        debugSummary: {
          successfulQueries: debugResults.successfulQueries.length,
          totalErrors: debugResults.errors.length,
          timing: debugResults.totalDebugTime
        }
      })
    }

    const leadDetails: LeadDetails = {
      lead,
      property,
      communications,
      callWindows
    }

    console.log(`[DEBUG] Final response for lead ${leadId}:`, {
      leadId: lead.lead_id,
      accountId: lead.account_id,
      callWindowsCount: callWindows.length,
      callWindowsSample: callWindows.slice(0, 2) // Show first 2 for debugging
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