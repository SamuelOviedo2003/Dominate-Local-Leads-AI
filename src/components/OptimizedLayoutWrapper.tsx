'use client'

import { ReactNode } from 'react'
import { useAuthData } from '@/contexts/AuthDataContext'
import UniversalHeader from '@/components/UniversalHeader'
import { logout } from '@/app/home/actions'
import { BusinessContextProvider } from '@/contexts/BusinessContext'
import { DynamicThemeProvider } from '@/contexts/DynamicThemeContext'

interface OptimizedLayoutWrapperProps {
  children: ReactNode
}

/**
 * Client component that consumes cached auth data and provides it to child components
 * Eliminates redundant API calls by using data from AuthDataProvider
 */
export default function OptimizedLayoutWrapper({ children }: OptimizedLayoutWrapperProps) {
  const { user, business } = useAuthData()

  console.log('[OPTIMIZED_LAYOUT] Using cached auth data - no API calls needed')

  return (
    <DynamicThemeProvider>
      <BusinessContextProvider
        initialUser={user}
        currentBusiness={business}
      >
        <div className="min-h-screen bg-gray-50">
          <UniversalHeader
            user={user}
            logoutAction={logout}
            availableBusinesses={user.accessibleBusinesses || []}
          />

          <main className="flex-1">
            {children}
          </main>
        </div>
      </BusinessContextProvider>
    </DynamicThemeProvider>
  )
}