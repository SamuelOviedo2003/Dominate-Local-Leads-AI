'use client'

import { useState } from 'react'
import { BusinessSwitcherData, CompanySwitchResponse, AvailableCompaniesResponse } from '@/types/auth'
import { useCompany } from '@/contexts'

interface UseCompanySwitchingReturn {
  switchCompany: (companyId: string) => Promise<{ success: boolean; error?: string }>
  isLoading: boolean
  error: string | null
}

export function useCompanySwitching(): UseCompanySwitchingReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setSelectedCompany, availableCompanies } = useCompany()

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
        // Update the selected company in context
        setSelectedCompany(result.data.company)
        
        // Since we've updated the user's business_id in the database,
        // we need to refresh the page to ensure all server-side components
        // and cached data reflect the new business context
        window.location.reload()
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