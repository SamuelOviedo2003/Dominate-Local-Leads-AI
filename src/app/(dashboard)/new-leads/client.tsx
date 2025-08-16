'use client'

import { useState } from 'react'
import { TimePeriod } from '@/types/leads'
import { useLeadsData } from '@/hooks'
import { 
  LeadMetrics, 
  AppointmentSetters, 
  LeadsTable, 
  TimePeriodFilter 
} from '@/components/features/leads'
import { useEffectiveBusinessId } from '@/contexts'

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
    appointmentSetters,
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

        {/* Lead Metrics and Appointment Setters */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Lead Metrics */}
          <LeadMetrics 
            metrics={metrics}
            isLoading={isLoading}
            error={error}
          />

          {/* Appointment Setters */}
          <AppointmentSetters 
            setters={appointmentSetters}
            isLoading={isLoading}
            error={error}
          />
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