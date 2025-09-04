import { NextRequest, NextResponse } from 'next/server'
import { validateBusinessSwitchAccess, getUserAccessibleBusinesses, getAuthenticatedUserForAPI } from '@/lib/auth-helpers'
import { BusinessSwitcherData } from '@/types/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
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

    // Validate access to the requested business using RLS system
    const accessResult = await validateBusinessSwitchAccess(user.id, companyId)
    
    if (!accessResult.success) {
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

    // In the new system, we don't update the database - business switching is session-based
    // The frontend will handle updating the session context
    return NextResponse.json({
      success: true,
      data: {
        company: selectedCompany,
        message: `Successfully switched to ${selectedCompany.company_name}`
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