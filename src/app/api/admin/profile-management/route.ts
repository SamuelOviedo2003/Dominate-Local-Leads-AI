import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createClient } from '@/lib/supabase/server'

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

interface Business {
  business_id: number
  company_name: string
  avatar_url: string | null
  city: string | null
  state: string | null
  dashboard: boolean
}

interface ProfileManagementData {
  users: UserWithBusinesses[]
  businesses: Business[]
}

/**
 * GET /api/admin/profile-management
 * Consolidated endpoint to fetch all profile management data in one request
 * Only accessible to super admins (role = 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Single authentication check
    const { user } = await authenticateRequest(request)

    // Only super admins can access profile management
    if (user.profile?.role !== 0) {
      return NextResponse.json(
        { error: 'Forbidden - Only super admins can access profile management' },
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

    // Fetch all data in parallel with optimized queries
    const [profilesResult, businessesResult, profileBusinessesResult] = await Promise.all([
      // Get all user profiles (current super admin + all regular users)
      supabase
        .from('profiles')
        .select('id, email, full_name, role, business_id, created_at, updated_at')
        .or(`id.eq.${user.id},role.is.null,role.neq.0`)
        .order('full_name'),

      // Get all businesses enabled for dashboard
      supabase
        .from('business_clients')
        .select('business_id, company_name, avatar_url, city, state, dashboard')
        .eq('dashboard', true)
        .order('company_name'),

      // Get all profile-business relationships in one query
      supabase
        .from('profile_businesses')
        .select(`
          profile_id,
          business_id,
          business_clients!inner(
            business_id,
            company_name,
            avatar_url
          )
        `)
    ])

    if (profilesResult.error) {
      console.error('Error fetching profiles:', profilesResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch user profiles' },
        { status: 500 }
      )
    }

    if (businessesResult.error) {
      console.error('Error fetching businesses:', businessesResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch businesses' },
        { status: 500 }
      )
    }

    if (profileBusinessesResult.error) {
      console.error('Error fetching profile businesses:', profileBusinessesResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch profile business assignments' },
        { status: 500 }
      )
    }

    const profiles = profilesResult.data || []
    const businesses = businessesResult.data || []
    const profileBusinesses = profileBusinessesResult.data || []

    // Create a map of profile business assignments for efficient lookup
    const businessAssignments = new Map<string, Array<{
      business_id: number
      company_name: string
      avatar_url: string | null
    }>>()

    profileBusinesses.forEach((pb: any) => {
      const profileId = pb.profile_id
      const businessData = {
        business_id: pb.business_clients.business_id,
        company_name: pb.business_clients.company_name,
        avatar_url: pb.business_clients.avatar_url
      }

      if (!businessAssignments.has(profileId)) {
        businessAssignments.set(profileId, [])
      }
      businessAssignments.get(profileId)!.push(businessData)
    })

    // Build users with their business assignments
    const usersWithBusinesses: UserWithBusinesses[] = profiles.map(profile => {
      // Super admins have access to all businesses
      if (profile.role === 0) {
        return {
          ...profile,
          assigned_businesses: businesses.map(b => ({
            business_id: b.business_id,
            company_name: b.company_name,
            avatar_url: b.avatar_url
          }))
        }
      }

      // Regular users get their assigned businesses
      return {
        ...profile,
        assigned_businesses: businessAssignments.get(profile.id) || []
      }
    })

    const response: ProfileManagementData = {
      users: usersWithBusinesses,
      businesses
    }

    return NextResponse.json({
      data: response,
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/profile-management:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}