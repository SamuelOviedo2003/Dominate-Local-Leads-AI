'use client'

import { useFollowUpAndRecentLeads } from '@/hooks/useFollowUpAndRecentLeads'
import { RecentLeadsTable } from '@/components/features/leads/RecentLeadsTable'
import { BookingsMetrics } from '@/components/features/metrics'
import { useBusinessContext } from '@/contexts/BusinessContext'

interface BookingsClientProps {
  businessId: string
  userRole?: number | null
}

export function BookingsClient({ businessId, userRole }: BookingsClientProps) {
  // Get the effective business ID (user's own or selected company for superadmin)
  const { currentBusinessId } = useBusinessContext()
  const effectiveBusinessId = currentBusinessId || ''

  // Use dedicated hook only for Recent Leads table
  const {
    recentLeads,
    isRecentLoading,
    recentError,
    refetchRecent
  } = useFollowUpAndRecentLeads({
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
        {recentError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-red-600 text-sm">
                {recentError}
              </div>
              <button
                onClick={refetchRecent}
                className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Recent Leads Table - Only Table */}
        <RecentLeadsTable
          leads={recentLeads}
          isLoading={isRecentLoading}
          error={recentError}
          navigationTarget="property-details"
        />
      </div>
    </div>
  )
}