import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export interface SessionUser {
  id: string
  email: string
  role: number
  businessId: string | null
  accessibleBusinesses: string[]
}

/**
 * Get authenticated user with business context from JWT only
 * NO REDIS, NO GLOBAL STATE - pure JWT validation
 */
export async function getAuthenticatedUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient()
    
    // Get user from JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return null
    }

    // Get user profile with current business context
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        role,
        business_id,
        profile_businesses!left(business_id)
      `)
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      // Failed to get user profile
      return null
    }

    // For super admins (role 0), get all available businesses instead of profile_businesses
    let accessibleBusinesses: string[] = []
    if (profile.role === 0) {
      // Super admin - get all businesses with dashboard=true
      const { data: allBusinesses } = await supabase
        .from('business_clients')
        .select('business_id')
        .eq('dashboard', true)
      
      accessibleBusinesses = (allBusinesses || []).map(b => b.business_id.toString())
    } else {
      // Regular user - use profile_businesses
      accessibleBusinesses = (profile.profile_businesses || []).map(pb => pb.business_id.toString())
    }

    return {
      id: user.id,
      email: user.email || '',
      role: profile.role ?? 1,
      businessId: profile.business_id?.toString() || null,
      accessibleBusinesses
    }
  } catch (error) {
    // Authentication error
    return null
  }
}

/**
 * Validate business access for authenticated user
 */
export async function validateBusinessAccess(userId: string, businessId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    // Check if user is super admin (role 0) - can access all businesses
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (profile?.role === 0) {
      return true // Super admin can access any business
    }

    // Check if user has explicit access to this business
    const { data: access } = await supabase
      .from('profile_businesses')
      .select('business_id')
      .eq('profile_id', userId)
      .eq('business_id', parseInt(businessId))
      .maybeSingle()

    return !!access
  } catch (error) {
    // Business access validation error
    return false
  }
}

/**
 * Get authenticated user for API endpoints (similar to getAuthenticatedUser but with API-specific error handling)
 */
export async function getAuthenticatedUserForAPI(): Promise<SessionUser | null> {
  try {
    return await getAuthenticatedUser()
  } catch (error) {
    // API authentication error
    return null
  }
}

/**
 * Update user's current business ID in profiles table
 */
export async function updateUserBusinessContext(userId: string, businessId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    // First validate business access
    const hasAccess = await validateBusinessAccess(userId, businessId)
    if (!hasAccess) {
      // Access denied to business
      return false
    }

    // Update profiles.business_id atomically
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ business_id: parseInt(businessId) })
      .eq('id', userId)

    if (updateError) {
      // Failed to update business context
      return false
    }

    return true
  } catch (error) {
    // Error updating business context
    return false
  }
}

/**
 * Create Supabase client with JWT token from Authorization header
 */
function createClientWithToken(token: string) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // No-op for token-based auth
        },
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}

/**
 * Enhanced authentication function that handles both cookie-based and JWT token-based auth
 * Prioritizes Authorization header tokens over cookies for API requests
 */
export async function getAuthenticatedUserFromRequest(request: NextRequest): Promise<SessionUser | null> {
  try {
    // Starting authentication for request
    
    // Try to get token from Authorization header first
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    // Checking auth header
    // Token extracted
    
    let supabaseClient
    let user
    
    if (token) {
      // Using token-based authentication
      // Use token from Authorization header
      supabaseClient = createClientWithToken(token)
      // Note: When using createClientWithToken, the token is already set in the client
      // So we call getUser() without parameters
      const { data: userData, error: authError } = await supabaseClient.auth.getUser()
      
      // Token validation result
      
      if (authError || !userData.user) {
        // JWT validation failed
        return null
      }
      
      user = userData.user
    } else {
      // Using cookie-based authentication fallback
      // Fallback to cookie-based authentication
      supabaseClient = await createClient()
      const { data: userData, error: authError } = await supabaseClient.auth.getUser()
      
      // Cookie auth result
      
      if (authError || !userData.user) {
        // Cookie authentication failed
        return null
      }
      
      user = userData.user
    }
    
    // Get user profile with business context using the appropriate client
    // Fetching user profile for user
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select(`
        role,
        business_id,
        profile_businesses!left(business_id)
      `)
      .eq('id', user.id)
      .maybeSingle()

    // Profile query result

    if (profileError || !profile) {
      // Failed to get user profile
      return null
    }

    // For super admins (role 0), get all available businesses instead of profile_businesses
    let accessibleBusinessesForApi: string[] = []
    if (profile.role === 0) {
      // Super admin - get all businesses with dashboard=true
      const { data: allBusinesses } = await supabaseClient
        .from('business_clients')
        .select('business_id')
        .eq('dashboard', true)
      
      accessibleBusinessesForApi = (allBusinesses || []).map(b => b.business_id.toString())
    } else {
      // Regular user - use profile_businesses
      accessibleBusinessesForApi = (profile.profile_businesses || []).map(pb => pb.business_id.toString())
    }

    const sessionUser = {
      id: user.id,
      email: user.email || '',
      role: profile.role ?? 1,
      businessId: profile.business_id?.toString() || null,
      accessibleBusinesses: accessibleBusinessesForApi
    }
    
    // Successfully created session user

    return sessionUser
  } catch (error) {
    // Authentication error
    return null
  }
}

/**
 * Enhanced business access validation with token support
 */
export async function validateBusinessAccessWithToken(userId: string, businessId: string, token?: string): Promise<boolean> {
  try {
    const supabase = token ? createClientWithToken(token) : await createClient()
    
    // Check if user is super admin (role 0) - can access all businesses
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (profile?.role === 0) {
      return true // Super admin can access any business
    }

    // Check if user has explicit access to this business
    const { data: access } = await supabase
      .from('profile_businesses')
      .select('business_id')
      .eq('profile_id', userId)
      .eq('business_id', parseInt(businessId))
      .maybeSingle()

    return !!access
  } catch (error) {
    // Business access validation error
    return false
  }
}

/**
 * Enhanced business context update with token support
 */
export async function updateUserBusinessContextWithToken(userId: string, businessId: string, token?: string): Promise<boolean> {
  try {
    const supabase = token ? createClientWithToken(token) : await createClient()
    
    // First validate business access
    const hasAccess = await validateBusinessAccessWithToken(userId, businessId, token)
    if (!hasAccess) {
      // Access denied to business
      return false
    }

    // Update profiles.business_id atomically
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ business_id: parseInt(businessId) })
      .eq('id', userId)

    if (updateError) {
      // Failed to update business context
      return false
    }

    return true
  } catch (error) {
    // Error updating business context
    return false
  }
}

/**
 * Get available businesses for current user
 * Enhanced to handle super admins who may not have explicit profile_businesses records
 */
export async function getAvailableBusinesses(userId: string): Promise<string[]> {
  try {
    const supabase = await createClient()
    
    // Check if user is super admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (profile?.role === 0) {
      // Super admin can access all businesses
      const { data: businesses } = await supabase
        .from('business_clients')
        .select('business_id')
        .eq('dashboard', true)

      return businesses?.map(b => b.business_id.toString()) || []
    } else {
      // Regular user - get businesses from profile_businesses
      const { data: businesses } = await supabase
        .from('profile_businesses')
        .select('business_id')
        .eq('profile_id', userId)

      return businesses?.map(b => b.business_id.toString()) || []
    }
  } catch (error) {
    // Error getting available businesses
    return []
  }
}

/**
 * Enhanced version of getAvailableBusinesses with token support
 * Handles super admins who may not have explicit profile_businesses records
 */
export async function getAvailableBusinessesWithToken(userId: string, token?: string): Promise<{ id: string; name: string; permalink: string; avatar_url?: string | null; city?: string | null; state?: string | null }[]> {
  try {
    const supabase = token ? createClientWithToken(token) : await createClient()
    
    // Check if user is super admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (profile?.role === 0) {
      // Super admin can access all businesses with full details
      const { data: businesses } = await supabase
        .from('business_clients')
        .select(`
          business_id,
          company_name,
          permalink,
          avatar_url,
          city,
          state
        `)
        .eq('dashboard', true)
        .order('company_name')

      return businesses?.map(b => ({
        id: b.business_id.toString(),
        name: b.company_name || `Business ${b.business_id}`,
        permalink: b.permalink || `business-${b.business_id}`,
        avatar_url: b.avatar_url,
        city: b.city,
        state: b.state
      })) || []
    } else {
      // Regular user - get businesses they have access to via profile_businesses
      const { data: businesses } = await supabase
        .from('profile_businesses')
        .select(`
          business_id,
          business_clients!left (
            company_name,
            permalink,
            avatar_url,
            city,
            state
          )
        `)
        .eq('profile_id', userId)

      return businesses?.map(pb => {
        const business = Array.isArray(pb.business_clients) ? pb.business_clients[0] : pb.business_clients
        return {
          id: pb.business_id.toString(),
          name: business?.company_name || `Business ${pb.business_id}`,
          permalink: business?.permalink || `business-${pb.business_id}`,
          avatar_url: business?.avatar_url || null,
          city: business?.city || null,
          state: business?.state || null
        }
      }) || []
    }
  } catch (error) {
    // Error getting available businesses with token
    return []
  }
}