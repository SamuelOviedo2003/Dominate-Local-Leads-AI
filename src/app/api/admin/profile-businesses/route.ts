import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getAuthenticatedUserFromRequest } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/profile-businesses
 * Add business access for a user
 * Only accessible to super admins (role = 0)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Only super admins can manage profile-business assignments
    if (user.role !== 0) {
      return NextResponse.json(
        { error: 'Forbidden - Only super admins can manage user-business assignments' },
        { status: 403 }
      )
    }

    const { profileId, businessId } = await request.json()

    if (!profileId || !businessId) {
      return NextResponse.json(
        { error: 'Missing required parameters: profileId and businessId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const supabaseService = createServiceRoleClient()

    // Validate that the user exists and is not a super admin (using service role to bypass RLS)
    const { data: targetProfile, error: profileError } = await supabaseService
      .from('profiles')
      .select('id, role')
      .eq('id', profileId)
      .single()

    if (profileError || !targetProfile) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    if (targetProfile.role === 0) {
      return NextResponse.json(
        { error: 'Cannot assign businesses to super admins - they have access to all businesses' },
        { status: 400 }
      )
    }

    // Validate that the business exists and is enabled for dashboard
    const { data: business, error: businessError } = await supabase
      .from('business_clients')
      .select('business_id')
      .eq('business_id', businessId)
      .eq('dashboard', true)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Target business not found or not enabled for dashboard access' },
        { status: 404 }
      )
    }

    // Check if assignment already exists
    const { data: existingAssignment } = await supabase
      .from('profile_businesses')
      .select('profile_id, business_id')
      .eq('profile_id', profileId)
      .eq('business_id', businessId)
      .single()

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'User already has access to this business' },
        { status: 409 }
      )
    }

    // Insert the new profile-business assignment
    const { error: insertError } = await supabase
      .from('profile_businesses')
      .insert({
        profile_id: profileId,
        business_id: businessId
      })

    if (insertError) {
      console.error('Error creating profile-business assignment:', insertError)
      return NextResponse.json(
        { error: 'Failed to assign business to user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Business successfully assigned to user',
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in POST /api/admin/profile-businesses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/profile-businesses
 * Remove business access for a user
 * Only accessible to super admins (role = 0)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and authorization
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Only super admins can manage profile-business assignments
    if (user.role !== 0) {
      return NextResponse.json(
        { error: 'Forbidden - Only super admins can manage user-business assignments' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')
    const businessId = searchParams.get('businessId')

    if (!profileId || !businessId) {
      return NextResponse.json(
        { error: 'Missing required parameters: profileId and businessId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const supabaseService = createServiceRoleClient()

    // Validate that the user exists and is not a super admin (using service role to bypass RLS)
    const { data: targetProfile, error: profileError } = await supabaseService
      .from('profiles')
      .select('id, role')
      .eq('id', profileId)
      .single()

    if (profileError || !targetProfile) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    if (targetProfile.role === 0) {
      return NextResponse.json(
        { error: 'Cannot modify business access for super admins' },
        { status: 400 }
      )
    }

    // Check if assignment exists
    const { data: existingAssignment } = await supabase
      .from('profile_businesses')
      .select('profile_id, business_id')
      .eq('profile_id', profileId)
      .eq('business_id', businessId)
      .single()

    if (!existingAssignment) {
      return NextResponse.json(
        { error: 'User does not have access to this business' },
        { status: 404 }
      )
    }

    // Delete the profile-business assignment
    const { error: deleteError } = await supabase
      .from('profile_businesses')
      .delete()
      .eq('profile_id', profileId)
      .eq('business_id', businessId)

    if (deleteError) {
      console.error('Error removing profile-business assignment:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove business access from user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Business access successfully removed from user',
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/profile-businesses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}