import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthUser, Profile, BusinessClient, BusinessSwitcherData } from '@/types/auth'

/**
 * Get authenticated user with business data for server components
 * Redirects to login if user is not authenticated
 */
export async function getAuthenticatedUser(): Promise<AuthUser> {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/login')
  }

  // Fetch user profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  // Fetch business data if profile exists
  let businessData: BusinessClient | null = null
  if (profile?.business_id) {
    const { data: business } = await supabase
      .from('business_clients')
      .select('*')
      .eq('business_id', profile.business_id)
      .single() as { data: BusinessClient | null }
    
    businessData = business
  }

  return {
    id: user.id,
    email: user.email!,
    profile: profile || undefined,
    businessData: businessData || undefined
  }
}

/**
 * Get available businesses for Super Admin business switcher
 */
export async function getAvailableBusinesses(): Promise<BusinessSwitcherData[]> {
  const supabase = await createClient()

  const { data: businesses, error } = await supabase
    .from('business_clients')
    .select('business_id, company_name, avatar_url, city, state')
    .order('company_name')

  if (error) {
    console.warn('Failed to fetch available businesses:', error.message)
    return []
  }

  return businesses as BusinessSwitcherData[]
}

/**
 * Get header data for authenticated user including business switcher data for Super Admins
 */
export async function getHeaderData() {
  const user = await getAuthenticatedUser()
  
  // Fetch available businesses if user is Super Admin
  const availableBusinesses = user.profile?.role === 0 
    ? await getAvailableBusinesses() 
    : []

  return {
    user,
    availableBusinesses
  }
}

/**
 * Get authenticated user for API routes
 * Returns null if not authenticated instead of redirecting
 */
export async function getAuthenticatedUserForAPI(): Promise<AuthUser | null> {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return null
  }

  // Fetch user profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  // Fetch business data if profile exists
  let businessData: BusinessClient | null = null
  if (profile?.business_id) {
    const { data: business } = await supabase
      .from('business_clients')
      .select('*')
      .eq('business_id', profile.business_id)
      .single() as { data: BusinessClient | null }
    
    businessData = business
  }

  return {
    id: user.id,
    email: user.email!,
    profile: profile || undefined,
    businessData: businessData || undefined
  }
}