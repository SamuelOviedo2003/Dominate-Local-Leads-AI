'use client'

import { memo } from 'react'
import { Users, CheckCircle, TrendingUp } from 'lucide-react'
import { LeadMetrics as LeadMetricsType } from '@/types/leads'
import { CardSkeleton } from '@/components/LoadingSystem'

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
    return <CardSkeleton count={4} />
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* Booked */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center">
          <CheckCircle className="w-8 h-8 text-purple-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Booked</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.booked}</p>
          </div>
        </div>
      </div>

      {/* Booking Rate */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center">
          <TrendingUp className="w-8 h-8 text-green-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Booking Rate</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold text-gray-900">
                {metrics.bookingRate.toFixed(1)}%
              </p>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                of leads
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const LeadMetrics = memo(LeadMetricsComponent)