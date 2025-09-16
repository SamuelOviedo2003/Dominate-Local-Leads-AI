'use client'

import { LeadMetrics } from '@/types/leads'
import { Users, Phone, CheckCircle, TrendingUp } from 'lucide-react'

interface LeadsMetricsProps {
  metrics: LeadMetrics | null
  isLoading?: boolean
  error?: string | null
}

export function LeadsMetrics({ metrics, isLoading = false, error = null }: LeadsMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin-smooth" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-600 text-sm">
          Error loading metrics: {error}
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="text-gray-500 text-center">No metrics data available</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Leads */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center">
          <Users className="w-8 h-8 text-blue-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Leads</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.total}</p>
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
              <p className="text-2xl font-bold text-gray-900">{metrics.contacted}</p>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                {metrics.contactRate.toFixed(1)}% of leads
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
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                {metrics.bookingRate.toFixed(1)}% of contacts
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
                {metrics.total > 0 ? ((metrics.booked / metrics.total) * 100).toFixed(1) : '0.0'}%
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