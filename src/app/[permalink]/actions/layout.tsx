import { ReactNode } from 'react'
import { BusinessContextProvider } from '@/contexts/BusinessContext'
import { DynamicThemeProvider } from '@/contexts/DynamicThemeContext'

interface PermalinkActionsLayoutProps {
  children: ReactNode
  params: { permalink: string }
}

/**
 * Optimized Actions layout that leverages parent layout's AuthDataProvider
 * Eliminates redundant authentication calls and database queries
 * Provides necessary context providers that child components require
 */
export default function PermalinkActionsLayout({
  children,
  params
}: PermalinkActionsLayoutProps) {
  console.log('[ACTIONS_LAYOUT_OPTIMIZED] Using cached auth data from parent layout')

  // No authentication or business resolution needed - parent layout provides AuthDataProvider
  // But we still need to provide BusinessContextProvider and DynamicThemeProvider for child components

  return (
    <DynamicThemeProvider>
      <BusinessContextProvider>
        {children}
      </BusinessContextProvider>
    </DynamicThemeProvider>
  )
}