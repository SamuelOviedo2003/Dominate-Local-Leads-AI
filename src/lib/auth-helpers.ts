import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthUser, Profile, BusinessClient, BusinessSwitcherData } from '@/types/auth'
import { cache } from 'react'
import { debugAuth, debugCache, debugError, extractUserMetadata, debugAPIRequest, debugAPIResponse, DebugContext } from '@/lib/debug'

// Enhanced rate limiting for auth operations
interface RateLimitState {
  count: number
  resetTime: number
  lastRetryAfter?: number
}

interface AuthCacheEntry<T> {
  data: T
  timestamp: number
  isStale?: boolean // Marks cache as stale but still usable during rate limits
}

// Enhanced cache for auth operations with rate limit awareness
interface AuthCache {
  user?: AuthCacheEntry<AuthUser>
  businesses?: { [userId: string]: AuthCacheEntry<BusinessSwitcherData[]> }
  availableBusinesses?: AuthCacheEntry<BusinessSwitcherData[]>
  rateLimits?: { [key: string]: RateLimitState }
}

const authCache: AuthCache = { businesses: {}, rateLimits: {} }
const CACHE_TTL = 120000 // 2 minutes TTL for fresh cache (increased from 30s)
const STALE_CACHE_TTL = 600000 // 10 minutes TTL for stale cache (increased from 5m)

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000, // 1 second
  MAX_DELAY: 8000, // 8 seconds
  BACKOFF_MULTIPLIER: 2,
}

/**
 * Rate limit handler for auth operations
 */
class AuthRateLimitHandler {
  /**
   * Check if we're currently rate limited for a specific operation
   */
  static isRateLimited(operation: string): boolean {
    const state = authCache.rateLimits?.[operation]
    if (!state) return false
    
    const now = Date.now()
    if (now >= state.resetTime) {
      delete authCache.rateLimits![operation]
      return false
    }
    
    return state.count >= RATE_LIMIT_CONFIG.MAX_RETRIES
  }

  /**
   * Record a rate limit hit and calculate backoff
   */
  static recordRateLimit(operation: string, retryAfter?: number): number {
    const now = Date.now()
    
    if (!authCache.rateLimits) {
      authCache.rateLimits = {}
    }
    
    const state = authCache.rateLimits[operation] || { count: 0, resetTime: now }
    
    state.count++
    state.lastRetryAfter = retryAfter
    
    // Calculate exponential backoff delay
    const backoffDelay = Math.min(
      RATE_LIMIT_CONFIG.BASE_DELAY * Math.pow(RATE_LIMIT_CONFIG.BACKOFF_MULTIPLIER, state.count - 1),
      RATE_LIMIT_CONFIG.MAX_DELAY
    )
    
    // Use server-provided retry-after if available, otherwise use backoff
    const delayMs = retryAfter ? retryAfter * 1000 : backoffDelay
    state.resetTime = now + delayMs
    
    authCache.rateLimits[operation] = state
    
    debugAuth('Rate limit recorded for auth operation', {
      operation,
      count: state.count,
      delayMs,
      retryAfter,
      resetTime: state.resetTime
    })
    
    return delayMs
  }

  /**
   * Clear rate limit state for an operation
   */
  static clearRateLimit(operation: string): void {
    if (authCache.rateLimits) {
      delete authCache.rateLimits[operation]
    }
  }
}

/**
 * Clear auth cache for a specific user (useful for logout or role changes)
 */
export function clearAuthCache(userId?: string) {
  debugCache('Clearing auth cache', {
    userId,
    hasUserCache: !!authCache.user,
    hasBusinessesCache: !!authCache.businesses,
    hasAvailableBusinessesCache: !!authCache.availableBusinesses,
    hasRateLimits: !!authCache.rateLimits && Object.keys(authCache.rateLimits).length > 0
  })
  if (userId && authCache.businesses) {
    delete authCache.businesses[userId]
  } else {
    authCache.user = undefined
    authCache.businesses = {}
    authCache.availableBusinesses = undefined
    authCache.rateLimits = {}
  }
}

/**
 * Check if cache entry is still valid (fresh)
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL
}

/**
 * Check if cache entry is stale but still usable
 */
function isCacheStale(timestamp: number): boolean {
  return Date.now() - timestamp < STALE_CACHE_TTL
}

/**
 * Handle Supabase errors with rate limit detection
 */
