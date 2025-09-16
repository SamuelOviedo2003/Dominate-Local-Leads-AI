'use client'

import { BookingsMetrics as BookingsMetricsType } from '@/types/leads'
import { Target, BarChart3, Award, DollarSign, TrendingUp } from 'lucide-react'

interface BookingsMetricsProps {
  metrics: BookingsMetricsType | null
  isLoading?: boolean
  error?: string | null
}

export function BookingsMetrics({ metrics, isLoading = false, error = null }: BookingsMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {[...Array(5)].map((_, i) => (
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {/* Shows */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center">
          <Target className="w-8 h-8 text-blue-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Shows</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold text-gray-900">{metrics.shows}</p>
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                {metrics.showsPercentage.toFixed(1)}% of booked
              </span>
            </div>
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
              {metrics.totalCalls.toLocaleString()}
            </p>
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
              <p className="text-2xl font-bold text-gray-900">{metrics.closes}</p>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                {metrics.closesPercentage.toFixed(1)}% of shows
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
              ${metrics.totalRevenue.toLocaleString()}
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
            <p className="text-2xl font-bold text-gray-900">{metrics.closeRate}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}