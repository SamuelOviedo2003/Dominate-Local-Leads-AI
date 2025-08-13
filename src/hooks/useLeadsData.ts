'use client'

import { useState, useEffect } from 'react'
import { LeadMetrics, AppointmentSetter, LeadWithClient, TimePeriod, ApiResponse } from '@/types/leads'

interface UseLeadsDataProps {
  timePeriod: TimePeriod
  businessId: string
}

interface UseLeadsDataReturn {
  metrics: LeadMetrics | null
  appointmentSetters: AppointmentSetter[] | null
  recentLeads: LeadWithClient[] | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useLeadsData({ timePeriod, businessId }: UseLeadsDataProps): UseLeadsDataReturn {
  const [metrics, setMetrics] = useState<LeadMetrics | null>(null)
  const [appointmentSetters, setAppointmentSetters] = useState<AppointmentSetter[] | null>(null)
  const [recentLeads, setRecentLeads] = useState<LeadWithClient[] | null>(null)
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

      // Fetch all data in parallel
      const [metricsRes, settersRes, leadsRes] = await Promise.all([
        fetch(`/api/leads/metrics?${params}`),
        fetch(`/api/leads/appointment-setters?${params}`),
        fetch(`/api/leads/recent?${params}`)
      ])

      // Check if all requests succeeded
      if (!metricsRes.ok || !settersRes.ok || !leadsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [metricsData, settersData, leadsData]: [
        ApiResponse<LeadMetrics>,
        ApiResponse<AppointmentSetter[]>,
        ApiResponse<LeadWithClient[]>
      ] = await Promise.all([
        metricsRes.json(),
        settersRes.json(),
        leadsRes.json()
      ])

      // Update state with fetched data
      if (metricsData.success) {
        setMetrics(metricsData.data)
      } else {
        throw new Error(metricsData.error || 'Failed to fetch metrics')
      }

      if (settersData.success) {
        setAppointmentSetters(settersData.data)
      } else {
        throw new Error(settersData.error || 'Failed to fetch appointment setters')
      }

      if (leadsData.success) {
        setRecentLeads(leadsData.data)
      } else {
        throw new Error(leadsData.error || 'Failed to fetch recent leads')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      console.error('Error fetching leads data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [timePeriod, businessId])

  return {
    metrics,
    appointmentSetters,
    recentLeads,
    isLoading,
    error,
    refetch: fetchData
  }
}