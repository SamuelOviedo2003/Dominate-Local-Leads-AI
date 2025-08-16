'use client'

import { memo } from 'react'
import { LeadMetrics as LeadMetricsType } from '@/types/leads'

interface LeadMetricsProps {
  metrics: LeadMetricsType | null
  isLoading: boolean
  error: string | null
}

function LeadMetricsComponent({ metrics, isLoading, error }: LeadMetricsProps) {
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Lead Metrics
        </h3>
        <div className="text-red-500 text-sm py-8 flex items-center justify-center">
          Error loading metrics: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
        Lead Metrics
      </h3>
      
      {isLoading ? (
        <div className="space-y-2">
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
        <div className="space-y-2">
          {/* Total Leads */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 transition-all duration-300 hover:shadow-md">
            <div className="text-sm font-medium text-gray-600 mb-1">Total Leads</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{metrics.total}</div>
          </div>
          
          {/* Contacted */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 transition-all duration-300 hover:shadow-md">
            <div className="text-sm font-medium text-gray-600 mb-1">Contacted</div>
            <div className="flex flex-col sm:flex-row sm:items-baseline space-y-1 sm:space-y-0 sm:space-x-2">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{metrics.contacted}</div>
              <div className="text-xs sm:text-sm font-medium text-blue-500 bg-blue-100 px-2 py-1 rounded-full w-fit">
                {metrics.contactRate.toFixed(1)}% of total
              </div>
            </div>
          </div>
          
          {/* Booked */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3 transition-all duration-300 hover:shadow-md">
            <div className="text-sm font-medium text-gray-600 mb-1">Booked</div>
            <div className="flex flex-col sm:flex-row sm:items-baseline space-y-1 sm:space-y-0 sm:space-x-2">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{metrics.booked}</div>
              <div className="text-xs sm:text-sm font-medium text-green-500 bg-green-100 px-2 py-1 rounded-full w-fit">
                {metrics.bookingRate.toFixed(1)}% of contacted
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-gray-500 text-center bg-gray-50 rounded-lg py-8 flex flex-col justify-center">
          <div className="text-4xl mb-2">📊</div>
          <div>No data available</div>
        </div>
      )}
    </div>
  )
}

export const LeadMetrics = memo(LeadMetricsComponent)