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

  // Get current pathname to prevent redirect loops
  const headersList = headers()
  const pathname = headersList.get('x-pathname') || `/${permalink}`

  try {
    // Get authenticated user using request-scoped cache (single fetch per request)
    const user = await getRequestAuthUser()

    if (!user) {
      if (pathname !== '/login') {
        redirect('/login')
      } else {
        notFound()
      }
    }

    // Resolve business using request-scoped cache (single fetch per request)
    const business = await getBusinessByPermalinkCached(permalink)

    if (!business) {
      notFound()
    }
    
    // Handle null role by treating as regular user (role 1) for backward compatibility
    const effectiveRole = user.profile?.role ?? 1

    // Check if user has access to this business
    let hasAccess = false

    if (effectiveRole === 0) {
      // Super admin has access to all businesses with dashboard=true
      hasAccess = business.dashboard !== false // Default to true if not specified
    } else {
      // Regular user - check against accessible businesses
      hasAccess = user.accessibleBusinesses?.some(
        (accessibleBusiness: any) => accessibleBusiness.business_id === business.business_id.toString()
      ) || false
    }

    if (!hasAccess) {
      // Handle access denial based on user role
      if (effectiveRole === 0) {
        // Super admin without access - redirect to profile management
        if (pathname !== '/profile-management') {
          redirect('/profile-management')
        } else {
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
              redirect(targetPath)
            } else {
              notFound()
            }
          }
        }

        // No accessible businesses - redirect to login
        if (pathname !== '/login') {
          redirect('/login')
        } else {
          notFound()
        }
      }
    }
    
    // Handle backward compatibility redirects for old URLs
    const currentSegments = pathname.split('/').filter(Boolean)
    if (currentSegments.length >= 2) {
      // If accessing /permalink directly, redirect to /permalink/dashboard
      if (currentSegments.length === 1) {
        const targetPath = `/${permalink}/dashboard`
        redirect(targetPath)
      }
    }

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