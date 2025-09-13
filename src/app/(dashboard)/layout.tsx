import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getAuthenticatedUserFromRequest } from '@/lib/auth-helpers-simple'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import DashboardLayoutComponent from '@/components/DashboardLayout'

interface DashboardLayoutProps {
  children: ReactNode
}

/**
 * Legacy dashboard layout - redirects all users to their permalink-based routes
 * This ensures backwards compatibility while migrating to the new permalink system
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  // Get authenticated user and redirect to their permalink-based dashboard
  const user = await getAuthenticatedUserFromRequest()
  
  // Handle case where user is not authenticated
  if (!user) {
    redirect('/login')
  }
  
  // Create Supabase client for business resolution
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
          // This is a read-only operation, so we don't need to set cookies
        },
      },
    }
  )

  // Get user's first accessible business for redirect
  if (user?.accessibleBusinesses && user.accessibleBusinesses.length > 0) {
    const firstBusiness = user.accessibleBusinesses[0]
    if (firstBusiness?.permalink) {
      // Update user's business context to match the business they're being redirected to
      // This ensures database state matches the URL when the app loads
      try {
        const { updateUserBusinessContext } = await import('@/lib/auth-helpers-simple')
        // Use JWT token from the user object (already validated by getAuthenticatedUserFromRequest)
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          await updateUserBusinessContext(user.id, firstBusiness.business_id, session.access_token)
        }
      } catch (contextError) {
        console.error('Failed to update business context during redirect:', contextError)
        // Continue with redirect even if context update fails
      }

      // Redirect to permalink-based route, preserving the current path
      const currentPath = '/dashboard' // Default to dashboard for old routes
      redirect(`/${firstBusiness.permalink}${currentPath}`)
    }
  }
  
  // If no accessible businesses, redirect to login
  redirect('/login?error=No business access available')
}