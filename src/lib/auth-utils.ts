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
      console.error('Failed to get user profile:', profileError)
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
    console.error('Authentication error:', error)
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
    console.error('Business access validation error:', error)
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
    console.error('API authentication error:', error)
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
      console.error('Access denied to business:', businessId)
      return false
    }

    // Update profiles.business_id atomically
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ business_id: parseInt(businessId) })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to update business context:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating business context:', error)
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
    console.log('[AuthUtils] Starting authentication for request:', request.url)
    
    // Try to get token from Authorization header first
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    console.log('[AuthUtils] Auth header present:', !!authHeader)
    console.log('[AuthUtils] Token extracted:', !!token)
    
    let supabaseClient
    let user
    
    if (token) {
      console.log('[AuthUtils] Using token-based authentication')
      // Use token from Authorization header
      supabaseClient = createClientWithToken(token)
      // Note: When using createClientWithToken, the token is already set in the client
      // So we call getUser() without parameters
      const { data: userData, error: authError } = await supabaseClient.auth.getUser()
      
      console.log('[AuthUtils] Token validation result:', {
        hasUser: !!userData.user,
        userId: userData.user?.id,
        error: authError?.message
      })
      
      if (authError || !userData.user) {
        console.error('[AuthUtils] JWT validation failed:', authError)
        return null
      }
      
      user = userData.user
    } else {
      console.log('[AuthUtils] Using cookie-based authentication fallback')
      // Fallback to cookie-based authentication
      supabaseClient = await createClient()
      const { data: userData, error: authError } = await supabaseClient.auth.getUser()
      
      console.log('[AuthUtils] Cookie auth result:', {
        hasUser: !!userData.user,
        userId: userData.user?.id,
        error: authError?.message
      })
      
      if (authError || !userData.user) {
        console.error('[AuthUtils] Cookie authentication failed:', authError)
        return null
      }
      
      user = userData.user
    }
    
    // Get user profile with business context using the appropriate client
    console.log('[AuthUtils] Fetching user profile for user:', user.id)
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select(`
        role,
        business_id,
        profile_businesses!left(business_id)
      `)
      .eq('id', user.id)
      .maybeSingle()

    console.log('[AuthUtils] Profile query result:', {
      hasProfile: !!profile,
      role: profile?.role,
      businessId: profile?.business_id,
      accessibleBusinesses: profile?.profile_businesses?.length || 0,
      error: profileError?.message
    })

    if (profileError || !profile) {
      console.error('[AuthUtils] Failed to get user profile:', profileError)
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
    
    console.log('[AuthUtils] Successfully created session user:', {
      id: sessionUser.id,
      role: sessionUser.role,
      businessId: sessionUser.businessId,
      accessibleBusinesses: sessionUser.accessibleBusinesses
    })

    return sessionUser
  } catch (error) {
    console.error('Authentication error:', error)
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
    console.error('Business access validation error:', error)
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
      console.error('Access denied to business:', businessId)
      return false
    }

    // Update profiles.business_id atomically
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ business_id: parseInt(businessId) })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to update business context:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating business context:', error)
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
    console.error('Error getting available businesses:', error)
    return []
  }
}

/**
 * Enhanced version of getAvailableBusinesses with token support
 * Handles super admins who may not have explicit profile_businesses records
 */
export async function getAvailableBusinessesWithToken(userId: string, token?: string): Promise<{ id: string; name: string; permalink: string }[]> {
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
          business_clients!inner (
            company_name,
            permalink,
            avatar_url,
            city,
            state
          )
        `)
        .eq('profile_id', userId)

      return businesses?.map(pb => ({
        id: pb.business_id.toString(),
        name: pb.business_clients.company_name || `Business ${pb.business_id}`,
        permalink: pb.business_clients.permalink || `business-${pb.business_id}`,
        avatar_url: pb.business_clients.avatar_url,
        city: pb.business_clients.city,
        state: pb.business_clients.state
      })) || []
    }
  } catch (error) {
    console.error('Error getting available businesses with token:', error)
    return []
  }
}