function handleSupabaseError(error: any, operation: string): { isRateLimit: boolean; retryAfter?: number } {
  if (!error) return { isRateLimit: false }
  
  const errorMessage = error.message?.toLowerCase() || ''
  const errorCode = error.code?.toLowerCase() || ''
  
  // Detect rate limit errors
  const isRateLimit = (
    errorCode === 'rate_limit_exceeded' ||
    errorCode === '429' ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests') ||
    errorMessage.includes('429')
  )
  
  if (isRateLimit) {
    // Try to extract retry-after header
    const retryAfter = error.details?.retry_after || error.retryAfter
    const retryAfterNum = retryAfter ? parseInt(retryAfter, 10) : undefined
    
    debugAuth('Rate limit detected in Supabase error', {
      operation,
      errorCode,
      errorMessage: errorMessage.substring(0, 200),
      retryAfter: retryAfterNum
    })
    
    return { isRateLimit: true, retryAfter: retryAfterNum }
  }
  
  return { isRateLimit: false }
}

/**
 * Get authenticated user with accessible businesses for server components
 * Redirects to login if user is not authenticated
 * Uses RLS policies to determine accessible businesses
 * Implements caching with rate limit handling and stale cache fallback
 */
export async function getAuthenticatedUser(): Promise<AuthUser> {
  const operation = 'getAuthenticatedUser'
  debugAuth('Getting authenticated user', { operation })
  
  // Check if we're rate limited
  if (AuthRateLimitHandler.isRateLimited(operation)) {
    debugAuth('Rate limited for getAuthenticatedUser, checking stale cache', {
      operation,
      hasStaleCache: !!(authCache.user && isCacheStale(authCache.user.timestamp))
    })
    
    // Try to serve stale cache during rate limit
    if (authCache.user && isCacheStale(authCache.user.timestamp)) {
      debugCache('Serving stale user cache due to rate limit', {
        operation,
        cacheAge: Date.now() - authCache.user.timestamp,
        userMetadata: extractUserMetadata(authCache.user.data)
      })
      return authCache.user.data
    }
    
    debugAuth('Rate limited and no stale cache available, redirecting to login', { operation })
    redirect('/login')
  }
  
  // Check fresh cache first
  if (authCache.user && isCacheValid(authCache.user.timestamp)) {
    debugCache('Cache hit: returning fresh user data', {
      cacheAge: Date.now() - authCache.user.timestamp,
      userMetadata: extractUserMetadata(authCache.user.data)
    })
    return authCache.user.data
  }

  debugCache('Cache miss or expired for user data, fetching fresh', {
    hasCachedUser: !!authCache.user,
    cacheAge: authCache.user ? Date.now() - authCache.user.timestamp : null
  })
  
  try {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      const errorInfo = handleSupabaseError(error, operation)
      if (errorInfo.isRateLimit) {
        AuthRateLimitHandler.recordRateLimit(operation, errorInfo.retryAfter)
        
        // Try stale cache
        if (authCache.user && isCacheStale(authCache.user.timestamp)) {
          debugAuth('Auth error with rate limit detected, serving stale cache', {
            operation,
            error: error?.message,
            userMetadata: extractUserMetadata(authCache.user.data)
          })
          return authCache.user.data
        }
      }
      
      debugError(
        DebugContext.AUTH,
        'Authentication failed in getAuthenticatedUser',
        error || new Error('Authentication failed')
      )
      redirect('/login')
    }

    // Fetch user profile data using the same client
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single() as { data: Profile | null; error: any }

    if (profileError || !profile) {
      const errorInfo = handleSupabaseError(profileError, `${operation}-profile`)
      if (errorInfo.isRateLimit) {
        AuthRateLimitHandler.recordRateLimit(operation, errorInfo.retryAfter)
        
        // Try stale cache
        if (authCache.user && isCacheStale(authCache.user.timestamp)) {
          debugAuth('Profile fetch rate limited, serving stale cache', {
            operation: `${operation}-profile`,
            error: profileError?.message,
            userMetadata: extractUserMetadata(authCache.user.data)
          })
          return authCache.user.data
        }
      }
      
      debugError(
        DebugContext.AUTH,
        'Profile not found for authenticated user',
        profileError || new Error('Profile not found')
      )
      redirect('/login')
    }

    // Handle null role by treating as regular user (role 1)
    const effectiveRole = profile.role ?? 1

    // Get accessible businesses directly without circular dependency
    const accessibleBusinesses = await getUserAccessibleBusinessesInternal(user.id, effectiveRole)
    
    debugAuth('User authentication successful', {
      userId: user.id,
      email: user.email,
      role: effectiveRole,
      businessCount: accessibleBusinesses.length,
      userMetadata: extractUserMetadata({ id: user.id, email: user.email!, profile })
    })

    const authUser: AuthUser = {
      id: user.id,
      email: user.email!,
      profile,
      accessibleBusinesses,
      currentBusinessId: undefined // Will be determined by business context
    }

    // Cache the result and clear rate limits on success
    authCache.user = {
      data: authUser,
      timestamp: Date.now()
    }
    
    AuthRateLimitHandler.clearRateLimit(operation)
    return authUser
    
  } catch (error) {
    debugError(
      DebugContext.AUTH,
      'Unexpected error in getAuthenticatedUser',
      error instanceof Error ? error : new Error(String(error))
    )
    
    // Check if this looks like a rate limit error
    const errorInfo = handleSupabaseError(error, operation)
    if (errorInfo.isRateLimit) {
      AuthRateLimitHandler.recordRateLimit(operation, errorInfo.retryAfter)
      
      // Try stale cache
      if (authCache.user && isCacheStale(authCache.user.timestamp)) {
        debugAuth('Unexpected error with rate limit, serving stale cache', {
          operation,
          error: error instanceof Error ? error.message : String(error),
          userMetadata: extractUserMetadata(authCache.user.data)
        })
        return authCache.user.data
      }
    }
    
    redirect('/login')
  }
}

