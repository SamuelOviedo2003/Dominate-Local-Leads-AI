'use client'

import { useMemo } from 'react'
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

  // Memoize coordinated loading states
  const isMetricsLoadingCoordinated = useMemo(
    () => businessContextLoading || isMetricsLoading || !effectiveBusinessId,
    [businessContextLoading, isMetricsLoading, effectiveBusinessId]
  )
  const isRecentLeadsLoadingCoordinated = useMemo(
    () => businessContextLoading || isRecentLeadsLoading || !effectiveBusinessId,
    [businessContextLoading, isRecentLeadsLoading, effectiveBusinessId]
  )

  // Memoize filtered leads for each table to prevent recalculation on every render
  const callNowLeads = useMemo(
    () => recentLeads ? recentLeads.filter(lead => lead.stage === 2) : [],  // Call Now (high priority)
    [recentLeads]
  )
  const waitingToCallLeads = useMemo(
    () => recentLeads ? recentLeads.filter(lead => lead.stage === 3) : [],  // Waiting to Call (normal priority)
    [recentLeads]
  )

  // Memoize allTablesEmpty check - only for Call Now and Waiting to Call
  const allTablesEmpty = useMemo(
    () => !isRecentLeadsLoadingCoordinated &&
      callNowLeads.length === 0 &&
      waitingToCallLeads.length === 0,
    [isRecentLeadsLoadingCoordinated, callNowLeads.length, waitingToCallLeads.length]
  )

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

        {/* Show "No Data" message only if ALL tables are empty */}
        {allTablesEmpty && !recentLeadsError && (
          <div className="flex items-center justify-center py-12">
            <pre className="text-gray-400 text-base font-mono select-none pointer-events-none leading-relaxed">
{`+------------------------------+
|                              |
|          NO DATA             |
|                              |
+------------------------------+`}
            </pre>
          </div>
        )}

        {/* Call now Table (Stage 1 AND call_now_status in [1,2]) */}
        {callNowLeads.length > 0 && (
          <div className="mb-8">
            <LeadsTable
              leads={callNowLeads}
              isLoading={isRecentLeadsLoadingCoordinated}
              error={recentLeadsError}
              title="Call now"
            />
          </div>
        )}

        {/* Waiting to call Table (Stage 1 AND call_now_status = 3) */}
        {waitingToCallLeads.length > 0 && (
          <LeadsTable
            leads={waitingToCallLeads}
            isLoading={isRecentLeadsLoadingCoordinated}
            error={recentLeadsError}
            title="Waiting to call"
          />
        )}
      </div>
    </div>
  )
}