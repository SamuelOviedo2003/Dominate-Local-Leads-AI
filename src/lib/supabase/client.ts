import { createBrowserClient } from '@supabase/ssr'

/**
 * Create a browser-side Supabase client using cookie-only authentication
 * Removes LocalStorage conflict and ensures consistent cookie-based sessions
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // Disable to prevent URL-based session attacks
        // Use default cookie storage instead of localStorage
        storageKey: 'sb-auth-token',
        storage: {
          getItem: (key: string) => {
            if (typeof window === 'undefined') return null
            // Use document.cookie for consistent cookie-based storage
            return getCookie(key)
          },
          setItem: (key: string, value: string) => {
            if (typeof window === 'undefined') return
            // Set cookie with secure defaults
            setCookie(key, value, {
              maxAge: 60 * 60 * 24 * 7, // 7 days
              path: '/',
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax'
            })
          },
          removeItem: (key: string) => {
            if (typeof window === 'undefined') return
            // Remove cookie
            setCookie(key, '', { maxAge: -1, path: '/' })
          }
        }
      }
    }
  )
}

/**
 * Helper function to get cookie value
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)

  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift()
    return cookieValue || null
  }

  return null
}

/**
 * Helper function to set cookie
 */
function setCookie(name: string, value: string, options: {
  maxAge?: number
  path?: string
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
} = {}) {
  if (typeof document === 'undefined') return

  let cookieString = `${name}=${value}`

  if (options.maxAge !== undefined) {
    cookieString += `; Max-Age=${options.maxAge}`
  }

  if (options.path) {
    cookieString += `; Path=${options.path}`
  }

  if (options.secure) {
    cookieString += `; Secure`
  }

  if (options.sameSite) {
    cookieString += `; SameSite=${options.sameSite}`
  }

  document.cookie = cookieString
}