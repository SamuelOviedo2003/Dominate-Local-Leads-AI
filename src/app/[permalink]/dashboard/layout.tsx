import { ReactNode } from 'react'
import OptimizedLayoutWrapper from '@/components/OptimizedLayoutWrapper'

interface PermalinkDashboardLayoutProps {
  children: ReactNode
  params: { permalink: string }
}

/**
 * Optimized dashboard layout for permalink-based routes
 * Uses OptimizedLayoutWrapper which consumes cached data from AuthDataProvider
 * Eliminates all redundant API calls and Supabase client creation
 */
export default function PermalinkDashboardLayout({
  children,
  params
}: PermalinkDashboardLayoutProps) {
  console.log('[DASHBOARD_LAYOUT_OPTIMIZED] Rendering with cached data from parent context')

  return (
    <OptimizedLayoutWrapper>
      {children}
    </OptimizedLayoutWrapper>
  )
}