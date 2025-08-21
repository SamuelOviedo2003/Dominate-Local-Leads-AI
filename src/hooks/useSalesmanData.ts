'use client'

import { useState, useEffect } from 'react'
import { SalesmanMetrics, LeadWithClient, TimePeriod, ApiResponse } from '@/types/leads'

interface UseSalesmanDataProps {
  timePeriod: TimePeriod
  businessId: string
}

interface UseSalesmanDataReturn {
  metrics: SalesmanMetrics | null
  salesmanLeads: LeadWithClient[] | null
  // Overall loading state for page-level coordination
  isLoading: boolean
  // Individual component loading states
  isMetricsLoading: boolean
  isSalesmanLeadsLoading: boolean
  // Individual component errors
  error: string | null
  metricsError: string | null
  salesmanLeadsError: string | null
  refetch: () => void
}

export function useSalesmanData({ timePeriod, businessId }: UseSalesmanDataProps): UseSalesmanDataReturn {
  const [metrics, setMetrics] = useState<SalesmanMetrics | null>(null)
  const [salesmanLeads, setSalesmanLeads] = useState<LeadWithClient[] | null>(null)
  
  // Overall loading state (true when any component is loading)
  const [isLoading, setIsLoading] = useState(false)
  
  // Individual component loading states
  const [isMetricsLoading, setIsMetricsLoading] = useState(false)
  const [isSalesmanLeadsLoading, setIsSalesmanLeadsLoading] = useState(false)
  
  // Individual component errors
  const [error, setError] = useState<string | null>(null)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [salesmanLeadsError, setSalesmanLeadsError] = useState<string | null>(null)

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
      const metricsParams = new URLSearchParams({
        startDate,
        businessId: businessId.toString(),
        timePeriod
      })

      const metricsRes = await fetch(`/api/salesman/metrics?${metricsParams}`)
      if (!metricsRes.ok) {
        throw new Error('Failed to fetch metrics')
      }

      const metricsData: ApiResponse<SalesmanMetrics> = await metricsRes.json()
      
      if (metricsData.success) {
        setMetrics(metricsData.data)
      } else {
        throw new Error(metricsData.error || 'Failed to fetch metrics')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch metrics'
      setMetricsError(errorMessage)
      console.error('Error fetching metrics:', err)
    } finally {
      setIsMetricsLoading(false)
    }
  }

  const fetchSalesmanLeads = async () => {
    if (!businessId) return

    setIsSalesmanLeadsLoading(true)
    setSalesmanLeadsError(null)

    try {
      const startDate = getStartDate(timePeriod)
      const baseParams = new URLSearchParams({
        startDate,
        businessId: businessId.toString()
      })

      const leadsRes = await fetch(`/api/salesman/leads?${baseParams}`)
      if (!leadsRes.ok) {
        throw new Error('Failed to fetch salesman leads')
      }

      const leadsData: ApiResponse<LeadWithClient[]> = await leadsRes.json()
      
      if (leadsData.success) {
        setSalesmanLeads(leadsData.data)
      } else {
        throw new Error(leadsData.error || 'Failed to fetch salesman leads')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch salesman leads'
      setSalesmanLeadsError(errorMessage)
      console.error('Error fetching salesman leads:', err)
    } finally {
      setIsSalesmanLeadsLoading(false)
    }
  }

  const fetchData = async () => {
    if (!businessId) return

    // Clear any previous global error
    setError(null)

    // Start all fetches independently
    const promises = [
      fetchMetrics(),
      fetchSalesmanLeads()
    ]

    // Wait for all to complete (they handle their own errors)
    await Promise.allSettled(promises)
  }

  // Update overall loading state based on individual loading states
  useEffect(() => {
    const anyLoading = isMetricsLoading || isSalesmanLeadsLoading
    setIsLoading(anyLoading)
  }, [isMetricsLoading, isSalesmanLeadsLoading])

  // Update overall error state - show error if all components failed
  useEffect(() => {
    const allErrors = [metricsError, salesmanLeadsError].filter(Boolean)
    if (allErrors.length === 2) {
      setError('Failed to load all data')
    } else if (allErrors.length > 0) {
      setError(null) // Partial success, let individual errors show
    } else {
      setError(null)
    }
  }, [metricsError, salesmanLeadsError])

  useEffect(() => {
    fetchData()
  }, [timePeriod, businessId])

  return {
    metrics,
    salesmanLeads,
    // Overall states
    isLoading,
    error,
    // Individual component states
    isMetricsLoading,
    isSalesmanLeadsLoading,
    // Individual component errors
    metricsError,
    salesmanLeadsError,
    refetch: fetchData
  }
}