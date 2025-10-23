import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/users/resend-verification
 *
 * Admin-only endpoint to resend email verification link using Supabase Admin API.
 *
 * IMPORTANT: This uses a SEPARATE admin client instance with service role key.
 * This client is ISOLATED from the user's session and CANNOT interfere with it.
 *
 * Security:
 * - Only super admins (role 0) can resend verification emails
 * - Cannot resend for another super admin
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
        { success: false, error: 'Forbidden - Only super admins can resend verification emails' },
        { status: 403 }
      )
    }

    // Get the userId from the request body
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
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

    // Prevent resending verification email for another super admin
    if (targetProfile.role === 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot resend verification email for another super admin' },
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

    // Use admin API to get the user's email from auth.users
    const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (getUserError || !authUser.user) {
      console.error('Failed to get user from auth:', getUserError)
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve user information' },
        { status: 500 }
      )
    }

    // Check if email is already verified
    if (authUser.user.email_confirmed_at) {
      return NextResponse.json(
        { success: false, error: 'Email is already verified' },
        { status: 400 }
      )
    }

    // Update the user's email_confirmed_at to null to allow resending verification
    // Then use inviteUserByEmail which will send a verification email
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        email_confirm: false // This marks email as unconfirmed
      }
    )

    if (updateError) {
      console.error('Failed to update user verification status:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to prepare user for verification resend' },
        { status: 500 }
      )
    }

    // Now send the verification email using inviteUserByEmail
    // This will trigger Supabase's built-in email verification flow
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      authUser.user.email!,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/confirm`
      }
    )

    if (inviteError) {
      console.error('Failed to send verification email:', inviteError)
      return NextResponse.json(
        { success: false, error: 'Failed to send verification email' },
        { status: 500 }
      )
    }

    // Log the action for audit trail
    console.log(`[AUDIT] Super admin ${requestingUser.id} (${requestingUser.email}) resent verification email for user ${userId} (${targetProfile.email})`)

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully',
      user: {
        id: authUser.user.id,
        email: authUser.user.email
      }
    })

  } catch (error) {
    console.error('Error in resend verification email API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
