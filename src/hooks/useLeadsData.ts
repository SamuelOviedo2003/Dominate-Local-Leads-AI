'use client'

import { useState, useEffect } from 'react'
import { LeadMetrics, LeadWithClient, TimePeriod, ApiResponse } from '@/types/leads'

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
  const [isLoading, setIsLoading] = useState(false)
  
  // Individual component loading states
  const [isMetricsLoading, setIsMetricsLoading] = useState(false)
  const [isRecentLeadsLoading, setIsRecentLeadsLoading] = useState(false)
  
  // Individual component errors
  const [error, setError] = useState<string | null>(null)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [recentLeadsError, setRecentLeadsError] = useState<string | null>(null)

  const getStartDate = (period: TimePeriod): string => {
    const date = new Date()
    date.setDate(date.getDate() - parseInt(period))
    return date.toISOString()
  }

  const fetchMetrics = async () => {
    if (!businessId) return

    setIsMetricsLoading(true)
    setMetricsError(null)

    try {
      const startDate = getStartDate(timePeriod)
      const params = new URLSearchParams({
        startDate,
        businessId
      })

      const metricsRes = await fetch(`/api/leads/metrics?${params}`)
      if (!metricsRes.ok) {
        throw new Error('Failed to fetch metrics')
      }

      const metricsData: ApiResponse<LeadMetrics> = await metricsRes.json()
      
      if (metricsData.success) {
        setMetrics(metricsData.data)
      } else {
        throw new Error(metricsData.error || 'Failed to fetch metrics')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch metrics'
      setMetricsError(errorMessage)
      // Error fetching metrics
    } finally {
      setIsMetricsLoading(false)
    }
  }


  const fetchRecentLeads = async () => {
    if (!businessId) return

    setIsRecentLeadsLoading(true)
    setRecentLeadsError(null)

    try {
      const startDate = getStartDate(timePeriod)
      const params = new URLSearchParams({
        startDate,
        businessId
      })

      const leadsRes = await fetch(`/api/leads/recent?${params}`)
      if (!leadsRes.ok) {
        throw new Error('Failed to fetch recent leads')
      }

      const leadsData: ApiResponse<LeadWithClient[]> = await leadsRes.json()
      
      if (leadsData.success) {
        setRecentLeads(leadsData.data)
      } else {
        throw new Error(leadsData.error || 'Failed to fetch recent leads')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch recent leads'
      setRecentLeadsError(errorMessage)
      // Error fetching recent leads
    } finally {
      setIsRecentLeadsLoading(false)
    }
  }

  const fetchData = async () => {
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
  }

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
  }, [timePeriod, businessId])

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