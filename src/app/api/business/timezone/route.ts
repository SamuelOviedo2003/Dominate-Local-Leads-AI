import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndAuthorizeApiRequest } from '@/lib/api-auth-optimized'
import { getSupabaseClient } from '@/lib/supabase/server-optimized'
import { logger } from '@/lib/logging'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    logger.debug('Business timezone API call started')

    // Extract query parameters for authentication
    const { searchParams } = new URL(request.url)
    const businessIdParam = searchParams.get('businessId')

    if (!businessIdParam) {
      return NextResponse.json(
        { error: 'businessId parameter is required' },
        { status: 400 }
      )
    }

    // Use optimized authentication and authorization
    const authResult = await authenticateAndAuthorizeApiRequest(request, businessIdParam)
    if (authResult instanceof Response) {
      return authResult
    }

    const { businessId } = authResult
    const supabase = getSupabaseClient()

    // Fetch business timezone
    const { data: businessData, error: businessError } = await supabase
      .from('business_clients')
      .select('time_zone')
      .eq('business_id', businessId)
      .single()

    if (businessError) {
      logger.error('Failed to fetch business timezone', {
        error: businessError,
        businessId
      })
      return NextResponse.json(
        { error: 'Failed to fetch business timezone' },
        { status: 500 }
      )
    }

    logger.debug('Business timezone fetched successfully', {
      businessId,
      timezone: businessData?.time_zone
    })

    return NextResponse.json({
      success: true,
      timezone: businessData?.time_zone || 'America/New_York'
    })

  } catch (error) {
    logger.error('Unexpected error in business timezone API', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}