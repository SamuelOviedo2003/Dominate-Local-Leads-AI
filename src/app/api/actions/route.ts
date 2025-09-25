import { NextRequest } from 'next/server'
import { authenticateAndAuthorizeApiRequest } from '@/lib/api-auth-optimized'
import { AIRecapAction } from '@/types/leads'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const businessIdParam = searchParams.get('businessId')

    if (!leadId || !businessIdParam) {
      return Response.json(
        { error: 'Missing required parameters: leadId and businessId' },
        { status: 400 }
      )
    }

    // Use optimized authentication and authorization
    const authResult = await authenticateAndAuthorizeApiRequest(request, businessIdParam)
    if (authResult instanceof Response) {
      return authResult
    }

    const { user, supabase, businessId } = authResult

    // Fetch actions data for the specific lead using cached business ID
    const { data: actions, error } = await supabase
      .from('ai_recap_actions')
      .select('*')
      .eq('lead_id', leadId)
      .eq('business_id', businessId)
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