import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { AuthUser, Profile, BusinessClient, BusinessSwitcherData } from '@/types/auth'
import { cache } from 'react'
import { sessionMonitor, trackCacheAccess, trackBusinessSwitch, extractRequestContext } from '@/lib/session-monitoring'
import { headers } from 'next/headers'

/**
 * CRITICAL SECURITY FIX: Session Bleeding Vulnerability Resolution
 * 
 * This module replaces the vulnerable auth-helpers.ts with a secure implementation
 * that eliminates global cache sharing between users and implements proper session isolation.
 * 
 * Key Security Improvements:
 * 1. NO GLOBAL CACHE - All caching is request-scoped using React's cache() function
 * 2. Session Isolation - Each request has its own cache context
 * 3. User Fingerprinting - Session validation includes user context verification
 * 4. Real-time Monitoring - Integrated session bleeding detection
 * 5. Atomic Operations - Company switching is atomic and monitored
 * 
 * Previous Vulnerability:
 * - Global authCache object shared between all users in Node.js process
 * - User A's data could be served to User B through shared cache
 * - Critical in Sliplane deployments with multiple concurrent users
 */

// Enhanced rate limiting for auth operations (kept per-request, not global)
interface RateLimitState {
  count: number
  resetTime: number
  lastRetryAfter?: number
}

interface RequestScopedCache {
  user?: {
    data: AuthUser
    timestamp: number
    requestId: string
    sessionFingerprint: string
  }
  businesses?: {
    [userId: string]: {
      data: BusinessSwitcherData[]
      timestamp: number
      requestId: string
    }
  }
  availableBusinesses?: {
    data: BusinessSwitcherData[]
    timestamp: number
    requestId: string
  }
  rateLimits?: { [key: string]: RateLimitState }
}

const CACHE_TTL = 30000 // 30 seconds TTL for request-scoped cache
const STALE_CACHE_TTL = 300000 // 5 minutes TTL for stale cache (used during rate limits)

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000, // 1 second
  MAX_DELAY: 8000, // 8 seconds
  BACKOFF_MULTIPLIER: 2,
}

/**
 * Generate a session fingerprint for additional security validation
 */
function generateSessionFingerprint(): string {
  const headersList = headers()
  const userAgent = headersList.get('user-agent') || ''
  const acceptLanguage = headersList.get('accept-language') || ''
  const acceptEncoding = headersList.get('accept-encoding') || ''
  
  // Create a fingerprint based on stable browser characteristics
  const fingerprint = btoa(`${userAgent}:${acceptLanguage}:${acceptEncoding}`)
  return fingerprint.substring(0, 16) // Truncate for storage efficiency
}

/**
 * Generate a unique request ID for tracking and cache scoping
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Get or create request-scoped cache
 * This ensures each request has its own cache context, preventing cross-user contamination
 */
function getRequestCache(): RequestScopedCache {
  // Use React's cache() to ensure this is request-scoped
  return cache(() => {
    const requestId = generateRequestId()
    console.log(`[AUTH-SECURE] Creating new request-scoped cache: ${requestId}`)
    return {
      businesses: {},
      rateLimits: {}
    } as RequestScopedCache
  })()
}

/**
 * Rate limit handler for auth operations (request-scoped)
 */
class RequestScopedRateLimitHandler {
  /**
   * Check if we're currently rate limited for a specific operation
   */
  static isRateLimited(operation: string, cache: RequestScopedCache): boolean {
    const state = cache.rateLimits?.[operation]
    if (!state) return false
    
    const now = Date.now()
    if (now >= state.resetTime) {
      delete cache.rateLimits![operation]
      return false
    }
    
    return state.count >= RATE_LIMIT_CONFIG.MAX_RETRIES
  }

  /**
   * Record a rate limit hit and calculate backoff
   */
  static recordRateLimit(operation: string, cache: RequestScopedCache, retryAfter?: number): number {
    const now = Date.now()
    
    if (!cache.rateLimits) {
      cache.rateLimits = {}
    }
    
    const state = cache.rateLimits[operation] || { count: 0, resetTime: now }
    
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
    
    cache.rateLimits[operation] = state
    
    console.log(`[AUTH-SECURE] Rate limit recorded for ${operation}: attempt ${state.count}/${RATE_LIMIT_CONFIG.MAX_RETRIES}, next retry in ${delayMs}ms`)
    
    return delayMs
  }

