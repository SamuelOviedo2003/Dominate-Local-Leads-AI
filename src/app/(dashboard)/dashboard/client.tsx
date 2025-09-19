'use client'

import { useState } from 'react'
import { TimePeriod } from '@/types/leads'
import { BusinessSwitcherData } from '@/types/auth'
import { useDashboardData } from '@/hooks/useDashboardData'
// TEMPORARILY DISABLED: Appointment setters functionality commented out due to missing time_speed column
// import { useAppointmentSetters } from '@/hooks/useAppointmentSetters'
import {
  // AppointmentSetters,
  TimePeriodFilter
} from '@/components/features/leads'
import { PlatformSpendCard } from '@/components/features/dashboard/PlatformSpendCard'
import { useBusinessContext } from '@/contexts/BusinessContext'

interface DashboardClientProps {
  userRole?: number
  accessibleBusinesses: BusinessSwitcherData[]
}

export function DashboardClient({ userRole, accessibleBusinesses }: DashboardClientProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30')

  // Get the effective business ID (user's own or selected company for superadmin)
  const { currentBusinessId, isLoading: businessContextLoading } = useBusinessContext()
  const effectiveBusinessId = currentBusinessId || ''

  // TEMPORARILY DISABLED: Appointment setters functionality commented out due to missing time_speed column
  /*
  const {
    appointmentSetters,
    isLoading: appointmentSettersLoading,
    error: appointmentSettersError,
    refetch: refetchAppointmentSetters
  } = useAppointmentSetters({
    timePeriod,
    businessId: effectiveBusinessId
  })
  */

  const {
    platformSpendMetrics,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useDashboardData({
    timePeriod,
    businessId: effectiveBusinessId
  })

  // Coordinated loading state that accounts for both business context and data loading
  const isLoading = businessContextLoading || dashboardLoading || !effectiveBusinessId
  const error = dashboardError
  const refetch = refetchDashboard

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
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

        {/* Platform Spend Card */}
        <div className="mb-8">
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin-smooth" />
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-600 text-sm">
                Error loading metrics: {error}
              </div>
            </div>
          ) : platformSpendMetrics ? (
            <PlatformSpendCard
              platformSpendMetrics={platformSpendMetrics}
              timePeriod={timePeriod}
            />
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="text-gray-500 text-center">No platform spend data available for the selected period</div>
            </div>
          )}
        </div>

        {/* Note: Individual metrics have been moved to their respective sections */}
        {/* New Leads metrics are now in the New Leads section */}
        {/* Bookings metrics are now in the Bookings section */}

        {/* TEMPORARILY DISABLED: Appointment Setters section commented out due to missing time_speed column */}
        {/*
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <AppointmentSetters 
              setters={appointmentSetters}
              isLoading={appointmentSettersLoading}
              error={appointmentSettersError}
            />
          </div>
        </div>
        */}
      </div>
    </div>
  )
}