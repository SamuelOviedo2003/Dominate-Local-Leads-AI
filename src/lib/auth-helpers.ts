import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { AuthUser, Profile, BusinessClient, BusinessSwitcherData } from '@/types/auth'

/**
 * Get authenticated user with accessible businesses for server components
 * Redirects to login if user is not authenticated
 * Uses RLS policies to determine accessible businesses
 */
export async function getAuthenticatedUser(): Promise<AuthUser> {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    console.warn('Authentication failed:', error?.message || 'No user found')
    redirect('/login')
  }

  // Fetch user profile data using service role to avoid RLS recursion
  const supabaseService = createServiceRoleClient()
  const { data: profile } = await supabaseService
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!profile) {
    console.warn('Profile not found for user:', user.id)
    redirect('/login')
  }

  // Handle null role by treating as regular user (role 1)
  const effectiveRole = profile.role ?? 1

  // Get accessible businesses directly without circular dependency
  const accessibleBusinesses = await getUserAccessibleBusinessesInternal(user.id, effectiveRole)
  
  console.log(`User ${user.email} (role: ${effectiveRole}) has access to ${accessibleBusinesses.length} businesses:`, 
    accessibleBusinesses.map(b => b.company_name))

  return {
    id: user.id,
    email: user.email!,
    profile,
    accessibleBusinesses,
    currentBusinessId: undefined // Will be determined by business context
  }
}

/**
 * Get available businesses for Super Admin business switcher
 * Only returns businesses where dashboard = true
 */
export async function getAvailableBusinesses(): Promise<BusinessSwitcherData[]> {
  const supabase = await createClient()

  const { data: businesses, error } = await supabase
    .from('business_clients')
    .select('business_id, company_name, avatar_url, city, state')
    .eq('dashboard', true)
    .order('company_name')

  if (error) {
    console.error('Failed to fetch available businesses:', {
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    return []
  }

  console.log(`Found ${businesses?.length || 0} available businesses with dashboard=true`)
  return businesses as BusinessSwitcherData[]
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
 */
export async function getAuthenticatedUserForAPI(): Promise<AuthUser | null> {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return null
  }

  // Fetch user profile data using service role to avoid RLS recursion
  const supabaseService = createServiceRoleClient()
  const { data: profile } = await supabaseService
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!profile) {
    return null
  }

  // Get accessible businesses using RLS policies  
  const accessibleBusinesses = await getUserAccessibleBusinessesInternal(user.id, profile.role)

  return {
    id: user.id,
    email: user.email!,
    profile,
    accessibleBusinesses,
    currentBusinessId: undefined // Will be determined by business context
  }
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
 */
async function getUserAccessibleBusinessesInternal(userId: string, userRole: number | null): Promise<BusinessSwitcherData[]> {
  const supabase = createServiceRoleClient()
  
  console.log(`Fetching accessible businesses for user ${userId} with role ${userRole}`)
  
  // For superadmins, return all businesses with dashboard=true (bypasses profile_businesses check)
  if (userRole === 0) {
    console.log('User is superadmin, fetching all available businesses')
    return await getAvailableBusinesses()
  }
  
  // For regular users, get businesses from profile_businesses table
  console.log('User is regular user, fetching businesses from profile_businesses table')
  const { data: userBusinesses, error } = await supabase
    .from('profile_businesses')
    .select(`
      business_id,
      business_clients!inner(
        business_id,
        company_name,
        avatar_url,
        city,
        state
      )
    `)
    .eq('profile_id', userId)
  
  if (error) {
    console.error('Failed to fetch user accessible businesses:', {
      userId,
      userRole,
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    return []
  }
  
  console.log(`Found ${userBusinesses?.length || 0} businesses for user ${userId}:`, userBusinesses)
  
  if (!userBusinesses || userBusinesses.length === 0) {
    console.warn(`No businesses found for user ${userId}. This user may not have any business assignments.`)
    return []
  }
  
  // Transform the data to match BusinessSwitcherData format
  const transformedBusinesses = userBusinesses.map((ub: any) => ({
    business_id: ub.business_clients.business_id.toString(),
    company_name: ub.business_clients.company_name,
    avatar_url: ub.business_clients.avatar_url,
    city: ub.business_clients.city,
    state: ub.business_clients.state
  }))
  
  console.log('Transformed businesses:', transformedBusinesses)
  return transformedBusinesses
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