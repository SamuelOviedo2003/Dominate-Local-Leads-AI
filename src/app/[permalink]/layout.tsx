import { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import { getRequestAuthUser, getBusinessByPermalinkCached } from '@/lib/supabase/server-optimized'
import { AuthDataProvider } from '@/contexts/AuthDataContext'
import { headers } from 'next/headers'

interface PermalinkLayoutProps {
  children: ReactNode
  params: { permalink: string }
}

/**
 * Centralized permalink layout - Single source of truth for business resolution
 * Handles all business access validation, redirects, and error states
 * Uses cached permalink resolution to prevent 429 errors and improve performance
 */
export default async function PermalinkLayout({ 
  children, 
  params 
}: PermalinkLayoutProps) {
  const { permalink } = params
  
  console.log(`[LAYOUT] Processing permalink: ${permalink}`)
  
  // Get current pathname to prevent redirect loops
  const headersList = headers()
  const pathname = headersList.get('x-pathname') || `/${permalink}`
  console.log(`[LAYOUT] Current pathname: ${pathname}`)
  
  try {
    // Get authenticated user using request-scoped cache (single fetch per request)
    const user = await getRequestAuthUser()

    if (!user) {
      console.log(`[LAYOUT_OPTIMIZED] No authenticated user found for ${permalink}, redirecting to login`)
      if (pathname !== '/login') {
        redirect('/login')
      } else {
        notFound()
      }
    }

    console.log(`[LAYOUT_OPTIMIZED] User ${user.email} (role: ${user.profile?.role ?? 1}) accessing ${permalink}`)

    // Resolve business using request-scoped cache (single fetch per request)
    const business = await getBusinessByPermalinkCached(permalink)

    if (!business) {
      console.log(`[LAYOUT_OPTIMIZED] Business not found for permalink: ${permalink}`)
      notFound()
    }

    console.log(`[LAYOUT_OPTIMIZED] Business resolved: ${business.company_name} (${business.business_id})`)
    
    // Handle null role by treating as regular user (role 1) for backward compatibility
    const effectiveRole = user.profile?.role ?? 1
    
    // Check if user has access to this business
    let hasAccess = false
    
    if (effectiveRole === 0) {
      // Super admin has access to all businesses with dashboard=true
      hasAccess = business.dashboard !== false // Default to true if not specified
      console.log(`[LAYOUT] Super admin access check for business ${business.business_id}: ${hasAccess}`)
    } else {
      // Regular user - check against accessible businesses
      hasAccess = user.accessibleBusinesses?.some(
        (accessibleBusiness: any) => accessibleBusiness.business_id === business.business_id.toString()
      ) || false
      console.log(`[LAYOUT] Regular user access check for business ${business.business_id}: ${hasAccess}`)
      console.log(`[LAYOUT] User accessible businesses:`, user.accessibleBusinesses?.map((b: any) => `${b.company_name} (${b.business_id})`))
    }
    
    if (!hasAccess) {
      console.log(`[LAYOUT] User ${user.email} does not have access to business ${business.company_name}`)
      
      // Handle access denial based on user role
      if (effectiveRole === 0) {
        // Super admin without access - redirect to profile management
        console.log(`[LAYOUT] Super admin without access to ${permalink}, redirecting to profile management`)
        
        if (pathname !== '/profile-management') {
          console.log(`[LAYOUT] Redirecting super admin from ${pathname} to profile management`)
          redirect('/profile-management')
        } else {
          console.log(`[LAYOUT] Super admin at profile management but no access - showing 404`)
          notFound()
        }
        
      } else {
        // Regular user without access - redirect to their first accessible business or login
        if (user.accessibleBusinesses && user.accessibleBusinesses.length > 0) {
          const firstAccessibleBusiness = user.accessibleBusinesses[0]
          if (firstAccessibleBusiness?.permalink) {
            const targetPath = `/${firstAccessibleBusiness.permalink}/dashboard`
            
            // Prevent redirect loops by checking if we're already at the target path
            if (pathname !== targetPath) {
              console.log(`[LAYOUT] Redirecting user from ${pathname} to their first accessible business: ${targetPath}`)
              redirect(targetPath)
            } else {
              console.error(`[LAYOUT] Access denied but already at target path - possible access configuration issue`)
              notFound()
            }
          }
        }
        
        // No accessible businesses - redirect to login
        if (pathname !== '/login') {
          console.log(`[LAYOUT] No accessible businesses found, redirecting from ${pathname} to login`)
          redirect('/login')
        } else {
          console.log(`[LAYOUT] Already at login path but no access - showing 404`)
          notFound()
        }
      }
    }
    
    console.log(`[LAYOUT] Access granted for user ${user.email} to business ${business.company_name}`)
    
    // Handle backward compatibility redirects for old URLs
    const currentSegments = pathname.split('/').filter(Boolean)
    if (currentSegments.length >= 2) {
      const section = currentSegments[1]
      const oldDashboardRoutes = ['dashboard', 'new-leads', 'incoming-calls', 'salesman', 'lead-details']
      
      // If accessing /permalink directly, redirect to /permalink/dashboard
      if (currentSegments.length === 1) {
        const targetPath = `/${permalink}/dashboard`
        console.log(`[LAYOUT] Redirecting from /${permalink} to ${targetPath}`)
        redirect(targetPath)
      }
      
      // Ensure old routes work properly (they should already be handled by middleware, but double-check)
      if (section && oldDashboardRoutes.includes(section)) {
        console.log(`[LAYOUT] Valid business section accessed: ${section}`)
      }
    }
    
    // Pass cached user and business data to child components via optimized Context
    console.log(`[LAYOUT_OPTIMIZED] Providing cached data to children via AuthDataProvider`)

    return (
      <AuthDataProvider
        user={user}
        business={business}
        effectiveRole={effectiveRole}
      >
        <div
          data-business-id={business.business_id}
          data-business-permalink={permalink}
          data-business-name={business.company_name}
          data-user-role={effectiveRole}
        >
          {children}
        </div>
      </AuthDataProvider>
    )
    
  } catch (error) {
    console.error(`[LAYOUT] Error processing permalink ${permalink}:`, error)
    
    // Handle different error types gracefully
    if (error instanceof Error) {
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        console.warn(`[LAYOUT] Rate limit error for permalink ${permalink}`)
        // For rate limit errors, show a more user-friendly error page
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Service Temporarily Unavailable</h1>
              <p className="text-gray-600 mb-4">
                We're experiencing high traffic. Please try again in a few moments.
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Retry
              </button>
            </div>
          </div>
        )
      }
      
      if (error.message.includes('NEXT_REDIRECT')) {
        // Re-throw redirect errors to let Next.js handle them
        throw error
      }
    }
    
    // For other errors, show 404
    console.log(`[LAYOUT] Showing 404 for permalink ${permalink} due to error`)
    notFound()
  }
}