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

/**
 * Validate if user is superadmin and get available companies for switching
 * Returns companies only if user has role 0 (superadmin)
 */
export async function getSuperAdminCompanies(): Promise<BusinessSwitcherData[]> {
  const user = await getAuthenticatedUserForAPI()
  
  if (!user || user.profile?.role !== 0) {
    return []
  }
  
  return await getAvailableBusinesses()
}

/**
 * Validate if a company is accessible to the current user
 * For superadmins: validates company has dashboard=true
 * For regular users: validates company matches their business_id
 */
export async function validateCompanyAccess(companyId: string): Promise<boolean> {
  const user = await getAuthenticatedUserForAPI()
  
  if (!user) {
    return false
  }
  
  // For regular users, they can only access their own company
  if (user.profile?.role !== 0) {
    return user.profile?.business_id?.toString() === companyId
  }
  
  // For superadmins, validate the company has dashboard=true
  const supabase = await createClient()
  const { data: company, error } = await supabase
    .from('business_clients')
    .select('business_id')
    .eq('business_id', companyId)
    .eq('dashboard', true)
    .single()
  
  return !error && !!company
}

/**
 * Update user's business_id for superadmin business switching
 * Only allows superadmins to switch business context
 */
export async function updateUserBusinessId(userId: string, businessId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // First verify the user is a superadmin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  
  if (profileError || !profile) {
    return { success: false, error: 'User profile not found' }
  }
  
  if (profile.role !== 0) {
    return { success: false, error: 'Only superadmins can switch business context' }
  }
  
  // Validate the target business exists and has dashboard enabled
  const { data: business, error: businessError } = await supabase
    .from('business_clients')
    .select('business_id')
    .eq('business_id', businessId)
    .eq('dashboard', true)
    .single()
  
  if (businessError || !business) {
    return { success: false, error: 'Target business not found or not accessible' }
  }
  
  // Update the user's business_id
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ business_id: parseInt(businessId), updated_at: new Date().toISOString() })
    .eq('id', userId)
  
  if (updateError) {
    console.error('Error updating user business_id:', updateError)
    return { success: false, error: 'Failed to update user business context' }
  }
  
  return { success: true }
}