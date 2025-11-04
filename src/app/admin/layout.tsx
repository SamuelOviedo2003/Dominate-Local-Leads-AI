import { ReactNode } from 'react'
import OptimizedLayoutWrapper from '@/components/OptimizedLayoutWrapper'
import { AuthDataProvider } from '@/contexts/AuthDataContext'
import { getRequestAuthUser } from '@/lib/supabase/server-optimized'
import { redirect } from 'next/navigation'

interface AdminLayoutProps {
  children: ReactNode
}

/**
 * Admin layout - Uses new header design with OptimizedLayoutWrapper
 * Content renders in main area between sidebar and top bar
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Get authenticated user
  const user = await getRequestAuthUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is super admin
  if (user.profile?.role !== 0) {
    const firstBusiness = user.accessibleBusinesses?.[0]
    if (firstBusiness?.business_id && firstBusiness?.permalink) {
      redirect(`/${firstBusiness.business_id}/${firstBusiness.permalink}/dashboard`)
    } else {
      redirect('/login')
    }
  }

  return (
    <AuthDataProvider user={user} business={null} effectiveRole={0}>
      <OptimizedLayoutWrapper>
        {children}
      </OptimizedLayoutWrapper>
    </AuthDataProvider>
  )
}
