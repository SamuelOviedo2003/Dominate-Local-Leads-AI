import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
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
  const user = await getAuthenticatedUser()
  
  // Create Supabase client for business resolution
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  if (user.accessibleBusinesses && user.accessibleBusinesses.length > 0) {
    const firstBusiness = user.accessibleBusinesses[0]
    if (firstBusiness?.permalink) {
      // Redirect to permalink-based route, preserving the current path
      const currentPath = '/dashboard' // Default to dashboard for old routes
      redirect(`/${firstBusiness.permalink}${currentPath}`)
    }
  }
  
  // If no accessible businesses, redirect to login
  redirect('/login?error=No business access available')
}