  /**
   * Clear rate limit state for an operation
   */
  static clearRateLimit(operation: string, cache: RequestScopedCache): void {
    if (cache.rateLimits) {
      delete cache.rateLimits[operation]
    }
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
    console.warn(`[AUTH-SECURE] Rate limit detected for ${operation}:`, {
      message: error.message,
      code: error.code,
      details: error.details
    })
    
    // Try to extract retry-after header
    const retryAfter = error.details?.retry_after || error.retryAfter
    const retryAfterNum = retryAfter ? parseInt(retryAfter, 10) : undefined
    
    return { isRateLimit: true, retryAfter: retryAfterNum }
  }
  
  return { isRateLimit: false }
}

/**
 * Validate session fingerprint to detect session hijacking attempts
 */
function validateSessionFingerprint(cachedFingerprint: string): boolean {
  const currentFingerprint = generateSessionFingerprint()
  const isValid = cachedFingerprint === currentFingerprint
  
  if (!isValid) {
    console.warn('[AUTH-SECURE] Session fingerprint mismatch detected - possible session hijacking attempt')
    sessionMonitor.trackEvent({
      sessionId: 'unknown',
      userId: 'unknown',
      action: 'anomaly',
      details: {
        type: 'fingerprint_mismatch',
        cached: cachedFingerprint,
        current: currentFingerprint
      }
    })
  }
  
  return isValid
}

/**
 * Get authenticated user with accessible businesses for server components
 * SECURE VERSION: Uses request-scoped caching with session validation
 * Redirects to login if user is not authenticated
 * Uses RLS policies to determine accessible businesses
 */
