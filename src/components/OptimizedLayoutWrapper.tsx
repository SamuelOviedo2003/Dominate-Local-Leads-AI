'use client'

import { ReactNode } from 'react'
import { useAuthData } from '@/contexts/AuthDataContext'
import TopBar from '@/components/TopBar'
import VerticalSidebar from '@/components/VerticalSidebar'
import { useSecureLogout } from '@/hooks/useSecureLogout'
import { BusinessContextProvider } from '@/contexts/BusinessContext'

interface OptimizedLayoutWrapperProps {
  children: ReactNode
}

/**
 * Client component that consumes cached auth data and provides it to child components
 * Eliminates redundant API calls by using data from AuthDataProvider
 *
 * NEW LAYOUT:
 * - TopBar: Fixed at top with logo, company name, and notification icons
 * - VerticalSidebar: Fixed at left with square card navigation items
 * - Main Content: Positioned to account for TopBar (64px) and VerticalSidebar (80px)
 */
export default function OptimizedLayoutWrapper({ children }: OptimizedLayoutWrapperProps) {
  const { user, business } = useAuthData()
  const { logout } = useSecureLogout()

  const isSuperAdmin = user?.profile?.role === 0
  const hasMultipleBusinesses = (user?.accessibleBusinesses?.length || 0) > 1

  return (
    <BusinessContextProvider
      initialUser={user}
      currentBusiness={business ?? undefined}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Vertical Sidebar - Fixed at left (hidden on mobile) */}
        <div className="hidden lg:block">
          <VerticalSidebar
            isSuperAdmin={isSuperAdmin}
            hasMultipleBusinesses={hasMultipleBusinesses}
            user={user}
            logoutAction={logout}
          />
        </div>

        {/* Top Bar - Fixed at top, offset by sidebar on desktop */}
        <TopBar
          user={user}
          logoutAction={logout}
          isSuperAdmin={isSuperAdmin}
          hasMultipleBusinesses={hasMultipleBusinesses}
        />

        {/* Main Content - Offset for TopBar and Sidebar */}
        <main className="pt-16 lg:pl-64 min-h-screen">
          {children}
        </main>
      </div>
    </BusinessContextProvider>
  )
}