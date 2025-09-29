import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndAuthorizeApiRequest } from '@/lib/api-auth-optimized'
import { getSupabaseClient } from '@/lib/supabase/server-optimized'
import { logger } from '@/lib/logging'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    logger.debug('Profiles with role = 5 API call started')

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

    // Fetch profiles where role = 5
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, business_id, role')
      .eq('role', 5)
      .order('full_name')

    if (profilesError) {
      logger.error('Failed to fetch profiles with role = 5', {
        error: profilesError,
        businessId
      })
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        { status: 500 }
      )
    }

    logger.debug('Profiles with role = 5 fetched successfully', {
      businessId,
      profileCount: profiles?.length || 0,
      profiles: profiles?.map(p => ({ id: p.id, name: p.full_name, business_id: p.business_id }))
    })

    return NextResponse.json({
      success: true,
      profiles: profiles || []
    })

  } catch (error) {
    logger.error('Unexpected error in profiles by business API', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}