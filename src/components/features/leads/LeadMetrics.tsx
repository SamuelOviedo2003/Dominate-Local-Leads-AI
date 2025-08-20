'use client'

import { memo } from 'react'
import { Users, Phone, CheckCircle, TrendingUp } from 'lucide-react'
import { LeadMetrics as LeadMetricsType } from '@/types/leads'

interface LeadMetricsProps {
  metrics: LeadMetricsType | null
  isLoading: boolean
  error: string | null
}

function LeadMetricsComponent({ metrics, isLoading, error }: LeadMetricsProps) {
  if (error) {
    return (
      <div className="col-span-full">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-red-500 text-center">
            Error loading metrics: {error}
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-200 rounded" />
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="col-span-full">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-gray-500 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <div>No metrics data available</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Leads */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center">
          <Users className="w-8 h-8 text-blue-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Leads</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.total}</p>
          </div>
        </div>
      </div>

      {/* Contacted */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center">
          <Phone className="w-8 h-8 text-green-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Contacted</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold text-gray-900">{metrics.contacted}</p>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                {metrics.contactRate.toFixed(1)}%
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
              <p className="text-2xl font-bold text-gray-900">{metrics.booked}</p>
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                {metrics.bookingRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Rate */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center">
          <TrendingUp className="w-8 h-8 text-yellow-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Booking Rate</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold text-gray-900">
                {metrics.total > 0 ? ((metrics.booked / metrics.total) * 100).toFixed(1) : '0.0'}%
              </p>
              <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                of total
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const LeadMetrics = memo(LeadMetricsComponent)