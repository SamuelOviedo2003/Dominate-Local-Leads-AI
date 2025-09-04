import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserForAPI, validateBusinessAccessForAPI } from '@/lib/auth-helpers'
import { CallerTypeDistribution } from '@/types/leads'

export const dynamic = 'force-dynamic'

/**
 * API endpoint for retrieving caller type distribution filtered by source
 * Optimized for real-time usage (hover events) with database-level aggregation
 * 
 * Required database indexes for optimal performance:
 * - idx_incoming_calls_business_created ON (business_id, created_at DESC)
 * - idx_incoming_calls_business_source_created ON (business_id, source, created_at DESC)
 * - idx_incoming_calls_business_source_caller_created ON (business_id, source, caller_type, created_at DESC) WHERE source IS NOT NULL AND caller_type IS NOT NULL
 */

/**
 * Validates and sanitizes the source parameter
 */
function validateSource(source: string | null): string {
  if (!source || typeof source !== 'string') {
    throw new Error('Source parameter is required and must be a string')
  }
  
  const trimmedSource = source.trim()
  if (trimmedSource.length === 0) {
    throw new Error('Source parameter cannot be empty')
  }
  
  if (trimmedSource.length > 255) {
    throw new Error('Source parameter is too long (max 255 characters)')
  }
  
  // Basic sanitization - remove potentially dangerous characters
  const sanitizedSource = trimmedSource.replace(/[<>"']/g, '')
  if (sanitizedSource !== trimmedSource) {
    throw new Error('Source parameter contains invalid characters')
  }
  
  return sanitizedSource
}

/**
 * Validates date parameter and returns a Date object
 */
function validateDate(dateString: string | null, paramName: string): Date {
  if (!dateString) {
    throw new Error(`${paramName} parameter is required`)
  }
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    throw new Error(`${paramName} must be a valid ISO date string`)
  }
  
  // Ensure date is not in the future (with 1 day tolerance for timezone issues)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (date > tomorrow) {
    throw new Error(`${paramName} cannot be in the future`)
  }
  
  return date
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Rate limiting hint for real-time usage
    // Consider implementing rate limiting middleware for hover events
    const userAgent = request.headers.get('user-agent') || 'unknown'
    if (userAgent.includes('bot') || userAgent.includes('crawler')) {
      console.warn('Bot/crawler detected, consider rate limiting')
    }

    // Check authentication
    const user = await getAuthenticatedUserForAPI()
    if (!user) {
      console.warn('Unauthorized access attempt to source-caller-types endpoint')
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const businessIdParam = searchParams.get('businessId')
    const sourceParam = searchParams.get('source')

    // Comprehensive input validation
    let startDate: Date
    let requestedBusinessId: number
    let source: string
    
    try {
      startDate = validateDate(startDateParam, 'startDate')
      source = validateSource(sourceParam)
      
      if (!businessIdParam) {
        throw new Error('businessId parameter is required')
      }
      
      requestedBusinessId = parseInt(businessIdParam, 10)
      if (isNaN(requestedBusinessId) || requestedBusinessId <= 0) {
        throw new Error('businessId must be a positive integer')
      }
    } catch (validationError) {
      console.warn('Input validation failed:', validationError)
      return NextResponse.json(
        { error: `Invalid input: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}` },
        { status: 400 }
      )
    }

    // Validate business access using the new profile_businesses system
    const hasAccess = await validateBusinessAccessForAPI(user, businessIdParam!)
    if (!hasAccess) {
      console.warn(`Access denied: User ${user.profile?.id || user.id} tried to access business ${requestedBusinessId}`)
      return NextResponse.json(
        { error: 'Access denied - You do not have access to this business data' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Optimized query with database-level filtering (consistent with other endpoints)
    const { data: callerTypeData, error } = await supabase
      .from('incoming_calls')
      .select('caller_type')
      .gte('created_at', startDate.toISOString())
      .eq('business_id', requestedBusinessId)
      .eq('source', source)
      .not('caller_type', 'is', null)
      .neq('caller_type', 'Unknown') // Exclude "Unknown" values for consistency with caller-type-distribution

    if (error) {
      console.error('Database error in source-caller-types query:', {
        error,
        businessId: requestedBusinessId,
        source: source,
        startDate: startDate.toISOString()
      })
      return NextResponse.json(
        { error: 'Failed to fetch caller type distribution data' },
        { status: 500 }
      )
    }

    // Process and group the data with Map for better performance
    const callerTypeCount = new Map<string, number>()
    callerTypeData?.forEach(call => {
      if (call.caller_type && call.caller_type !== 'Unknown') {
        callerTypeCount.set(call.caller_type, (callerTypeCount.get(call.caller_type) || 0) + 1)
      }
    })

    // Convert to array format sorted by count (descending)
    const callerTypeDistribution: CallerTypeDistribution[] = Array.from(callerTypeCount.entries())
      .map(([caller_type, count]) => ({ caller_type, count }))
      .sort((a, b) => b.count - a.count)

    const queryTime = Date.now() - startTime

    // Handle empty results gracefully
    if (callerTypeDistribution.length === 0) {
      console.info(`No caller type data found for source: ${source}, business: ${requestedBusinessId}, since: ${startDate.toISOString()}`)
    } else {
      console.info(`Source-caller-types query completed in ${queryTime}ms for source: ${source}, found ${callerTypeDistribution.length} caller types`)
    }

    // Add cache-control headers for real-time usage optimization
    const response = NextResponse.json({
      data: callerTypeDistribution,
      success: true,
      metadata: {
        source: source,
        startDate: startDate.toISOString(),
        businessId: requestedBusinessId,
        queryTimeMs: queryTime,
        recordCount: callerTypeDistribution.length
      }
    })

    // Set appropriate cache headers for real-time data
    // Short cache for hover events but allow stale-while-revalidate
    response.headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
    response.headers.set('X-Response-Time', `${queryTime}ms`)
    
    return response

  } catch (error) {
    const queryTime = Date.now() - startTime
    console.error('Unexpected error in source-caller-types endpoint:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      queryTimeMs: queryTime,
      url: request.url
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        success: false,
        metadata: {
          queryTimeMs: queryTime
        }
      },
      { status: 500 }
    )
  }
}