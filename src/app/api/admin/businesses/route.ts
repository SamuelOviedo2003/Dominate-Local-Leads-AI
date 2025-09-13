import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/businesses
 * List all available businesses for assignment
 * Only accessible to super admins (role = 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization using JWT tokens
    const { user } = await authenticateRequest(request)

    // Only super admins can access business management
    if (user.profile?.role !== 0) {
      return NextResponse.json(
        { error: 'Forbidden - Only super admins can access business management' },
        { status: 403 }
      )
    }

    // Create Supabase client with user's JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const supabase = createClient(token)

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