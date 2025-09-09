'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { BusinessSwitcherData, BusinessContext } from '@/types/auth'

interface BusinessContextProviderProps {
  children: React.ReactNode
  initialBusinesses: BusinessSwitcherData[]
}

interface BusinessContextValue extends BusinessContext {
  refreshBusinesses: () => Promise<void>
}

const BusinessContextContext = createContext<BusinessContextValue | null>(null)

/**
 * URL-based business context provider
 * Derives current business from URL pathname (single source of truth)
 * No separate state management to prevent URL/content sync issues
 */
export function BusinessContextProvider({ 
  children, 
  initialBusinesses 
}: BusinessContextProviderProps) {
  const [availableBusinesses, setAvailableBusinesses] = useState<BusinessSwitcherData[]>(initialBusinesses)
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()

  // Derive current business ID from URL pathname
  const currentBusinessId = React.useMemo(() => {
    // Extract permalink from pathname (first segment after root)
    const segments = pathname.split('/').filter(Boolean)
    const permalink = segments[0]
    
    if (!permalink) return null
    
    // Find business by permalink
    const business = availableBusinesses.find(b => b.permalink === permalink)
    return business?.business_id || null
  }, [pathname, availableBusinesses])

  const refreshBusinesses = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch updated accessible businesses
      const response = await fetch('/api/business/accessible')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setAvailableBusinesses(result.data)
        }
      }
    } catch (error) {
      console.error('Failed to refresh accessible businesses:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const contextValue: BusinessContextValue = {
    currentBusinessId,
    availableBusinesses,
    isLoading,
    refreshBusinesses
  }

  return (
    <BusinessContextContext.Provider value={contextValue}>
      {children}
    </BusinessContextContext.Provider>
  )
}

/**
 * Hook to access business context
 * Provides current business selection and switching functionality
 */
export function useBusinessContext(): BusinessContextValue {
  const context = useContext(BusinessContextContext)
  
  if (!context) {
    throw new Error('useBusinessContext must be used within a BusinessContextProvider')
  }
  
  return context
}

/**
 * Hook to get the current business data
 * Returns the full business data for the currently selected business
 */
export function useCurrentBusiness(): BusinessSwitcherData | null {
  const { currentBusinessId, availableBusinesses } = useBusinessContext()
  
  if (!currentBusinessId) {
    return null
  }
  
  return availableBusinesses.find(b => b.business_id === currentBusinessId) || null
}