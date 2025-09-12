'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { BusinessSwitcherData } from '@/types/auth'
import { createClient } from '@/lib/supabase/client'
import { debugSession, debugBusiness, debugAuth, debugError, extractUserMetadata, DebugContext } from '@/lib/debug'

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
      debugError(
        DebugContext.BUSINESS,
        'Failed to get business ID from URL',
        error instanceof Error ? error : new Error(String(error))
      )
      return null
    }
  }

  // Get JWT token from Supabase session
  const getAuthToken = async (): Promise<string | null> => {
    try {
      debugAuth('Getting auth token from Supabase session', {})
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      const userMetadata = extractUserMetadata(session?.user, { businessId: currentBusinessId })
      
      debugAuth('Retrieved session data', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        sessionExpiry: session?.expires_at,
        error: error?.message
      }, userMetadata)
      
      if (error) {
        debugError(
          DebugContext.AUTH,
          'Session error during token retrieval',
          error,
          userMetadata
        )
        return null
      }
      
      if (!session?.access_token) {
        debugAuth('No access token in session', {
          hasSession: !!session,
          sessionUser: !!session?.user
        }, userMetadata)
        return null
      }
      
      debugAuth('Successfully retrieved access token', {
        tokenLength: session.access_token.length,
        expiresAt: session.expires_at
      }, userMetadata)
      return session.access_token
    } catch (error) {
      debugError(
        DebugContext.AUTH,
        'Error getting auth token',
        error instanceof Error ? error : new Error(String(error))
      )
      return null
    }
  }

  // Fetch business context from server with JWT authentication
  const refreshContext = async () => {
    // Prevent concurrent refresh operations
    if (isOperationInProgress) {
      debugSession('Operation already in progress, skipping refreshContext', {
        currentOperationState: 'IN_PROGRESS'
      })
      return
    }
    
    try {
      debugSession('Starting refreshContext', {
        currentBusinessId,
        hasAvailableBusinesses: availableBusinesses.length > 0
      })
      setIsOperationInProgress(true)
      setIsLoading(true)
      
      // Get JWT token from Supabase session
      const token = await getAuthToken()
      if (!token) {
        debugError(
          DebugContext.AUTH,
          'No authentication token available for refreshContext',
          new Error('No authentication token available')
        )
        throw new Error('No authentication token available')
      }
      
      debugSession('Making API request to /api/user/business-context', {
        hasToken: !!token,
        tokenLength: token.length
      })
      const response = await fetch('/api/user/business-context', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
      })

      debugSession('API response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        debugError(
          DebugContext.API,
          'API error response from business-context endpoint',
          new Error(`${response.status} ${response.statusText}: ${errorText.substring(0, 200)}`)
        )
        throw new Error(`Failed to fetch business context: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      debugSession('API success response received', {
        hasData: !!result.data,
        currentBusinessId: result.data?.currentBusinessId,
        accessibleBusinessesCount: result.data?.accessibleBusinesses?.length || 0,
        userRole: result.data?.role
      })
      const { data } = result
      
      setCurrentBusinessId(data.currentBusinessId)
      
      // Fetch full business details for all users (super admins and regular users)
      const userMetadata = extractUserMetadata(null, { businessId: data.currentBusinessId })
      debugBusiness('Fetching business details for accessible businesses', {
        accessibleBusinessIds: data.accessibleBusinesses,
        accessibleCount: data.accessibleBusinesses?.length || 0,
        userRole: data.role
      }, userMetadata)
      
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
        
        debugBusiness('Business details API response', {
          status: businessResponse.status,
          ok: businessResponse.ok
        }, userMetadata)
        
        if (businessResponse.ok) {
          const businessResult = await businessResponse.json()
          businessObjects = businessResult.data || []
          
          debugBusiness('Business details result', {
            businessCount: businessObjects.length,
            businessIds: businessObjects.map((b: BusinessSwitcherData) => b.business_id),
            hasBusinessData: businessObjects.length > 0
          }, userMetadata)
          
          if (businessObjects.length === 0) {
            debugBusiness('No business data returned from API', {
              apiEndpoint: '/api/business/accessible',
              expectedBusinesses: data.accessibleBusinesses
            }, userMetadata)
          }
        } else {
          const errorText = await businessResponse.text()
          debugError(
            DebugContext.API,
            'Business details API failed',
            new Error(`${businessResponse.status} ${businessResponse.statusText}: ${errorText.substring(0, 200)}`),
            userMetadata
          )
        }
      } catch (error) {
        debugError(
          DebugContext.API,
          'Error fetching business details',
          error instanceof Error ? error : new Error(String(error)),
          userMetadata
        )
      }
      
      // If no business objects were fetched, don't create placeholder objects
      // This prevents showing "Business X" or "B" in the header
      if (businessObjects.length === 0) {
        debugError(
          DebugContext.BUSINESS,
          'No business data available - user may not have proper business access',
          new Error(`User role: ${data.role}, Accessible: ${data.accessibleBusinesses?.length || 0} businesses`),
          userMetadata
        )
        // Keep empty array - this will be handled by the UI to show appropriate messages
        businessObjects = []
      }
      
      setAvailableBusinesses(businessObjects)
      setUserRole(data.role)

      // Improved business selection logic with better URL/profile sync
      const urlBusinessId = getCurrentBusinessIdFromUrl()
      debugBusiness('Business selection logic - analyzing context', {
        urlBusinessId,
        profileBusinessId: data.currentBusinessId,
        availableBusinessIds: data.accessibleBusinesses,
        businessObjectsCount: businessObjects.length
      }, userMetadata)
      
      let selectedBusiness: BusinessSwitcherData | null = null
      
      // Priority 1: Use URL business if valid and accessible
      if (urlBusinessId && data.accessibleBusinesses.includes(urlBusinessId)) {
        const urlBusiness = businessObjects.find((b: BusinessSwitcherData) => b.business_id === urlBusinessId)
        if (urlBusiness) {
          selectedBusiness = urlBusiness
          setCurrentBusinessId(urlBusinessId)
          debugBusiness('Using URL business', {
            businessId: urlBusinessId,
            companyName: urlBusiness.company_name,
            selectionPriority: 1
          }, userMetadata)
        }
      }
      
      // Priority 2: Use profile business if no URL or URL business not accessible
      if (!selectedBusiness && data.currentBusinessId) {
        const profileBusiness = businessObjects.find((b: BusinessSwitcherData) => b.business_id === data.currentBusinessId)
        if (profileBusiness && data.accessibleBusinesses.includes(data.currentBusinessId)) {
          selectedBusiness = profileBusiness
          debugBusiness('Using profile business', {
            businessId: data.currentBusinessId,
            companyName: profileBusiness.company_name,
            selectionPriority: 2
          }, userMetadata)
        }
      }
      
      // Priority 3: For super admins without a valid business, select the first available one
      if (!selectedBusiness && data.role === 0 && businessObjects.length > 0) {
        selectedBusiness = businessObjects[0]
        setCurrentBusinessId(businessObjects[0].business_id)
        debugBusiness('Super admin fallback to first business', {
          businessId: businessObjects[0].business_id,
          companyName: businessObjects[0].company_name,
          selectionPriority: 3,
          userRole: data.role
        }, userMetadata)
      }
      
      // Priority 4: For regular users, select their first accessible business
      if (!selectedBusiness && businessObjects.length > 0) {
        selectedBusiness = businessObjects[0]
        setCurrentBusinessId(businessObjects[0].business_id)
        debugBusiness('Regular user fallback to first business', {
          businessId: businessObjects[0].business_id,
          companyName: businessObjects[0].company_name,
          selectionPriority: 4,
          userRole: data.role
        }, userMetadata)
      }
      
      setSelectedCompanyState(selectedBusiness)
      debugSession('RefreshContext completed - final business selection', {
        selectedBusinessId: selectedBusiness?.business_id,
        selectedCompanyName: selectedBusiness?.company_name || 'None',
        totalAvailableBusinesses: businessObjects.length,
        userRole: data.role
      }, userMetadata)
    } catch (error) {
      debugError(
        DebugContext.SESSION,
        'Failed to refresh business context',
        error instanceof Error ? error : new Error(String(error))
      )
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
      const userMetadata = extractUserMetadata(null, { businessId: currentBusinessId })
      debugError(
        DebugContext.BUSINESS,
        'Business switch error',
        error instanceof Error ? error : new Error(String(error)),
        userMetadata
      )
      return { success: false, error: 'Failed to switch business' }
    } finally {
      setIsLoading(false)
    }
  }

  const setSelectedCompany = async (company: BusinessSwitcherData) => {
    // Prevent concurrent business switch operations
    if (isOperationInProgress) {
      debugBusiness('Business switch already in progress, ignoring request', {
        targetBusinessId: company.business_id,
        targetCompanyName: company.company_name,
        operationState: 'IN_PROGRESS'
      })
      return
    }
    
    try {
      const userMetadata = extractUserMetadata(null, { businessId: currentBusinessId })
      debugBusiness('Starting business switch', {
        fromBusinessId: currentBusinessId,
        toBusinessId: company.business_id,
        toCompanyName: company.company_name,
        hasPermalink: !!company.permalink
      }, userMetadata)
      setIsOperationInProgress(true)
      setIsLoading(true)
      
      // First, trigger business switch on server (atomic database update)
      const result = await switchBusiness(company.business_id)
      
      if (!result.success) {
        debugError(
          DebugContext.BUSINESS,
          'Business switch failed',
          new Error(`Failed to switch to ${company.company_name}: ${result.error || 'Unknown error'}`),
          userMetadata
        )
        // Revert UI state on failure
        await refreshContext()
        return
      }
      
      debugBusiness('Business switch successful', {
        newBusinessId: company.business_id,
        newCompanyName: company.company_name,
        hasPermalink: !!company.permalink
      }, userMetadata)
      
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
        
        debugBusiness('Redirecting after business switch', {
          fromUrl: window.location.pathname,
          toUrl: targetUrl,
          businessPermalink: company.permalink,
          preservedPage: targetUrl.includes('/dashboard') ? 'dashboard' : 'other'
        }, userMetadata)
        // Use window.location.href for a full page navigation to ensure clean state
        window.location.href = targetUrl
      } else {
        debugBusiness('No permalink found for business - refreshing context', {
          businessId: company.business_id,
          companyName: company.company_name,
          availablePermalinks: availableBusinesses.filter(b => b.permalink).map(b => ({ id: b.business_id, permalink: b.permalink }))
        }, userMetadata)
        // If no permalink, refresh the context to ensure consistency
        await refreshContext()
      }
    } catch (error) {
      debugError(
        DebugContext.BUSINESS,
        'Error during business switch',
        error instanceof Error ? error : new Error(String(error))
      )
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
      debugBusiness('setAvailableCompanies deprecated call', {
        deprecatedFunction: 'setAvailableCompanies',
        recommendedFunction: 'refreshContext',
        companiesCount: companies?.length || 0
      })
    },
    isLoading: context.isLoading,
    setIsLoading: (loading: boolean) => {
      debugBusiness('setIsLoading deprecated call', {
        deprecatedFunction: 'setIsLoading',
        requestedLoadingState: loading,
        message: 'loading state is managed automatically'
      })
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