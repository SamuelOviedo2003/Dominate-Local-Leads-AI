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
  
  // Prevent concurrent business operations
  const [isOperationInProgress, setIsOperationInProgress] = useState(false)

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
    // Prevent concurrent refresh operations
    if (isOperationInProgress) {
      console.log('[BusinessContext] Operation already in progress, skipping refreshContext')
      return
    }
    
    try {
      console.log('[BusinessContext] Starting refreshContext...')
      setIsOperationInProgress(true)
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

      // Improved business selection logic with better URL/profile sync
      const urlBusinessId = getCurrentBusinessIdFromUrl()
      console.log('[BusinessContext] URL business ID:', urlBusinessId)
      console.log('[BusinessContext] Profile business ID:', data.currentBusinessId)
      console.log('[BusinessContext] Available businesses:', data.accessibleBusinesses)
      
      let selectedBusiness: BusinessSwitcherData | null = null
      
      // Priority 1: Use URL business if valid and accessible
      if (urlBusinessId && data.accessibleBusinesses.includes(urlBusinessId)) {
        const urlBusiness = businessObjects.find((b: BusinessSwitcherData) => b.business_id === urlBusinessId)
        if (urlBusiness) {
          selectedBusiness = urlBusiness
          setCurrentBusinessId(urlBusinessId)
          console.log('[BusinessContext] Using URL business:', urlBusiness.company_name)
        }
      }
      
      // Priority 2: Use profile business if no URL or URL business not accessible
      if (!selectedBusiness && data.currentBusinessId) {
        const profileBusiness = businessObjects.find((b: BusinessSwitcherData) => b.business_id === data.currentBusinessId)
        if (profileBusiness && data.accessibleBusinesses.includes(data.currentBusinessId)) {
          selectedBusiness = profileBusiness
          console.log('[BusinessContext] Using profile business:', profileBusiness.company_name)
        }
      }
      
      // Priority 3: For super admins without a valid business, select the first available one
      if (!selectedBusiness && data.role === 0 && businessObjects.length > 0) {
        selectedBusiness = businessObjects[0]
        setCurrentBusinessId(businessObjects[0].business_id)
        console.log('[BusinessContext] Super admin fallback to first business:', businessObjects[0].company_name)
      }
      
      // Priority 4: For regular users, select their first accessible business
      if (!selectedBusiness && businessObjects.length > 0) {
        selectedBusiness = businessObjects[0]
        setCurrentBusinessId(businessObjects[0].business_id)
        console.log('[BusinessContext] Regular user fallback to first business:', businessObjects[0].company_name)
      }
      
      setSelectedCompanyState(selectedBusiness)
      console.log('[BusinessContext] Final selected business:', selectedBusiness?.company_name || 'None')
    } catch (error) {
      console.error('Failed to refresh business context:', error)
    } finally {
      setIsLoading(false)
      setIsOperationInProgress(false)
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
    // Prevent concurrent business switch operations
    if (isOperationInProgress) {
      console.log('[BusinessContext] Business switch already in progress, ignoring request')
      return
    }
    
    try {
      console.log(`[BusinessContext] Starting business switch to:`, company.company_name)
      setIsOperationInProgress(true)
      setIsLoading(true)
      
      // First, trigger business switch on server (atomic database update)
      const result = await switchBusiness(company.business_id)
      
      if (!result.success) {
        console.error(`[BusinessContext] Business switch failed:`, result.error)
        // Revert UI state on failure
        await refreshContext()
        return
      }
      
      console.log(`[BusinessContext] Business switch successful for:`, company.company_name)
      
      // Update local state immediately after successful backend update
      setCurrentBusinessId(company.business_id)
      setSelectedCompanyState(company)
      
      // If we have a permalink, redirect to ensure URL synchronization
      if (company.permalink) {
        const currentPath = window.location.pathname
        const isOnPermalinkRoute = currentPath.includes('/')
        
        // Determine the target URL based on current page
        let targetUrl = `/${company.permalink}/dashboard`
        
        // Preserve the current page if we're already on a business-specific page
        if (isOnPermalinkRoute) {
          const pathSegments = currentPath.split('/')
          if (pathSegments.length >= 3) {
            const pageSegment = pathSegments[2] // e.g., 'dashboard', 'new-leads', etc.
            targetUrl = `/${company.permalink}/${pageSegment}`
          }
        }
        
        console.log(`[BusinessContext] Redirecting to: ${targetUrl}`)
        // Use window.location.href for a full page navigation to ensure clean state
        window.location.href = targetUrl
      } else {
        console.warn(`[BusinessContext] No permalink found for business:`, company.company_name)
        // If no permalink, refresh the context to ensure consistency
        await refreshContext()
      }
    } catch (error) {
      console.error(`[BusinessContext] Error during business switch:`, error)
      // Revert state on error
      await refreshContext()
    } finally {
      setIsLoading(false)
      setIsOperationInProgress(false)
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