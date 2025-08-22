'use client'

import { useState, useEffect } from 'react'
import { EnhancedDashboardMetrics, TimePeriod, ApiResponse } from '@/types/leads'

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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getStartDate = (period: TimePeriod): string => {
    const date = new Date()
    date.setDate(date.getDate() - parseInt(period))
    return date.toISOString()
  }

  const fetchData = async () => {
    if (!businessId) return

    setIsLoading(true)
    setError(null)

    try {
      const startDate = getStartDate(timePeriod)
      const params = new URLSearchParams({
        startDate,
        businessId
      })

      // Fetch platform spend data
      const platformSpendRes = await fetch(`/api/dashboard/platform-spend?${params}`)

      if (!platformSpendRes.ok) {
        throw new Error(`HTTP error! status: ${platformSpendRes.status}`)
      }

      const platformSpendData: ApiResponse<EnhancedDashboardMetrics> = await platformSpendRes.json()

      if (!platformSpendData.success) {
        throw new Error(platformSpendData.error || 'Failed to fetch platform spend data')
      }

      setPlatformSpendMetrics(platformSpendData.data)

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
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