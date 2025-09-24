import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

/**
 * Request-scoped singleton Supabase client
 * Uses React's cache() to ensure only one instance per request
 * Dramatically reduces cookie.getAll() calls and client creation overhead
 */
export const getSupabaseClient = cache(() => {
  console.log('[SUPABASE_OPTIMIZED] Creating single request-scoped Supabase client')

  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          const allCookies = cookieStore.getAll()
          console.log('[SUPABASE_OPTIMIZED] Cookie access - returning', allCookies.length, 'cookies')
          return allCookies
        },
        setAll(cookiesToSet) {
          console.log('[SUPABASE_OPTIMIZED] setAll() called with', cookiesToSet.length, 'cookies')
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // Server Components can't modify cookies - this is expected and can be ignored
            console.log('[SUPABASE_OPTIMIZED] Cookie setAll warning (expected in Server Components):', error)
          }
        },
      },
    }
  )
})

/**
 * Legacy createCookieClient wrapper for backward compatibility
 * @deprecated Use getSupabaseClient() instead for better performance
 */
export function createCookieClient() {
  console.warn('[SUPABASE_OPTIMIZED] createCookieClient() is deprecated, use getSupabaseClient() for better performance')
  return getSupabaseClient()
}

/**
 * Request-scoped authenticated user data cache
 * Fetches user data once per request and caches the result
 * Eliminates redundant database calls across components
 */
export const getRequestAuthUser = cache(async () => {
  console.log('[SUPABASE_OPTIMIZED] Fetching authenticated user data (cached per request)')

  const supabase = getSupabaseClient()

  // Get user from Supabase using cookies
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    console.log('[SUPABASE_OPTIMIZED] No authenticated user found')
    return null
  }

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.log('[SUPABASE_OPTIMIZED] Profile not found for user:', user.id)
    return null
  }

  const effectiveRole = profile.role ?? 1
  const accessibleBusinesses = await getUserAccessibleBusinesses(user.id, effectiveRole, supabase)

  const authUser = {
    id: user.id,
    email: user.email!,
    profile,
    accessibleBusinesses,
    currentBusinessId: profile.business_id?.toString() ?? undefined
  }

  console.log('[SUPABASE_OPTIMIZED] Cached auth user data:', {
    userId: authUser.id,
    email: authUser.email,
    businessCount: authUser.accessibleBusinesses?.length || 0
  })

  return authUser
})

/**
 * Get accessible businesses for user based on role
 * Used by getRequestAuthUser - leverages the same cached Supabase client
 */
async function getUserAccessibleBusinesses(
  userId: string,
  userRole: number,
  supabase: any
) {
  if (userRole === 0) {
    // Super admin - all businesses with dashboard=true
    const { data: businesses, error } = await supabase
      .from('business_clients')
      .select('business_id, company_name, avatar_url, city, state, permalink')
      .eq('dashboard', true)
      .order('company_name')

    if (error) {
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

/**
 * Request-scoped business resolution cache
 * Caches business lookups to prevent redundant database calls
 */
export const getBusinessByPermalinkCached = cache(async (permalink: string) => {
  console.log('[SUPABASE_OPTIMIZED] Resolving business for permalink (cached):', permalink)

  const supabase = getSupabaseClient()

  const { data: business, error } = await supabase
    .from('business_clients')
    .select('business_id, company_name, permalink, dashboard, avatar_url, city, state')
    .eq('permalink', permalink)
    .single()

  if (error || !business) {
    console.log('[SUPABASE_OPTIMIZED] Business not found for permalink:', permalink)
    return null
  }

  console.log('[SUPABASE_OPTIMIZED] Business resolved:', business.company_name)
  return business
})