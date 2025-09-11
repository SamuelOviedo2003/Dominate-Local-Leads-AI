import { NextRequest, NextResponse } from 'next/server'
import { validateBusinessSwitchAccess, getUserAccessibleBusinesses, getAuthenticatedUserForAPI } from '@/lib/auth-helpers-fixed'
import { trackBusinessSwitch, extractRequestContext } from '@/lib/session-monitoring'
import { BusinessSwitcherData } from '@/types/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const requestContext = extractRequestContext(request)
  
  try {
    // Verify user authentication
    const user = await getAuthenticatedUserForAPI()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // ⭐ CRITICAL: Generate unique session ID for tracking
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Validate access to the requested business using RLS system
    const accessResult = await validateBusinessSwitchAccess(user.id, companyId)
    
    if (!accessResult.success) {
      console.error('[COMPANY-SWITCH] Access denied:', {
        userId: user.id,
        companyId,
        error: accessResult.error
      })
      
      return NextResponse.json(
        { success: false, error: accessResult.error || 'Access denied to the requested business' },
        { status: 403 }
      )
    }

    // Get user's accessible businesses to find the requested company details
    const accessibleBusinesses = await getUserAccessibleBusinesses()
    const selectedCompany = accessibleBusinesses.find(c => c.business_id === companyId)

    if (!selectedCompany) {
      return NextResponse.json(
        { success: false, error: 'Business not found in accessible businesses' },
        { status: 404 }
      )
    }

    // ⭐ CRITICAL: Track business switch for session monitoring
    trackBusinessSwitch(sessionId, user.id, companyId, requestContext)

    console.log('[COMPANY-SWITCH] Successful business switch:', {
      userId: user.id,
      userEmail: user.email,
      fromBusiness: 'previous_context', // Could be enhanced to track previous business
      toBusiness: companyId,
      companyName: selectedCompany.company_name,
      sessionId,
      ip: requestContext.ip
    })

    return NextResponse.json({
      success: true,
      data: {
        company: selectedCompany,
        message: `Successfully switched to ${selectedCompany.company_name}`,
        sessionId // Include for client-side tracking
      }
    })

  } catch (error) {
    console.error('[COMPANY-SWITCH] Error switching company:', error)
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const requestContext = extractRequestContext(request)
  
  try {
    // Verify user authentication
    const user = await getAuthenticatedUserForAPI()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get accessible businesses for the current user (works for both super admins and regular users)
    const businesses = await getUserAccessibleBusinesses()

    if (businesses.length === 0) {
      console.warn('[COMPANY-SWITCH] No accessible businesses found:', {
        userId: user.id,
        userEmail: user.email,
        userRole: user.profile?.role
      })
      
      return NextResponse.json(
        { success: false, error: 'No businesses associated with your account' },
        { status: 403 }
      )
    }

    console.log('[COMPANY-SWITCH] Retrieved accessible businesses:', {
      userId: user.id,
      businessCount: businesses.length,
      businesses: businesses.map(b => ({ id: b.business_id, name: b.company_name }))
    })

    return NextResponse.json({
      success: true,
      data: businesses
    })

  } catch (error) {
    console.error('[COMPANY-SWITCH] Error fetching available companies:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}