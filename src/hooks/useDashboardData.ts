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
  const fetchData = useCallback(async () => {
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

      // Fetch platform spend data with authenticated request
      const platformSpendData: ApiResponse<EnhancedDashboardMetrics> = await authGet(`/api/dashboard/platform-spend?${params}`)

      if (!platformSpendData.success) {
        throw new Error(platformSpendData.error || 'Failed to fetch platform spend data')
      }

      setPlatformSpendMetrics(platformSpendData.data)

    } catch (err) {
      // Error fetching dashboard data
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [startDate, businessId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    platformSpendMetrics,
    isLoading,
    error,
    refetch: fetchData
  }
}