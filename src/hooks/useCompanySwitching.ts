'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { BusinessSwitcherData, CompanySwitchResponse, AvailableCompaniesResponse } from '@/types/auth'
import { useBusinessContext } from '@/contexts/BusinessContext'

interface UseCompanySwitchingReturn {
  switchCompany: (companyId: string) => Promise<{ success: boolean; error?: string }>
  isLoading: boolean
  error: string | null
}

export function useCompanySwitching(): UseCompanySwitchingReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setCurrentBusinessId, availableBusinesses } = useBusinessContext()
  const router = useRouter()
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
        // Update the business context (session-based, no database update)
        setCurrentBusinessId(result.data.company.business_id)
        
        // Find the selected business to get its permalink for URL navigation
        const selectedBusiness = availableBusinesses.find(b => b.business_id === companyId)
        
        if (selectedBusiness?.permalink) {
          // Extract the current page from pathname and navigate to the same page in the new business
          const currentPage = pathname.split('/').pop() || 'dashboard'
          const newPath = `/${selectedBusiness.permalink}/${currentPage}`
          
          // Navigate to the new business URL
          router.push(newPath)
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