import { NextRequest, NextResponse } from 'next/server'
import { validateCompanyAccess, getSuperAdminCompanies, getAuthenticatedUserForAPI } from '@/lib/auth-helpers'
import { BusinessSwitcherData } from '@/types/auth'

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

    // Only superadmins can switch companies
    if (user.profile?.role !== 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions - only superadmins can switch companies' },
        { status: 403 }
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

    // Validate access to the requested company
    const hasAccess = await validateCompanyAccess(companyId)
    
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to the requested company' },
        { status: 403 }
      )
    }

    // Get available companies to find the requested company details
    const availableCompanies = await getSuperAdminCompanies()
    const selectedCompany = availableCompanies.find(c => c.business_id === companyId)

    if (!selectedCompany) {
      return NextResponse.json(
        { success: false, error: 'Company not found in available companies' },
        { status: 404 }
      )
    }

    // Update the user's profile to switch their business_id
    const { updateUserBusinessId } = await import('@/lib/auth-helpers')
    const updateResult = await updateUserBusinessId(user.id, companyId)
    
    if (!updateResult.success) {
      return NextResponse.json(
        { success: false, error: updateResult.error || 'Failed to update user business context' },
        { status: 500 }
      )
    }

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

    // Only superadmins can access all companies
    if (user.profile?.role !== 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions - only superadmins can access all companies' },
        { status: 403 }
      )
    }

    // Get available companies for the current user
    const companies = await getSuperAdminCompanies()

    return NextResponse.json({
      success: true,
      data: companies
    })

  } catch (error) {
    console.error('Error fetching available companies:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}