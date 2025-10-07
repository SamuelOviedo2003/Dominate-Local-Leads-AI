import { ReactNode } from 'react'
import OptimizedLayoutWrapper from '@/components/OptimizedLayoutWrapper'

interface PermalinkPropertyDetailsLayoutProps {
  children: ReactNode
  params: { permalink: string }
}

/**
 * Optimized Property Details layout that leverages parent layout's AuthDataProvider
 * Uses OptimizedLayoutWrapper which includes UniversalHeader and necessary context providers
 * Eliminates redundant authentication calls and database queries
 */
export default function PermalinkPropertyDetailsLayout({
  children,
  params
}: PermalinkPropertyDetailsLayoutProps) {
  console.log('[PROPERTY_DETAILS_LAYOUT_OPTIMIZED] Using cached auth data from parent layout')

  // No authentication or business resolution needed - parent layout provides AuthDataProvider
  // OptimizedLayoutWrapper provides UniversalHeader, BusinessContextProvider, and DynamicThemeProvider

  return (
    <OptimizedLayoutWrapper>
      {children}
    </OptimizedLayoutWrapper>
  )
}