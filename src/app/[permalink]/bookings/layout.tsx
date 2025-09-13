import { ReactNode } from 'react'
import { getHeaderData } from '@/lib/auth-helpers'
import UniversalHeader from '@/components/UniversalHeader'
import { logout } from '@/app/home/actions'
import { BusinessContextProvider } from '@/contexts/BusinessContext'
import { DynamicThemeProvider } from '@/contexts/DynamicThemeContext'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface PermalinkBookingsLayoutProps {
  children: ReactNode
  params: { permalink: string }
}

/**
 * Bookings layout for permalink-based routes
 * This provides the same UI structure with BusinessContextProvider
 * but uses the business context established by the permalink layout
 */
export default async function PermalinkBookingsLayout({ 
  children,
  params 
}: PermalinkBookingsLayoutProps) {
  const { permalink } = params
  const headerData = await getHeaderData()
  const { user, availableBusinesses } = headerData || { user: null, availableBusinesses: [] }

  // If no authenticated user, redirect to login
  // This should not happen as the permalink layout already validates authentication
  if (!user) {
    console.error('[BOOKINGS_LAYOUT] No authenticated user found - this should not happen after permalink layout validation')
    return null
  }

  // Create Supabase client to resolve the current business from permalink
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
  
  // Resolve current business from permalink
  const { data: currentBusiness } = await supabase
    .from('business_clients')
    .select('business_id, company_name, permalink')
    .eq('permalink', permalink)
    .single()

  // Use the resolved business ID as the current business
  // The permalink layout has already validated this business exists and user has access
  const currentBusinessId = currentBusiness?.business_id?.toString()

  return (
    <DynamicThemeProvider>
      <BusinessContextProvider>
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