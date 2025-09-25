import { ReactNode } from 'react'
import OptimizedLayoutWrapper from '@/components/OptimizedLayoutWrapper'

interface PermalinkActionsLayoutProps {
  children: ReactNode
  params: { permalink: string }
}

/**
 * Optimized Actions layout that leverages parent layout's AuthDataProvider
 * Uses OptimizedLayoutWrapper which includes UniversalHeader and necessary context providers
 * Eliminates redundant authentication calls and database queries
 */
export default function PermalinkActionsLayout({
  children,
  params
}: PermalinkActionsLayoutProps) {
  console.log('[ACTIONS_LAYOUT_OPTIMIZED] Using cached auth data from parent layout')

  // No authentication or business resolution needed - parent layout provides AuthDataProvider
  // OptimizedLayoutWrapper provides UniversalHeader, BusinessContextProvider, and DynamicThemeProvider

  return (
    <OptimizedLayoutWrapper>
      {children}
    </OptimizedLayoutWrapper>
  )
}