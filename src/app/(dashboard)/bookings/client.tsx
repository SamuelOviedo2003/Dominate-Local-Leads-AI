'use client'

import { useBookingsData } from '@/hooks/useBookingsData'
import { LeadsTable } from '@/components/features/leads/LeadsTable'
import { useBusinessContext } from '@/contexts/BusinessContext'

interface BookingsClientProps {
  businessId: string
  userRole?: number | null
}

export function BookingsClient({ businessId, userRole }: BookingsClientProps) {
  // Get the effective business ID (user's own or selected company for superadmin)
  const { currentBusinessId } = useBusinessContext()
  const effectiveBusinessId = currentBusinessId || ''

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
    timePeriod: '30',
    businessId: effectiveBusinessId
  })

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
            <p className="text-gray-600 mt-2">Track appointment shows, closes, and revenue metrics</p>
          </div>
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


        {/* Bookings Leads Table */}
        <LeadsTable 
          leads={bookingsLeads}
          isLoading={isBookingsLeadsLoading}
          error={bookingsLeadsError}
          navigationTarget="property-details"
        />
      </div>
    </div>
  )
}