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
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useSalesmanData({ timePeriod, businessId }: UseSalesmanDataProps): UseSalesmanDataReturn {
  const [metrics, setMetrics] = useState<SalesmanMetrics | null>(null)
  const [salesmanLeads, setSalesmanLeads] = useState<LeadWithClient[] | null>(null)
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
      const baseParams = new URLSearchParams({
        startDate,
        businessId: businessId.toString()
      })

      const metricsParams = new URLSearchParams({
        ...Object.fromEntries(baseParams),
        timePeriod
      })

      // Fetch all data in parallel
      const [metricsRes, leadsRes] = await Promise.all([
        fetch(`/api/salesman/metrics?${metricsParams}`),
        fetch(`/api/salesman/leads?${baseParams}`)
      ])

      // Check if all requests succeeded
      if (!metricsRes.ok || !leadsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [metricsData, leadsData]: [
        ApiResponse<SalesmanMetrics>,
        ApiResponse<LeadWithClient[]>
      ] = await Promise.all([
        metricsRes.json(),
        leadsRes.json()
      ])

      // Update state with fetched data
      if (metricsData.success) {
        setMetrics(metricsData.data)
      } else {
        throw new Error(metricsData.error || 'Failed to fetch metrics')
      }

      if (leadsData.success) {
        setSalesmanLeads(leadsData.data)
      } else {
        throw new Error(leadsData.error || 'Failed to fetch salesman leads')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      console.error('Error fetching salesman data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [timePeriod, businessId])

  return {
    metrics,
    salesmanLeads,
    isLoading,
    error,
    refetch: fetchData
  }
}