export const getAuthenticatedUser = cache(async (): Promise<AuthUser> => {
  console.log('[AUTH-SECURE] getAuthenticatedUser called - request-scoped cache')
  const operation = 'getAuthenticatedUser'
  const requestCache = getRequestCache()
  const requestId = generateRequestId()
  
  // Check if we're rate limited
  if (RequestScopedRateLimitHandler.isRateLimited(operation, requestCache)) {
    console.warn('[AUTH-SECURE] Rate limited, checking for stale cache')
    
    // Try to serve stale cache during rate limit, but validate fingerprint
    if (requestCache.user && isCacheStale(requestCache.user.timestamp)) {
      if (validateSessionFingerprint(requestCache.user.sessionFingerprint)) {
        console.log('[AUTH-SECURE] [STALE-CACHE-HIT] Serving stale cache due to rate limit')
        return requestCache.user.data
      } else {
        console.warn('[AUTH-SECURE] Stale cache fingerprint invalid, forcing re-authentication')
      }
    }
    
    console.error('[AUTH-SECURE] Rate limited and no valid stale cache available')
    redirect('/login')
  }
  
  // Check fresh cache first and validate fingerprint
  if (requestCache.user && isCacheValid(requestCache.user.timestamp)) {
    if (validateSessionFingerprint(requestCache.user.sessionFingerprint)) {
      console.log('[AUTH-SECURE] [CACHE-HIT] Returning cached user data with valid fingerprint')
      
      // Track cache access for monitoring
      const headersList = headers()
      const context = extractRequestContext({
        headers: headersList
      } as any)
      
      trackCacheAccess(
        requestCache.user.requestId,
        requestCache.user.data.id,
        {
          cacheHit: true,
          fingerprintValid: true,
          operation
        },
        context
      )
      
      return requestCache.user.data
    } else {
      console.warn('[AUTH-SECURE] Cache fingerprint invalid, forcing fresh authentication')
      // Clear invalid cache
      requestCache.user = undefined
    }
  }

  console.log('[AUTH-SECURE] [CACHE-MISS] Cache miss or expired, fetching fresh user data')
  
  try {
    const supabase = await createClient()
    const sessionFingerprint = generateSessionFingerprint()

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      const errorInfo = handleSupabaseError(error, operation)
      if (errorInfo.isRateLimit) {
        RequestScopedRateLimitHandler.recordRateLimit(operation, requestCache, errorInfo.retryAfter)
        
        // Try stale cache with fingerprint validation
        if (requestCache.user && isCacheStale(requestCache.user.timestamp)) {
          if (validateSessionFingerprint(requestCache.user.sessionFingerprint)) {
            console.log('[AUTH-SECURE] [STALE-CACHE-HIT] Auth error with rate limit, serving stale cache')
            return requestCache.user.data
          }
        }
      }
      
      console.warn('[AUTH-SECURE] Authentication failed:', error?.message || 'No user found')
      redirect('/login')
    }

    // Fetch user profile data using service role to avoid RLS recursion
    const supabaseService = createServiceRoleClient()
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single() as { data: Profile | null; error: any }

    if (profileError || !profile) {
      const errorInfo = handleSupabaseError(profileError, `${operation}-profile`)
      if (errorInfo.isRateLimit) {
        RequestScopedRateLimitHandler.recordRateLimit(operation, requestCache, errorInfo.retryAfter)
        
        // Try stale cache with fingerprint validation
        if (requestCache.user && isCacheStale(requestCache.user.timestamp)) {
          if (validateSessionFingerprint(requestCache.user.sessionFingerprint)) {
            console.log('[AUTH-SECURE] [STALE-CACHE-HIT] Profile fetch rate limited, serving stale cache')
            return requestCache.user.data
          }
        }
      }
      
      console.warn('[AUTH-SECURE] Profile not found for user:', user.id)
      redirect('/login')
    }

    // Handle null role by treating as regular user (role 1)
    const effectiveRole = profile.role ?? 1

    // Get accessible businesses directly without circular dependency
    const accessibleBusinesses = await getUserAccessibleBusinessesInternal(user.id, effectiveRole, requestCache, requestId)
    
    console.log(`[AUTH-SECURE] User ${user.email} (role: ${effectiveRole}) has access to ${accessibleBusinesses.length} businesses:`, 
      accessibleBusinesses.map(b => b.company_name))

    const authUser: AuthUser = {
      id: user.id,
      email: user.email!,
      profile,
      accessibleBusinesses,
      currentBusinessId: undefined // Will be determined by business context
    }

    // Cache the result with session fingerprint and clear rate limits on success
    requestCache.user = {
      data: authUser,
      timestamp: Date.now(),
      requestId,
      sessionFingerprint
    }
    
    RequestScopedRateLimitHandler.clearRateLimit(operation, requestCache)
    
    // Track successful authentication
    const headersList = headers()
    const context = extractRequestContext({
      headers: headersList
    } as any)
    
    trackCacheAccess(
      requestId,
      user.id,
      {
        cacheHit: false,
        fingerprintSet: sessionFingerprint,
        operation
      },
      context
    )
    
    return authUser
    
  } catch (error) {
    console.error('[AUTH-SECURE] Unexpected error in getAuthenticatedUser:', error)
    
    // Check if this looks like a rate limit error
    const errorInfo = handleSupabaseError(error, operation)
    if (errorInfo.isRateLimit) {
      RequestScopedRateLimitHandler.recordRateLimit(operation, requestCache, errorInfo.retryAfter)
      
      // Try stale cache with fingerprint validation
      if (requestCache.user && isCacheStale(requestCache.user.timestamp)) {
        if (validateSessionFingerprint(requestCache.user.sessionFingerprint)) {
          console.log('[AUTH-SECURE] [STALE-CACHE-HIT] Unexpected error with rate limit, serving stale cache')
          return requestCache.user.data
        }
      }
    }
    
    redirect('/login')
  }
})

/**
 * Get available businesses for Super Admin business switcher
 * SECURE VERSION: Uses request-scoped caching
 * Only returns businesses where dashboard = true
 * Uses consistent ordering to ensure deterministic "first business" selection
 */
