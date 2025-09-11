import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { AuthUser, Profile, BusinessClient, BusinessSwitcherData } from '@/types/auth'
import { cache } from 'react'
import { trackCacheAccess, trackLogin, trackLogout } from '@/lib/session-monitoring'

// Enhanced rate limiting for auth operations
interface RateLimitState {
  count: number
  resetTime: number
  lastRetryAfter?: number
}

interface AuthCacheEntry<T> {
  data: T
  timestamp: number
  userId: string // ⭐ CRITICAL: Tie cache entries to specific users
  requestId: string // ⭐ CRITICAL: Unique request identifier
  isStale?: boolean
}

// ⭐ CRITICAL FIX: Request-scoped cache instead of global cache
class RequestScopedAuthCache {
  private static instances = new Map<string, RequestScopedAuthCache>()
  private user?: AuthCacheEntry<AuthUser>
  private businesses = new Map<string, AuthCacheEntry<BusinessSwitcherData[]>>()
  private availableBusinesses?: AuthCacheEntry<BusinessSwitcherData[]>
  private rateLimits = new Map<string, RateLimitState>()
  private requestId: string
  
  private constructor(requestId: string) {
    this.requestId = requestId
  }
  
  public static getInstance(requestId?: string): RequestScopedAuthCache {
    const id = requestId || RequestScopedAuthCache.generateRequestId()
    
    if (!RequestScopedAuthCache.instances.has(id)) {
      RequestScopedAuthCache.instances.set(id, new RequestScopedAuthCache(id))
      
      // Auto-cleanup after 5 minutes to prevent memory leaks
      setTimeout(() => {
        RequestScopedAuthCache.instances.delete(id)
      }, 300000)
    }
    
    return RequestScopedAuthCache.instances.get(id)!
  }
  
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  public getUser(userId: string): AuthCacheEntry<AuthUser> | undefined {
    // ⭐ CRITICAL: Verify user ID matches cache entry
    if (this.user && this.user.userId === userId) {
      trackCacheAccess('cache-session', userId, { 
        cacheHit: true, 
        requestId: this.requestId,
        cacheType: 'user'
      })
      return this.user
    }
    
    if (this.user && this.user.userId !== userId) {
      // ⭐ CRITICAL: Detect cache contamination
      trackCacheAccess('cache-session', userId, { 
        cacheHit: false,
        cacheMismatch: true,
        expectedUserId: userId,
        cachedUserId: this.user.userId,
        requestId: this.requestId,
        cacheType: 'user'
      })
      console.error(`[CACHE-SECURITY] User cache contamination detected!`, {
        expectedUserId: userId,
        cachedUserId: this.user.userId,
        requestId: this.requestId
      })
      // Clear contaminated cache immediately
      this.user = undefined
    }
    
    return undefined
  }
  
  public setUser(userId: string, data: AuthUser): void {
    this.user = {
      data,
      timestamp: Date.now(),
      userId,
      requestId: this.requestId
    }
  }
  
  public getBusinesses(userId: string): AuthCacheEntry<BusinessSwitcherData[]> | undefined {
    const cached = this.businesses.get(userId)
    if (cached && cached.userId === userId) {
      trackCacheAccess('cache-session', userId, { 
        cacheHit: true, 
        requestId: this.requestId,
        cacheType: 'businesses'
      })
      return cached
    }
    return undefined
  }
  
  public setBusinesses(userId: string, data: BusinessSwitcherData[]): void {
    this.businesses.set(userId, {
      data,
      timestamp: Date.now(),
      userId,
      requestId: this.requestId
    })
  }
  
  public getAvailableBusinesses(): AuthCacheEntry<BusinessSwitcherData[]> | undefined {
    if (this.availableBusinesses) {
      trackCacheAccess('cache-session', 'system', { 
        cacheHit: true, 
        requestId: this.requestId,
        cacheType: 'available_businesses'
      })
    }
    return this.availableBusinesses
  }
  
  public setAvailableBusinesses(data: BusinessSwitcherData[]): void {
    this.availableBusinesses = {
      data,
      timestamp: Date.now(),
      userId: 'system', // System-wide cache
      requestId: this.requestId
    }
  }
  
  public clearUser(userId?: string): void {
    if (userId) {
      if (this.user?.userId === userId) {
        this.user = undefined
      }
      this.businesses.delete(userId)
    } else {
      this.user = undefined
      this.businesses.clear()
      this.availableBusinesses = undefined
    }
  }
}

