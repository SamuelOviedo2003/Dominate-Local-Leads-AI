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
  const headerData = await getHeaderData()
  const { user, availableBusinesses } = headerData || { user: null, availableBusinesses: [] }

  // If no authenticated user, show error or redirect
  if (!user) {
    console.error('[DASHBOARD_LAYOUT] No authenticated user found')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-600">Please log in to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <DynamicThemeProvider>
      <BusinessContextProvider>
        <div className="min-h-screen bg-gray-50">
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