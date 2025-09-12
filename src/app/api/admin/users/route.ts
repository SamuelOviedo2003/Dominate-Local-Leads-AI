import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getAuthenticatedUserFromRequest } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

interface UserWithBusinesses {
  id: string
  email: string
  full_name: string
  role: number
  business_id: number
  created_at: string
  updated_at: string
  assigned_businesses: {
    business_id: number
    company_name: string
    avatar_url: string | null
  }[]
}

/**
 * GET /api/admin/users
 * List all users with their business assignments
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

    // Only super admins can access user management
    if (user.role !== 0) {
      return NextResponse.json(
        { error: 'Forbidden - Only super admins can access user management' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    
    // Fetch all users with their profile data using service role to bypass RLS
    const supabaseService = createServiceRoleClient()
    const { data: users, error: usersError } = await supabaseService
      .from('profiles')
      .select('id, email, full_name, role, business_id, created_at, updated_at')
      .order('full_name')

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // Fetch business assignments for each user from profile_businesses table
    const usersWithBusinesses: UserWithBusinesses[] = await Promise.all(
      users.map(async (userProfile) => {
        // For super admins (role 0), they have access to all businesses
        if (userProfile.role === 0) {
          const { data: allBusinesses } = await supabaseService
            .from('business_clients')
            .select('business_id, company_name, avatar_url')
            .eq('dashboard', true)
            .order('company_name')

          return {
            ...userProfile,
            assigned_businesses: allBusinesses || []
          }
        }

        // For regular users, get assigned businesses from profile_businesses table
        const { data: assignedBusinesses } = await supabase
          .from('profile_businesses')
          .select(`
            business_id,
            business_clients!inner(
              business_id,
              company_name,
              avatar_url
            )
          `)
          .eq('profile_id', userProfile.id)

        const businesses = assignedBusinesses?.map((ab: any) => ({
          business_id: ab.business_clients.business_id,
          company_name: ab.business_clients.company_name,
          avatar_url: ab.business_clients.avatar_url
        })) || []

        return {
          ...userProfile,
          assigned_businesses: businesses
        }
      })
    )

    return NextResponse.json({
      data: usersWithBusinesses,
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}