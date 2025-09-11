import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { AuthUser, Profile, BusinessClient, BusinessSwitcherData } from '@/types/auth'
import { cache } from 'react'
import { sessionMonitor, trackCacheAccess, extractRequestContext } from '@/lib/session-monitoring'
import { headers } from 'next/headers'
import { RedisSessionStore } from '@/lib/redis-session-store'

/**
 * SECURE REQUEST-SCOPED AUTHENTICATION SYSTEM
 * 
 * This replaces the vulnerable global cache with proper request isolation.
 * Each request gets its own cache that cannot leak between users.
 */

interface RequestContext {
  requestId: string
  userId?: string
  sessionId?: string
  timestamp: number
}

/**
 * Generate a unique request ID for tracking and isolation
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2)}`
}

/**
 * Extract request context for session isolation
 */
async function getRequestContext(): Promise<RequestContext> {
  const headersList = await headers()
  const requestId = generateRequestId()
  
  // Try to extract session ID from headers (set by middleware)
  const sessionId = headersList.get('x-session-id') || 
                   headersList.get('x-request-id') || 
                   requestId

  return {
    requestId,
    sessionId,
    timestamp: Date.now()
  }
}

/**
 * REQUEST-SCOPED cached function to get authenticated user
 * Each request gets its own isolated cache using React's cache() function
 */
export const getAuthenticatedUser = cache(async (): Promise<AuthUser> => {
  console.log('[AUTH-ISOLATED] getAuthenticatedUser called with request-scoped cache')
  
  const context = await getRequestContext()
  
  try {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      console.warn('[AUTH-ISOLATED] Authentication failed:', error?.message || 'No user found')
      redirect('/login')
    }

    // Update request context with user ID
    context.userId = user.id

    // Track cache access for monitoring
    sessionMonitor.trackEvent({
      sessionId: context.sessionId!,
      userId: user.id,
      action: 'cache_access',
      details: {
        requestId: context.requestId,
        cacheType: 'user',
        operation: 'getAuthenticatedUser'
      }
    })

    // Fetch user profile data using service role to avoid RLS recursion
    const supabaseService = createServiceRoleClient()
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single() as { data: Profile | null; error: any }

    if (profileError || !profile) {
      console.warn('[AUTH-ISOLATED] Profile not found for user:', user.id)
      redirect('/login')
    }

    // Handle null role by treating as regular user (role 1)
    const effectiveRole = profile.role ?? 1

    // Get accessible businesses using request-scoped function
    const accessibleBusinesses = await getUserAccessibleBusinessesIsolated(user.id, effectiveRole)
    
    console.log(`[AUTH-ISOLATED] User ${user.email} (role: ${effectiveRole}) has access to ${accessibleBusinesses.length} businesses`)

    const authUser: AuthUser = {
      id: user.id,
      email: user.email!,
      profile,
      accessibleBusinesses,
      currentBusinessId: undefined // Will be determined by business context
    }

    return authUser
    
  } catch (error) {
    console.error('[AUTH-ISOLATED] Unexpected error in getAuthenticatedUser:', error)
    redirect('/login')
  }
})

/**
 * REQUEST-SCOPED cached function to get user accessible businesses
 */
const getUserAccessibleBusinessesIsolated = cache(async (userId: string, userRole: number | null): Promise<BusinessSwitcherData[]> => {
  console.log(`[AUTH-ISOLATED] getUserAccessibleBusinessesIsolated called for user ${userId} with role ${userRole}`)
  
  const context = await getRequestContext()
  
  try {
    const supabase = createServiceRoleClient()
    let businesses: BusinessSwitcherData[] = []
    
    // Track cache access
    sessionMonitor.trackEvent({
      sessionId: context.sessionId!,
      userId,
      action: 'cache_access',
      details: {
        requestId: context.requestId,
        cacheType: 'businesses',
        operation: 'getUserAccessibleBusinesses',
        userRole
      }
    })
    
    // For superadmins, return all businesses with dashboard=true
    if (userRole === 0) {
      console.log('[AUTH-ISOLATED] User is superadmin, fetching all available businesses')
      businesses = await getAvailableBusinessesIsolated()
    } else {
      // For regular users, get businesses from profile_businesses table
      console.log('[AUTH-ISOLATED] User is regular user, fetching businesses from profile_businesses table')
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
        console.error('[AUTH-ISOLATED] Failed to fetch user accessible businesses:', error)
        return []
      }
      
      if (!userBusinesses || userBusinesses.length === 0) {
        console.warn(`[AUTH-ISOLATED] No businesses found for user ${userId}`)
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
    }
    
    console.log(`[AUTH-ISOLATED] Retrieved ${businesses.length} businesses for user ${userId}`)
    return businesses
    
  } catch (error) {
    console.error(`[AUTH-ISOLATED] Unexpected error fetching businesses for user ${userId}:`, error)
    return []
  }
})

/**
 * REQUEST-SCOPED cached function to get available businesses
 */