/**
 * Get available businesses for Super Admin business switcher
 * Only returns businesses where dashboard = true
 * Uses consistent ordering to ensure deterministic "first business" selection
 * Implements caching to prevent repeated database calls
 */
export async function getAvailableBusinesses(): Promise<BusinessSwitcherData[]> {
  debugAuth('Getting available businesses for business switcher')
  
  // Check cache first
  if (authCache.availableBusinesses && isCacheValid(authCache.availableBusinesses.timestamp)) {
    debugCache('Cache hit: returning cached available businesses', {
      businessCount: authCache.availableBusinesses.data.length,
      cacheAge: Date.now() - authCache.availableBusinesses.timestamp
    })
    return authCache.availableBusinesses.data
  }

  debugCache('Cache miss or expired for available businesses, fetching fresh', {
    hasCachedBusinesses: !!authCache.availableBusinesses,
    cacheAge: authCache.availableBusinesses ? Date.now() - authCache.availableBusinesses.timestamp : null
  })
  const supabase = await createClient()

  const { data: businesses, error } = await supabase
    .from('business_clients')
    .select('business_id, company_name, avatar_url, city, state, permalink')
    .eq('dashboard', true)
    .order('company_name') // Consistent ordering for deterministic first business selection

  if (error) {
    debugError(
      DebugContext.AUTH,
      'Failed to fetch available businesses',
      error || new Error('Failed to fetch available businesses')
    )
    return []
  }

  const businessList = (businesses || []) as BusinessSwitcherData[]
  
  // Cache the result
  authCache.availableBusinesses = {
    data: businessList,
    timestamp: Date.now()
  }

  debugAuth('Successfully fetched and cached available businesses', {
    businessCount: businessList.length,
    businesses: businessList.map(b => ({ id: b.business_id, name: b.company_name }))
  })
  return businessList
}

/**
 * Get the first available business for super admin redirects
 * Uses the cached available businesses to ensure consistent business selection
 * Uses the same ordering as getAvailableBusinesses for consistency
 */
export async function getFirstAvailableBusinessForSuperAdmin(): Promise<BusinessSwitcherData | null> {
  debugAuth('Getting first available business for super admin redirect')
  
  // Use the cached available businesses to ensure consistency
  const businesses = await getAvailableBusinesses()
  
  const firstBusiness: BusinessSwitcherData | null = businesses.length > 0 ? businesses[0] || null : null
  
  debugAuth('Determined first available business for super admin', {
    businessId: firstBusiness?.business_id,
    companyName: firstBusiness?.company_name,
    hasBusinesses: businesses.length > 0
  })
  return firstBusiness
}

/**
 * Get header data for authenticated user including accessible businesses
 * Uses the new profile_businesses system for regular users, all businesses for super admins
 */
export async function getHeaderData() {
  const user = await getAuthenticatedUser()
  
  // Get accessible businesses using the new profile_businesses system
  const availableBusinesses = await getUserAccessibleBusinesses()

  return {
    user,
    availableBusinesses
  }
}

