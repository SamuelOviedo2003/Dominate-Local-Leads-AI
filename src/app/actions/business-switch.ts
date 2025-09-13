'use server'

import { revalidatePath } from 'next/cache'
import { createCookieClient } from '@/lib/supabase/server'
import { BusinessSwitcherData } from '@/types/auth'

/**
 * Server action to handle business switching for superadmins
 * Validates user permissions and business access
 */
export async function switchBusiness(businessId: string): Promise<{
  success: boolean
  data?: BusinessSwitcherData
  error?: string
}> {
  try {
    const supabase = createCookieClient()

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        error: 'Profile not found'
      }
    }

    const effectiveRole = profile.role ?? 1

    // Only superadmins (role=0) can switch businesses
    if (effectiveRole !== 0) {
      return {
        success: false,
        error: 'Insufficient permissions - only superadmins can switch businesses'
      }
    }

    // Validate that the target business exists and has dashboard enabled
    const { data: business, error: businessError } = await supabase
      .from('business_clients')
      .select('business_id, company_name, avatar_url, city, state, permalink')
      .eq('business_id', businessId)
      .eq('dashboard', true)
      .single()

    if (businessError || !business) {
      return {
        success: false,
        error: 'Business not found or not accessible'
      }
    }

    // Update user's current business context
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ business_id: parseInt(businessId) })
      .eq('id', user.id)

    if (updateError) {
      return {
        success: false,
        error: 'Failed to update business context'
      }
    }

    // Revalidate paths that might show business-specific data
    revalidatePath('/dashboard')
    revalidatePath('/new-leads')
    revalidatePath('/', 'layout')

    return {
      success: true,
      data: {
        business_id: business.business_id.toString(),
        company_name: business.company_name,
        avatar_url: business.avatar_url,
        city: business.city,
        state: business.state,
        permalink: business.permalink
      }
    }

  } catch (error) {
    console.error('Error switching business:', error)
    return {
      success: false,
      error: 'Internal server error'
    }
  }
}

/**
 * Server action to get available businesses for superadmin switching
 */
export async function getAvailableBusinesses(): Promise<{
  success: boolean
  data?: BusinessSwitcherData[]
  error?: string
}> {
  try {
    const supabase = createCookieClient()

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        error: 'Profile not found'
      }
    }

    const effectiveRole = profile.role ?? 1

    // Only superadmins (role=0) can see all businesses
    if (effectiveRole !== 0) {
      return {
        success: false,
        error: 'Insufficient permissions - only superadmins can access all businesses'
      }
    }

    // Get all businesses with dashboard enabled
    const { data: businesses, error: businessesError } = await supabase
      .from('business_clients')
      .select('business_id, company_name, avatar_url, city, state, permalink')
      .eq('dashboard', true)
      .order('company_name')

    if (businessesError) {
      return {
        success: false,
        error: 'Failed to fetch businesses'
      }
    }

    return {
      success: true,
      data: (businesses || []).map(b => ({
        business_id: b.business_id.toString(),
        company_name: b.company_name,
        avatar_url: b.avatar_url,
        city: b.city,
        state: b.state,
        permalink: b.permalink
      }))
    }

  } catch (error) {
    console.error('Error fetching available businesses:', error)
    return {
      success: false,
      error: 'Internal server error'
    }
  }
}

/**
 * Server action to validate if user can access a specific business
 */
export async function validateBusinessAccess(businessId: string): Promise<{
  success: boolean
  canAccess?: boolean
  userRole?: number
  error?: string
}> {
  try {
    const supabase = createCookieClient()

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        error: 'Profile not found'
      }
    }

    const effectiveRole = profile.role ?? 1
    let canAccess = false

    // Superadmins (role=0) can access any business with dashboard=true
    if (effectiveRole === 0) {
      const { data: business, error: businessError } = await supabase
        .from('business_clients')
        .select('business_id')
        .eq('business_id', businessId)
        .eq('dashboard', true)
        .single()

      canAccess = !businessError && !!business
    } else {
      // Regular users can only access businesses in their profile_businesses table
      const { data: access, error: accessError } = await supabase
        .from('profile_businesses')
        .select('business_id')
        .eq('profile_id', user.id)
        .eq('business_id', parseInt(businessId, 10))
        .single()
        
      canAccess = !accessError && !!access
    }

    return {
      success: true,
      canAccess,
      userRole: effectiveRole
    }

  } catch (error) {
    console.error('Error validating business access:', error)
    return {
      success: false,
      error: 'Internal server error'
    }
  }
}