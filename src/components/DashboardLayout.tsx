import { ReactNode } from 'react'
import { getHeaderData } from '@/lib/auth-helpers'
import UniversalHeader from './UniversalHeader'
import { logout } from '@/app/home/actions'
import { BusinessContextProvider } from '@/contexts/BusinessContext'
import { DynamicThemeProvider } from '@/contexts/DynamicThemeContext'

interface DashboardLayoutProps {
  children: ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, availableBusinesses } = await getHeaderData()

  // For the new profile_businesses system, use the first available business as initial
  // or null if no businesses are available (which should be handled by individual pages)
  const initialBusinessId = availableBusinesses.length > 0 ? availableBusinesses[0].business_id : undefined

  return (
    <DynamicThemeProvider>
      <BusinessContextProvider 
        initialBusinesses={availableBusinesses}
        currentBusinessId={initialBusinessId}
      >
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <UniversalHeader 
            user={user} 
            logoutAction={logout}
            availableBusinesses={availableBusinesses}
          />
          
          <main className="flex-1">
            {children}
          </main>
        </div>
      </BusinessContextProvider>
    </DynamicThemeProvider>
  )
}