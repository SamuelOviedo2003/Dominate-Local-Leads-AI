'use client'

import { useState, useEffect } from 'react'
import { BookingsMetrics, LeadWithClient, TimePeriod, ApiResponse } from '@/types/leads'

interface UseBookingsDataProps {
  timePeriod: TimePeriod
  businessId: string
}

interface UseBookingsDataReturn {
  metrics: BookingsMetrics | null
  bookingsLeads: LeadWithClient[] | null
  // Overall loading state for page-level coordination
  isLoading: boolean
  // Individual component loading states
  isMetricsLoading: boolean
  isBookingsLeadsLoading: boolean
  // Individual component errors
  error: string | null
  metricsError: string | null
  bookingsLeadsError: string | null
  refetch: () => void
}

export function useBookingsData({ timePeriod, businessId }: UseBookingsDataProps): UseBookingsDataReturn {
  const [metrics, setMetrics] = useState<BookingsMetrics | null>(null)
  const [bookingsLeads, setBookingsLeads] = useState<LeadWithClient[] | null>(null)
  
  // Overall loading state (true when any component is loading)
  const [isLoading, setIsLoading] = useState(false)
  
  // Individual component loading states
  const [isMetricsLoading, setIsMetricsLoading] = useState(false)
  const [isBookingsLeadsLoading, setIsBookingsLeadsLoading] = useState(false)
  
  // Individual component errors
  const [error, setError] = useState<string | null>(null)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [bookingsLeadsError, setBookingsLeadsError] = useState<string | null>(null)

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

      const metricsRes = await fetch(`/api/bookings/metrics?${metricsParams}`)
      if (!metricsRes.ok) {
        throw new Error('Failed to fetch metrics')
      }

      const metricsData: ApiResponse<BookingsMetrics> = await metricsRes.json()
      
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

  const fetchBookingsLeads = async () => {
    if (!businessId) return

    setIsBookingsLeadsLoading(true)
    setBookingsLeadsError(null)

    try {
      const startDate = getStartDate(timePeriod)
      const baseParams = new URLSearchParams({
        startDate,
        businessId: businessId.toString()
      })

      const leadsRes = await fetch(`/api/bookings/leads?${baseParams}`)
      if (!leadsRes.ok) {
        throw new Error('Failed to fetch bookings leads')
      }

      const leadsData: ApiResponse<LeadWithClient[]> = await leadsRes.json()
      
      if (leadsData.success) {
        setBookingsLeads(leadsData.data)
      } else {
        throw new Error(leadsData.error || 'Failed to fetch bookings leads')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bookings leads'
      setBookingsLeadsError(errorMessage)
      console.error('Error fetching bookings leads:', err)
    } finally {
      setIsBookingsLeadsLoading(false)
    }
  }

  const fetchData = async () => {
    if (!businessId) return

    // Clear any previous global error
    setError(null)

    // Start all fetches independently
    const promises = [
      fetchMetrics(),
      fetchBookingsLeads()
    ]

    // Wait for all to complete (they handle their own errors)
    await Promise.allSettled(promises)
  }

  // Update overall loading state based on individual loading states
  useEffect(() => {
    const anyLoading = isMetricsLoading || isBookingsLeadsLoading
    setIsLoading(anyLoading)
  }, [isMetricsLoading, isBookingsLeadsLoading])

  // Update overall error state - show error if all components failed
  useEffect(() => {
    const allErrors = [metricsError, bookingsLeadsError].filter(Boolean)
    if (allErrors.length === 2) {
      setError('Failed to load all data')
    } else if (allErrors.length > 0) {
      setError(null) // Partial success, let individual errors show
    } else {
      setError(null)
    }
  }, [metricsError, bookingsLeadsError])

  useEffect(() => {
    fetchData()
  }, [timePeriod, businessId])

  return {
    metrics,
    bookingsLeads,
    // Overall states
    isLoading,
    error,
    // Individual component states
    isMetricsLoading,
    isBookingsLeadsLoading,
    // Individual component errors
    metricsError,
    bookingsLeadsError,
    refetch: fetchData
  }
}