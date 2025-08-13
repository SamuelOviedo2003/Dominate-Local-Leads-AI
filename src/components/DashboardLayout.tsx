import { ReactNode } from 'react'
import { getHeaderData } from '@/lib/auth-helpers'
import UniversalHeader from './UniversalHeader'
import { logout } from '@/app/home/actions'

interface DashboardLayoutProps {
  children: ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, availableBusinesses } = await getHeaderData()

  return (
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
  )
}