/**
 * Get authenticated user for API routes
 * Returns null if not authenticated instead of redirecting
 * Uses RLS policies to determine accessible businesses
 * Implements caching for API routes as well
 */
export async function getAuthenticatedUserForAPI(): Promise<AuthUser | null> {
  debugAuth('Getting authenticated user for API route')
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    debugAuth('API authentication failed', {
      hasError: !!error,
      hasUser: !!user,
      error: error?.message
    })
    return null
  }

  // Check cache first for API calls too
  if (authCache.user && isCacheValid(authCache.user.timestamp) && authCache.user.data.id === user.id) {
    debugCache('Cache hit: returning cached user data for API call', {
      userId: user.id,
      cacheAge: Date.now() - authCache.user.timestamp,
      userMetadata: extractUserMetadata(authCache.user.data)
    })
    return authCache.user.data
  }

  debugCache('Cache miss for API call, fetching fresh user data', {
    userId: user.id,
    hasCachedUser: !!authCache.user,
    cacheValid: authCache.user ? isCacheValid(authCache.user.timestamp) : false
  })
  // Fetch user profile data using the same client
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!profile) {
    debugError(
      DebugContext.AUTH,
      'Profile not found for API user',
      new Error('Profile not found for API user')
    )
    return null
  }

  // Get accessible businesses using RLS policies  
  const accessibleBusinesses = await getUserAccessibleBusinessesInternal(user.id, profile.role)

  const authUser: AuthUser = {
    id: user.id,
    email: user.email!,
    profile,
    accessibleBusinesses,
    currentBusinessId: undefined // Will be determined by business context
  }

  // Update cache for consistency
  authCache.user = {
    data: authUser,
    timestamp: Date.now()
  }

  return authUser
}

/**
 * Validate if user is superadmin and get available companies for switching
 * Returns companies only if user has role 0 (superadmin)
 */
export async function getSuperAdminCompanies(): Promise<BusinessSwitcherData[]> {
  const user = await getAuthenticatedUserForAPI()
  
  // Handle null role by treating as regular user
  const effectiveRole = user?.profile?.role ?? 1
  
  if (!user || effectiveRole !== 0) {
    return []
  }
  
  return await getAvailableBusinesses()
}

/**
 * Internal helper to get businesses accessible to a user via profile_businesses table
 * For superadmins: returns all businesses with dashboard=true (bypasses profile_businesses)
 * For regular users: returns businesses from profile_businesses table
 * Implements caching with rate limit handling and stale cache fallback
 */
