import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/businesses
 * List all available businesses for assignment
 * Only accessible to super admins (role = 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Only super admins can access business management
    if (user.role !== 0) {
      return NextResponse.json(
        { error: 'Forbidden - Only super admins can access business management' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Fetch all businesses that are enabled for dashboard access
    const { data: businesses, error } = await supabase
      .from('business_clients')
      .select('business_id, company_name, avatar_url, city, state, dashboard')
      .eq('dashboard', true)
      .order('company_name')

    if (error) {
      console.error('Error fetching businesses:', error)
      return NextResponse.json(
        { error: 'Failed to fetch businesses' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: businesses,
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/businesses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}