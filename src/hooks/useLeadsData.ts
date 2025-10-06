'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { LeadMetrics, LeadWithClient, TimePeriod, ApiResponse } from '@/types/leads'
import { authGet } from '@/lib/auth-fetch'

interface UseLeadsDataProps {
  timePeriod: TimePeriod
  businessId: string
}

interface UseLeadsDataReturn {
  metrics: LeadMetrics | null
  recentLeads: LeadWithClient[] | null
  // Overall loading state for page-level coordination
  isLoading: boolean
  // Individual component loading states
  isMetricsLoading: boolean
  isRecentLeadsLoading: boolean
  // Individual component errors
  error: string | null
  metricsError: string | null
  recentLeadsError: string | null
  refetch: () => void
}

export function useLeadsData({ timePeriod, businessId }: UseLeadsDataProps): UseLeadsDataReturn {
  const [metrics, setMetrics] = useState<LeadMetrics | null>(null)
  const [recentLeads, setRecentLeads] = useState<LeadWithClient[] | null>(null)

  // Overall loading state (true when any component is loading)
  const [isLoading, setIsLoading] = useState(true) // Start with true to prevent flash

  // Individual component loading states - start with true to prevent flash of empty content
  const [isMetricsLoading, setIsMetricsLoading] = useState(true)
  const [isRecentLeadsLoading, setIsRecentLeadsLoading] = useState(true)
  
  // Individual component errors
  const [error, setError] = useState<string | null>(null)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [recentLeadsError, setRecentLeadsError] = useState<string | null>(null)

  // Memoize startDate calculation to prevent recalculation on every render
  const startDate = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - parseInt(timePeriod))
    return date.toISOString()
  }, [timePeriod])

  // Memoize fetchMetrics with useCallback to prevent recreation on every render
  const fetchMetrics = useCallback(async () => {
    if (!businessId) {
      setIsMetricsLoading(false)
      return
    }

    setIsMetricsLoading(true)
    setMetricsError(null)

    try {
      const params = new URLSearchParams({
        startDate,
        businessId
      })

      const metricsData: ApiResponse<LeadMetrics> = await authGet(`/api/leads/metrics?${params}`)
      
      if (metricsData.success) {
        setMetrics(metricsData.data)
      } else {
        throw new Error(metricsData.error || 'Failed to fetch metrics')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch metrics'
      setMetricsError(errorMessage)
    } finally {
      setIsMetricsLoading(false)
    }
  }, [startDate, businessId])

  // Memoize fetchRecentLeads with useCallback to prevent recreation on every render
  const fetchRecentLeads = useCallback(async () => {
    if (!businessId) {
      setIsRecentLeadsLoading(false)
      return
    }

    setIsRecentLeadsLoading(true)
    setRecentLeadsError(null)

    try {
      const params = new URLSearchParams({
        businessId
      })

      const leadsData: ApiResponse<LeadWithClient[]> = await authGet(`/api/leads/recent?${params}`)
      
      if (leadsData.success) {
        setRecentLeads(leadsData.data)
      } else {
        throw new Error(leadsData.error || 'Failed to fetch recent leads')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch recent leads'
      setRecentLeadsError(errorMessage)
    } finally {
      setIsRecentLeadsLoading(false)
    }
  }, [businessId])

  // Memoize fetchData with useCallback to prevent recreation on every render
  const fetchData = useCallback(async () => {
    if (!businessId) return

    // Clear any previous global error
    setError(null)

    // Start all fetches independently
    const promises = [
      fetchMetrics(),
      fetchRecentLeads()
    ]

    // Wait for all to complete (they handle their own errors)
    await Promise.allSettled(promises)
  }, [businessId, fetchMetrics, fetchRecentLeads])

  // Update overall loading state based on individual loading states
  useEffect(() => {
    const anyLoading = isMetricsLoading || isRecentLeadsLoading
    setIsLoading(anyLoading)
  }, [isMetricsLoading, isRecentLeadsLoading])

  // Update overall error state - show error if all components failed
  useEffect(() => {
    const allErrors = [metricsError, recentLeadsError].filter(Boolean)
    if (allErrors.length === 2) {
      setError('Failed to load all data')
    } else if (allErrors.length > 0) {
      setError(null) // Partial success, let individual errors show
    } else {
      setError(null)
    }
  }, [metricsError, recentLeadsError])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    metrics,
    recentLeads,
    // Overall states
    isLoading,
    error,
    // Individual component states
    isMetricsLoading,
    isRecentLeadsLoading,
    // Individual component errors
    metricsError,
    recentLeadsError,
    refetch: fetchData
  }
}