'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
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
  const searchParams = useSearchParams()

  // Optimized fetch function with unified loading state
  const fetchLeadDetails = useCallback(async () => {
    if (!leadId) {
      setError('Missing required parameters')
      return
    }

    // IMPORTANT: Support for cross-business lead viewing in Waiting to Call mode
    // If leadBusinessId is present in URL query params, use it instead of the URL's businessId
    // This allows viewing leads from other businesses while keeping the current business context in the URL
    const leadBusinessId = searchParams.get('leadBusinessId')
    const effectiveBusinessId = leadBusinessId || businessId

    if (!effectiveBusinessId) {
      setError('Missing business ID')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const url = new URL(`/api/leads/${leadId}`, window.location.origin)
      url.searchParams.set('businessId', effectiveBusinessId)

      const response = await fetch(url.toString())

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch lead details')
      }

      const result: ApiResponse<LeadDetails> = await response.json()

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
  }, [leadId, businessId, searchParams])

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