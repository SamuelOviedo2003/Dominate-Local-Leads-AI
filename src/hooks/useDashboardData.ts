'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { EnhancedDashboardMetrics, TimePeriod, ApiResponse } from '@/types/leads'
import { authGet } from '@/lib/auth-fetch'

interface UseDashboardDataProps {
  timePeriod: TimePeriod
  businessId: string
}

interface UseDashboardDataReturn {
  platformSpendMetrics: EnhancedDashboardMetrics | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useDashboardData({ timePeriod, businessId }: UseDashboardDataProps): UseDashboardDataReturn {
  const [platformSpendMetrics, setPlatformSpendMetrics] = useState<EnhancedDashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Start with true to prevent flash
  const [error, setError] = useState<string | null>(null)

  // Memoize startDate calculation to prevent recalculation on every render
  const startDate = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - parseInt(timePeriod))
    return date.toISOString()
  }, [timePeriod])

  // Memoize fetchData with useCallback to prevent recreation on every render
  const fetchData = useCallback(async (signal?: AbortSignal) => {
    if (!businessId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        startDate,
        businessId
      })

      // Fetch platform spend data with authenticated request and abort signal
      const platformSpendData: ApiResponse<EnhancedDashboardMetrics> = await authGet(`/api/dashboard/platform-spend?${params}`, signal)

      // Check if request was aborted
      if (signal?.aborted) {
        return
      }

      if (!platformSpendData.success) {
        throw new Error(platformSpendData.error || 'Failed to fetch platform spend data')
      }

      setPlatformSpendMetrics(platformSpendData.data)

    } catch (err) {
      // Ignore abort errors - these are expected when component unmounts or business switches
      const isAbortError =
        (err instanceof Error && err.name === 'AbortError') ||
        (err instanceof Error && err.message === 'Load failed') || // Fetch abort in some browsers
        (err instanceof DOMException && err.name === 'AbortError') ||
        signal?.aborted

      if (isAbortError) {
        return
      }

      // Only set error if not aborted
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      // Only update loading state if not aborted
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [startDate, businessId])

  useEffect(() => {
    // Create abort controller for this fetch
    const abortController = new AbortController()

    fetchData(abortController.signal)

    // Cleanup: abort fetch if component unmounts or dependencies change
    return () => {
      abortController.abort()
    }
  }, [fetchData])

  // Manual refetch function (without abort signal for backwards compatibility)
  const refetch = useCallback(() => {
    const abortController = new AbortController()
    fetchData(abortController.signal)
    // Note: caller is responsible for cleanup if needed
  }, [fetchData])

  return {
    platformSpendMetrics,
    isLoading,
    error,
    refetch
  }
}