const getAvailableBusinessesIsolated = cache(async (): Promise<BusinessSwitcherData[]> => {
  console.log('[AUTH-ISOLATED] getAvailableBusinessesIsolated called')
  
  const context = await getRequestContext()
  const supabase = await createClient()

  const { data: businesses, error } = await supabase
    .from('business_clients')
    .select('business_id, company_name, avatar_url, city, state, permalink')
    .eq('dashboard', true)
    .order('company_name') // Consistent ordering

  if (error) {
    console.error('[AUTH-ISOLATED] Failed to fetch available businesses:', error)
    return []
  }

  const businessList = (businesses || []) as BusinessSwitcherData[]
  console.log(`[AUTH-ISOLATED] Found ${businessList.length} available businesses with dashboard=true`)
  
  return businessList
})

/**
 * Get authenticated user for API routes (non-redirecting version)
 */
export async function getAuthenticatedUserForAPI(): Promise<AuthUser | null> {
  console.log('[AUTH-ISOLATED] getAuthenticatedUserForAPI called')
  
  const context = await getRequestContext()
  
  try {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      console.log('[AUTH-ISOLATED] API auth failed:', error?.message || 'No user found')
      return null
    }

    // Track cache access
    sessionMonitor.trackEvent({
      sessionId: context.sessionId!,
      userId: user.id,
      action: 'cache_access',
      details: {
        requestId: context.requestId,
        cacheType: 'user_api',
        operation: 'getAuthenticatedUserForAPI'
      }
    })

    // Fetch user profile data using service role
    const supabaseService = createServiceRoleClient()
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single() as { data: Profile | null }

    if (!profile) {
      console.log('[AUTH-ISOLATED] Profile not found for API user:', user.id)
      return null
    }

    // Get accessible businesses using the isolated function
    const accessibleBusinesses = await getUserAccessibleBusinessesIsolated(user.id, profile.role)

    const authUser: AuthUser = {
      id: user.id,
      email: user.email!,
      profile,
      accessibleBusinesses,
      currentBusinessId: undefined
    }

    return authUser
    
  } catch (error) {
    console.error('[AUTH-ISOLATED] Unexpected error in getAuthenticatedUserForAPI:', error)
    return null
  }
}

/**
 * Get header data for authenticated user
 */
export async function getHeaderData() {
  const user = await getAuthenticatedUser()
  const availableBusinesses = user.accessibleBusinesses

  return {
    user,
    availableBusinesses
  }
}

/**
 * Validate company access for the current user
 */
export async function validateCompanyAccess(companyId: string): Promise<boolean> {
  const user = await getAuthenticatedUserForAPI()
  
  if (!user) {
    return false
  }
  
  const supabase = createServiceRoleClient()
  
  // Handle null role by treating as regular user
  const effectiveRole = user.profile?.role ?? 1
  
  // For superadmins, validate the company has dashboard=true
  if (effectiveRole === 0) {
    const { data: company, error } = await supabase
      .from('business_clients')
      .select('business_id')
      .eq('business_id', companyId)
      .eq('dashboard', true)
      .single()
    
    return !error && !!company
  }
  
  // For regular users, check if they have access via accessible businesses
  return user.accessibleBusinesses?.some(b => b.business_id === companyId) || false
}

/**
 * Validate business access for API routes
 */
export async function validateBusinessAccessForAPI(user: AuthUser, businessId: string): Promise<boolean> {
  // Handle null role by treating as regular user
  const effectiveRole = user.profile?.role ?? 1
  
  // Super admins have access to all businesses
  if (effectiveRole === 0) {
    return true
  }
  
  // Regular users must have explicit access
  return user.accessibleBusinesses?.some(b => b.business_id === businessId) || false
}

/**
 * Get the effective business ID for a user
 */
export async function getEffectiveBusinessId(user?: AuthUser): Promise<string | null> {
  const authUser = user || await getAuthenticatedUserForAPI()
  
  if (!authUser || !authUser.accessibleBusinesses || authUser.accessibleBusinesses.length === 0) {
    return null
  }
  
  return authUser.accessibleBusinesses[0]?.business_id || null
}

/**
 * Validate that user has access to switch to a specific business
 */
export async function validateBusinessSwitchAccess(userId: string, businessId: string): Promise<{ success: boolean; error?: string }> {
  const context = await getRequestContext()
  
  // Track business switch attempt
  sessionMonitor.trackEvent({
    sessionId: context.sessionId!,
    userId,
    businessId,
    action: 'business_switch',
    details: {
      requestId: context.requestId,
      operation: 'validateBusinessSwitchAccess'
    }
  })

  // Get user profile to check role
  const supabaseService = createServiceRoleClient()
  const { data: profile, error: profileError } = await supabaseService
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
    const { data: business, error: businessError } = await supabaseService
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
  const { data: access, error: accessError } = await supabaseService
    .from('profile_businesses')
    .select('business_id')
    .eq('profile_id', userId)
    .eq('business_id', parseInt(businessId, 10))
    .single()
  
  return { 
    success: !accessError && !!access, 
    error: !accessError && !!access ? undefined : 'Access denied to the requested business'
  }
}

/**
 * Clear any cached data for the current request (for testing/debugging)
 */
export function clearRequestCache() {
  console.log('[AUTH-ISOLATED] Request cache will be cleared automatically at request end')
  // React's cache() automatically clears at the end of each request
  // No manual cleanup needed - this is the beauty of request-scoped caching
}