export const getAvailableBusinesses = cache(async (): Promise<BusinessSwitcherData[]> => {
  console.log('[AUTH-SECURE] getAvailableBusinesses called - request-scoped cache')
  const requestCache = getRequestCache()
  const requestId = generateRequestId()
  
  // Check cache first
  if (requestCache.availableBusinesses && isCacheValid(requestCache.availableBusinesses.timestamp)) {
    console.log('[AUTH-SECURE] [CACHE-HIT] Returning cached available businesses')
    return requestCache.availableBusinesses.data
  }

  console.log('[AUTH-SECURE] [CACHE-MISS] Cache miss or expired, fetching fresh available businesses')
  const supabase = await createClient()

  const { data: businesses, error } = await supabase
    .from('business_clients')
    .select('business_id, company_name, avatar_url, city, state, permalink')
    .eq('dashboard', true)
    .order('company_name') // Consistent ordering for deterministic first business selection

  if (error) {
    console.error('[AUTH-SECURE] Failed to fetch available businesses:', {
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    return []
  }

  const businessList = (businesses || []) as BusinessSwitcherData[]
  
  // Cache the result with request ID
  requestCache.availableBusinesses = {
    data: businessList,
    timestamp: Date.now(),
    requestId
  }

  console.log(`[AUTH-SECURE] Found and cached ${businessList.length} available businesses with dashboard=true`)
  return businessList
})

/**
 * Get the first available business for super admin redirects
 * SECURE VERSION: Uses the cached available businesses to ensure consistent business selection
 */
export const getFirstAvailableBusinessForSuperAdmin = cache(async (): Promise<BusinessSwitcherData | null> => {
  console.log('[AUTH-SECURE] getFirstAvailableBusinessForSuperAdmin called')
  
  // Use the cached available businesses to ensure consistency
  const businesses = await getAvailableBusinesses()
  
  const firstBusiness: BusinessSwitcherData | null = businesses.length > 0 ? businesses[0] || null : null
  
  console.log('[AUTH-SECURE] First available business for super admin:', firstBusiness?.company_name || 'none')
  return firstBusiness
})

/**
 * Get header data for authenticated user including accessible businesses
 * SECURE VERSION: Uses request-scoped caching
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
 * SECURE VERSION: Uses request-scoped caching
 * Returns null if not authenticated instead of redirecting
 */
export const getAuthenticatedUserForAPI = cache(async (): Promise<AuthUser | null> => {
  console.log('[AUTH-SECURE] getAuthenticatedUserForAPI called - request-scoped cache')
  const requestCache = getRequestCache()
  const requestId = generateRequestId()
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    console.log('[AUTH-SECURE] API auth failed:', error?.message || 'No user found')
    return null
  }

  // Check cache first for API calls too, but validate user ID matches
  if (requestCache.user && 
      isCacheValid(requestCache.user.timestamp) && 
      requestCache.user.data.id === user.id &&
      validateSessionFingerprint(requestCache.user.sessionFingerprint)) {
    console.log('[AUTH-SECURE] [CACHE-HIT] Returning cached user data for API call')
    return requestCache.user.data
  }

  console.log('[AUTH-SECURE] [CACHE-MISS] Cache miss for API call, fetching fresh data')
  // Fetch user profile data using service role to avoid RLS recursion
  const supabaseService = createServiceRoleClient()
  const { data: profile } = await supabaseService
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!profile) {
    console.log('[AUTH-SECURE] Profile not found for API user:', user.id)
    return null
  }

  // Get accessible businesses using RLS policies  
  const accessibleBusinesses = await getUserAccessibleBusinessesInternal(user.id, profile.role, requestCache, requestId)

  const authUser: AuthUser = {
    id: user.id,
    email: user.email!,
    profile,
    accessibleBusinesses,
    currentBusinessId: undefined // Will be determined by business context
  }

  // Update cache for consistency with fingerprint
  const sessionFingerprint = generateSessionFingerprint()
  requestCache.user = {
    data: authUser,
    timestamp: Date.now(),
    requestId,
    sessionFingerprint
  }

  return authUser
})

/**
 * Internal helper to get businesses accessible to a user via profile_businesses table
 * SECURE VERSION: Uses request-scoped caching with user isolation
 * For superadmins: returns all businesses with dashboard=true (bypasses profile_businesses)
 * For regular users: returns businesses from profile_businesses table
 */
