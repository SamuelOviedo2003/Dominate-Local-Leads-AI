'use client'

import { useState } from 'react'
import { TimePeriod } from '@/types/leads'
import { useBookingsData } from '@/hooks/useBookingsData'
import { RecentLeadsTable } from '@/components/features/leads/RecentLeadsTable'
import { BookingsMetrics } from '@/components/features/metrics'
import { TimePeriodFilter } from '@/components/features/leads'
import { useBusinessContext } from '@/contexts/BusinessContext'

interface BookingsClientProps {
  businessId: string
  userRole?: number | null
}

export function BookingsClient({ businessId, userRole }: BookingsClientProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30')

  // Get the effective business ID (user's own or selected company for superadmin)
  const { currentBusinessId, isLoading: businessContextLoading } = useBusinessContext()
  const effectiveBusinessId = currentBusinessId || ''

  // Use comprehensive bookings data hook
  const {
    metrics,
    bookingsLeads,
    isLoading,
    isMetricsLoading,
    isBookingsLeadsLoading,
    error,
    metricsError,
    bookingsLeadsError,
    refetch
  } = useBookingsData({
    timePeriod,
    businessId: effectiveBusinessId
  })

  // Coordinated loading state to prevent flash of empty content
  const isLoadingCoordinated = businessContextLoading || isLoading || !effectiveBusinessId

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          </div>

          {/* Time Period Filter */}
          <TimePeriodFilter
            selectedPeriod={timePeriod}
            onPeriodChange={setTimePeriod}
          />
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-red-600 text-sm">
                {error}
              </div>
              <button
                onClick={refetch}
                className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Bookings Metrics */}
        <BookingsMetrics
          metrics={metrics}
          isLoading={isMetricsLoading}
          error={metricsError}
        />

        {/* Bookings Leads Table */}
        <RecentLeadsTable
          leads={bookingsLeads}
          isLoading={isBookingsLeadsLoading}
          error={bookingsLeadsError}
          navigationTarget="property-details"
        />
      </div>
    </div>
  )
}