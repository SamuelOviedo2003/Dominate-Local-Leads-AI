import { ReactNode } from 'react'
import OptimizedLayoutWrapper from '@/components/OptimizedLayoutWrapper'

interface PermalinkIncomingCallsLayoutProps {
  children: ReactNode
  params: { permalink: string }
}

/**
 * Incoming Calls layout - Uses new header design with OptimizedLayoutWrapper
 */
export default function PermalinkIncomingCallsLayout({
  children,
  params
}: PermalinkIncomingCallsLayoutProps) {
  return (
    <OptimizedLayoutWrapper>
      {children}
    </OptimizedLayoutWrapper>
  )
}