async function getUserAccessibleBusinessesInternal(
  userId: string, 
  userRole: number | null, 
  requestCache: RequestScopedCache,
  requestId: string
): Promise<BusinessSwitcherData[]> {
  console.log(`[AUTH-SECURE] getUserAccessibleBusinessesInternal called for user ${userId} with role ${userRole}`)
  const operation = `getUserAccessibleBusinesses-${userId}`
  
  // Check if we're rate limited
  if (RequestScopedRateLimitHandler.isRateLimited(operation, requestCache)) {
    console.warn(`[AUTH-SECURE] Rate limited for user ${userId}, checking for stale cache`)
    
    // Try to serve stale cache during rate limit
    if (requestCache.businesses?.[userId] && isCacheStale(requestCache.businesses[userId].timestamp)) {
      console.log(`[AUTH-SECURE] [STALE-CACHE-HIT] Serving stale businesses cache for user ${userId} due to rate limit`)
      return requestCache.businesses[userId].data
    }
    
    console.warn(`[AUTH-SECURE] Rate limited and no stale cache available for user ${userId}`)
    return []
  }
  
  // Check fresh cache first
  if (requestCache.businesses?.[userId] && isCacheValid(requestCache.businesses[userId].timestamp)) {
    console.log(`[AUTH-SECURE] [CACHE-HIT] Returning cached businesses for user ${userId}`)
    return requestCache.businesses[userId].data
  }

  console.log(`[AUTH-SECURE] [CACHE-MISS] Cache miss or expired, fetching fresh businesses for user ${userId}`)
  
  try {
    const supabase = createServiceRoleClient()
    let businesses: BusinessSwitcherData[] = []
    
    // For superadmins, return all businesses with dashboard=true (bypasses profile_businesses check)
    if (userRole === 0) {
      console.log('[AUTH-SECURE] User is superadmin, fetching all available businesses')
      // Use the cached getAvailableBusinesses which now has proper request-scoped caching
      businesses = await getAvailableBusinesses()
    } else {
      // For regular users, get businesses from profile_businesses table
      console.log('[AUTH-SECURE] User is regular user, fetching businesses from profile_businesses table')
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
          RequestScopedRateLimitHandler.recordRateLimit(operation, requestCache, errorInfo.retryAfter)
          
          // Try stale cache
          if (requestCache.businesses?.[userId] && isCacheStale(requestCache.businesses[userId].timestamp)) {
            console.log(`[AUTH-SECURE] [STALE-CACHE-HIT] Rate limited, serving stale businesses cache for user ${userId}`)
            return requestCache.businesses[userId].data
          }
        }
        
        console.error('[AUTH-SECURE] Failed to fetch user accessible businesses:', {
          userId,
          userRole,
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return []
      }
      
      console.log(`[AUTH-SECURE] Found ${userBusinesses?.length || 0} raw businesses for user ${userId}`)
      
      if (!userBusinesses || userBusinesses.length === 0) {
        console.warn(`[AUTH-SECURE] No businesses found for user ${userId}. This user may not have any business assignments.`)
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
      
      console.log('[AUTH-SECURE] Transformed businesses:', businesses)
    }
    
    // Cache the result with user isolation and clear rate limits on success
    if (!requestCache.businesses) {
      requestCache.businesses = {}
    }
    requestCache.businesses[userId] = {
      data: businesses,
      timestamp: Date.now(),
      requestId
    }
    
    RequestScopedRateLimitHandler.clearRateLimit(operation, requestCache)
    console.log(`[AUTH-SECURE] Cached ${businesses.length} businesses for user ${userId}`)
    return businesses
    
  } catch (error) {
    console.error(`[AUTH-SECURE] Unexpected error fetching businesses for user ${userId}:`, error)
    
    // Check if this looks like a rate limit error
    const errorInfo = handleSupabaseError(error, operation)
    if (errorInfo.isRateLimit) {
      RequestScopedRateLimitHandler.recordRateLimit(operation, requestCache, errorInfo.retryAfter)
      
      // Try stale cache
      if (requestCache.businesses?.[userId] && isCacheStale(requestCache.businesses[userId].timestamp)) {
        console.log(`[AUTH-SECURE] [STALE-CACHE-HIT] Unexpected error with rate limit, serving stale businesses cache for user ${userId}`)
        return requestCache.businesses[userId].data
      }
    }
    
    return []
  }
}

/**
 * Get businesses accessible to the current user via profile_businesses table
 * SECURE VERSION: Uses request-scoped caching
 */
export const getUserAccessibleBusinesses = cache(async (): Promise<BusinessSwitcherData[]> => {
  const user = await getAuthenticatedUserForAPI()
  
  if (!user || !user.profile) {
    return []
  }
  
  // Handle null role by treating as regular user (role 1)
  const effectiveRole = user.profile.role ?? 1
  const requestCache = getRequestCache()
  const requestId = generateRequestId()
  
  return await getUserAccessibleBusinessesInternal(user.id, effectiveRole, requestCache, requestId)
})

/**
 * Validate if user is superadmin and get available companies for switching
 * SECURE VERSION: Uses request-scoped caching
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
 * Validate if a company is accessible to the current user
 * SECURE VERSION: No caching for security validation
 */
export async function validateCompanyAccess(companyId: string): Promise<boolean> {
  const user = await getAuthenticatedUserForAPI()
  
  if (!user) {
    return false
  }
  
  const supabase = createServiceRoleClient()
  
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
 * SECURE VERSION: No caching for security validation
 */
export async function validateBusinessAccessForAPI(user: AuthUser, businessId: string): Promise<boolean> {
  // Handle null role by treating as regular user
  const effectiveRole = user.profile?.role ?? 1
  
  // Super admins (role 0) have access to all businesses, bypassing profile_businesses table
  if (effectiveRole === 0) {
    return true
  }
  
  // Regular users must have explicit access via profile_businesses table
  const supabase = createServiceRoleClient()
  const { data: access, error } = await supabase
    .from('profile_businesses')
    .select('business_id')
    .eq('profile_id', user.id)
    .eq('business_id', parseInt(businessId, 10))
    .single()
  
  return !error && !!access
}

/**
 * Get the effective business ID for a user
 * SECURE VERSION: No caching for this simple operation
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
 * SECURE VERSION: Validates business access before allowing switch
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
    // Track business switch for monitoring
    const headersList = headers()
    const context = extractRequestContext({
      headers: headersList
    } as any)
    
    trackBusinessSwitch(
      generateRequestId(),
      user.id,
      requestedBusinessId,
      context
    )
    
    return requestedBusinessId
  }
  
  // Otherwise, return the first accessible business
  return getEffectiveBusinessId(user)
}

/**
 * Validate that user has access to switch to a specific business
 * SECURE VERSION: Enhanced with monitoring and atomic validation
 */
export async function validateBusinessSwitchAccess(userId: string, businessId: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[AUTH-SECURE] Validating business switch access: user ${userId} -> business ${businessId}`)
  
  // Get user profile to check role using service role to avoid RLS recursion
  const supabaseService = createServiceRoleClient()
  const { data: profile, error: profileError } = await supabaseService
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  
  if (profileError || !profile) {
    console.warn('[AUTH-SECURE] User profile not found for business switch validation:', userId)
    return { success: false, error: 'User profile not found' }
  }
  
  // Handle null role by treating as regular user
  const effectiveRole = profile.role ?? 1
  
  // For superadmins, validate the business exists and has dashboard enabled
  if (effectiveRole === 0) {
    const { data: business, error: businessError } = await supabaseService
      .from('business_clients')
      .select('business_id')
      .eq('business_id', businessId)
      .eq('dashboard', true)
      .single()
    
    const success = !businessError && !!business
    
    if (success) {
      console.log(`[AUTH-SECURE] Superadmin business switch validated: ${userId} -> ${businessId}`)
    } else {
      console.warn(`[AUTH-SECURE] Superadmin business switch denied: ${userId} -> ${businessId}`)
    }
    
    return { 
      success, 
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
  
  if (hasAccess) {
    console.log(`[AUTH-SECURE] Regular user business switch validated: ${userId} -> ${businessId}`)
  } else {
    console.warn(`[AUTH-SECURE] Regular user business switch denied: ${userId} -> ${businessId}`)
  }
  
  return { 
    success: hasAccess, 
    error: hasAccess ? undefined : 'Access denied to the requested business'
  }
}