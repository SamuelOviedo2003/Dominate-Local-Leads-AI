'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { BusinessSwitcherData } from '@/types/auth'
import { redisSessionStore } from '@/lib/redis-session-store'
import { sessionMonitor, trackBusinessSwitch, extractRequestContext } from '@/lib/session-monitoring'
import { validateBusinessSwitchAccess } from '@/lib/auth-helpers-isolated'
import { headers } from 'next/headers'

/**
 * SECURE ATOMIC BUSINESS SWITCHING
 * 
 * This replaces the vulnerable business switching with atomic operations
 * using distributed locks to prevent session contamination.
 */

interface BusinessSwitchResult {
  success: boolean
  data?: BusinessSwitcherData
  error?: string
  lockId?: string
  timing?: {
    lockAcquired: number
    operationCompleted: number
    lockReleased: number
    totalTime: number
  }
}

/**
 * Atomic business switch with distributed locking
 */
export async function atomicBusinessSwitch(businessId: string): Promise<BusinessSwitchResult> {
  const startTime = Date.now()
  let timing = {
    lockAcquired: 0,
    operationCompleted: 0,
    lockReleased: 0,
    totalTime: 0
  }

  console.log(`[BUSINESS-SWITCH-SECURE] Starting atomic business switch to ${businessId}`)

  try {
    // Get current user and validate
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Extract request context
    const headersList = await headers()
    const sessionId = headersList.get('x-session-id') || 
                     headersList.get('x-request-id') || 
                     `session_${Date.now()}_${Math.random().toString(36).substring(2)}`

    // Validate business switch access
    const accessValidation = await validateBusinessSwitchAccess(user.id, businessId)
    if (!accessValidation.success) {
      return {
        success: false,
        error: accessValidation.error || 'Access denied'
      }
    }

    // Initialize Redis session store if needed
    if (!redisSessionStore.isAvailable()) {
      await redisSessionStore.initialize()
    }

    // Perform atomic business switch using Redis distributed locking
    const switchResult = await redisSessionStore.atomicBusinessSwitch(
      user.id,
      businessId,
      async (): Promise<boolean> => {
        timing.lockAcquired = Date.now() - startTime

        try {
          console.log(`[BUSINESS-SWITCH-SECURE] Executing business switch operation for user ${user.id}`)

          // Get user profile to validate permissions
          const supabaseService = createServiceRoleClient()
          const { data: profile, error: profileError } = await supabaseService
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          if (profileError || !profile) {
            console.error('[BUSINESS-SWITCH-SECURE] User profile not found')
            return false
          }

          // Only superadmins (role=0) can switch businesses
          if (profile.role !== 0) {
            console.error('[BUSINESS-SWITCH-SECURE] Insufficient permissions - only superadmins can switch businesses')
            return false
          }

          // Validate that the target business exists and has dashboard enabled
          const { data: business, error: businessError } = await supabase
            .from('business_clients')
            .select('business_id, company_name, avatar_url, city, state, permalink')
            .eq('business_id', businessId)
            .eq('dashboard', true)
            .single()

          if (businessError || !business) {
            console.error('[BUSINESS-SWITCH-SECURE] Business not found or not accessible')
            return false
          }

          // Track successful business switch
          trackBusinessSwitch(sessionId, user.id, businessId, {
            ip: headersList.get('x-forwarded-for') || 'unknown',
            userAgent: headersList.get('user-agent') || 'unknown'
          })

          console.log(`[BUSINESS-SWITCH-SECURE] Business switch operation completed successfully`)
          timing.operationCompleted = Date.now() - startTime
          
          return true

        } catch (error) {
          console.error('[BUSINESS-SWITCH-SECURE] Error during business switch operation:', error)
          return false
        }
      }
    )

    timing.lockReleased = Date.now() - startTime
    timing.totalTime = timing.lockReleased

    if (!switchResult.success) {
      return {
        success: false,
        error: switchResult.error || 'Business switch failed',
        timing
      }
    }

    // Get the business data for response
    const supabaseService = createServiceRoleClient()
    const { data: business, error: businessError } = await supabaseService
      .from('business_clients')
      .select('business_id, company_name, avatar_url, city, state, permalink')
      .eq('business_id', businessId)
      .eq('dashboard', true)
      .single()

    if (businessError || !business) {
      return {
        success: false,
        error: 'Failed to retrieve business data after switch',
        timing
      }
    }

    // Revalidate paths that might show business-specific data
    // Use a more targeted approach to avoid unnecessary revalidations
    revalidatePath(`/${business.permalink}`)
    revalidatePath('/api/business/current')

    console.log(`[BUSINESS-SWITCH-SECURE] Atomic business switch completed in ${timing.totalTime}ms`)

    return {
      success: true,
      data: business as BusinessSwitcherData,
      timing
    }

  } catch (error) {
    console.error('[BUSINESS-SWITCH-SECURE] Unexpected error in atomic business switch:', error)
    
    timing.totalTime = Date.now() - startTime
    
    return {
      success: false,
      error: 'Internal server error during business switch',
      timing
    }
  }
}

