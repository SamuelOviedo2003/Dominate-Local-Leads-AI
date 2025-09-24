import { createClient, createCookieClient } from '@/lib/supabase/server'
import { AuthUser, Profile, BusinessSwitcherData } from '@/types/auth'
import { headers } from 'next/headers'

export async function getAuthenticatedUser(token: string): Promise<AuthUser> {
  const supabase = createClient(token)
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('Authentication failed')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null; error: any }

  if (profileError || !profile) {
    throw new Error('Profile not found')
  }

  const effectiveRole = profile.role ?? 1
  const accessibleBusinesses = await getUserAccessibleBusinesses(user.id, effectiveRole, supabase)

  return {
    id: user.id,
    email: user.email!,
    profile,
    accessibleBusinesses,
    currentBusinessId: profile.business_id?.toString() ?? undefined
  }
}

async function getUserAccessibleBusinesses(
  userId: string,
  userRole: number,
  supabase: any
): Promise<BusinessSwitcherData[]> {
  console.log('[AUTH_DEBUG] getUserAccessibleBusinesses called:', {
    userId,
    userRole,
    isSuperAdmin: userRole === 0
  })

  if (userRole === 0) {
    console.log('[AUTH_DEBUG] Fetching all businesses for super admin...')
    // Super admin - all businesses with dashboard=true
    const { data: businesses, error } = await supabase
      .from('business_clients')
      .select('business_id, company_name, avatar_url, city, state, permalink')
      .eq('dashboard', true)
      .order('company_name')

    console.log('[AUTH_DEBUG] Super admin businesses query result:', {
      businessCount: businesses?.length || 0,
      error: error?.message,
      businessesSample: businesses?.slice(0, 3)?.map((b: any) => ({
        business_id: b.business_id,
        company_name: b.company_name
      }))
    })

    if (error) {
      console.error('[AUTH_DEBUG] Error fetching businesses for super admin:', error)
      throw new Error('Failed to fetch businesses for super admin')
    }
    return (businesses || []).map((business: any) => ({
      ...business,
      business_id: business.business_id.toString()
    }))
  } else {
    console.log('[AUTH_DEBUG] Fetching user-specific businesses from profile_businesses...')
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

    console.log('[AUTH_DEBUG] Regular user businesses query result:', {
      userBusinessCount: userBusinesses?.length || 0,
      error: error?.message,
      userBusinessesSample: userBusinesses?.slice(0, 3)?.map((ub: any) => ({
        business_id: ub.business_clients?.business_id,
        company_name: ub.business_clients?.company_name
      }))
    })

    if (error) {
      console.error('[AUTH_DEBUG] Error fetching user businesses:', error)
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

export async function validateBusinessAccess(
  userId: string, 
  businessId: string, 
  token: string
): Promise<boolean> {
  const supabase = createClient(token)
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (!profile) return false

  const effectiveRole = profile.role ?? 1

  if (effectiveRole === 0) {
    // Super admin - check business exists and has dashboard=true
    const { data: business } = await supabase
      .from('business_clients')
      .select('business_id')
      .eq('business_id', businessId)
      .eq('dashboard', true)
      .single()
    
    return !!business
  } else {
    // Regular user - check profile_businesses access
    const { data: access } = await supabase
      .from('profile_businesses')
      .select('business_id')
      .eq('profile_id', userId)
      .eq('business_id', parseInt(businessId, 10))
      .single()
    
    return !!access
  }
}

export async function updateUserBusinessContext(
  userId: string, 
  businessId: string, 
  token: string
): Promise<void> {
  const hasAccess = await validateBusinessAccess(userId, businessId, token)
  if (!hasAccess) {
    throw new Error('Access denied to business')
  }

  const supabase = createClient(token)
  const { error } = await supabase
    .from('profiles')
    .update({ business_id: parseInt(businessId) })
    .eq('id', userId)

  if (error) {
    throw new Error('Failed to update business context')
  }
}

// Server-side helper to get token from Next.js headers
async function getTokenFromHeaders(): Promise<string | null> {
  try {
    const headersList = headers()
    const authHeader = headersList.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.replace('Bearer ', '')
    }
    
    // Also check for custom header that frontend might set
    const customAuthHeader = headersList.get('x-supabase-token')
    return customAuthHeader || null
  } catch (error) {
    // headers() might fail in some contexts, return null
    return null
  }
}

/**
 * Get authenticated user from request - works with both cookie and token-based auth
 * For server components in cookie-based auth mode or token-based auth mode
 */
export async function getAuthenticatedUserFromRequest(): Promise<AuthUser | null> {
  try {
    // Debug environment variables and auth configuration
    const useCookieAuth = process.env.NEXT_PUBLIC_USE_COOKIE_AUTH === 'true'
    console.log('[AUTH_DEBUG] Environment configuration:', {
      NEXT_PUBLIC_USE_COOKIE_AUTH: process.env.NEXT_PUBLIC_USE_COOKIE_AUTH,
      useCookieAuth,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
      supabaseKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.substring(0, 20) + '...',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL
    })

    if (useCookieAuth) {
      console.log('[AUTH_DEBUG] Using cookie-based authentication method')
      // Use cookie-based authentication
      const supabase = createCookieClient()

      console.log('[AUTH_DEBUG] Created cookie client, fetching user session...')
      // Get user from Supabase using cookies
      const { data: { user }, error } = await supabase.auth.getUser()

      console.log('[AUTH_DEBUG] Supabase getUser() result:', {
        hasUser: !!user,
        userEmail: user?.email,
        userId: user?.id,
        error: error?.message,
        userMetadata: user?.user_metadata,
        userRole: user?.role
      })

      if (error || !user) {
        console.log('[AUTH_DEBUG] No authenticated user found in cookies:', error?.message)
        return null
      }

      console.log('[AUTH_DEBUG] Fetching profile for user:', user.id)
      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single() as { data: Profile | null; error: any }

      console.log('[AUTH_DEBUG] Profile query result:', {
        hasProfile: !!profile,
        profileError: profileError?.message,
        profileRole: profile?.role,
        profileBusinessId: profile?.business_id,
        profileEmail: profile?.email,
        profileFullName: profile?.full_name
      })

      if (profileError || !profile) {
        console.log('[AUTH_DEBUG] Profile not found for user:', user.id, profileError?.message)
        return null
      }

      const effectiveRole = profile.role ?? 1
      console.log('[AUTH_DEBUG] Effective role calculated:', {
        originalRole: profile.role,
        effectiveRole,
        isSupeAdmin: effectiveRole === 0
      })

      console.log('[AUTH_DEBUG] Fetching accessible businesses...')
      const accessibleBusinesses = await getUserAccessibleBusinesses(user.id, effectiveRole, supabase)

      console.log('[AUTH_DEBUG] Final accessible businesses result:', {
        accessibleBusinessesCount: accessibleBusinesses?.length || 0,
        businessIds: accessibleBusinesses?.map(b => b.business_id),
        businessNames: accessibleBusinesses?.map(b => b.company_name)
      })

      const finalAuthUser = {
        id: user.id,
        email: user.email!,
        profile,
        accessibleBusinesses,
        currentBusinessId: profile.business_id?.toString() ?? undefined
      }

      console.log('[AUTH_DEBUG] Cookie-based authentication successful - returning AuthUser:', {
        userId: finalAuthUser.id,
        email: finalAuthUser.email,
        currentBusinessId: finalAuthUser.currentBusinessId,
        accessibleBusinessesCount: finalAuthUser.accessibleBusinesses?.length || 0
      })

      return finalAuthUser
    } else {
      console.log('[AUTH_DEBUG] Using token-based authentication (legacy mode)')
      // Use token-based authentication (legacy)
      const token = await getTokenFromHeaders()
      console.log('[AUTH_DEBUG] Token from headers:', {
        hasToken: !!token,
        tokenPrefix: token?.substring(0, 20) + '...'
      })

      if (!token) {
        // In localStorage mode, server components can't access the token
        // Return null instead of throwing error to allow graceful handling
        console.log('[AUTH_DEBUG] No token found in headers for localStorage mode')
        return null
      }

      console.log('[AUTH_DEBUG] Calling getAuthenticatedUser with token...')
      return getAuthenticatedUser(token)
    }
  } catch (error) {
    console.error('[AUTH_DEBUG] Error getting authenticated user from request:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return null
  }
}

// Header data for layouts (includes both user and businesses)
export async function getHeaderData(): Promise<{ user: AuthUser; availableBusinesses: BusinessSwitcherData[] } | null> {
  const user = await getAuthenticatedUserFromRequest()
  if (!user) {
    return null
  }
  return {
    user,
    availableBusinesses: user.accessibleBusinesses || []
  }
}