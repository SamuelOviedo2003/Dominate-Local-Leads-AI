import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/users/reset-password
 *
 * Admin-only endpoint to reset a user's password using Supabase Admin API.
 *
 * IMPORTANT: This uses a SEPARATE admin client instance with service role key.
 * This client is ISOLATED from the user's session and CANNOT interfere with it.
 *
 * Security:
 * - Only super admins (role 0) can reset passwords
 * - Cannot reset another super admin's password
 * - Uses service role key on SERVER SIDE ONLY
 * - Creates isolated admin client with NO session persistence
 * - Admin client never touches user session cookies
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authorization token from the request header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No token provided' },
        { status: 401 }
      )
    }

    // Create a regular Supabase client with the user's token to verify their identity
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      auth: {
        persistSession: false, // Don't persist session
        autoRefreshToken: false // Don't refresh token
      }
    })

    // Verify the requesting user is authenticated and is a super admin
    const { data: { user: requestingUser }, error: authError } = await userSupabase.auth.getUser()

    if (authError || !requestingUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // Check if requesting user is a super admin (role 0)
    const { data: requestingProfile, error: profileError } = await userSupabase
      .from('profiles')
      .select('role')
      .eq('id', requestingUser.id)
      .single()

    if (profileError || requestingProfile?.role !== 0) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Only super admins can reset passwords' },
        { status: 403 }
      )
    }

    // Get the userId and newPassword from the request body
    const { userId, newPassword } = await request.json()

    if (!userId || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'User ID and new password are required' },
        { status: 400 }
      )
    }

    // Validate password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Check that target user exists and is not a super admin
    const { data: targetProfile, error: targetProfileError } = await userSupabase
      .from('profiles')
      .select('role, email, full_name')
      .eq('id', userId)
      .single()

    if (targetProfileError || !targetProfile) {
      return NextResponse.json(
        { success: false, error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Prevent resetting another super admin's password
    if (targetProfile.role === 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot reset password for another super admin' },
        { status: 403 }
      )
    }

    // NOW create the ADMIN client with service role key
    // This client is COMPLETELY ISOLATED from user sessions
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseServiceRoleKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create ISOLATED admin client
    // This client:
    // - Uses service role key (full permissions)
    // - Has NO session persistence
    // - Does NOT auto-refresh tokens
    // - Cannot interfere with user sessions
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false, // No token refresh
        persistSession: false    // No session persistence - CRITICAL FOR SESSION ISOLATION
      }
    })

    // Use admin API to update the user's password
    // This ONLY updates the password in auth.users table
    // It does NOT affect any active sessions or cookies
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Failed to update user password:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to reset password' },
        { status: 500 }
      )
    }

    // Log the action for audit trail
    console.log(`[AUDIT] Super admin ${requestingUser.id} (${requestingUser.email}) reset password for user ${userId} (${targetProfile.email})`)

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      user: {
        id: updatedUser.user.id,
        email: updatedUser.user.email
      }
    })

  } catch (error) {
    console.error('Error in password reset API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
