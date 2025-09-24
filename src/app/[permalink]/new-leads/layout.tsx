import { ReactNode } from 'react'
import OptimizedLayoutWrapper from '@/components/OptimizedLayoutWrapper'

interface PermalinkNewLeadsLayoutProps {
  children: ReactNode
  params: { permalink: string }
}

/**
 * Optimized New Leads layout for permalink-based routes
 * Uses OptimizedLayoutWrapper which consumes cached data from AuthDataProvider
 * Eliminates all redundant API calls and Supabase client creation
 */
export default function PermalinkNewLeadsLayout({
  children,
  params
}: PermalinkNewLeadsLayoutProps) {
  console.log('[NEW_LEADS_LAYOUT_OPTIMIZED] Rendering with cached data from parent context')

  return (
    <OptimizedLayoutWrapper>
      {children}
    </OptimizedLayoutWrapper>
  )
}