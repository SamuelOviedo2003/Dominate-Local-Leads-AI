'use client'

import { useLeadsData } from '@/hooks/useLeadsData'
import { LeadsTable } from '@/components/features/leads'
import { LeadsMetrics } from '@/components/features/metrics'
import { useBusinessContext } from '@/contexts/BusinessContext'

interface NewLeadsClientProps {
  businessId?: string
  userRole?: number | null
}

export function NewLeadsClient({ businessId, userRole }: NewLeadsClientProps) {
  // Get the effective business ID (user's own or selected company for superadmin)
  const { currentBusinessId, isLoading: businessContextLoading } = useBusinessContext()
  const effectiveBusinessId = currentBusinessId || ''

  const {
    metrics,
    recentLeads,
    isLoading,
    isMetricsLoading,
    isRecentLeadsLoading,
    error,
    metricsError,
    recentLeadsError,
    refetch
  } = useLeadsData({
    timePeriod: '30',
    businessId: effectiveBusinessId
  })

  // Coordinated loading states to prevent flash of empty content
  const isMetricsLoadingCoordinated = businessContextLoading || isMetricsLoading || !effectiveBusinessId
  const isRecentLeadsLoadingCoordinated = businessContextLoading || isRecentLeadsLoading || !effectiveBusinessId

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            {/* Empty header content as requested */}
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

        {/* Leads Metrics - First Row */}
        <LeadsMetrics
          metrics={metrics}
          isLoading={isMetricsLoadingCoordinated}
          error={metricsError}
        />

        {/* Call now Table (Stage 1 AND call_now_status in [1,2]) */}
        <div className="mb-8">
          <LeadsTable
            leads={recentLeads ? recentLeads.filter(lead => lead.stage === 1 && (lead.call_now_status === 1 || lead.call_now_status === 2)) : null}
            isLoading={isRecentLeadsLoadingCoordinated}
            error={recentLeadsError}
            title="Call now"
          />
        </div>

        {/* Follow Up Table (Stage 2) */}
        <div className="mb-8">
          <LeadsTable
            leads={recentLeads ? recentLeads.filter(lead => lead.stage === 2) : null}
            isLoading={isRecentLeadsLoadingCoordinated}
            error={recentLeadsError}
            title="Follow Up"
            navigationTarget="actions"
          />
        </div>

        {/* Waiting to call Table (Stage 1 AND call_now_status = 3) */}
        <LeadsTable
          leads={recentLeads ? recentLeads.filter(lead => lead.stage === 1 && lead.call_now_status === 3) : null}
          isLoading={isRecentLeadsLoadingCoordinated}
          error={recentLeadsError}
          title="Waiting to call"
        />
      </div>
    </div>
  )
}