import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createCookieClient } from '@/lib/supabase/server'
import { AIRecapAction } from '@/types/leads'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateRequest(request)

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const businessIdParam = searchParams.get('businessId')

    if (!leadId || !businessIdParam) {
      return Response.json(
        { error: 'Missing required parameters: leadId and businessId' },
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
    const hasAccess = user.accessibleBusinesses?.some(
      business => business.business_id === businessIdParam
    )
    if (!hasAccess) {
      return Response.json(
        { error: 'Access denied - You do not have access to this business data' },
        { status: 403 }
      )
    }

    const supabase = createCookieClient()

    // Fetch actions data for the specific lead
    const { data: actions, error } = await supabase
      .from('ai_recap_actions')
      .select('*')
      .eq('lead_id', leadId)
      .eq('business_id', requestedBusinessId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return Response.json(
        { error: 'Failed to fetch actions data' },
        { status: 500 }
      )
    }

    return Response.json({
      data: actions as AIRecapAction[],
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