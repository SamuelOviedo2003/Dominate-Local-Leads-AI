'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { BusinessSwitcherData, BusinessContext } from '@/types/auth'
import { sessionMonitor } from '@/lib/session-monitoring'

interface BusinessContextProviderProps {
  children: React.ReactNode
  initialBusinesses: BusinessSwitcherData[]
}

interface BusinessContextValue extends BusinessContext {
  refreshBusinesses: () => Promise<void>
  sessionId: string // ⭐ Track session ID for monitoring
}

const BusinessContextContext = createContext<BusinessContextValue | null>(null)

/**
 * URL-based business context provider with session monitoring
 * Derives current business from URL pathname (single source of truth)
 * Includes session validation to prevent cross-user contamination
 */
export function BusinessContextProvider({ 
  children, 
  initialBusinesses 
}: BusinessContextProviderProps) {
  const [availableBusinesses, setAvailableBusinesses] = useState<BusinessSwitcherData[]>(initialBusinesses)
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const pathname = usePathname()

  // Derive current business ID from URL pathname
  const currentBusinessId = React.useMemo(() => {
    // Extract permalink from pathname (first segment after root)
    const segments = pathname.split('/').filter(Boolean)
    const permalink = segments[0]
    
    if (!permalink) return null
    
    // Find business by permalink
    const business = availableBusinesses.find(b => b.permalink === permalink)
    const businessId = business?.business_id || null
    
    // ⭐ CRITICAL: Track business context changes for monitoring
    if (businessId) {
      console.log('[BUSINESS-CONTEXT] Business context derived from URL:', {
        permalink,
        businessId,
        companyName: business?.company_name,
        sessionId,
        pathname
      })
    }
    
    return businessId
  }, [pathname, availableBusinesses, sessionId])

  // ⭐ CRITICAL: Validate session integrity on business changes
  useEffect(() => {
    if (currentBusinessId) {
      // Verify the current user still has access to this business
      const hasAccess = availableBusinesses.some(b => b.business_id === currentBusinessId)
      
      if (!hasAccess) {
        console.error('[BUSINESS-CONTEXT] Security Alert: User lost access to current business', {
          currentBusinessId,
          sessionId,
          availableBusinesses: availableBusinesses.map(b => b.business_id)
        })
        
        // Log as potential security anomaly
        sessionMonitor.trackEvent({
          sessionId,
          userId: 'context-validation',
          action: 'anomaly',
          businessId: currentBusinessId,
          details: {
            type: 'business_access_lost',
            currentBusinessId,
            availableBusinesses: availableBusinesses.map(b => b.business_id)
          }
        })
        
        // Force refresh of businesses to get latest access rights
        refreshBusinesses()
      }
    }
  }, [currentBusinessId, availableBusinesses, sessionId])

  const refreshBusinesses = useCallback(async () => {
    setIsLoading(true)
    try {
      console.log('[BUSINESS-CONTEXT] Refreshing accessible businesses...', { sessionId })
      
      // Fetch updated accessible businesses with session validation
      const response = await fetch('/api/business/accessible', {
        headers: {
          'X-Session-Id': sessionId, // Include session ID for tracking
          'X-Request-Time': new Date().toISOString()
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          console.log('[BUSINESS-CONTEXT] Successfully refreshed businesses:', {
            count: result.data.length,
            businesses: result.data.map((b: BusinessSwitcherData) => ({ id: b.business_id, name: b.company_name })),
            sessionId
          })
          
          setAvailableBusinesses(result.data)
          
          // Track successful refresh
          sessionMonitor.trackEvent({
            sessionId,
            userId: 'context-refresh',
            action: 'cache_access',
            details: {
              type: 'businesses_refreshed',
              count: result.data.length,
              success: true
            }
          })
        } else {
          console.error('[BUSINESS-CONTEXT] Failed to refresh businesses - invalid response:', result)
        }
      } else {
        console.error('[BUSINESS-CONTEXT] Failed to refresh businesses - HTTP error:', {
          status: response.status,
          statusText: response.statusText,
          sessionId
        })
        
        // Track failed refresh
        sessionMonitor.trackEvent({
          sessionId,
          userId: 'context-refresh',
          action: 'anomaly',
          details: {
            type: 'businesses_refresh_failed',
            status: response.status,
            statusText: response.statusText
          }
        })
      }
    } catch (error) {
      console.error('[BUSINESS-CONTEXT] Failed to refresh accessible businesses:', error)
      
      // Track error
      sessionMonitor.trackEvent({
        sessionId,
        userId: 'context-refresh',
        action: 'anomaly',
        details: {
          type: 'businesses_refresh_error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  // ⭐ CRITICAL: Session validation on mount
  useEffect(() => {
    console.log('[BUSINESS-CONTEXT] Business context provider mounted', {
      sessionId,
      initialBusinessCount: initialBusinesses.length,
      pathname
    })
    
    // Track context initialization
    sessionMonitor.trackEvent({
      sessionId,
      userId: 'context-init',
      action: 'cache_access',
      details: {
        type: 'context_initialized',
        businessCount: initialBusinesses.length,
        pathname
      }
    })
  }, [sessionId, initialBusinesses.length, pathname])

  const contextValue: BusinessContextValue = {
    currentBusinessId,
    availableBusinesses,
    isLoading,
    refreshBusinesses,
    sessionId
  }

  return (
    <BusinessContextContext.Provider value={contextValue}>
      {children}
    </BusinessContextContext.Provider>
  )
}

/**
 * Hook to access business context with session validation
 */
export function useBusinessContext(): BusinessContextValue {
  const context = useContext(BusinessContextContext)
  
  if (!context) {
    throw new Error('useBusinessContext must be used within a BusinessContextProvider')
  }
  
  return context
}

/**
 * Hook to get the current business data with validation
 * Returns the full business data for the currently selected business
 */
export function useCurrentBusiness(): BusinessSwitcherData | null {
  const { currentBusinessId, availableBusinesses, sessionId } = useBusinessContext()
  
  if (!currentBusinessId) {
    return null
  }
  
  const currentBusiness = availableBusinesses.find(b => b.business_id === currentBusinessId)
  
  // ⭐ CRITICAL: Log business access for monitoring
  if (currentBusiness) {
    console.log('[BUSINESS-CONTEXT] Current business accessed:', {
      businessId: currentBusiness.business_id,
      companyName: currentBusiness.company_name,
      sessionId
    })
  } else {
    console.error('[BUSINESS-CONTEXT] Current business not found in available businesses:', {
      currentBusinessId,
      sessionId,
      availableBusinessIds: availableBusinesses.map(b => b.business_id)
    })
    
    // Track as anomaly
    sessionMonitor.trackEvent({
      sessionId,
      userId: 'context-access',
      action: 'anomaly',
      details: {
        type: 'current_business_not_found',
        currentBusinessId,
        availableBusinessIds: availableBusinesses.map(b => b.business_id)
      }
    })
  }
  
  return currentBusiness || null
}