async function getUserAccessibleBusinessesInternal(userId: string, userRole: number | null): Promise<BusinessSwitcherData[]> {
  const operation = `getUserAccessibleBusinesses-${userId}`
  debugAuth('Getting user accessible businesses (internal)', {
    userId,
    userRole,
    operation
  })
  
  // Check if we're rate limited
  if (AuthRateLimitHandler.isRateLimited(operation)) {
    debugAuth('Rate limited for getUserAccessibleBusinessesInternal, checking stale cache', {
      userId,
      operation,
      hasStaleCache: !!(authCache.businesses?.[userId] && isCacheStale(authCache.businesses[userId].timestamp))
    })
    
    // Try to serve stale cache during rate limit
    if (authCache.businesses?.[userId] && isCacheStale(authCache.businesses[userId].timestamp)) {
      debugCache('Serving stale businesses cache due to rate limit', {
        userId,
        operation,
        businessCount: authCache.businesses[userId].data.length,
        cacheAge: Date.now() - authCache.businesses[userId].timestamp
      })
      return authCache.businesses[userId].data
    }
    
    debugAuth('Rate limited and no stale businesses cache available', {
      userId,
      operation
    })
    return []
  }
  
  // Check fresh cache first
  if (authCache.businesses?.[userId] && isCacheValid(authCache.businesses[userId].timestamp)) {
    debugCache('Cache hit: returning cached businesses for user', {
      userId,
      businessCount: authCache.businesses[userId].data.length,
      cacheAge: Date.now() - authCache.businesses[userId].timestamp
    })
    return authCache.businesses[userId].data
  }

  debugCache('Cache miss or expired for user businesses, fetching fresh', {
    userId,
    userRole,
    hasCachedBusinesses: !!(authCache.businesses?.[userId]),
    cacheAge: authCache.businesses?.[userId] ? Date.now() - authCache.businesses[userId].timestamp : null
  })
  
  try {
    const supabase = await createClient()
    let businesses: BusinessSwitcherData[] = []
    
    // For superadmins, return all businesses with dashboard=true (bypasses profile_businesses check)
    if (userRole === 0) {
      debugAuth('User is superadmin, fetching all available businesses', {
        userId,
        userRole
      })
      // Use the cached getAvailableBusinesses which now has proper caching
      businesses = await getAvailableBusinesses()
    } else {
      debugAuth('User is regular user, fetching from profile_businesses table', {
        userId,
        userRole
      })
      // For regular users, get businesses from profile_businesses table
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
        const errorInfo = handleSupabaseError(error, operation)
        if (errorInfo.isRateLimit) {
          AuthRateLimitHandler.recordRateLimit(operation, errorInfo.retryAfter)
          
          // Try stale cache
          if (authCache.businesses?.[userId] && isCacheStale(authCache.businesses[userId].timestamp)) {
            debugAuth('Rate limited fetching user businesses, serving stale cache', {
              userId,
              operation,
              error: error?.message,
              businessCount: authCache.businesses[userId].data.length
            })
            return authCache.businesses[userId].data
          }
        }
        
        debugError(
          DebugContext.AUTH,
          'Failed to fetch user accessible businesses',
          error || new Error('Failed to fetch user accessible businesses')
        )
        return []
      }
      
      debugAuth('Successfully fetched raw businesses for user', {
        userId,
        rawBusinessCount: userBusinesses ? userBusinesses.length : 0
      })
      
      if (!userBusinesses || userBusinesses.length === 0) {
        debugAuth('No businesses found for user in profile_businesses table', {
          userId,
          userRole
        })
        return []
      }
      
      // Transform the data to match BusinessSwitcherData format
      businesses = userBusinesses.map((ub: any) => ({
        business_id: ub.business_clients.business_id.toString(),
        company_name: ub.business_clients.company_name,
        avatar_url: ub.business_clients.avatar_url,
        city: ub.business_clients.city,
        state: ub.business_clients.state,
        permalink: ub.business_clients.permalink
      }))
      
      debugAuth('Successfully transformed businesses for user', {
        userId,
        businessCount: businesses.length,
        businesses: businesses.map(b => ({ id: b.business_id, name: b.company_name }))
      })
    }
    
    // Cache the result and clear rate limits on success
    if (!authCache.businesses) {
      authCache.businesses = {}
    }
    authCache.businesses[userId] = {
      data: businesses,
      timestamp: Date.now()
    }
    
    AuthRateLimitHandler.clearRateLimit(operation)
    debugCache('Successfully cached businesses for user', {
      userId,
      businessCount: businesses.length,
      operation
    })
    return businesses
    
  } catch (error) {
    debugError(
      DebugContext.AUTH,
      'Unexpected error fetching businesses for user',
      error instanceof Error ? error : new Error(String(error))
    )
    
    // Check if this looks like a rate limit error
    const errorInfo = handleSupabaseError(error, operation)
    if (errorInfo.isRateLimit) {
      AuthRateLimitHandler.recordRateLimit(operation, errorInfo.retryAfter)
      
      // Try stale cache
      if (authCache.businesses?.[userId] && isCacheStale(authCache.businesses[userId].timestamp)) {
        debugAuth('Unexpected error with rate limit, serving stale businesses cache', {
          userId,
          operation,
          error: error instanceof Error ? error.message : String(error),
          businessCount: authCache.businesses[userId].data.length
        })
        return authCache.businesses[userId].data
      }
    }
    
    return []
  }
}

/**
 * Get businesses accessible to the current user via profile_businesses table
 * For superadmins: returns all businesses with dashboard=true (bypasses profile_businesses)
 * For regular users: returns businesses from profile_businesses table
 */
export async function getUserAccessibleBusinesses(): Promise<BusinessSwitcherData[]> {
  const user = await getAuthenticatedUserForAPI()
  
  if (!user || !user.profile) {
    return []
  }
  
  // Handle null role by treating as regular user (role 1)
  const effectiveRole = user.profile.role ?? 1
  
  return await getUserAccessibleBusinessesInternal(user.id, effectiveRole)
}

/**
 * Validate if a company is accessible to the current user
 * For superadmins: validates company has dashboard=true (bypasses profile_businesses)
 * For regular users: validates company exists in profile_businesses table
 */
