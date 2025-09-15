'use client'

import { useState } from 'react'
import { TimePeriod } from '@/types/leads'
import { BusinessSwitcherData } from '@/types/auth'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useLeadsData } from '@/hooks/useLeadsData'
import { useBookingsData } from '@/hooks/useBookingsData'
// TEMPORARILY DISABLED: Appointment setters functionality commented out due to missing time_speed column
// import { useAppointmentSetters } from '@/hooks/useAppointmentSetters'
import {
  // AppointmentSetters,
  TimePeriodFilter
} from '@/components/features/leads'
import { PlatformSpendCard } from '@/components/features/dashboard/PlatformSpendCard'
import { useBusinessContext } from '@/contexts/BusinessContext'
import { Users, Phone, CheckCircle, TrendingUp, Target, Award, DollarSign, Calendar, BarChart3 } from 'lucide-react'

interface DashboardClientProps {
  userRole?: number
  accessibleBusinesses: BusinessSwitcherData[]
}

export function DashboardClient({ userRole, accessibleBusinesses }: DashboardClientProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30')
  
  // Get the effective business ID (user's own or selected company for superadmin)
  const { currentBusinessId } = useBusinessContext()
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

  const {
    metrics: leadsMetrics,
    isMetricsLoading: isLeadsMetricsLoading,
    metricsError: leadsMetricsError,
    refetch: refetchLeads
  } = useLeadsData({
    timePeriod,
    businessId: effectiveBusinessId
  })

  const {
    metrics: bookingsMetrics,
    isMetricsLoading: isBookingsMetricsLoading,
    metricsError: bookingsMetricsError,
    refetch: refetchBookings
  } = useBookingsData({
    timePeriod,
    businessId: effectiveBusinessId
  })

  // Updated loading and error handling with all metrics
  const isLoading = dashboardLoading || isLeadsMetricsLoading || isBookingsMetricsLoading
  const error = dashboardError || leadsMetricsError || bookingsMetricsError
  const refetch = () => {
    refetchDashboard()
    refetchLeads()
    refetchBookings()
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor your platform performance and lead metrics</p>
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
              <div className="text-gray-500 text-center">No platform spend data available</div>
            </div>
          )}
        </div>

        {/* Combined Metrics Section */}
        <div className="mb-8">
          {isLeadsMetricsLoading || isBookingsMetricsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-9 gap-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin-smooth" />
                  </div>
                </div>
              ))}
            </div>
          ) : (leadsMetricsError && bookingsMetricsError) ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-red-600 text-sm">
                  Error loading metrics: {leadsMetricsError || bookingsMetricsError}
                </div>
                <button
                  onClick={refetch}
                  className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (leadsMetrics || bookingsMetrics) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-9 gap-6">
              {/* New Leads Metrics */}
              {leadsMetrics && (
                <>
                  {/* Total Leads */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center">
                      <Users className="w-8 h-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Leads</p>
                        <p className="text-2xl font-bold text-gray-900">{leadsMetrics.total}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contacted */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center">
                      <Phone className="w-8 h-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Contacts</p>
                        <div className="flex items-baseline space-x-2">
                          <p className="text-2xl font-bold text-gray-900">{leadsMetrics.contacted}</p>
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            {leadsMetrics.contactRate.toFixed(1)}% of leads
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Booked */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center">
                      <CheckCircle className="w-8 h-8 text-purple-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Booked</p>
                        <div className="flex items-baseline space-x-2">
                          <p className="text-2xl font-bold text-gray-900">{leadsMetrics.booked}</p>
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            {leadsMetrics.bookingRate.toFixed(1)}% of contacts
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Overall Booking Rate */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center">
                      <TrendingUp className="w-8 h-8 text-yellow-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Booking Rate</p>
                        <div className="flex items-baseline space-x-2">
                          <p className="text-2xl font-bold text-gray-900">
                            {leadsMetrics.total > 0 ? ((leadsMetrics.booked / leadsMetrics.total) * 100).toFixed(1) : '0.0'}%
                          </p>
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            of leads
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Bookings Metrics */}
              {bookingsMetrics && (
                <>
                  {/* Shows */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center">
                      <Target className="w-8 h-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Shows</p>
                        <div className="flex items-baseline space-x-2">
                          <p className="text-2xl font-bold text-gray-900">{bookingsMetrics.shows}</p>
                          <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                            {bookingsMetrics.showsPercentage.toFixed(1)}% of booked
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Closes */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center">
                      <Award className="w-8 h-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Closes</p>
                        <div className="flex items-baseline space-x-2">
                          <p className="text-2xl font-bold text-gray-900">{bookingsMetrics.closes}</p>
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            {bookingsMetrics.closesPercentage.toFixed(1)}% of shows
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Revenue */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center">
                      <DollarSign className="w-8 h-8 text-yellow-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">
                          ${bookingsMetrics.totalRevenue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Close Rate */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center">
                      <TrendingUp className="w-8 h-8 text-orange-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Close Rate</p>
                        <p className="text-2xl font-bold text-gray-900">{bookingsMetrics.closeRate}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Total Calls */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center">
                      <BarChart3 className="w-8 h-8 text-indigo-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Calls</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {bookingsMetrics.totalCalls.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="text-gray-500 text-center">No metrics data available</div>
            </div>
          )}
        </div>

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