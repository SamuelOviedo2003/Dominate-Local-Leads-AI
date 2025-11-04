import { ReactNode } from 'react'
import OptimizedLayoutWrapper from '@/components/OptimizedLayoutWrapper'

interface PermalinkBookingsLayoutProps {
  children: ReactNode
  params: { permalink: string }
}

/**
 * Bookings layout - Uses new header design with OptimizedLayoutWrapper
 */
export default function PermalinkBookingsLayout({
  children,
  params
}: PermalinkBookingsLayoutProps) {
  return (
    <OptimizedLayoutWrapper>
      {children}
    </OptimizedLayoutWrapper>
  )
}