'use client'

import { useState } from 'react'
import { TimePeriod } from '@/types/leads'
import { useSalesmanData } from '@/hooks/useSalesmanData'
import { TimePeriodFilter } from '@/components/features/leads/TimePeriodFilter'
import { LeadsTable } from '@/components/features/leads/LeadsTable'
import { TrendingUp, DollarSign, Target, Award, BarChart3, Calendar } from 'lucide-react'
import { useEffectiveBusinessId } from '@/contexts/CompanyContext'

interface SalesmanClientProps {
  businessId: string
  userRole?: number
}

export function SalesmanClient({ businessId, userRole }: SalesmanClientProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30')
  
  // Get the effective business ID (user's own or selected company for superadmin)
  const effectiveBusinessId = useEffectiveBusinessId()
  
  const {
    metrics,
    salesmanLeads,
    isLoading,
    isMetricsLoading,
    isSalesmanLeadsLoading,
    error,
    metricsError,
    salesmanLeadsError,
    refetch
  } = useSalesmanData({
    timePeriod,
    businessId: effectiveBusinessId
  })

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Salesman Dashboard</h1>
            <p className="text-gray-600 mt-2">Track sales performance and revenue metrics</p>
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

        {/* Salesman Metrics */}
        <div className="mb-8">
          {isMetricsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin-smooth" />
                  </div>
                </div>
              ))}
            </div>
          ) : metricsError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-red-600 text-sm">
                  Error loading metrics: {metricsError}
                </div>
                <button
                  onClick={refetch}
                  className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : metrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <Calendar className="w-8 h-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Booked</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.booked}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <Target className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Shows</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.shows}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <Award className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Closes</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.closes}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <DollarSign className="w-8 h-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${metrics.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Close Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.closeRate}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <BarChart3 className="w-8 h-8 text-indigo-600" />
                  <div className="ml-4">
                    <p className="text-xs font-medium text-gray-600">Avg Order Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${metrics.averageOrderValue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="text-gray-500 text-center">No metrics data available</div>
            </div>
          )}
        </div>

        {/* Salesman Leads Table */}
        <LeadsTable 
          leads={salesmanLeads}
          isLoading={isSalesmanLeadsLoading}
          error={salesmanLeadsError}
          navigationTarget="property-details"
        />
      </div>
    </div>
  )
}