/**
 * Get available businesses with session isolation
 */
export async function getAvailableBusinessesSecure(): Promise<{
  success: boolean
  data?: BusinessSwitcherData[]
  error?: string
}> {
  console.log('[BUSINESS-SWITCH-SECURE] Getting available businesses with session isolation')

  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Get user profile to check role using service role to avoid RLS recursion
    const supabaseService = createServiceRoleClient()
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        error: 'User profile not found'
      }
    }

    // Only superadmins (role=0) can see all businesses
    if (profile.role !== 0) {
      return {
        success: false,
        error: 'Insufficient permissions - only superadmins can access all businesses'
      }
    }

    // Get all businesses with dashboard enabled using a fresh query
    // This avoids any cached results that could cause session bleeding
    const { data: businesses, error: businessesError } = await supabase
      .from('business_clients')
      .select('business_id, company_name, avatar_url, city, state, permalink')
      .eq('dashboard', true)
      .order('company_name')

    if (businessesError) {
      console.error('[BUSINESS-SWITCH-SECURE] Failed to fetch businesses:', businessesError)
      return {
        success: false,
        error: 'Failed to fetch businesses'
      }
    }

    console.log(`[BUSINESS-SWITCH-SECURE] Retrieved ${businesses?.length || 0} businesses for user ${user.id}`)

    return {
      success: true,
      data: businesses as BusinessSwitcherData[]
    }

  } catch (error) {
    console.error('[BUSINESS-SWITCH-SECURE] Error fetching available businesses:', error)
    return {
      success: false,
      error: 'Internal server error'
    }
  }
}

/**
 * Validate business access with session isolation
 */
export async function validateBusinessAccessSecure(businessId: string): Promise<{
  success: boolean
  canAccess?: boolean
  userRole?: number
  businessData?: BusinessSwitcherData
  error?: string
}> {
  console.log(`[BUSINESS-SWITCH-SECURE] Validating access to business ${businessId}`)

  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Get user profile using service role to avoid RLS recursion
    const supabaseService = createServiceRoleClient()
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        error: 'User profile not found'
      }
    }

    let canAccess = false
    let businessData: BusinessSwitcherData | undefined

    // Superadmins (role=0) can access any business with dashboard=true
    if (profile.role === 0) {
      const { data: business, error: businessError } = await supabase
        .from('business_clients')
        .select('business_id, company_name, avatar_url, city, state, permalink')
        .eq('business_id', businessId)
        .eq('dashboard', true)
        .single()

      canAccess = !businessError && !!business
      if (canAccess) {
        businessData = business as BusinessSwitcherData
      }
    } else {
      // Regular users can only access businesses in their profile_businesses table
      const { data: access, error: accessError } = await supabase
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
        .eq('profile_id', user.id)
        .eq('business_id', parseInt(businessId, 10))
        .single()
        
      canAccess = !accessError && !!access
      if (canAccess && access) {
        // Type assertion to handle nested business_clients structure
        const businessClients = access.business_clients as any
        businessData = {
          business_id: businessClients.business_id.toString(),
          company_name: businessClients.company_name,
          avatar_url: businessClients.avatar_url,
          city: businessClients.city,
          state: businessClients.state,
          permalink: businessClients.permalink
        }
      }
    }

    console.log(`[BUSINESS-SWITCH-SECURE] User ${user.id} ${canAccess ? 'can' : 'cannot'} access business ${businessId}`)

    return {
      success: true,
      canAccess,
      userRole: profile.role,
      businessData
    }

  } catch (error) {
    console.error('[BUSINESS-SWITCH-SECURE] Error validating business access:', error)
    return {
      success: false,
      error: 'Internal server error'
    }
  }
}

/**
 * Get current business context with session isolation
 */
export async function getCurrentBusinessContext(): Promise<{
  success: boolean
  currentBusinessId?: string
  businessData?: BusinessSwitcherData
  error?: string
}> {
  console.log('[BUSINESS-SWITCH-SECURE] Getting current business context')

  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Get current business from Redis session store
    if (redisSessionStore.isAvailable()) {
      const sessionData = await redisSessionStore.getSession(user.id)
      
      if (sessionData?.currentBusinessId) {
        // Validate the business still exists and user has access
        const validation = await validateBusinessAccessSecure(sessionData.currentBusinessId)
        
        if (validation.success && validation.canAccess && validation.businessData) {
          return {
            success: true,
            currentBusinessId: sessionData.currentBusinessId,
            businessData: validation.businessData
          }
        }
      }
    }

    return {
      success: true,
      currentBusinessId: undefined,
      businessData: undefined
    }

  } catch (error) {
    console.error('[BUSINESS-SWITCH-SECURE] Error getting current business context:', error)
    return {
      success: false,
      error: 'Internal server error'
    }
  }
}