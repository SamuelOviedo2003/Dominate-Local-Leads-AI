import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * POST /api/auth/logout
 *
 * Logout API endpoint that ensures complete session cleanup:
 * - Signs out from Supabase
 * - Deletes all auth-related cookies
 * - Clears server-side session state
 */
export async function POST(request: NextRequest) {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // Sign out from Supabase
  await supabase.auth.signOut()

  // Get all cookies and delete Supabase auth-related ones
  const allCookies = cookieStore.getAll()
  allCookies.forEach((cookie) => {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('auth-token')) {
      cookieStore.delete(cookie.name)
    }
  })

  return NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { status: 200 }
  )
}
