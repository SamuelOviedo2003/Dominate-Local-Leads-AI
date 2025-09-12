import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest, validateBusinessAccessWithToken, updateUserBusinessContextWithToken } from '@/lib/auth-utils'
import { withAuthenticatedApiDebug, logBusinessAccess } from '@/lib/api-debug-middleware'
import { debugBusiness, extractUserMetadata } from '@/lib/debug'

export const POST = withAuthenticatedApiDebug(
  async (request: NextRequest, context, user) => {
    const { businessId } = await request.json()

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'Business ID required', requestId: context.requestId },
        { status: 400 }
      )
    }

    // Get JWT token from Authorization header for consistent auth
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    // Validate business access permissions with token
    const hasAccess = await validateBusinessAccessWithToken(user.id, businessId, token)
    
    // Log business access validation
    logBusinessAccess(context, businessId, hasAccess, user)
    
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this business', requestId: context.requestId },
        { status: 403 }
      )
    }

    // Log business switch attempt
    const userMetadata = extractUserMetadata(user, { businessId })
    debugBusiness('Business switch attempt', { 
      fromBusinessId: user.businessId,
      toBusinessId: businessId,
      requestId: context.requestId 
    }, userMetadata)

    // Atomic update to profiles.business_id with token
    const success = await updateUserBusinessContextWithToken(user.id, businessId, token)

    if (!success) {
      debugBusiness('Business switch failed', { 
        businessId,
        reason: 'Database update failed',
        requestId: context.requestId 
      }, userMetadata)
      
      return NextResponse.json(
        { success: false, error: 'Failed to switch business', requestId: context.requestId },
        { status: 500 }
      )
    }

    debugBusiness('Business switch successful', { 
      businessId,
      requestId: context.requestId 
    }, userMetadata)

    return NextResponse.json({
      success: true,
      data: { businessId }
    })
  },
  getAuthenticatedUserFromRequest
)