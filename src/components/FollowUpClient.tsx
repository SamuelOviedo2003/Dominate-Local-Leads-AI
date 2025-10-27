'use client'

import { useMemo } from 'react'
import { useLeadsData } from '@/hooks/useLeadsData'
import { LeadsTable } from '@/components/features/leads'
import { LeadsMetrics } from '@/components/features/metrics'
import { useBusinessContext } from '@/contexts/BusinessContext'

export function FollowUpClient() {
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

  // Memoize filtered leads for Follow Up table (Stage 20)
  const followUpLeads = useMemo(
    () => recentLeads ? recentLeads.filter(lead => lead.stage === 20) : [],  // Follow Up
    [recentLeads]
  )

  // Memoize empty check
  const isEmpty = useMemo(
    () => !isRecentLeadsLoadingCoordinated && followUpLeads.length === 0,
    [isRecentLeadsLoadingCoordinated, followUpLeads.length]
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

        {/* Show "No Data" message if empty */}
        {isEmpty && !recentLeadsError && (
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

        {/* Follow Up Table (Stage 2) */}
        {followUpLeads.length > 0 && (
          <div className="mb-8">
            <LeadsTable
              leads={followUpLeads}
              isLoading={isRecentLeadsLoadingCoordinated}
              error={recentLeadsError}
              title="Follow Up"
              navigationTarget="actions"
            />
          </div>
        )}
      </div>
    </div>
  )
}
