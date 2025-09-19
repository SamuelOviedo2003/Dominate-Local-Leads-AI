import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createCookieClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logging'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    logger.debug('Follow up leads API call started')

    // Get authenticated user using the proper auth method
    const { user } = await authenticateRequest(request)

    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const businessIdParam = searchParams.get('businessId')

    if (!businessIdParam) {
      return Response.json(
        { error: 'Business ID is required' },
        { status: 400 }
      )
    }

    const requestedBusinessId = parseInt(businessIdParam, 10)
    if (isNaN(requestedBusinessId)) {
      return Response.json(
        { error: 'businessId must be a valid number' },
        { status: 400 }
      )
    }

    // Validate business access permissions using user's accessible businesses
    logger.debug('Business access validation', {
      businessIdParam,
      accessibleBusinesses: user.accessibleBusinesses?.map(b => b.business_id),
      userId: user.id
    })

    const hasAccess = user.accessibleBusinesses?.some(
      business => business.business_id === businessIdParam
    )
    if (!hasAccess) {
      logger.warn('Business access denied', {
        businessIdParam,
        accessibleBusinesses: user.accessibleBusinesses?.map(b => b.business_id),
        userId: user.id
      })
      return Response.json(
        { error: 'Access denied - You do not have access to this business data' },
        { status: 403 }
      )
    }

    logger.debug('Follow up leads query params', { businessId: businessIdParam, userId: user.id })

    const supabase = createCookieClient()

    // Fetch follow up leads - leads that have ai_recap_purposes data
    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        *,
        clients!inner (
          account_id,
          business_id,
          full_address,
          house_value,
          house_url,
          distance_meters,
          duration_seconds
        )
      `)
      .eq('business_id', requestedBusinessId)
      .not('ai_recap_purposes', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Database error:', error)
      return Response.json(
        { error: 'Failed to fetch follow up leads data' },
        { status: 500 }
      )
    }

    logger.debug('Follow up leads fetched successfully', {
      count: leads?.length || 0,
      businessId: businessIdParam
    })

    // Helper function to format datetime with hours and minutes
    const formatDateTimeWithTime = (dateString: string): string => {
      const date = new Date(dateString)
      return date.toISOString()
    }

    // Transform the data to match the expected LeadWithClient structure
    const transformedLeads = leads?.map(leadData => {
      const { clients, ...lead } = leadData
      return {
        ...lead,
        created_at: formatDateTimeWithTime(lead.created_at),
        client: Array.isArray(clients) ? clients[0] : clients
      }
    }) || []

    return Response.json({
      data: transformedLeads,
      success: true
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}