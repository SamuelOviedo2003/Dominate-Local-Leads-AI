import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/users/reset-password
 * Allows super admins to reset any user's password without knowing current password
 * Only accessible to super admins (role = 0)
 * Uses Supabase Admin API with service role key
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization using JWT tokens
    const { user } = await authenticateRequest(request)

    // Only super admins can reset passwords
    if (user.profile?.role !== 0) {
      return NextResponse.json(
        { error: 'Forbidden - Only super admins can reset user passwords' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, newPassword } = body

    // Validation
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      )
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid newPassword' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Get environment variables for admin access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json(
        { error: 'Server configuration error - missing service role key' },
        { status: 500 }
      )
    }

    // Create admin client with service role key
    // This bypasses RLS and allows password updates
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify the target user exists
    const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (userError || !targetUser) {
      console.error('Error fetching target user:', userError)
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Prevent super admin from resetting another super admin's password
    // First, get the target user's profile to check role
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Error fetching target user profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to verify user permissions' },
        { status: 500 }
      )
    }

    // Only allow resetting passwords for regular users (role != 0)
    if (targetProfile.role === 0) {
      return NextResponse.json(
        { error: 'Cannot reset password for another super admin' },
        { status: 403 }
      )
    }

    // Update the user's password using admin API
    const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Error updating user password:', updateError)
      return NextResponse.json(
        { error: 'Failed to update password: ' + updateError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Password reset successful for user ${userId} by super admin ${user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully'
    })

  } catch (error) {
    console.error('Unexpected error in POST /api/admin/users/reset-password:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
