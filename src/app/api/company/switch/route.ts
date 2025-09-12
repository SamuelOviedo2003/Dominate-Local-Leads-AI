import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest, getAuthenticatedUser, validateBusinessAccessWithToken, getAvailableBusinessesWithToken } from '@/lib/auth-utils'
import { BusinessSwitcherData } from '@/types/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const user = await getAuthenticatedUserFromRequest(request)
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

    // Get JWT token from Authorization header for consistent auth
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    // Validate access to the requested business using JWT token
    const hasAccess = await validateBusinessAccessWithToken(user.id, companyId, token)
    
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to the requested business' },
        { status: 403 }
      )
    }

    // Get user's accessible businesses to find the requested company details
    const accessibleBusinesses = await getAvailableBusinessesWithToken(user.id, token)
    const selectedCompany = accessibleBusinesses.find(c => c.id === companyId)

    if (!selectedCompany) {
      return NextResponse.json(
        { success: false, error: 'Business not found in accessible businesses' },
        { status: 404 }
      )
    }

    // In the new system, we don't update the database - business switching is session-based
    // The frontend will handle updating the session context
    return NextResponse.json({
      success: true,
      data: {
        company: {
          business_id: selectedCompany.id,
          company_name: selectedCompany.name,
          permalink: selectedCompany.permalink,
          avatar_url: selectedCompany.avatar_url,
          city: selectedCompany.city,
          state: selectedCompany.state
        },
        message: `Successfully switched to ${selectedCompany.name}`
      }
    })

  } catch (error) {
    console.error('Error switching company:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Verify user authentication
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get accessible businesses for the current user (works for both super admins and regular users)
    const businessesData = await getAvailableBusinessesWithToken(user.id)
    
    // Format to match BusinessSwitcherData format
    const businesses = businessesData.map(b => ({
      business_id: b.id,
      company_name: b.name,
      permalink: b.permalink,
      avatar_url: b.avatar_url,
      city: b.city,
      state: b.state
    }))

    if (businesses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No businesses associated with your account' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: businesses
    })

  } catch (error) {
    console.error('Error fetching available companies:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}