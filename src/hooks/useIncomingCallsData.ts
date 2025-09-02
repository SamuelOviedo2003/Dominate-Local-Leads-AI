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
  const [isLoading, setIsLoading] = useState(false)
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

      const response = await fetch(`/api/incoming-calls/source-caller-types?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch source caller types')
      }

      const data: ApiResponse<CallerTypeDistribution[]> = await response.json()

      if (data.success) {
        return data.data
      } else {
        throw new Error(data.error || 'Failed to fetch source caller types')
      }

    } catch (err) {
      console.error('Error fetching source caller types:', err)
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

      // Fetch all incoming calls data in parallel
      const [sourceRes, callerTypeRes, sankeyRes, recentCallsRes] = await Promise.all([
        fetch(`/api/incoming-calls/source-distribution?${params}`),
        fetch(`/api/incoming-calls/caller-type-distribution?${params}`),
        fetch(`/api/incoming-calls/sankey-data?${params}`),
        fetch(`/api/incoming-calls/recent-calls?${params}`)
      ])

      // Check if all requests succeeded
      if (!sourceRes.ok || !callerTypeRes.ok || !sankeyRes.ok || !recentCallsRes.ok) {
        throw new Error('Failed to fetch incoming calls data')
      }

      const [sourceData, callerTypeData, sankeyApiData, recentCallsData]: [
        ApiResponse<SourceDistribution[]>,
        ApiResponse<CallerTypeDistribution[]>,
        ApiResponse<SankeyData[]>,
        ApiResponse<IncomingCall[]>
      ] = await Promise.all([
        sourceRes.json(),
        callerTypeRes.json(),
        sankeyRes.json(),
        recentCallsRes.json()
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
      console.error('Error fetching incoming calls data:', err)
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

        // Fetch all data in parallel with abort signal
        const [sourceRes, callerTypeRes, sankeyRes, recentRes] = await Promise.all([
          fetch(`/api/incoming-calls/source-distribution?${params}`, {
            signal: abortController.signal
          }).then(res => res.json()),
          fetch(`/api/incoming-calls/caller-type-distribution?${params}`, {
            signal: abortController.signal
          }).then(res => res.json()),
          fetch(`/api/incoming-calls/sankey-data?${params}`, {
            signal: abortController.signal
          }).then(res => res.json()),
          fetch(`/api/incoming-calls/recent-calls?${params}`, {
            signal: abortController.signal
          }).then(res => res.json())
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