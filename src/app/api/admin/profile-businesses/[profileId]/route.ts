import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getAuthenticatedUserForAPI } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    profileId: string
  }
}

/**
 * GET /api/admin/profile-businesses/[profileId]
 * Get user's business assignments
 * Only accessible to super admins (role = 0)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication and authorization
    const user = await getAuthenticatedUserForAPI()
    if (!user || !user.profile) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Only super admins can access user business assignments
    if (user.profile.role !== 0) {
      return NextResponse.json(
        { error: 'Forbidden - Only super admins can view user business assignments' },
        { status: 403 }
      )
    }

    const { profileId } = params

    if (!profileId) {
      return NextResponse.json(
        { error: 'Missing profileId parameter' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const supabaseService = createServiceRoleClient()

    // Validate that the user exists (using service role to bypass RLS)
    const { data: targetProfile, error: profileError } = await supabaseService
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', profileId)
      .single()

    if (profileError || !targetProfile) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    // For super admins (role 0), return all available businesses since they have access to all
    if (targetProfile.role === 0) {
      const { data: allBusinesses, error: businessError } = await supabase
        .from('business_clients')
        .select('business_id, company_name, avatar_url, city, state')
        .eq('dashboard', true)
        .order('company_name')

      if (businessError) {
        console.error('Error fetching all businesses:', businessError)
        return NextResponse.json(
          { error: 'Failed to fetch business data' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        data: {
          user: targetProfile,
          assigned_businesses: allBusinesses || [],
          is_super_admin: true
        },
        success: true
      })
    }

    // For regular users, get assigned businesses from profile_businesses table
    const { data: assignedBusinesses, error } = await supabase
      .from('profile_businesses')
      .select(`
        business_id,
        business_clients!inner(
          business_id,
          company_name,
          avatar_url,
          city,
          state
        )
      `)
      .eq('profile_id', profileId)

    if (error) {
      console.error('Error fetching user business assignments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch user business assignments' },
        { status: 500 }
      )
    }

    // Transform the data to match expected format
    const businesses = assignedBusinesses?.map(ab => ({
      business_id: ab.business_clients.business_id,
      company_name: ab.business_clients.company_name,
      avatar_url: ab.business_clients.avatar_url,
      city: ab.business_clients.city,
      state: ab.business_clients.state
    })) || []

    return NextResponse.json({
      data: {
        user: targetProfile,
        assigned_businesses: businesses,
        is_super_admin: false
      },
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/profile-businesses/[profileId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}