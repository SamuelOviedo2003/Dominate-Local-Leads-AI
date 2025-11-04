import { ReactNode } from 'react'
import OptimizedLayoutWrapper from '@/components/OptimizedLayoutWrapper'
import { AuthDataProvider } from '@/contexts/AuthDataContext'
import { getRequestAuthUser } from '@/lib/supabase/server-optimized'
import { redirect } from 'next/navigation'

interface SettingsLayoutProps {
  children: ReactNode
}

/**
 * Settings layout - Uses new header design with OptimizedLayoutWrapper
 * Content renders in main area between sidebar and top bar
 */
export default async function SettingsLayout({ children }: SettingsLayoutProps) {
  // Get authenticated user
  const user = await getRequestAuthUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <AuthDataProvider user={user} business={null} effectiveRole={user.profile?.role ?? 1}>
      <OptimizedLayoutWrapper>
        {children}
      </OptimizedLayoutWrapper>
    </AuthDataProvider>
  )
}
