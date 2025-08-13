'use client'

import { LeadMetrics as LeadMetricsType } from '@/types/leads'

interface LeadMetricsProps {
  metrics: LeadMetricsType | null
  isLoading: boolean
  error: string | null
}

export function LeadMetrics({ metrics, isLoading, error }: LeadMetricsProps) {
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Metrics</h3>
        <div className="text-red-500 text-sm">Error loading metrics: {error}</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Metrics</h3>
      
      {isLoading ? (
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ) : metrics ? (
        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-600">Total Leads</div>
            <div className="text-2xl font-bold text-gray-900">{metrics.total}</div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Contacted</div>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.contacted}
              <span className="text-sm text-gray-500 ml-2">
                ({metrics.contactRate.toFixed(1)}%)
              </span>
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Booked</div>
            <div className="text-2xl font-bold text-green-600">
              {metrics.booked}
              <span className="text-sm text-gray-500 ml-2">
                ({metrics.bookingRate.toFixed(1)}%)
              </span>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Contact Rate</div>
                <div className="font-semibold">{metrics.contactRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-gray-600">Booking Rate</div>
                <div className="font-semibold">{metrics.bookingRate.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-gray-500 text-center py-8">No data available</div>
      )}
    </div>
  )
}