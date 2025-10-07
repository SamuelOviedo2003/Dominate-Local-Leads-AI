'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookingsMetrics, LeadWithClient, ApiResponse } from '@/types/leads'
import { authGet } from '@/lib/auth-fetch'

interface UseBookingsDataProps {
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

export function useBookingsData({ businessId }: UseBookingsDataProps): UseBookingsDataReturn {
  const [metrics, setMetrics] = useState<BookingsMetrics | null>(null)
  const [bookingsLeads, setBookingsLeads] = useState<LeadWithClient[] | null>(null)

  // Overall loading state (true when any component is loading) - start as true
  const [isLoading, setIsLoading] = useState(true)

  // Individual component loading states - start as true to prevent empty state flicker
  const [isMetricsLoading, setIsMetricsLoading] = useState(true)
  const [isBookingsLeadsLoading, setIsBookingsLeadsLoading] = useState(true)
  
  // Individual component errors
  const [error, setError] = useState<string | null>(null)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [bookingsLeadsError, setBookingsLeadsError] = useState<string | null>(null)

  // Memoize fetchMetrics with useCallback to prevent recreation on every render
  const fetchMetrics = useCallback(async () => {
    if (!businessId) return

    setIsMetricsLoading(true)
    setMetricsError(null)

    try {
      const metricsParams = new URLSearchParams({
        businessId: businessId.toString()
      })

      const metricsData: ApiResponse<BookingsMetrics> = await authGet(`/api/bookings/metrics?${metricsParams}`)

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
  }, [businessId])

  // Memoize fetchBookingsLeads with useCallback to prevent recreation on every render
  const fetchBookingsLeads = useCallback(async () => {
    if (!businessId) return

    setIsBookingsLeadsLoading(true)
    setBookingsLeadsError(null)

    try {
      const baseParams = new URLSearchParams({
        businessId: businessId.toString()
      })

      const leadsData: ApiResponse<LeadWithClient[]> = await authGet(`/api/bookings/leads?${baseParams}`)

      if (leadsData.success) {
        setBookingsLeads(leadsData.data)
      } else {
        throw new Error(leadsData.error || 'Failed to fetch bookings leads')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bookings leads'
      setBookingsLeadsError(errorMessage)
    } finally {
      setIsBookingsLeadsLoading(false)
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
      fetchBookingsLeads()
    ]

    // Wait for all to complete (they handle their own errors)
    await Promise.allSettled(promises)
  }, [businessId, fetchMetrics, fetchBookingsLeads])

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
  }, [fetchData])

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