export async function validateCompanyAccess(companyId: string): Promise<boolean> {
  const user = await getAuthenticatedUserForAPI()
  
  if (!user) {
    return false
  }
  
  const supabase = await createClient()
  
  // Handle null role by treating as regular user
  const effectiveRole = user.profile?.role ?? 1
  
  // For superadmins, validate the company has dashboard=true (bypasses profile_businesses check)
  if (effectiveRole === 0) {
    const { data: company, error } = await supabase
      .from('business_clients')
      .select('business_id')
      .eq('business_id', companyId)
      .eq('dashboard', true)
      .single()
    
    return !error && !!company
  }
  
  // For regular users, check if they have access via profile_businesses table
  const { data: access, error } = await supabase
    .from('profile_businesses')
    .select('business_id')
    .eq('profile_id', user.id)
    .eq('business_id', parseInt(companyId, 10))
    .single()
  
  return !error && !!access
}

/**
 * Validate business access for API routes using the new profile_businesses system
 * For superadmins: allows access to all businesses with dashboard=true (bypasses profile_businesses)
 * For regular users: validates access via profile_businesses table
 */
export async function validateBusinessAccessForAPI(user: AuthUser, businessId: string): Promise<boolean> {
  // Handle null role by treating as regular user
  const effectiveRole = user.profile?.role ?? 1
  
  // Super admins (role 0) have access to all businesses, bypassing profile_businesses table
  if (effectiveRole === 0) {
    return true
  }
  
  // Regular users must have explicit access via profile_businesses table
  const supabase = await createClient()
  const { data: access, error } = await supabase
    .from('profile_businesses')
    .select('business_id')
    .eq('profile_id', user.id)
    .eq('business_id', parseInt(businessId, 10))
    .single()
  
  return !error && !!access
}

/**
 * Get the effective business ID for a user in the new profile_businesses system
 * For API routes that need a single business ID to work with
 * Returns the first accessible business ID for the user, or null if none available
 */
export async function getEffectiveBusinessId(user?: AuthUser): Promise<string | null> {
  const authUser = user || await getAuthenticatedUserForAPI()
  
  if (!authUser || !authUser.accessibleBusinesses || authUser.accessibleBusinesses.length === 0) {
    return null
  }
  
  // Return the first accessible business ID
  return authUser.accessibleBusinesses?.[0]?.business_id || null
}

/**
 * Get the effective business ID from request context (for API routes)
 * Handles business switching by checking for business ID in query params or using user's first accessible business
 */
export async function getEffectiveBusinessIdFromRequest(request?: Request | { searchParams?: URLSearchParams }): Promise<string | null> {
  const user = await getAuthenticatedUserForAPI()
  if (!user) return null
  
  // Check if there's a business ID in the request (for business switching)
  let requestedBusinessId: string | null = null
  
  if (request && 'searchParams' in request && request.searchParams) {
    requestedBusinessId = request.searchParams.get('businessId')
  } else if (request && 'url' in request) {
    const url = new URL(request.url)
    requestedBusinessId = url.searchParams.get('businessId')
  }
  
  // If a specific business is requested and user has access to it, use that
  if (requestedBusinessId && user.accessibleBusinesses?.some(b => b.business_id === requestedBusinessId)) {
    return requestedBusinessId
  }
  
  // Otherwise, return the first accessible business
  return getEffectiveBusinessId(user)
}

/**
 * Validate that user has access to switch to a specific business
 * Uses the new profile_businesses + RLS system for validation
 */
export async function validateBusinessSwitchAccess(userId: string, businessId: string): Promise<{ success: boolean; error?: string }> {
  // Get user profile to check role using service role to avoid RLS recursion
  const supabase = await createClient()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  
  if (profileError || !profile) {
    return { success: false, error: 'User profile not found' }
  }
  
  // Handle null role by treating as regular user
  const effectiveRole = profile.role ?? 1
  
  // For superadmins, validate the business exists and has dashboard enabled
  if (effectiveRole === 0) {
    const { data: business, error: businessError } = await supabase
      .from('business_clients')
      .select('business_id')
      .eq('business_id', businessId)
      .eq('dashboard', true)
      .single()
    
    return { 
      success: !businessError && !!business, 
      error: businessError || !business ? 'Target business not found or not accessible' : undefined
    }
  }
  
  // For regular users, check access via profile_businesses table
  const hasAccess = await validateBusinessAccessForAPI({ 
    id: userId, 
    email: '', 
    profile: {
      id: userId,
      email: '',
      full_name: '',
      avatar_url: null,
      role: profile.role,
      business_id: null,
      telegram_id: null,
      ghl_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any
  }, businessId)
  
  return { 
    success: hasAccess, 
    error: hasAccess ? undefined : 'Access denied to the requested business'
  }
}