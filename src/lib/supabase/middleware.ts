import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { extractPermalinkFromPath } from '@/lib/permalink-utils'
import { validatePermalinkExists } from '@/lib/permalink-cache'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  // Processing request
  
  let supabaseResponse = NextResponse.next({
    request,
  })
  
  // Add pathname to headers for layout access
  supabaseResponse.headers.set('x-pathname', pathname)
  
  // Create Supabase client using cookie-based authentication only
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
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

  // Allow certain routes to bypass all validation
  const publicRoutes = [
    '/login', '/signup', '/auth', '/forgot-password',
    '/super-admin', '/profile-management',
    '/_next', '/api', '/favicon.ico'
  ]
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  if (isPublicRoute) {
    // Public route, bypassing validation
    return supabaseResponse
  }

  // Handle basic auth requirement for non-public routes
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError) {
    // Authentication error
    return supabaseResponse
  }

  if (!user) {
    // No authenticated user, redirecting to login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Handle permalink-based routes - ONLY validate existence
  const permalink = extractPermalinkFromPath(pathname)
  
  if (permalink) {
    // Permalink route detected
    
    try {
      // Use the new cached permalink validation
      const isValid = await validatePermalinkExists(permalink)
      
      if (!isValid) {
        // Invalid permalink, returning 404
        return new NextResponse(null, { status: 404 })
      }

      // Valid permalink
      // Permalink validation complete
      
      // Middleware responsibility ends here - layout handles all access validation and redirects
      return supabaseResponse
      
    } catch (error) {
      // Error validating permalink
      // On error, let the request through and let layout handle it
      // This prevents middleware from blocking requests due to transient errors
      return supabaseResponse
    }
  }

  // Non-permalink route, passing through
  return supabaseResponse
}