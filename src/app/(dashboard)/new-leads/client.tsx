'use client'

import { useState } from 'react'
import { TimePeriod } from '@/types/leads'
import { useLeadsData } from '@/hooks/useLeadsData'
import { 
  LeadMetrics, 
  LeadsTable, 
  TimePeriodFilter 
} from '@/components/features/leads'
import { useEffectiveBusinessId } from '@/contexts/CompanyContext'

interface NewLeadsClientProps {
  businessId: string
  userRole?: number
}

export function NewLeadsClient({ businessId, userRole }: NewLeadsClientProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30')
  
  // Get the effective business ID (user's own or selected company for superadmin)
  const effectiveBusinessId = useEffectiveBusinessId()
  
  const {
    metrics,
    recentLeads,
    isLoading,
    error,
    refetch
  } = useLeadsData({
    timePeriod,
    businessId: effectiveBusinessId
  })

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            {/* Empty header content as requested */}
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

        {/* Lead Metrics */}
        <div className="mb-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin-smooth" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-600 text-sm">
                Error loading metrics: {error}
              </div>
            </div>
          ) : metrics ? (
            <LeadMetrics 
              metrics={metrics}
              isLoading={false}
              error={null}
            />
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="text-gray-500 text-center">No metrics data available</div>
            </div>
          )}
        </div>

        {/* Recent Leads Table - Full Width */}
        <LeadsTable 
          leads={recentLeads}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  )
}