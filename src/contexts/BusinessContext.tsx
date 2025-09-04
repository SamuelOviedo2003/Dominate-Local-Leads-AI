'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { BusinessSwitcherData, BusinessContext } from '@/types/auth'

interface BusinessContextProviderProps {
  children: React.ReactNode
  initialBusinesses: BusinessSwitcherData[]
  currentBusinessId?: string
}

interface BusinessContextValue extends BusinessContext {
  setCurrentBusinessId: (businessId: string) => void
  refreshBusinesses: () => Promise<void>
}

const BusinessContextContext = createContext<BusinessContextValue | null>(null)

/**
 * Session-based business context provider
 * Manages current business selection without database updates
 * Uses session storage for persistence across page reloads
 */
export function BusinessContextProvider({ 
  children, 
  initialBusinesses, 
  currentBusinessId: initialCurrentBusinessId 
}: BusinessContextProviderProps) {
  const [currentBusinessId, setCurrentBusinessIdState] = useState<string | null>(null)
  const [availableBusinesses, setAvailableBusinesses] = useState<BusinessSwitcherData[]>(initialBusinesses)
  const [isLoading, setIsLoading] = useState(false)

  // Initialize current business from session storage or first available business
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBusinessId = sessionStorage.getItem('currentBusinessId')
      
      // If we have a saved business ID and it's in our available businesses, use it
      if (savedBusinessId && availableBusinesses.some(b => b.business_id === savedBusinessId)) {
        setCurrentBusinessIdState(savedBusinessId)
      }
      // Otherwise use the initial current business ID if provided
      else if (initialCurrentBusinessId && availableBusinesses.some(b => b.business_id === initialCurrentBusinessId)) {
        setCurrentBusinessIdState(initialCurrentBusinessId)
        sessionStorage.setItem('currentBusinessId', initialCurrentBusinessId)
      }
      // Finally, fall back to the first available business
      else if (availableBusinesses.length > 0) {
        const firstBusiness = availableBusinesses[0].business_id
        setCurrentBusinessIdState(firstBusiness)
        sessionStorage.setItem('currentBusinessId', firstBusiness)
      }
    }
  }, [initialCurrentBusinessId, availableBusinesses])

  const setCurrentBusinessId = useCallback((businessId: string) => {
    // Validate that the business is in our available businesses
    if (!availableBusinesses.some(b => b.business_id === businessId)) {
      console.warn('Attempted to switch to business not in available businesses:', businessId)
      return
    }

    setCurrentBusinessIdState(businessId)
    
    // Persist to session storage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('currentBusinessId', businessId)
    }
  }, [availableBusinesses])

  const refreshBusinesses = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch updated accessible businesses
      const response = await fetch('/api/business/accessible')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setAvailableBusinesses(result.data)
          
          // If current business is no longer available, reset to first available
          if (currentBusinessId && !result.data.some((b: BusinessSwitcherData) => b.business_id === currentBusinessId)) {
            if (result.data.length > 0) {
              const firstBusiness = result.data[0].business_id
              setCurrentBusinessId(firstBusiness)
            } else {
              setCurrentBusinessIdState(null)
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('currentBusinessId')
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh accessible businesses:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentBusinessId, setCurrentBusinessId])

  const contextValue: BusinessContextValue = {
    currentBusinessId,
    availableBusinesses,
    isLoading,
    setCurrentBusinessId,
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