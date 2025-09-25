import { ReactNode } from 'react'
import { BusinessContextProvider } from '@/contexts/BusinessContext'
import { DynamicThemeProvider } from '@/contexts/DynamicThemeContext'

interface PermalinkLeadDetailsLayoutProps {
  children: ReactNode
  params: { permalink: string }
}

/**
 * Optimized Lead Details layout that leverages parent layout's AuthDataProvider
 * Eliminates redundant authentication calls and database queries
 * Provides necessary context providers that child components require
 */
export default function PermalinkLeadDetailsLayout({
  children,
  params
}: PermalinkLeadDetailsLayoutProps) {
  console.log('[LEAD_DETAILS_LAYOUT_OPTIMIZED] Using cached auth data from parent layout')

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