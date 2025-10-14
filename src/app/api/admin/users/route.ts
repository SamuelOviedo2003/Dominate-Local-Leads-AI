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

/**
 * GET /api/admin/users
 * List all users with their business assignments
 * Only accessible to super admins (role = 0)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [DEBUG] /api/admin/users - Starting request')

    // Check authentication and authorization using JWT tokens
    const { user } = await authenticateRequest(request)

    console.log('🔍 [DEBUG] Authenticated user:', {
      id: user.id,
      email: user.email,
      role: user.profile?.role,
      business_id: user.profile?.business_id
    })

    // Only super admins can access user management
    if (user.profile?.role !== 0) {
      console.log('🔍 [DEBUG] Access denied - user role:', user.profile?.role)
      return NextResponse.json(
        { error: 'Forbidden - Only super admins can access user management' },
        { status: 403 }
      )
    }

    // Create Supabase client with user's JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('🔍 [DEBUG] Missing authorization header')
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const supabase = createClient(token)
    console.log('🔍 [DEBUG] Created Supabase client with token:', token.substring(0, 20) + '...')
    
    // Note: For admin operations, we still need comprehensive user data.
    // However, we'll use a different approach that respects RLS while ensuring admin access.
    // This requires that RLS policies allow super admins to view user profiles.
    
    console.log('🔍 [DEBUG] About to query profiles table with filter:', `id.eq.${user.id},role.is.null,role.neq.0`)

    // Fetch all users: current super admin + all regular users, but exclude OTHER super admins
    // This allows the current super admin to see their own profile + manage all regular users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, business_id, created_at, updated_at')
      .or(`id.eq.${user.id},role.is.null,role.neq.0`) // Include: current user OR role is null OR role != 0
      .order('full_name')

    console.log('🔍 [DEBUG] Supabase query result:', {
      usersCount: users?.length || 0,
      users: users?.map(u => ({ id: u.id, email: u.email, role: u.role })) || [],
      error: usersError
    })

    if (usersError) {
      console.error('🔍 [DEBUG] Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch users. Please ensure RLS policies allow super admin access to profiles table.' },
        { status: 500 }
      )
    }

    // Fetch business assignments for each user from profile_businesses table
    console.log('🔍 [DEBUG] Starting business assignment fetch for', users.length, 'users')

    const usersWithBusinesses: UserWithBusinesses[] = await Promise.all(
      users.map(async (userProfile) => {
        console.log('🔍 [DEBUG] Processing user:', { id: userProfile.id, email: userProfile.email, role: userProfile.role })

        // For super admins (role 0), they have access to all businesses
        if (userProfile.role === 0) {
          console.log('🔍 [DEBUG] Fetching all businesses for super admin:', userProfile.email)

          const { data: allBusinesses, error: businessError } = await supabase
            .from('business_clients')
            .select('business_id, company_name, avatar_url')
            .eq('dashboard', true)
            .order('company_name')

          console.log('🔍 [DEBUG] Super admin businesses:', {
            count: allBusinesses?.length || 0,
            businesses: allBusinesses?.map(b => ({ id: b.business_id, name: b.company_name })) || [],
            error: businessError
          })

          return {
            ...userProfile,
            assigned_businesses: allBusinesses || []
          }
        }

        // For regular users, get assigned businesses from profile_businesses table
        console.log('🔍 [DEBUG] Fetching assigned businesses for regular user:', userProfile.email)

        const { data: assignedBusinesses, error: assignedError } = await supabase
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

        console.log('🔍 [DEBUG] Regular user businesses:', {
          count: assignedBusinesses?.length || 0,
          assignments: assignedBusinesses || [],
          error: assignedError
        })

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

    console.log('🔍 [DEBUG] Final users with businesses:', {
      count: usersWithBusinesses.length,
      users: usersWithBusinesses.map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        businessCount: u.assigned_businesses.length
      }))
    })

    console.log('🔍 [DEBUG] Returning successful response with', usersWithBusinesses.length, 'users')

    return NextResponse.json({
      data: usersWithBusinesses,
      success: true
    })

  } catch (error) {
    console.error('🔍 [DEBUG] Unexpected error in GET /api/admin/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users
 * Delete a user profile and associated auth user
 * Only accessible to super admins (role = 0)
 * Requires service role key for deleting auth users
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and authorization using JWT tokens
    const { user } = await authenticateRequest(request)

    // Only super admins can delete users
    if (user.profile?.role !== 0) {
      return NextResponse.json(
        { error: 'Forbidden - Only super admins can delete users' },
        { status: 403 }
      )
    }

    // Get userId from query params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Validate userId is present
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      )
    }

    // Prevent super admin from deleting themselves
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own super admin account' },
        { status: 400 }
      )
    }

    // Create Supabase admin client using service role key
    // This is required to delete auth users
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration for service role')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify the target user exists and get their role
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, email')
      .eq('id', userId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Prevent deletion of other super admins
    if (targetUser.role === 0) {
      return NextResponse.json(
        { error: 'Cannot delete other super admin accounts' },
        { status: 400 }
      )
    }

    // Delete the user from auth.users (this will cascade delete the profile via trigger/policy)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError)
      return NextResponse.json(
        { error: 'Failed to delete user from authentication system' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/users
 * Update user information (name, email, phone) or role
 * Only accessible to super admins (role = 0)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check authentication and authorization using JWT tokens
    const { user } = await authenticateRequest(request)

    // Only super admins can modify users
    if (user.profile?.role !== 0) {
      return NextResponse.json(
        { error: 'Forbidden - Only super admins can modify users' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, role, firstName, lastName, email, phone } = body

    // Validate userId is present
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      )
    }

    // Validate role if provided
    if (role !== undefined && (typeof role !== 'number' || role < 0 || role > 10)) {
      return NextResponse.json(
        { error: 'Invalid role value. Must be a number between 0 and 10' },
        { status: 400 }
      )
    }

    // Prevent super admin from downgrading their own role
    if (role !== undefined && userId === user.id && role !== 0) {
      return NextResponse.json(
        { error: 'Cannot downgrade your own super admin role' },
        { status: 400 }
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

    // Verify the target user exists
    const { data: targetUser, error: targetError } = await supabase
      .from('profiles')
      .select('id, role, email')
      .eq('id', userId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Build update object with provided fields
    const updates: any = {}

    if (role !== undefined) {
      updates.role = role
    }

    if (firstName !== undefined || lastName !== undefined) {
      const fullName = `${firstName || ''} ${lastName || ''}`.trim()
      if (fullName) {
        updates.full_name = fullName
      }
    }

    if (email !== undefined) {
      updates.email = email
    }

    // Note: phone is not stored in profiles table currently
    // If needed, it should be added to the profiles table schema

    // Update the user's profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User profile updated successfully'
    })

  } catch (error) {
    console.error('Unexpected error in PATCH /api/admin/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
