import { NextRequest } from 'next/server'
import { getSupabaseClient, getRequestAuthUser } from '@/lib/supabase/server-optimized'
import { AuthUser } from '@/types/auth'

/**
 * Optimized API authentication middleware
 * Uses request-scoped caching to eliminate redundant auth calls
 */
export async function authenticateApiRequest(request: NextRequest): Promise<{
  user: AuthUser
  supabase: ReturnType<typeof getSupabaseClient>
}> {
  try {
    console.log('[API_AUTH_OPTIMIZED] Using cached authentication data')

    // Get user from request-scoped cache (same instance used by layout)
    const user = await getRequestAuthUser()

    if (!user) {
      throw new Error('Authentication failed - user not found')
    }

    // Get shared Supabase client instance
    const supabase = getSupabaseClient()

    return { user, supabase }

  } catch (error) {
    console.error('[API_AUTH_OPTIMIZED] Authentication error:', error)
    throw new Error('Authentication failed')
  }
}

/**
 * Validate business access for API endpoints
 * Uses cached user data to avoid additional DB calls
 */
export function validateBusinessAccess(
  user: AuthUser,
  businessIdParam: string
): boolean {
  const hasAccess = user.accessibleBusinesses?.some(
    business => business.business_id === businessIdParam
  )

  return hasAccess || false
}

/**
 * Standard API response for authentication errors
 */
export function authErrorResponse() {
  return Response.json(
    { error: 'Unauthorized - Please log in' },
    { status: 401 }
  )
}

/**
 * Standard API response for access denied errors
 */
export function accessDeniedResponse() {
  return Response.json(
    { error: 'Access denied - You do not have access to this business data' },
    { status: 403 }
  )
}

/**
 * Validate and parse business ID parameter
 */
export function validateBusinessIdParam(businessIdParam: string | null): {
  isValid: boolean
  businessId?: number
  error?: string
} {
  if (!businessIdParam) {
    return { isValid: false, error: 'Missing businessId parameter' }
  }

  const businessId = parseInt(businessIdParam, 10)
  if (isNaN(businessId)) {
    return { isValid: false, error: 'businessId must be a valid number' }
  }

  return { isValid: true, businessId }
}

/**
 * All-in-one API authentication and authorization helper
 * Handles auth, business ID validation, and access checking
 */
export async function authenticateAndAuthorizeApiRequest(
  request: NextRequest,
  businessIdParam: string | null
): Promise<{
  user: AuthUser
  supabase: ReturnType<typeof getSupabaseClient>
  businessId: number
} | Response> {
  try {
    // Authenticate user
    const { user, supabase } = await authenticateApiRequest(request)

    // Validate business ID
    const { isValid, businessId, error } = validateBusinessIdParam(businessIdParam)
    if (!isValid) {
      return Response.json({ error }, { status: 400 })
    }

    // Check business access
    if (!validateBusinessAccess(user, businessIdParam!)) {
      return accessDeniedResponse()
    }

    return { user, supabase, businessId: businessId! }

  } catch (error) {
    console.error('[API_AUTH_OPTIMIZED] Authorization error:', error)
    return authErrorResponse()
  }
}