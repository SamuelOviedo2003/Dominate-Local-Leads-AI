'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { BusinessSwitcherData } from '@/types/auth'
import { createClient } from '@/lib/supabase/client'
import { authGet, authPost } from '@/lib/auth-fetch'
import { determineTargetPageForBusinessSwitch } from '@/lib/permalink-navigation'

interface BusinessContextType {
  currentBusinessId: string | null
  availableBusinesses: BusinessSwitcherData[]
  userRole: number
  isLoading: boolean
  switchBusiness: (businessId: string) => Promise<{ success: boolean; error?: string }>
  refreshContext: () => Promise<void>
  selectedCompany: BusinessSwitcherData | null
  setSelectedCompany: (company: BusinessSwitcherData) => Promise<void>
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined)

interface BusinessProviderProps {
  children: ReactNode
}

export function BusinessProvider({ children }: BusinessProviderProps) {
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null)
  const [availableBusinesses, setAvailableBusinesses] = useState<BusinessSwitcherData[]>([])
  const [selectedCompany, setSelectedCompanyState] = useState<BusinessSwitcherData | null>(null)
  const [userRole, setUserRole] = useState<number>(1)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = async (): Promise<boolean> => {
    try {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      return !error && !!session?.access_token
    } catch (error) {
      console.error('Error checking auth:', error)
      return false
    }
  }

  const refreshContext = async () => {
    try {
      setIsLoading(true)

      const isAuthenticated = await checkAuth()
      if (!isAuthenticated) {
        console.warn('User is not authenticated, clearing business context')
        // Clear context when not authenticated
        setCurrentBusinessId(null)
        setAvailableBusinesses([])
        setSelectedCompanyState(null)
        setUserRole(1)
        return
      }

      const result = await authGet('/api/user/business-context')
      const { data } = result

      setCurrentBusinessId(data.currentBusinessId)
      setUserRole(data.role)

      // Fetch full business details
      const businessResult = await authGet('/api/business/accessible')
      const businesses = businessResult.data || []
      setAvailableBusinesses(businesses)

      // Select appropriate business with enhanced persistence logic
      let selectedBusiness = null

      // First priority: Use the stored business ID from user profile (persistence)
      if (data.currentBusinessId) {
        selectedBusiness = businesses.find((b: BusinessSwitcherData) =>
          b.business_id === data.currentBusinessId
        )
      }

      // Fallback: If stored business not found/accessible, use first available business
      if (!selectedBusiness && businesses.length > 0) {
        selectedBusiness = businesses[0]
        // Update the user's profile to persist this selection
        setCurrentBusinessId(selectedBusiness.business_id)

        // Also update the database to persist across sessions
        try {
          await authPost('/api/user/switch-business', { businessId: selectedBusiness.business_id })
        } catch (error) {
          console.warn('Failed to persist business selection:', error)
        }
      }

      setSelectedCompanyState(selectedBusiness)
    } catch (error) {
      console.error('Failed to refresh business context:', error)
      // Clear context on error to ensure loading state resolves
      setCurrentBusinessId(null)
      setAvailableBusinesses([])
      setSelectedCompanyState(null)
      setUserRole(1)
    } finally {
      setIsLoading(false)
    }
  }

  const switchBusiness = async (businessId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const isAuthenticated = await checkAuth()
      if (!isAuthenticated) {
        return { success: false, error: 'User is not authenticated' }
      }

      const result = await authPost('/api/user/switch-business', { businessId })

      if (result.success) {
        setCurrentBusinessId(businessId)
        const newCompany = availableBusinesses.find(b => b.business_id === businessId)
        setSelectedCompanyState(newCompany || null)
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      return { success: false, error: 'Failed to switch business' }
    }
  }

  const setSelectedCompany = async (company: BusinessSwitcherData) => {
    const result = await switchBusiness(company.business_id)

    if (result.success && company.permalink) {
      // Determine target section based on current page
      const currentPath = window.location.pathname
      const targetSection = determineTargetPageForBusinessSwitch(currentPath)

      // Navigate to new business URL while preserving appropriate section
      window.location.href = `/${company.permalink}/${targetSection}`
    } else if (!result.success) {
      console.error('Business switch failed:', result.error)
    }
  }

  // Load context on mount
  useEffect(() => {
    refreshContext()
  }, [])

  return (
    <BusinessContext.Provider
      value={{
        currentBusinessId,
        availableBusinesses,
        userRole,
        isLoading,
        switchBusiness,
        refreshContext,
        selectedCompany,
        setSelectedCompany
      }}
    >
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusinessContext() {
  const context = useContext(BusinessContext)
  if (context === undefined) {
    throw new Error('useBusinessContext must be used within a BusinessProvider')
  }
  return context
}

export function useCompany() {
  const context = useBusinessContext()
  return {
    selectedCompany: context.selectedCompany,
    availableCompanies: context.availableBusinesses,
    setSelectedCompany: context.setSelectedCompany,
    setAvailableCompanies: () => {
      // This is now handled by refreshContext
    },
    isLoading: context.isLoading,
    setIsLoading: () => {
      // Loading state is managed automatically
    },
    userRole: context.userRole
  }
}

/**
 * Hook to get the effective business ID for data fetching
 * For superadmins, returns the selected company's business_id
 * For regular users, returns the first available business from their accessible businesses
 */
export function useEffectiveBusinessId(): string {
  const { selectedCompany, availableBusinesses, userRole } = useBusinessContext()
  
  // If user is superadmin (role 0) and has selected a company, use that
  if (userRole === 0 && selectedCompany) {
    return selectedCompany.business_id
  }
  
  // Otherwise, use the first available business (for regular users this will be their assigned business)
  return selectedCompany?.business_id || availableBusinesses[0]?.business_id || ''
}

/**
 * Hook to get the current business data
 * Returns the full business data for the currently selected business
 */
export function useCurrentBusiness(): BusinessSwitcherData | null {
  const { selectedCompany } = useBusinessContext()
  return selectedCompany
}

// Legacy alias for BusinessProvider
export const BusinessContextProvider = BusinessProvider