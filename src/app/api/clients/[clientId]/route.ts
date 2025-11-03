import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndAuthorizeApiRequest } from '@/lib/api-auth-optimized'
import { getSupabaseClient } from '@/lib/supabase/server-optimized'
import { logger } from '@/lib/logging'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    logger.debug('Client data API call started', { clientId: params.clientId })

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
    const { clientId } = params

    // Fetch client data
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('client_id, full_address, distance_meters, duration_seconds, business_id')
      .eq('client_id', clientId)
      .maybeSingle()

    if (clientError) {
      logger.error('Failed to fetch client data', {
        error: clientError,
        clientId,
        businessId
      })
      return NextResponse.json(
        { error: 'Failed to fetch client data' },
        { status: 500 }
      )
    }

    if (!clientData) {
      logger.warn('Client not found', { clientId, businessId })
      return NextResponse.json(
        { success: true, data: { client: null } },
        { status: 200 }
      )
    }

    // Verify the client belongs to the requested business
    if (clientData.business_id !== businessId) {
      logger.warn('Client does not belong to this business', {
        clientId,
        requestedBusinessId: businessId,
        actualBusinessId: clientData.business_id
      })
      return NextResponse.json(
        { success: true, data: { client: null } },
        { status: 200 }
      )
    }

    logger.debug('Client data fetched successfully', {
      clientId,
      businessId
    })

    return NextResponse.json({
      success: true,
      data: {
        client: clientData
      }
    })

  } catch (error) {
    logger.error('Unexpected error in client data API', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      clientId: params.clientId
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
