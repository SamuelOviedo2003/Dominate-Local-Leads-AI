'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { BusinessSwitcherData } from '@/types/auth'
import { createClient } from '@/lib/supabase/client'

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

  // Get business ID from current URL context (for permalink routes)
  const getCurrentBusinessIdFromUrl = (): string | null => {
    try {
      if (typeof window === 'undefined') return null
      
      // Check if we have business context in DOM attributes (set by permalink layout)
      const businessElement = document.querySelector('[data-business-id]')
      const businessId = businessElement?.getAttribute('data-business-id')
      
      return businessId || null
    } catch (error) {
      console.warn('[BusinessContext] Error getting business ID from URL:', error)
      return null
    }
  }

  // Get JWT token from Supabase session
  const getAuthToken = async (): Promise<string | null> => {
    try {
      console.log('[BusinessContext] Getting auth token from Supabase session...')
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      console.log('[BusinessContext] Session data:', { 
        hasSession: !!session, 
        hasAccessToken: !!session?.access_token,
        userId: session?.user?.id,
        error: error?.message 
      })
      
      if (error) {
        console.error('[BusinessContext] Session error:', error)
        return null
      }
      
      if (!session?.access_token) {
        console.warn('[BusinessContext] No access token in session')
        return null
      }
      
      console.log('[BusinessContext] Successfully retrieved access token')
      return session.access_token
    } catch (error) {
      console.error('[BusinessContext] Error getting auth token:', error)
      return null
    }
  }

  // Fetch business context from server with JWT authentication
  const refreshContext = async () => {
    try {
      console.log('[BusinessContext] Starting refreshContext...')
      setIsLoading(true)
      
      // Get JWT token from Supabase session
      const token = await getAuthToken()
      if (!token) {
        console.error('[BusinessContext] No authentication token available')
        throw new Error('No authentication token available')
      }
      
      console.log('[BusinessContext] Making API request to /api/user/business-context')
      const response = await fetch('/api/user/business-context', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
      })

      console.log('[BusinessContext] API response:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[BusinessContext] API error response:', errorText)
        throw new Error(`Failed to fetch business context: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log('[BusinessContext] API success response:', result)
      const { data } = result
      
      setCurrentBusinessId(data.currentBusinessId)
      
      // Fetch full business details for all users (super admins and regular users)
      console.log('[BusinessContext] Fetching business details for accessible businesses:', data.accessibleBusinesses)
      
      let businessObjects = []
      
      // Always try to fetch full business data from /api/business/accessible
      try {
        const businessResponse = await fetch('/api/business/accessible', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'same-origin'
        })
        
        console.log('[BusinessContext] Business details API response:', businessResponse.status)
        
        if (businessResponse.ok) {
          const businessResult = await businessResponse.json()
          console.log('[BusinessContext] Business details result:', businessResult)
          businessObjects = businessResult.data || []
          
          if (businessObjects.length === 0) {
            console.warn('[BusinessContext] No business data returned from API')
          }
        } else {
          const errorText = await businessResponse.text()
          console.error('[BusinessContext] Business details API failed:', businessResponse.status, errorText)
        }
      } catch (error) {
        console.error('[BusinessContext] Error fetching business details:', error)
      }
      
      // If no business objects were fetched, don't create placeholder objects
      // This prevents showing "Business X" or "B" in the header
      if (businessObjects.length === 0) {
        console.error('[BusinessContext] No business data available - user may not have proper business access')
        // Keep empty array - this will be handled by the UI to show appropriate messages
        businessObjects = []
      }
      
      setAvailableBusinesses(businessObjects)
      setUserRole(data.role)

      // Set selected company based on URL context or current business ID
      const urlBusinessId = getCurrentBusinessIdFromUrl()
      
      if (urlBusinessId) {
        // If we're on a permalink route, use the business from the URL
        const urlBusiness = businessObjects.find((b: BusinessSwitcherData) => b.business_id === urlBusinessId)
        if (urlBusiness && data.accessibleBusinesses.includes(urlBusinessId)) {
          setSelectedCompanyState(urlBusiness)
          setCurrentBusinessId(urlBusinessId)
        } else if (data.currentBusinessId) {
          // Fallback to profile business if URL business not accessible
          const current = businessObjects.find((b: BusinessSwitcherData) => b.business_id === data.currentBusinessId)
          setSelectedCompanyState(current || null)
        }
      } else if (data.currentBusinessId) {
        // Not on permalink route, use profile business ID
        const current = businessObjects.find((b: BusinessSwitcherData) => b.business_id === data.currentBusinessId)
        setSelectedCompanyState(current || null)
      } else if (data.role === 0 && businessObjects.length > 0) {
        // For super admins without a current business, select the first available one
        setSelectedCompanyState(businessObjects[0])
        setCurrentBusinessId(businessObjects[0].business_id)
      }
    } catch (error) {
      console.error('Failed to refresh business context:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Server-side business switching with JWT authentication
  const switchBusiness = async (businessId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true)
      
      // Get JWT token from Supabase session
      const token = await getAuthToken()
      if (!token) {
        return { success: false, error: 'No authentication token available' }
      }
      
      const response = await fetch('/api/user/switch-business', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ businessId })
      })

      const result = await response.json()

      if (result.success) {
        setCurrentBusinessId(businessId)
        const newCompany = availableBusinesses.find(b => b.business_id === businessId)
        setSelectedCompanyState(newCompany || null)
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('Business switch error:', error)
      return { success: false, error: 'Failed to switch business' }
    } finally {
      setIsLoading(false)
    }
  }

  const setSelectedCompany = async (company: BusinessSwitcherData) => {
    setSelectedCompanyState(company)
    
    // Trigger business switch on server
    const result = await switchBusiness(company.business_id)
    
    // If successful and we have a permalink, redirect to the new business URL
    if (result.success && company.permalink) {
      console.log(`[BusinessContext] Business switch successful, redirecting to /${company.permalink}/dashboard`)
      // Use window.location.href for a full page navigation to ensure clean state
      window.location.href = `/${company.permalink}/dashboard`
    } else if (!result.success) {
      console.error(`[BusinessContext] Business switch failed:`, result.error)
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

// Backward compatibility with useCompany
export function useCompany() {
  const context = useBusinessContext()
  return {
    selectedCompany: context.selectedCompany,
    availableCompanies: context.availableBusinesses,
    setSelectedCompany: context.setSelectedCompany,
    setAvailableCompanies: (companies: BusinessSwitcherData[]) => {
      // This is now handled by refreshContext
      console.warn('setAvailableCompanies is deprecated - use refreshContext instead')
    },
    isLoading: context.isLoading,
    setIsLoading: (loading: boolean) => {
      console.warn('setIsLoading is deprecated - loading state is managed automatically')
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