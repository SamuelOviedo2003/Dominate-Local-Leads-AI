import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient(token: string) {
  if (!token) {
    throw new Error('JWT token required for server-side Supabase client')
  }
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() { /* no-op */ },
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}

/**
 * Create a Supabase server client that works with cookie-based authentication
 * This is for use in server components when NEXT_PUBLIC_USE_COOKIE_AUTH=true
 */
export function createCookieClient() {
  console.log('[AUTH_DEBUG] createCookieClient called - initializing cookie-based Supabase client')

  const cookieStore = cookies()

  console.log('[AUTH_DEBUG] Cookie store created, reading all cookies...')
  const allCookies = cookieStore.getAll()
  console.log('[AUTH_DEBUG] Available cookies:', {
    cookieCount: allCookies.length,
    cookieNames: allCookies.map(c => c.name),
    supabaseCookies: allCookies.filter(c => c.name.includes('supabase')).map(c => ({
      name: c.name,
      hasValue: !!c.value,
      valueLength: c.value?.length || 0
    }))
  })

  console.log('[AUTH_DEBUG] Creating Supabase server client with:', {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    keyPrefix: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.substring(0, 20) + '...'
  })

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = cookieStore.getAll()
          console.log('[AUTH_DEBUG] getAll() called - returning', cookies.length, 'cookies')
          return cookies
        },
        setAll(cookiesToSet) {
          console.log('[AUTH_DEBUG] setAll() called with', cookiesToSet.length, 'cookies to set')
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              console.log('[AUTH_DEBUG] Setting cookie:', {
                name,
                hasValue: !!value,
                valueLength: value?.length || 0,
                options
              })
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            console.log('[AUTH_DEBUG] Cookie setAll error (likely in Server Component - can be ignored):', error)
            // The `setAll` method is being called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function createClientFromRequest(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (!token) {
    throw new Error('No authorization token found in request')
  }
  
  return createClient(token)
}