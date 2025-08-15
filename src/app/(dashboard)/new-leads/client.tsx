'use client'

import { useState } from 'react'
import { TimePeriod } from '@/types/leads'
import { useLeadsData } from '@/hooks/useLeadsData'
import { LeadMetrics } from '@/components/features/leads/LeadMetrics'
import { AppointmentSetters } from '@/components/features/leads/AppointmentSetters'
import { LeadsTable } from '@/components/features/leads/LeadsTable'
import { TimePeriodFilter } from '@/components/features/leads/TimePeriodFilter'
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
            <h1 className="text-2xl font-bold text-gray-900">New Leads</h1>
            <p className="text-gray-600 mt-1">
              Track and manage your incoming leads and appointment setters performance
            </p>
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