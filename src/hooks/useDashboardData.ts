'use client'

import { useState, useEffect } from 'react'
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

  const getStartDate = (period: TimePeriod): string => {
    const date = new Date()
    date.setDate(date.getDate() - parseInt(period))
    return date.toISOString()
  }

  const fetchData = async () => {
    if (!businessId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const startDate = getStartDate(timePeriod)
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
  }

  useEffect(() => {
    fetchData()
  }, [timePeriod, businessId])

  const refetch = () => {
    fetchData()
  }

  return {
    platformSpendMetrics,
    isLoading,
    error,
    refetch
  }
}