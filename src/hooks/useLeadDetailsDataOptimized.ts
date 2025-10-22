'use client'

import { useState, useEffect, useCallback } from 'react'
import { LeadDetails, ApiResponse } from '@/types/leads'

interface UseLeadDetailsDataOptimizedProps {
  leadId: string
  businessId: string
}

interface UseLeadDetailsDataOptimizedReturn {
  // Data
  leadDetails: LeadDetails | null

  // Unified loading state
  isLoading: boolean

  // Unified error state
  error: string | null

  // Actions
  refetch: () => void
}

export function useLeadDetailsDataOptimized({ leadId, businessId }: UseLeadDetailsDataOptimizedProps): UseLeadDetailsDataOptimizedReturn {
  const [leadDetails, setLeadDetails] = useState<LeadDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Start as true to prevent empty state flicker
  const [error, setError] = useState<string | null>(null)

  // Optimized fetch function with unified loading state
  const fetchLeadDetails = useCallback(async () => {
    if (!leadId || !businessId) {
      setError('Missing required parameters')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const url = new URL(`/api/leads/${leadId}`, window.location.origin)
      url.searchParams.set('businessId', businessId)

      const response = await fetch(url.toString())

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch lead details')
      }

      const result: ApiResponse<LeadDetails> = await response.json()

      console.log('[useLeadDetailsDataOptimized] API response:', {
        success: result.success,
        hasData: !!result.data,
        leadPhone: result.data?.lead?.phone,
        dialpadPhone: result.data?.dialpadPhone,
        fullLeadData: result.data?.lead
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch lead details')
      }

      setLeadDetails(result.data)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)

    } finally {
      // Unified loading completion - no artificial delays
      setIsLoading(false)
    }
  }, [leadId, businessId])

  // Fetch data when dependencies change
  useEffect(() => {
    fetchLeadDetails()
  }, [fetchLeadDetails])

  return {
    leadDetails,
    isLoading,
    error,
    refetch: fetchLeadDetails
  }
}