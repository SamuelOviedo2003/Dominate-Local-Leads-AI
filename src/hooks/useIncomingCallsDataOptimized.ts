'use client'

import { useState, useEffect } from 'react'
import {
  SourceDistribution,
  CallerTypeDistribution,
  SankeyData,
  IncomingCall,
  IncomingCallsTimePeriod,
  ApiResponse
} from '@/types/leads'
import { authGet } from '@/lib/auth-fetch'

interface UseIncomingCallsDataProps {
  timePeriod: IncomingCallsTimePeriod
  businessId: string
}

interface IncomingCallsAnalyticsData {
  sourceDistribution: SourceDistribution[]
  callerTypeDistribution: CallerTypeDistribution[]
  recentCalls: IncomingCall[]
  sankeyData: SankeyData[]
}

interface UseIncomingCallsDataReturn {
  sourceDistribution: SourceDistribution[] | null
  callerTypeDistribution: CallerTypeDistribution[] | null
  sankeyData: SankeyData[] | null
  recentCalls: IncomingCall[] | null
  isLoading: boolean
  error: string | null
  refetch: () => void
  fetchSourceCallerTypes: (source: string) => Promise<CallerTypeDistribution[] | null>
}

export function useIncomingCallsDataOptimized({ timePeriod, businessId }: UseIncomingCallsDataProps): UseIncomingCallsDataReturn {
  const [data, setData] = useState<IncomingCallsAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getStartDate = (period: IncomingCallsTimePeriod): string => {
    const date = new Date()
    date.setDate(date.getDate() - parseInt(period))
    return date.toISOString()
  }

  const fetchSourceCallerTypes = async (source: string): Promise<CallerTypeDistribution[] | null> => {
    if (!businessId) return null

    try {
      const startDate = getStartDate(timePeriod)
      const params = new URLSearchParams({
        startDate,
        businessId,
        source
      })

      const response: ApiResponse<CallerTypeDistribution[]> = await authGet(`/api/incoming-calls/source-caller-types?${params}`)

      if (response.success) {
        return response.data
      } else {
        throw new Error(response.error || 'Failed to fetch source caller types')
      }

    } catch (err) {
      console.error('Error fetching source caller types:', err)
      return null
    }
  }

  const fetchAllData = async () => {
    if (!businessId) {
      setData(null)
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

      // Single API call to get all analytics data
      const response: ApiResponse<IncomingCallsAnalyticsData> = await authGet(`/api/incoming-calls/analytics?${params}`)

      if (response.success && response.data) {
        setData(response.data)
        setError(null)
      } else {
        throw new Error(response.error || 'Failed to fetch incoming calls analytics')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [timePeriod, businessId])

  return {
    sourceDistribution: data?.sourceDistribution || null,
    callerTypeDistribution: data?.callerTypeDistribution || null,
    sankeyData: data?.sankeyData || null,
    recentCalls: data?.recentCalls || null,
    isLoading,
    error,
    refetch: fetchAllData,
    fetchSourceCallerTypes
  }
}