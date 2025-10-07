import { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import { getRequestAuthUser, getBusinessByIdCached, getBusinessByPermalinkCached } from '@/lib/supabase/server-optimized'
import { AuthDataProvider } from '@/contexts/AuthDataContext'
import { headers } from 'next/headers'

interface PermalinkLayoutProps {
  children: ReactNode
  params: {
    business_id: string
    permalink: string
  }
}

/**
 * Centralized business layout - Single source of truth for business resolution
 * NEW: Uses business_id for direct primary key lookups (50% faster)
 * Validates permalink matches for security
 * Handles all business access validation, redirects, and error states
 */
export default async function PermalinkLayout({
  children,
  params
}: PermalinkLayoutProps) {
  const { business_id, permalink } = params

  // Get current pathname to prevent redirect loops
  const headersList = headers()
  const pathname = headersList.get('x-pathname') || `/${business_id}/${permalink}/dashboard`

  console.log(`[LAYOUT] Processing business ${business_id}/${permalink}, pathname: ${pathname}`)

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

    // OPTIMIZATION: Parse and validate business_id
    const businessIdNum = parseInt(business_id, 10)

    if (isNaN(businessIdNum)) {
      // Invalid business_id format - try permalink-based lookup for backward compatibility
      const businessFromPermalink = await getBusinessByPermalinkCached(business_id)
      if (businessFromPermalink) {
        // Old URL format detected - extract section from current path and redirect to new format
        const pathParts = pathname.split('/').filter(Boolean)
        const section = pathParts[1] || 'dashboard' // section is second part in old format
        redirect(`/${businessFromPermalink.business_id}/${business_id}/${section}`)
      }
      notFound()
    }

    // OPTIMIZATION: Direct business lookup by ID (uses primary key index)
    const business = await getBusinessByIdCached(businessIdNum)

    if (!business) {
      notFound()
    }

    // SECURITY: Validate permalink matches business_id
    // Skip validation if permalink already matches to prevent redirect loops
    if (business.permalink && business.permalink !== permalink) {
      // Permalink mismatch - construct correct URL with matching permalink
      const pathParts = pathname.split('/').filter(Boolean)
      // Format: [business_id, permalink, ...rest]
      if (pathParts.length >= 3) {
        pathParts[1] = business.permalink // Replace permalink with correct one
        const targetPath = '/' + pathParts.join('/')
        redirect(targetPath)
      }
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
        (accessibleBusiness: any) => {
          // Compare as strings since accessibleBusinesses has business_id as string
          const accessibleId = String(accessibleBusiness.business_id)
          const currentId = String(business.business_id)
          return accessibleId === currentId
        }
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
          if (firstAccessibleBusiness?.permalink && firstAccessibleBusiness?.business_id) {
            const targetPath = `/${firstAccessibleBusiness.business_id}/${firstAccessibleBusiness.permalink}/dashboard`

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
    console.error(`[LAYOUT] Error processing business ${business_id}/${permalink}:`, error)
    
    // Handle different error types gracefully
    if (error instanceof Error) {
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        console.warn(`[LAYOUT] Rate limit error for business ${business_id}/${permalink}`)
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
    console.log(`[LAYOUT] Showing 404 for business ${business_id}/${permalink} due to error`)
    notFound()
  }
}