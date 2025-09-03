import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Allow certain routes to bypass authentication
  const publicRoutes = ['/login', '/signup', '/auth', '/forgot-password']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  if (isPublicRoute) {
    return supabaseResponse
  }

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  // Only check authentication for protected routes
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  // If there's an authentication error (like invalid refresh token), 
  // allow the request to proceed rather than blocking it
  if (error) {
    console.warn('Authentication error in middleware:', error.message)
    // Don't redirect on auth errors - let the app handle it
    return supabaseResponse
  }

  if (!user) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}