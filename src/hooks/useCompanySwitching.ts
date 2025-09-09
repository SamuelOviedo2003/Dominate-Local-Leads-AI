'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { BusinessSwitcherData, CompanySwitchResponse, AvailableCompaniesResponse } from '@/types/auth'
import { useBusinessContext } from '@/contexts/BusinessContext'
import { determineTargetPageForBusinessSwitch } from '@/lib/permalink-navigation'

interface UseCompanySwitchingReturn {
  switchCompany: (companyId: string) => Promise<{ success: boolean; error?: string }>
  isLoading: boolean
  error: string | null
}

export function useCompanySwitching(): UseCompanySwitchingReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { availableBusinesses } = useBusinessContext()
  const pathname = usePathname()

  const switchCompany = async (companyId: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/company/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId }),
      })

      const result: CompanySwitchResponse = await response.json()

      if (!result.success) {
        const errorMessage = result.error || 'Failed to switch company'
        setError(errorMessage)
        return { success: false, error: errorMessage }
      }

      if (result.data?.company) {
        // Find the selected business to get its permalink for URL navigation
        const selectedBusiness = availableBusinesses.find(b => b.business_id === companyId)
        
        if (selectedBusiness?.permalink) {
          // Determine the appropriate page/section for the new business
          const targetPage = determineTargetPageForBusinessSwitch(pathname)
          const newPath = `/${selectedBusiness.permalink}/${targetPage}`
          
          // Use full page navigation to ensure server components re-render and cache invalidation works
          // This ensures URL and content are always in sync
          window.location.href = newPath
        } else {
          // Fallback: reload the page if we can't determine the permalink
          window.location.reload()
        }
      }

      return { success: true }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    switchCompany,
    isLoading,
    error
  }
}

/**
 * Hook to fetch available companies for superadmin
 */
export function useAvailableCompanies() {
  const [companies, setCompanies] = useState<BusinessSwitcherData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCompanies = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/company/switch')
      const result: AvailableCompaniesResponse = await response.json()

      if (!result.success) {
        const errorMessage = result.error || 'Failed to fetch companies'
        setError(errorMessage)
        return
      }

      setCompanies(result.data || [])

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred'
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