import { ReactNode } from 'react'
import { getHeaderData } from '@/lib/auth-helpers'
import UniversalHeader from './UniversalHeader'
import { logout } from '@/app/home/actions'
import { CompanyProvider } from '@/contexts'
import { DynamicThemeProvider } from '@/contexts'

interface DashboardLayoutProps {
  children: ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, availableBusinesses } = await getHeaderData()

  // Determine initial company for superadmin (their own company)
  const initialCompany = user.businessData ? {
    business_id: user.businessData.business_id.toString(),
    company_name: user.businessData.company_name,
    avatar_url: user.businessData.avatar_url,
    city: user.businessData.city,
    state: user.businessData.state
  } : null

  return (
    <DynamicThemeProvider>
      <CompanyProvider 
        initialCompany={initialCompany}
        availableCompanies={availableBusinesses}
        userBusinessId={user.businessData?.business_id.toString()}
        userRole={user.profile?.role}
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
      </CompanyProvider>
    </DynamicThemeProvider>
  )
}