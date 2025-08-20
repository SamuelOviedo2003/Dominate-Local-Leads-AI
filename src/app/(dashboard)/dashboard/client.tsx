'use client'

import { useState } from 'react'
import { TimePeriod } from '@/types/leads'
import { useLeadsData } from '@/hooks/useLeadsData'
import { 
  AppointmentSetters, 
  TimePeriodFilter 
} from '@/components/features/leads'
import { useEffectiveBusinessId } from '@/contexts/CompanyContext'

interface DashboardClientProps {
  businessId: string
  userRole?: number
}

export function DashboardClient({ businessId, userRole }: DashboardClientProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30')
  
  // Get the effective business ID (user's own or selected company for superadmin)
  const effectiveBusinessId = useEffectiveBusinessId()
  
  const {
    appointmentSetters,
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
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor your appointment setters performance</p>
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

        {/* Appointment Setters - Centered */}
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <AppointmentSetters 
              setters={appointmentSetters}
              isLoading={isLoading}
              error={error}
            />
          </div>
        </div>
      </div>
    </div>
  )
}