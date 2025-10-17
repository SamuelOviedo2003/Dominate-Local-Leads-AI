import { NextRequest, NextResponse } from 'next/server'
import { createCookieClient } from '@/lib/supabase/server'
import { Profile } from '@/types/auth'

export const dynamic = 'force-dynamic'

/**
 * GET handler to fetch current user profile
 */
export async function GET() {
  try {
    // Create Supabase client for cookie-based auth
    const supabase = createCookieClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Fetch complete profile data with latest information
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, role, business_id, telegram_id, ghl_id, dialpad_id, created_at, updated_at')
      .eq('id', user.id)
      .single()

    if (profileError || !profileData) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Email is already verified if user exists (Supabase requirement)
    const emailVerified = user.email_confirmed_at !== null

    const profile: Profile = {
      ...profileData,
      business_id: profileData.business_id?.toString() || ''
    }

    return NextResponse.json({
      success: true,
      data: {
        profile,
        emailVerified
      }
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/profile', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH handler to update user profile information
 */
export async function PATCH(request: NextRequest) {
  try {
    // Create Supabase client for cookie-based auth
    const supabase = createCookieClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { full_name, telegram_id, ghl_id } = body

    // Validate required fields
    if (full_name !== undefined && (typeof full_name !== 'string' || full_name.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Full name must be a non-empty string' },
        { status: 400 }
      )
    }

    // Validate optional fields
    if (telegram_id !== undefined && telegram_id !== null && typeof telegram_id !== 'string') {
      return NextResponse.json(
        { error: 'Telegram ID must be a string or null' },
        { status: 400 }
      )
    }

    if (ghl_id !== undefined && ghl_id !== null && typeof ghl_id !== 'string') {
      return NextResponse.json(
        { error: 'GHL ID must be a string or null' },
        { status: 400 }
      )
    }

    // Build update object with only provided fields
    const updateData: Partial<Profile> = {
      updated_at: new Date().toISOString()
    }

    if (full_name !== undefined) {
      updateData.full_name = full_name.trim()
    }
    if (telegram_id !== undefined) {
      updateData.telegram_id = telegram_id?.trim() || null
    }
    if (ghl_id !== undefined) {
      updateData.ghl_id = ghl_id?.trim() || null
    }

    // Update the profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select('id, email, full_name, avatar_url, role, business_id, telegram_id, ghl_id, dialpad_id, created_at, updated_at')
      .single()

    if (updateError) {
      console.error('Profile update failed', { userId: user.id, error: updateError })
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Format response
    const profile: Profile = {
      ...updatedProfile,
      business_id: updatedProfile.business_id?.toString() || ''
    }

    return NextResponse.json({
      success: true,
      data: profile,
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('Unexpected error in PATCH /api/profile', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}