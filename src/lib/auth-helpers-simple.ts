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
 * Get authenticated user from request using cookie-based authentication only
 * Simplified and optimized for single authentication method
 */
export async function getAuthenticatedUserFromRequest(): Promise<AuthUser | null> {
  try {
    // Use cookie-based authentication only
    const supabase = createCookieClient()

    // Get user from Supabase using cookies
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single() as { data: Profile | null; error: any }

    if (profileError || !profile) {
      return null
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
  } catch (error) {
    console.error('[AUTH_SIMPLE] Error getting authenticated user:', error)
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