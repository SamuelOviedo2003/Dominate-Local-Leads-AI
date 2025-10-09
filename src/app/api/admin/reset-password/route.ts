import { NextRequest, NextResponse } from 'next/server'
import { createCookieClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/reset-password
 *
 * Sends a password reset email to the specified user
 *
 * Request body:
 * - userId: The user ID to reset password for
 * - email: The user's email address
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createCookieClient()

    // Check if the requesting user is authenticated
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the current user is an admin (role 0 in profiles table)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (profileError || profileData?.role !== 0) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, email } = body

    if (!userId || !email) {
      return NextResponse.json(
        { success: false, error: 'User ID and email are required' },
        { status: 400 }
      )
    }

    // Verify the target user exists in profiles table
    const { data: targetProfile, error: targetProfileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single()

    if (targetProfileError || !targetProfile) {
      return NextResponse.json(
        { success: false, error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Verify the email matches the user
    if (targetProfile.email !== email) {
      return NextResponse.json(
        { success: false, error: 'Email does not match user' },
        { status: 400 }
      )
    }

    // Send password reset email using Supabase Auth
    // This sends an email to the TARGET user (not the admin)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`
    })

    if (resetError) {
      console.error('Password reset error:', resetError)
      return NextResponse.json(
        { success: false, error: 'Failed to send password reset email' },
        { status: 500 }
      )
    }

    console.log(`Admin ${currentUser.id} triggered password reset for user ${userId} (${email})`)

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully'
    })

  } catch (error) {
    console.error('Error in reset-password API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
