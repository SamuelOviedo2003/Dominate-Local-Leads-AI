'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * Authenticated fetch utility that works with cookie-based authentication
 * Ensures consistent authentication across all client-side API calls
 */

interface AuthFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
  signal?: AbortSignal
}

/**
 * Check if user is authenticated
 */
async function checkAuthentication(): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session?.access_token) {
      return false
    }

    return true
  } catch (error) {
    console.error('Error checking authentication:', error)
    return false
  }
}

/**
 * Authenticated fetch wrapper that uses JWT tokens via Authorization header
 * Compatible with the new unified authentication system
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export async function authFetch(url: string, options: AuthFetchOptions = {}): Promise<Response> {
  try {
    console.log('[AUTH_DEBUG] authFetch called:', {
      url,
      method: options.method || 'GET',
      hasHeaders: !!options.headers,
      timestamp: new Date().toISOString()
    })

    // Get JWT token from Supabase session
    console.log('[AUTH_DEBUG] Creating client-side Supabase client for session...')
    const supabase = createClient()

    console.log('[AUTH_DEBUG] Fetching session from Supabase...')
    const { data: { session }, error } = await supabase.auth.getSession()

    console.log('[AUTH_DEBUG] Session fetch result:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      tokenLength: session?.access_token?.length || 0,
      expiresAt: session?.expires_at,
      refreshToken: !!session?.refresh_token,
      error: error?.message,
      userEmail: session?.user?.email
    })

    if (error || !session?.access_token) {
      console.error('[AUTH_DEBUG] Authentication failed:', error?.message)
      throw new Error('Authentication failed - please refresh and try again')
    }

    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers
    }

    console.log('[AUTH_DEBUG] Prepared request headers:', {
      hasContentType: !!fetchHeaders['Content-Type'],
      hasAuthorization: !!fetchHeaders['Authorization'],
      authTokenPrefix: session.access_token.substring(0, 30) + '...'
    })

    // Check if already aborted before making the request
    if (options.signal?.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError')
    }

    const fetchOptions: RequestInit = {
      ...options,
      headers: fetchHeaders
    }

    console.log('[AUTH_DEBUG] Making authenticated request to:', url)
    const startTime = Date.now()
    const response = await fetch(url, fetchOptions)
    const requestDuration = Date.now() - startTime

    console.log('[AUTH_DEBUG] Request completed:', {
      url,
      status: response.status,
      statusText: response.statusText,
      durationMs: requestDuration,
      hasResponseBody: !!response.body,
      contentType: response.headers.get('content-type')
    })

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      console.error('[AUTH_DEBUG] Authentication failed for request:', {
        url,
        status: response.status,
        statusText: response.statusText
      })
      throw new Error('Authentication failed - please refresh and try again')
    }

    return response
  } catch (error) {
    // Don't log abort errors - these are expected during component unmount/navigation
    const isAbortError =
      (error instanceof Error && error.name === 'AbortError') ||
      (error instanceof Error && error.message === 'Load failed') || // Fetch abort in some browsers
      (error instanceof DOMException && error.name === 'AbortError') ||
      options.signal?.aborted

    if (isAbortError) {
      // Silently re-throw abort errors without logging
      throw error
    }

    // Only log real errors, not abort errors
    console.error('[AUTH_DEBUG] AuthFetch error:', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}

/**
 * Authenticated fetch for JSON responses with automatic error handling
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Promise<any> - Parsed JSON response
 */
export async function authFetchJson<T = any>(url: string, options: AuthFetchOptions = {}): Promise<T> {
  try {
    const response = await authFetch(url, options)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`HTTP error ${response.status}:`, errorText)
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    // Don't log abort errors - these are expected during component unmount/navigation
    const isAbortError =
      (error instanceof Error && error.name === 'AbortError') ||
      (error instanceof Error && error.message === 'Load failed') || // Fetch abort in some browsers
      (error instanceof DOMException && error.name === 'AbortError') ||
      options.signal?.aborted

    if (isAbortError) {
      // Silently re-throw abort errors without logging
      throw error
    }

    // Only log real errors, not abort errors
    console.error('AuthFetchJson error:', error)
    throw error
  }
}

/**
 * Authenticated GET request
 */
export async function authGet<T = any>(url: string, signal?: AbortSignal): Promise<T> {
  return authFetchJson<T>(url, { method: 'GET', signal })
}

/**
 * Authenticated POST request
 */
export async function authPost<T = any>(url: string, data?: any, signal?: AbortSignal): Promise<T> {
  return authFetchJson<T>(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
    signal
  })
}

/**
 * Authenticated PATCH request
 */
export async function authPatch<T = any>(url: string, data?: any, signal?: AbortSignal): Promise<T> {
  return authFetchJson<T>(url, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
    signal
  })
}

/**
 * Authenticated DELETE request
 */
export async function authDelete<T = any>(url: string, signal?: AbortSignal): Promise<T> {
  return authFetchJson<T>(url, { method: 'DELETE', signal })
}