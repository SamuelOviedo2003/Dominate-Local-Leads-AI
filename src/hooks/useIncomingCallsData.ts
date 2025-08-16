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
    fetchData()
  }, [timePeriod, businessId])

  return {
    sourceDistribution,
    callerTypeDistribution,
    sankeyData,
    recentCalls,
    isLoading,
    error,
    refetch: fetchData
  }
}