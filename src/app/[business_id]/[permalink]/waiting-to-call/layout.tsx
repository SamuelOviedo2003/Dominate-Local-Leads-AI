import { ReactNode } from 'react'
import OptimizedLayoutWrapper from '@/components/OptimizedLayoutWrapper'

interface WaitingToCallLayoutProps {
  children: ReactNode
  params: { permalink: string }
}

/**
 * Optimized Waiting to Call layout for permalink-based routes
 * Uses OptimizedLayoutWrapper which consumes cached data from AuthDataProvider
 * Eliminates all redundant API calls and Supabase client creation
 */
export default function WaitingToCallLayout({
  children,
  params
}: WaitingToCallLayoutProps) {
  console.log('[WAITING_TO_CALL_LAYOUT] Rendering with cached data from parent context')

  return (
    <OptimizedLayoutWrapper>
      {children}
    </OptimizedLayoutWrapper>
  )
}
