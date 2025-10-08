import { ReactNode } from 'react'
import OptimizedLayoutWrapper from '@/components/OptimizedLayoutWrapper'

interface PermalinkFollowUpLayoutProps {
  children: ReactNode
  params: { permalink: string }
}

/**
 * Optimized Follow Up layout for permalink-based routes
 * Uses OptimizedLayoutWrapper which consumes cached data from AuthDataProvider
 * Eliminates all redundant API calls and Supabase client creation
 */
export default function PermalinkFollowUpLayout({
  children,
  params
}: PermalinkFollowUpLayoutProps) {
  console.log('[FOLLOW_UP_LAYOUT_OPTIMIZED] Rendering with cached data from parent context')

  return (
    <OptimizedLayoutWrapper>
      {children}
    </OptimizedLayoutWrapper>
  )
}
