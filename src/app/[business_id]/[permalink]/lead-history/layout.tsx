import { ReactNode } from 'react'
import OptimizedLayoutWrapper from '@/components/OptimizedLayoutWrapper'

interface LeadHistoryLayoutProps {
  children: ReactNode
  params: { permalink: string; business_id: string }
}

/**
 * Lead History layout for permalink-based routes
 * Uses OptimizedLayoutWrapper which consumes cached data from AuthDataProvider
 * Eliminates all redundant API calls and Supabase client creation
 */
export default function LeadHistoryLayout({
  children,
  params
}: LeadHistoryLayoutProps) {
  console.log('[LEAD_HISTORY_LAYOUT] Rendering with cached data from parent context')

  return (
    <OptimizedLayoutWrapper>
      {children}
    </OptimizedLayoutWrapper>
  )
}
