import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { extractPermalinkFromPath } from '@/lib/permalink-utils'
import { validatePermalinkExists } from '@/lib/permalink-cache'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  console.log(`[MIDDLEWARE] Processing request for: ${pathname}`)
  
  let supabaseResponse = NextResponse.next({
    request,
  })
  
  // Add pathname to headers for layout access
  supabaseResponse.headers.set('x-pathname', pathname)

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
    console.log(`[MIDDLEWARE] Public route ${pathname}, bypassing validation`)
    return supabaseResponse
  }

  // Handle basic auth requirement for non-public routes
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError) {
    console.warn('[MIDDLEWARE] Authentication error:', authError.message)
    return supabaseResponse
  }

  if (!user) {
    console.log(`[MIDDLEWARE] No authenticated user, redirecting to login from ${pathname}`)
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Handle permalink-based routes - ONLY validate existence
  const permalink = extractPermalinkFromPath(pathname)
  
  if (permalink) {
    console.log(`[MIDDLEWARE] Permalink route detected: ${permalink} for path ${pathname}`)
    
    try {
      // Use the new cached permalink validation
      const isValid = await validatePermalinkExists(permalink)
      
      if (!isValid) {
        console.log(`[MIDDLEWARE] Invalid permalink: ${permalink}, returning 404`)
        return new NextResponse(null, { status: 404 })
      }

      console.log(`[MIDDLEWARE] Valid permalink: ${permalink}`)
      console.log(`[MIDDLEWARE] Permalink validation complete, letting layout handle all business logic`)
      
      // Middleware responsibility ends here - layout handles all access validation and redirects
      return supabaseResponse
      
    } catch (error) {
      console.error(`[MIDDLEWARE] Error validating permalink ${permalink}:`, error)
      // On error, let the request through and let layout handle it
      // This prevents middleware from blocking requests due to transient errors
      return supabaseResponse
    }
  }

  console.log(`[MIDDLEWARE] Non-permalink route ${pathname}, passing through`)
  return supabaseResponse
}