'use client'

import { useState, useEffect } from 'react'
import {
  IncomingCallsAnalytics,
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

export function useIncomingCallsData({ timePeriod, businessId }: UseIncomingCallsDataProps): UseIncomingCallsDataReturn {
  const [sourceDistribution, setSourceDistribution] = useState<SourceDistribution[] | null>(null)
  const [callerTypeDistribution, setCallerTypeDistribution] = useState<CallerTypeDistribution[] | null>(null)
  const [sankeyData, setSankeyData] = useState<SankeyData[] | null>(null)
  const [recentCalls, setRecentCalls] = useState<IncomingCall[] | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Start as true to prevent empty state flicker
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

      const data: ApiResponse<CallerTypeDistribution[]> = await authGet(`/api/incoming-calls/source-caller-types?${params}`)

      if (data.success) {
        return data.data
      } else {
        throw new Error(data.error || 'Failed to fetch source caller types')
      }

    } catch (err) {
      // Error fetching source caller types
      return null
    }
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

      // Fetch all incoming calls data in parallel with authentication
      const [sourceData, callerTypeData, sankeyApiData, recentCallsData]: [
        ApiResponse<SourceDistribution[]>,
        ApiResponse<CallerTypeDistribution[]>,
        ApiResponse<SankeyData[]>,
        ApiResponse<IncomingCall[]>
      ] = await Promise.all([
        authGet(`/api/incoming-calls/source-distribution?${params}`),
        authGet(`/api/incoming-calls/caller-type-distribution?${params}`),
        authGet(`/api/incoming-calls/sankey-data?${params}`),
        authGet(`/api/incoming-calls/recent-calls?${params}`)
      ])

      // Update state with fetched data
      if (sourceData.success) {
        setSourceDistribution(sourceData.data)
      } else {
        throw new Error(sourceData.error || 'Failed to fetch source distribution')
      }

      if (callerTypeData.success) {
        setCallerTypeDistribution(callerTypeData.data)
      } else {
        throw new Error(callerTypeData.error || 'Failed to fetch caller type distribution')
      }

      if (sankeyApiData.success) {
        setSankeyData(sankeyApiData.data)
      } else {
        throw new Error(sankeyApiData.error || 'Failed to fetch Sankey data')
      }

      if (recentCallsData.success) {
        setRecentCalls(recentCallsData.data)
      } else {
        throw new Error(recentCallsData.error || 'Failed to fetch recent calls')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      // Error fetching incoming calls data
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const abortController = new AbortController()
    
    const fetchDataWithAbort = async () => {
      setIsLoading(true)
      setError(null)

      try {
        if (!businessId) {
          setSourceDistribution(null)
          setCallerTypeDistribution(null)
          setSankeyData(null)
          setRecentCalls(null)
          setIsLoading(false)
          return
        }

        const startDate = getStartDate(timePeriod)
        const params = new URLSearchParams({
          startDate,
          businessId
        })

        // Fetch all data in parallel with abort signal and authentication
        const [sourceRes, callerTypeRes, sankeyRes, recentRes] = await Promise.all([
          authGet(`/api/incoming-calls/source-distribution?${params}`),
          authGet(`/api/incoming-calls/caller-type-distribution?${params}`),
          authGet(`/api/incoming-calls/sankey-data?${params}`),
          authGet(`/api/incoming-calls/recent-calls?${params}`)
        ])

        // Only update state if request wasn't aborted
        if (!abortController.signal.aborted) {
          setSourceDistribution(sourceRes.data || [])
          setCallerTypeDistribution(callerTypeRes.data || [])
          setSankeyData(sankeyRes.data || [])
          setRecentCalls(recentRes.data || [])
        }
      } catch (error: any) {
        // Don't set error if request was aborted
        if (!abortController.signal.aborted) {
          setError('Failed to fetch incoming calls data')
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    fetchDataWithAbort()

    // Cleanup function to abort requests
    return () => {
      abortController.abort()
    }
  }, [timePeriod, businessId])

  return {
    sourceDistribution,
    callerTypeDistribution,
    sankeyData,
    recentCalls,
    isLoading,
    error,
    refetch: fetchData,
    fetchSourceCallerTypes
  }
}