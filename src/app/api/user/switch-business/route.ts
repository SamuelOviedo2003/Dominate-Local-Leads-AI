import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createCookieClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateRequest(request)
    const { businessId } = await request.json()

    // Validate business ID
    const businessIdInt = parseInt(businessId, 10)
    if (isNaN(businessIdInt)) {
      return Response.json(
        { success: false, error: 'Invalid business ID' },
        { status: 400 }
      )
    }

    // Check if user has access to this business
    const hasAccess = user.accessibleBusinesses?.some(
      business => business.business_id === businessId
    )
    if (!hasAccess) {
      return Response.json(
        { success: false, error: 'Access denied to this business' },
        { status: 403 }
      )
    }

    // Update user's business context using cookie client
    const supabase = createCookieClient()
    const { error } = await supabase
      .from('profiles')
      .update({ business_id: businessIdInt })
      .eq('id', user.id)

    if (error) {
      throw new Error('Failed to update business context')
    }

    return Response.json({ success: true })
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Business switch failed' },
      { status: 400 }
    )
  }
}