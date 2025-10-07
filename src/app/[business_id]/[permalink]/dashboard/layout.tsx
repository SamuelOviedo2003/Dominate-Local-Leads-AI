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
  return (
    <OptimizedLayoutWrapper>
      {children}
    </OptimizedLayoutWrapper>
  )
}