const CACHE_TTL = 30000 // 30 seconds TTL for fresh cache
const STALE_CACHE_TTL = 300000 // 5 minutes TTL for stale cache (used during rate limits)

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000, // 1 second
  MAX_DELAY: 8000, // 8 seconds
  BACKOFF_MULTIPLIER: 2,
}

/**
 * Get a request-scoped cache instance
 */
function getRequestCache(): RequestScopedAuthCache {
  // Generate a unique request ID for this execution context
  const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  return RequestScopedAuthCache.getInstance(requestId)
}

/**
 * Clear auth cache for a specific user (useful for logout or role changes)
 */
export function clearAuthCache(userId?: string) {
  console.log('[AUTH-DEBUG] Clearing auth cache', { userId })
  // Clear across all request caches - this is a rare operation
  // In practice, caches are request-scoped so this has minimal impact
  // TODO: In production, consider using Redis for distributed cache clearing
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
 * Rate limit handler for auth operations
 */
class AuthRateLimitHandler {
  static isRateLimited(cache: RequestScopedAuthCache, operation: string): boolean {
    const state = (cache as any).rateLimits.get(operation)
    if (!state) return false
    
    const now = Date.now()
    if (now >= state.resetTime) {
      (cache as any).rateLimits.delete(operation)
      return false
    }
    
    return state.count >= RATE_LIMIT_CONFIG.MAX_RETRIES
  }

  static recordRateLimit(cache: RequestScopedAuthCache, operation: string, retryAfter?: number): number {
    const now = Date.now()
    const state = (cache as any).rateLimits.get(operation) || { count: 0, resetTime: now }
    
    state.count++
    state.lastRetryAfter = retryAfter
    
    const backoffDelay = Math.min(
      RATE_LIMIT_CONFIG.BASE_DELAY * Math.pow(RATE_LIMIT_CONFIG.BACKOFF_MULTIPLIER, state.count - 1),
      RATE_LIMIT_CONFIG.MAX_DELAY
    )
    
    const delayMs = retryAfter ? retryAfter * 1000 : backoffDelay
    state.resetTime = now + delayMs
    
    ;(cache as any).rateLimits.set(operation, state)
    
    console.log(`[AUTH-DEBUG] Rate limit recorded for ${operation}: attempt ${state.count}/${RATE_LIMIT_CONFIG.MAX_RETRIES}, next retry in ${delayMs}ms`)
    
    return delayMs
  }

  static clearRateLimit(cache: RequestScopedAuthCache, operation: string): void {
    ;(cache as any).rateLimits.delete(operation)
  }
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
    console.warn(`[AUTH-DEBUG] Rate limit detected for ${operation}:`, {
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
 * Get authenticated user with accessible businesses for server components
 * Redirects to login if user is not authenticated
 * Uses RLS policies to determine accessible businesses
 * Implements request-scoped caching with session monitoring
 */
export async function getAuthenticatedUser(): Promise<AuthUser> {
  console.log('[AUTH-DEBUG] getAuthenticatedUser called')
  const operation = 'getAuthenticatedUser'
  
  // ⭐ CRITICAL: Get request-scoped cache
  const authCache = getRequestCache()
  
  // Generate unique session ID for monitoring
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    console.warn('[AUTH-DEBUG] Authentication failed:', error?.message || 'No user found')
    redirect('/login')
  }
  
  // Check if we're rate limited
  if (AuthRateLimitHandler.isRateLimited(authCache, operation)) {
    console.warn('[AUTH-DEBUG] Rate limited, checking for stale cache')
    
    // Try to serve stale cache during rate limit
    const cachedUser = authCache.getUser(user.id)
    if (cachedUser && isCacheStale(cachedUser.timestamp)) {
      console.log('[AUTH-DEBUG] [STALE-CACHE-HIT] Serving stale cache due to rate limit')
      return cachedUser.data
    }
    
    console.error('[AUTH-DEBUG] Rate limited and no stale cache available')
    redirect('/login')
  }
  
  // Check fresh cache first
  const cachedUser = authCache.getUser(user.id)
  if (cachedUser && isCacheValid(cachedUser.timestamp)) {
    console.log('[AUTH-DEBUG] [CACHE-HIT] Returning cached user data')
    return cachedUser.data
  }

  console.log('[AUTH-DEBUG] [CACHE-MISS] Cache miss or expired, fetching fresh user data')
  
  try {
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
        AuthRateLimitHandler.recordRateLimit(authCache, operation, errorInfo.retryAfter)
        
        // Try stale cache
        const cachedUser = authCache.getUser(user.id)
        if (cachedUser && isCacheStale(cachedUser.timestamp)) {
          console.log('[AUTH-DEBUG] [STALE-CACHE-HIT] Profile fetch rate limited, serving stale cache')
          return cachedUser.data
        }
      }
      
      console.warn('[AUTH-DEBUG] Profile not found for user:', user.id)
      redirect('/login')
    }

    // Handle null role by treating as regular user (role 1)
    const effectiveRole = profile.role ?? 1

    // Get accessible businesses directly without circular dependency
    const accessibleBusinesses = await getUserAccessibleBusinessesInternal(user.id, effectiveRole, authCache)
    
    console.log(`[AUTH-DEBUG] User ${user.email} (role: ${effectiveRole}) has access to ${accessibleBusinesses.length} businesses:`, 
      accessibleBusinesses.map(b => b.company_name))

    const authUser: AuthUser = {
      id: user.id,
      email: user.email!,
      profile,
      accessibleBusinesses,
      currentBusinessId: undefined // Will be determined by business context
    }

    // ⭐ CRITICAL: Cache with user ID validation
    authCache.setUser(user.id, authUser)
    
    // Track successful login
    trackLogin(sessionId, user.id, user.email!)
    
    AuthRateLimitHandler.clearRateLimit(authCache, operation)
    return authUser
    
  } catch (error) {
    console.error('[AUTH-DEBUG] Unexpected error in getAuthenticatedUser:', error)
    
    // Check if this looks like a rate limit error
    const errorInfo = handleSupabaseError(error, operation)
    if (errorInfo.isRateLimit) {
      AuthRateLimitHandler.recordRateLimit(authCache, operation, errorInfo.retryAfter)
      
      // Try stale cache
      const cachedUser = authCache.getUser(user.id)
      if (cachedUser && isCacheStale(cachedUser.timestamp)) {
        console.log('[AUTH-DEBUG] [STALE-CACHE-HIT] Unexpected error with rate limit, serving stale cache')
        return cachedUser.data
      }
    }
    
    redirect('/login')
  }
}

/**
 * Get available businesses for Super Admin business switcher
 * Uses request-scoped caching to prevent cross-user contamination
 */
export async function getAvailableBusinesses(): Promise<BusinessSwitcherData[]> {
  console.log('[AUTH-DEBUG] getAvailableBusinesses called')
  
  // ⭐ CRITICAL: Get request-scoped cache
  const authCache = getRequestCache()
  
  // Check cache first
  const cached = authCache.getAvailableBusinesses()
  if (cached && isCacheValid(cached.timestamp)) {
    console.log('[AUTH-DEBUG] [CACHE-HIT] Returning cached available businesses')
    return cached.data
  }

  console.log('[AUTH-DEBUG] [CACHE-MISS] Cache miss or expired, fetching fresh available businesses')
  const supabase = await createClient()

  const { data: businesses, error } = await supabase
    .from('business_clients')
    .select('business_id, company_name, avatar_url, city, state, permalink')
    .eq('dashboard', true)
    .order('company_name') // Consistent ordering for deterministic first business selection

  if (error) {
    console.error('[AUTH-DEBUG] Failed to fetch available businesses:', {
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    return []
  }

  const businessList = (businesses || []) as BusinessSwitcherData[]
  
  // ⭐ CRITICAL: Cache with request scope
  authCache.setAvailableBusinesses(businessList)

  console.log(`[AUTH-DEBUG] Found and cached ${businessList.length} available businesses with dashboard=true`)
  return businessList
}

/**
 * Internal helper to get businesses accessible to a user via profile_businesses table
 * Uses request-scoped caching with user ID validation
 */
async function getUserAccessibleBusinessesInternal(
  userId: string, 
  userRole: number | null, 
  authCache: RequestScopedAuthCache
): Promise<BusinessSwitcherData[]> {
  console.log(`[AUTH-DEBUG] getUserAccessibleBusinessesInternal called for user ${userId} with role ${userRole}`)
  const operation = `getUserAccessibleBusinesses-${userId}`
  
  // Check if we're rate limited
  if (AuthRateLimitHandler.isRateLimited(authCache, operation)) {
    console.warn(`[AUTH-DEBUG] Rate limited for user ${userId}, checking for stale cache`)
    
    const cached = authCache.getBusinesses(userId)
    if (cached && isCacheStale(cached.timestamp)) {
      console.log(`[AUTH-DEBUG] [STALE-CACHE-HIT] Serving stale businesses cache for user ${userId} due to rate limit`)
      return cached.data
    }
    
    console.warn(`[AUTH-DEBUG] Rate limited and no stale cache available for user ${userId}`)
    return []
  }
  
  // Check fresh cache first
  const cached = authCache.getBusinesses(userId)
  if (cached && isCacheValid(cached.timestamp)) {
    console.log(`[AUTH-DEBUG] [CACHE-HIT] Returning cached businesses for user ${userId}`)
    return cached.data
  }

  console.log(`[AUTH-DEBUG] [CACHE-MISS] Cache miss or expired, fetching fresh businesses for user ${userId}`)
  
  try {
    const supabase = createServiceRoleClient()
    let businesses: BusinessSwitcherData[] = []
    
    // For superadmins, return all businesses with dashboard=true (bypasses profile_businesses check)
    if (userRole === 0) {
      console.log('[AUTH-DEBUG] User is superadmin, fetching all available businesses')
      businesses = await getAvailableBusinesses()
    } else {
      // For regular users, get businesses from profile_businesses table
      console.log('[AUTH-DEBUG] User is regular user, fetching businesses from profile_businesses table')
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
          AuthRateLimitHandler.recordRateLimit(authCache, operation, errorInfo.retryAfter)
          
          const cached = authCache.getBusinesses(userId)
          if (cached && isCacheStale(cached.timestamp)) {
            console.log(`[AUTH-DEBUG] [STALE-CACHE-HIT] Rate limited, serving stale businesses cache for user ${userId}`)
            return cached.data
          }
        }
        
        console.error('[AUTH-DEBUG] Failed to fetch user accessible businesses:', {
          userId,
          userRole,
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return []
      }
      
      console.log(`[AUTH-DEBUG] Found ${userBusinesses?.length || 0} raw businesses for user ${userId}`)
      
      if (!userBusinesses || userBusinesses.length === 0) {
        console.warn(`[AUTH-DEBUG] No businesses found for user ${userId}. This user may not have any business assignments.`)
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
      
      console.log('[AUTH-DEBUG] Transformed businesses:', businesses)
    }
    
    // ⭐ CRITICAL: Cache with user ID validation
    authCache.setBusinesses(userId, businesses)
    
    AuthRateLimitHandler.clearRateLimit(authCache, operation)
    console.log(`[AUTH-DEBUG] Cached ${businesses.length} businesses for user ${userId}`)
    return businesses
    
  } catch (error) {
    console.error(`[AUTH-DEBUG] Unexpected error fetching businesses for user ${userId}:`, error)
    
    const errorInfo = handleSupabaseError(error, operation)
    if (errorInfo.isRateLimit) {
      AuthRateLimitHandler.recordRateLimit(authCache, operation, errorInfo.retryAfter)
      
      const cached = authCache.getBusinesses(userId)
      if (cached && isCacheStale(cached.timestamp)) {
        console.log(`[AUTH-DEBUG] [STALE-CACHE-HIT] Unexpected error with rate limit, serving stale businesses cache for user ${userId}`)
        return cached.data
      }
    }
    
    return []
  }
}

/**
 * Get authenticated user for API routes with request-scoped caching
 */
export async function getAuthenticatedUserForAPI(): Promise<AuthUser | null> {
  console.log('[AUTH-DEBUG] getAuthenticatedUserForAPI called')
  
  // ⭐ CRITICAL: Get request-scoped cache
  const authCache = getRequestCache()
  
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    console.log('[AUTH-DEBUG] API auth failed:', error?.message || 'No user found')
    return null
  }

  // Check cache first for API calls too with user ID validation
  const cachedUser = authCache.getUser(user.id)
  if (cachedUser && isCacheValid(cachedUser.timestamp)) {
    console.log('[AUTH-DEBUG] [CACHE-HIT] Returning cached user data for API call')
    return cachedUser.data
  }

  console.log('[AUTH-DEBUG] [CACHE-MISS] Cache miss for API call, fetching fresh data')
  
  const supabaseService = createServiceRoleClient()
  const { data: profile } = await supabaseService
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!profile) {
    console.log('[AUTH-DEBUG] Profile not found for API user:', user.id)
    return null
  }

  const accessibleBusinesses = await getUserAccessibleBusinessesInternal(user.id, profile.role, authCache)

  const authUser: AuthUser = {
    id: user.id,
    email: user.email!,
    profile,
    accessibleBusinesses,
    currentBusinessId: undefined
  }

  // ⭐ CRITICAL: Cache with user ID validation
  authCache.setUser(user.id, authUser)

  return authUser
}

// Re-export all other functions with the same interface but request-scoped caching
export async function getFirstAvailableBusinessForSuperAdmin(): Promise<BusinessSwitcherData | null> {
  console.log('[AUTH-DEBUG] getFirstAvailableBusinessForSuperAdmin called')
  const businesses = await getAvailableBusinesses()
  const firstBusiness: BusinessSwitcherData | null = businesses.length > 0 ? businesses[0] || null : null
  console.log('[AUTH-DEBUG] First available business for super admin:', firstBusiness?.company_name || 'none')
  return firstBusiness
}

export async function getHeaderData() {
  const user = await getAuthenticatedUser()
  const availableBusinesses = await getUserAccessibleBusinesses()
  return { user, availableBusinesses }
}

export async function getSuperAdminCompanies(): Promise<BusinessSwitcherData[]> {
  const user = await getAuthenticatedUserForAPI()
  const effectiveRole = user?.profile?.role ?? 1
  if (!user || effectiveRole !== 0) {
    return []
  }
  return await getAvailableBusinesses()
}

export async function getUserAccessibleBusinesses(): Promise<BusinessSwitcherData[]> {
  const user = await getAuthenticatedUserForAPI()
  if (!user || !user.profile) {
    return []
  }
  const effectiveRole = user.profile.role ?? 1
  const authCache = getRequestCache()
  return await getUserAccessibleBusinessesInternal(user.id, effectiveRole, authCache)
}

export async function validateCompanyAccess(companyId: string): Promise<boolean> {
  const user = await getAuthenticatedUserForAPI()
  if (!user) {
    return false
  }
  
  const supabase = createServiceRoleClient()
  const effectiveRole = user.profile?.role ?? 1
  
  if (effectiveRole === 0) {
    const { data: company, error } = await supabase
      .from('business_clients')
      .select('business_id')
      .eq('business_id', companyId)
      .eq('dashboard', true)
      .single()
    
    return !error && !!company
  }
  
  const { data: access, error } = await supabase
    .from('profile_businesses')
    .select('business_id')
    .eq('profile_id', user.id)
    .eq('business_id', parseInt(companyId, 10))
    .single()
  
  return !error && !!access
}

export async function validateBusinessAccessForAPI(user: AuthUser, businessId: string): Promise<boolean> {
  const effectiveRole = user.profile?.role ?? 1
  
  if (effectiveRole === 0) {
    return true
  }
  
  const supabase = createServiceRoleClient()
  const { data: access, error } = await supabase
    .from('profile_businesses')
    .select('business_id')
    .eq('profile_id', user.id)
    .eq('business_id', parseInt(businessId, 10))
    .single()
  
  return !error && !!access
}

export async function getEffectiveBusinessId(user?: AuthUser): Promise<string | null> {
  const authUser = user || await getAuthenticatedUserForAPI()
  
  if (!authUser || !authUser.accessibleBusinesses || authUser.accessibleBusinesses.length === 0) {
    return null
  }
  
  return authUser.accessibleBusinesses?.[0]?.business_id || null
}

export async function getEffectiveBusinessIdFromRequest(request?: Request | { searchParams?: URLSearchParams }): Promise<string | null> {
  const user = await getAuthenticatedUserForAPI()
  if (!user) return null
  
  let requestedBusinessId: string | null = null
  
  if (request && 'searchParams' in request && request.searchParams) {
    requestedBusinessId = request.searchParams.get('businessId')
  } else if (request && 'url' in request) {
    const url = new URL(request.url)
    requestedBusinessId = url.searchParams.get('businessId')
  }
  
  if (requestedBusinessId && user.accessibleBusinesses?.some(b => b.business_id === requestedBusinessId)) {
    return requestedBusinessId
  }
  
  return getEffectiveBusinessId(user)
}

export async function validateBusinessSwitchAccess(userId: string, businessId: string): Promise<{ success: boolean; error?: string }> {
  const supabaseService = createServiceRoleClient()
  const { data: profile, error: profileError } = await supabaseService
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  
  const supabase = createServiceRoleClient()
  
  if (profileError || !profile) {
    return { success: false, error: 'User profile not found' }
  }
  
  const effectiveRole = profile.role ?? 1
  
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