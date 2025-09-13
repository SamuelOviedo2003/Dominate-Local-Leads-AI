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
    // Get JWT token from Supabase session
    const supabase = createClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session?.access_token) {
      throw new Error('Authentication failed - please refresh and try again')
    }

    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers
    }

    const fetchOptions: RequestInit = {
      ...options,
      headers: fetchHeaders
    }

    const response = await fetch(url, fetchOptions)

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      console.error('Authentication failed for request:', url, response.status)
      throw new Error('Authentication failed - please refresh and try again')
    }

    return response
  } catch (error) {
    console.error('AuthFetch error:', error)
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
    console.error('AuthFetchJson error:', error)
    throw error
  }
}

/**
 * Authenticated GET request
 */
export async function authGet<T = any>(url: string): Promise<T> {
  return authFetchJson<T>(url, { method: 'GET' })
}

/**
 * Authenticated POST request
 */
export async function authPost<T = any>(url: string, data?: any): Promise<T> {
  return authFetchJson<T>(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  })
}

/**
 * Authenticated PATCH request
 */
export async function authPatch<T = any>(url: string, data?: any): Promise<T> {
  return authFetchJson<T>(url, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined
  })
}

/**
 * Authenticated DELETE request
 */
export async function authDelete<T = any>(url: string): Promise<T> {
  return authFetchJson<T>(url, { method: 'DELETE' })
}