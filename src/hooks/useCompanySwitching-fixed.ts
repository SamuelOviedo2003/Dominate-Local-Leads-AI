'use client'

import { useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { BusinessSwitcherData, CompanySwitchResponse, AvailableCompaniesResponse } from '@/types/auth'
import { useBusinessContext } from '@/contexts/BusinessContext-fixed'
import { determineTargetPageForBusinessSwitch } from '@/lib/permalink-navigation'
import { sessionMonitor } from '@/lib/session-monitoring'

interface UseCompanySwitchingReturn {
  switchCompany: (companyId: string) => Promise<{ success: boolean; error?: string }>
  isLoading: boolean
  error: string | null
}

/**
 * Enhanced company switching hook with session isolation and atomic operations
 */
export function useCompanySwitching(): UseCompanySwitchingReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { availableBusinesses, sessionId } = useBusinessContext()
  const pathname = usePathname()
  const router = useRouter()
  
  // ⭐ CRITICAL: Track ongoing switches to prevent concurrent operations
  const switchingRef = useRef<string | null>(null)

  const switchCompany = async (companyId: string): Promise<{ success: boolean; error?: string }> => {
    // ⭐ CRITICAL: Prevent concurrent switching operations
    if (switchingRef.current === companyId) {
      console.warn('[COMPANY-SWITCH] Switch already in progress for company:', companyId)
      return { success: false, error: 'Switch already in progress for this company' }
    }
    
    if (switchingRef.current) {
      console.warn('[COMPANY-SWITCH] Another switch operation in progress:', switchingRef.current)
      return { success: false, error: 'Another company switch is already in progress' }
    }

    setIsLoading(true)
    setError(null)
    switchingRef.current = companyId

    try {
      // ⭐ CRITICAL: Generate unique request ID for tracking
      const requestId = `switch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      console.log('[COMPANY-SWITCH] Starting atomic business switch:', {
        companyId,
        requestId,
        sessionId,
        pathname
      })

      // ⭐ CRITICAL: Validate business access before making request
      const targetBusiness = availableBusinesses.find(b => b.business_id === companyId)
      if (!targetBusiness) {
        const errorMessage = 'Target business not found in available businesses'
        console.error('[COMPANY-SWITCH] Validation failed:', {
          companyId,
          availableBusinesses: availableBusinesses.map(b => b.business_id),
          requestId
        })
        
        sessionMonitor.trackEvent({
          sessionId,
          userId: 'company-switch',
          action: 'anomaly',
          details: {
            type: 'invalid_business_access',
            companyId,
            availableBusinesses: availableBusinesses.map(b => b.business_id),
            requestId
          }
        })
        
        setError(errorMessage)
        return { success: false, error: errorMessage }
      }

      // ⭐ CRITICAL: Atomic switch operation with enhanced headers
      const response = await fetch('/api/company/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId,
          'X-Request-Id': requestId,
          'X-Business-Switch': 'atomic',
          'X-Request-Time': new Date().toISOString(),
        },
        body: JSON.stringify({ 
          companyId,
          requestId,
          sessionId 
        }),
      })

      const result: CompanySwitchResponse = await response.json()

      if (!result.success) {
        const errorMessage = result.error || 'Failed to switch company'
        console.error('[COMPANY-SWITCH] Server-side switch failed:', {
          companyId,
          error: errorMessage,
          status: response.status,
          requestId
        })
        
        sessionMonitor.trackEvent({
          sessionId,
          userId: 'company-switch',
          action: 'anomaly',
          details: {
            type: 'server_switch_failed',
            companyId,
            error: errorMessage,
            status: response.status,
            requestId
          }
        })
        
        setError(errorMessage)
        return { success: false, error: errorMessage }
      }

      // ⭐ CRITICAL: Verify response data integrity
      if (!result.data?.company || result.data.company.business_id !== companyId) {
        const errorMessage = 'Switch response data integrity check failed'
        console.error('[COMPANY-SWITCH] Data integrity check failed:', {
          expected: companyId,
          received: result.data?.company?.business_id,
          requestId
        })
        
        sessionMonitor.trackEvent({
          sessionId,
          userId: 'company-switch',
          action: 'anomaly',
          details: {
            type: 'data_integrity_failure',
            expectedCompanyId: companyId,
            receivedCompanyId: result.data?.company?.business_id,
            requestId
          }
        })
        
        setError(errorMessage)
        return { success: false, error: errorMessage }
      }

      console.log('[COMPANY-SWITCH] Server-side switch successful:', {
        companyId,
        companyName: result.data.company.company_name,
        requestId,
        serverSessionId: result.data.sessionId
      })

      // ⭐ CRITICAL: Atomic navigation with session validation
      if (targetBusiness.permalink) {
        const targetPage = determineTargetPageForBusinessSwitch(pathname)
        const newPath = `/${targetBusiness.permalink}/${targetPage}`
        
        console.log('[COMPANY-SWITCH] Performing atomic navigation:', {
          fromPath: pathname,
          toPath: newPath,
          targetPage,
          permalink: targetBusiness.permalink,
          requestId
        })
        
        // ⭐ CRITICAL: Use router.replace for atomic navigation instead of window.location
        // This prevents race conditions and maintains React state
        try {
          // Add cache-busting query parameter to ensure fresh data
          const cacheBuster = `cb=${Date.now()}`
          const finalPath = newPath.includes('?') 
            ? `${newPath}&${cacheBuster}`
            : `${newPath}?${cacheBuster}`
          
          router.replace(finalPath)
          
          // Track successful navigation
          sessionMonitor.trackEvent({
            sessionId,
            userId: 'company-switch',
            businessId: companyId,
            action: 'business_switch',
            details: {
              type: 'navigation_success',
              fromPath: pathname,
              toPath: finalPath,
              targetPage,
              requestId
            }
          })
          
        } catch (navigationError) {
          console.error('[COMPANY-SWITCH] Navigation failed, falling back to window.location:', navigationError)
          
          // Fallback to window.location for edge cases
          const newUrl = new URL(newPath, window.location.origin)
          newUrl.searchParams.set('cb', Date.now().toString())
          window.location.href = newUrl.toString()
        }
      } else {
        // Fallback: reload the page if we can't determine the permalink
        console.warn('[COMPANY-SWITCH] No permalink available, reloading page:', {
          companyId,
          requestId
        })
        window.location.reload()
      }

      return { success: true }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred'
      console.error('[COMPANY-SWITCH] Atomic switch operation failed:', {
        companyId,
        error: errorMessage,
        sessionId
      })
      
      sessionMonitor.trackEvent({
        sessionId,
        userId: 'company-switch',
        action: 'anomaly',
        details: {
          type: 'switch_operation_failed',
          companyId,
          error: errorMessage,
          requestId: switchingRef.current
        }
      })
      
      setError(errorMessage)
      return { success: false, error: errorMessage }
      
    } finally {
      setIsLoading(false)
      switchingRef.current = null
    }
  }

  return {
    switchCompany,
    isLoading,
    error
  }
}

/**
 * Hook to fetch available companies with session validation
 */
export function useAvailableCompanies() {
  const [companies, setCompanies] = useState<BusinessSwitcherData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { sessionId } = useBusinessContext()

  const fetchCompanies = async () => {
    setIsLoading(true)
    setError(null)

    const requestId = `companies_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      console.log('[COMPANY-FETCH] Fetching available companies:', {
        sessionId,
        requestId
      })
      
      const response = await fetch('/api/company/switch', {
        headers: {
          'X-Session-Id': sessionId,
          'X-Request-Id': requestId,
          'X-Request-Time': new Date().toISOString(),
        }
      })
      
      const result: AvailableCompaniesResponse = await response.json()

      if (!result.success) {
        const errorMessage = result.error || 'Failed to fetch companies'
        console.error('[COMPANY-FETCH] Fetch failed:', {
          error: errorMessage,
          status: response.status,
          requestId
        })
        
        sessionMonitor.trackEvent({
          sessionId,
          userId: 'company-fetch',
          action: 'anomaly',
          details: {
            type: 'companies_fetch_failed',
            error: errorMessage,
            status: response.status,
            requestId
          }
        })
        
        setError(errorMessage)
        return
      }

      console.log('[COMPANY-FETCH] Companies fetched successfully:', {
        count: result.data?.length || 0,
        requestId
      })
      
      setCompanies(result.data || [])

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred'
      console.error('[COMPANY-FETCH] Network error:', {
        error: errorMessage,
        sessionId,
        requestId
      })
      
      sessionMonitor.trackEvent({
        sessionId,
        userId: 'company-fetch',
        action: 'anomaly',
        details: {
          type: 'companies_fetch_network_error',
          error: errorMessage,
          requestId
        }
      })
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    companies,
    isLoading,
    error,
    fetchCompanies
  }
}