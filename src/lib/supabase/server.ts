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
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
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