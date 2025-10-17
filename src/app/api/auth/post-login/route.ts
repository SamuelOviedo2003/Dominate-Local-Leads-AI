import { NextRequest, NextResponse } from 'next/server'
import { createCookieClient } from '@/lib/supabase/server'
import { AuthUser, Profile, BusinessSwitcherData } from '@/types/auth'
import { sendDepartmentCheckWebhook } from '@/lib/utils/departmentWebhook'

/**
 * Consolidated post-login endpoint that handles all authentication setup
 * Replaces the 3 separate API calls previously made after login
 */
export async function POST(request: NextRequest) {
  try {
    // Create Supabase client using cookies (server-side)
    const supabase = createCookieClient()

    // Get the authenticated user from the session
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('[POST-LOGIN] Authentication failed:', userError?.message)
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }

    // OPTIMIZATION: Parallel data fetching - fetch profile first to determine role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single() as { data: Profile | null; error: any }

    if (profileError || !profile) {
      console.error('[POST-LOGIN] Profile fetch failed:', profileError?.message)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    const effectiveRole = profile.role ?? 1

    // Get accessible businesses based on role (will use parallel queries internally)
    const accessibleBusinesses = await getUserAccessibleBusinesses(user.id, effectiveRole, supabase)

    if (!accessibleBusinesses || accessibleBusinesses.length === 0) {
      console.warn('[POST-LOGIN] No accessible businesses found for user:', user.email)
      return NextResponse.json(
        { error: 'No business access assigned. Please contact support.' },
        { status: 403 }
      )
    }

    // Determine the target business for redirect
    let targetBusiness = null

    // First priority: Use stored business_id from profile if valid
    if (profile.business_id) {
      targetBusiness = accessibleBusinesses.find(
        b => b.business_id === profile.business_id.toString()
      )
    }

    // Fallback: Use first accessible business
    if (!targetBusiness && accessibleBusinesses.length > 0) {
      targetBusiness = accessibleBusinesses[0]

      // OPTIMIZATION: Only update if business_id has changed
      const newBusinessId = parseInt(targetBusiness!.business_id)
      const currentBusinessId = typeof profile.business_id === 'string' ? parseInt(profile.business_id) : profile.business_id

      if (currentBusinessId !== newBusinessId) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ business_id: newBusinessId })
          .eq('id', user.id)

        if (updateError) {
          console.warn('[POST-LOGIN] Failed to update business_id:', updateError.message)
        }
      }
    }

    // Final check - ensure we have a target business
    if (!targetBusiness) {
      console.error('[POST-LOGIN] No target business found after all fallbacks')
      return NextResponse.json(
        { error: 'No accessible business found. Please contact support.' },
        { status: 403 }
      )
    }

    // Send department check webhook
    // Fetch dialpad_phone from business_clients for the target business
    const { data: businessData } = await supabase
      .from('business_clients')
      .select('dialpad_phone')
      .eq('business_id', parseInt(targetBusiness.business_id))
      .single()

    console.log('[POST-LOGIN] Webhook check:', {
      has_dialpad_phone: !!businessData?.dialpad_phone,
      dialpad_phone: businessData?.dialpad_phone,
      has_profile_dialpad_id: !!profile.dialpad_id,
      profile_dialpad_id: profile.dialpad_id
    })

    // Always call webhook function - it handles validation internally
    await sendDepartmentCheckWebhook(profile.dialpad_id, businessData?.dialpad_phone)

    // Build complete user object
    const authUser: AuthUser = {
      id: user.id,
      email: user.email!,
      profile: {
        ...profile,
        business_id: targetBusiness.business_id // Keep as string to match Profile type
      },
      accessibleBusinesses,
      currentBusinessId: targetBusiness.business_id
    }

    // Return consolidated data for client with new business_id URL structure
    const redirectUrl = targetBusiness.permalink
      ? `/${targetBusiness.business_id}/${targetBusiness.permalink}/dashboard`
      : '/dashboard'

    return NextResponse.json({
      success: true,
      user: authUser,
      redirectUrl,
      targetBusiness
    })

  } catch (error) {
    console.error('[POST-LOGIN] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error during login setup' },
      { status: 500 }
    )
  }
}

/**
 * Get accessible businesses for user based on role
 * Consolidated from auth-helpers-simple.ts
 */
async function getUserAccessibleBusinesses(
  userId: string,
  userRole: number,
  supabase: any
): Promise<BusinessSwitcherData[]> {
  if (userRole === 0) {
    // Super admin - all businesses with dashboard=true
    const { data: businesses, error } = await supabase
      .from('business_clients')
      .select('business_id, company_name, avatar_url, city, state, permalink')
      .eq('dashboard', true)
      .order('company_name')

    if (error) {
      console.error('[POST-LOGIN] Super admin businesses fetch error:', error)
      throw new Error('Failed to fetch businesses for super admin')
    }

    return (businesses || []).map((business: any) => ({
      ...business,
      business_id: business.business_id.toString()
    }))
  } else {
    // Regular user - businesses from profile_businesses
    const { data: userBusinesses, error } = await supabase
      .from('profile_businesses')
      .select(`
        business_id,
        business_clients!inner(
          business_id,
          company_name,
          avatar_url,
          city,
          state,
          permalink
        )
      `)
      .eq('profile_id', userId)

    if (error) {
      console.error('[POST-LOGIN] User businesses fetch error:', error)
      throw new Error('Failed to fetch user businesses')
    }

    return (userBusinesses || []).map((ub: any) => ({
      business_id: ub.business_clients.business_id.toString(),
      company_name: ub.business_clients.company_name,
      avatar_url: ub.business_clients.avatar_url,
      city: ub.business_clients.city,
      state: ub.business_clients.state,
      permalink: ub.business_clients.permalink
    }))
  }
}