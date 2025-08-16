'use client'

import { useState } from 'react'
import { useIncomingCallsData } from '@/hooks'
import { IncomingCallsTimePeriod } from '@/types/leads'
// Remove this import for now - will use inline component
import { Phone, TrendingUp, Users, Calendar } from 'lucide-react'
// Using simple custom charts without external dependencies

interface IncomingCallsClientProps {
  businessId: string
  userRole: number
}

// Loading component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  )
}

// Error component
function ErrorDisplay({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="text-red-600 mb-4">{message}</div>
      <button
        onClick={onRetry}
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
      >
        Try Again
      </button>
    </div>
  )
}

// Time period filter mapping
const timePeriodMapping: Record<string, IncomingCallsTimePeriod> = {
  '7': '7',
  '15': '15',
  '30': '30',
  '60': '60',
  '90': '90'
}

// Pie chart colors
const COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

// Simple bar chart component
function SimpleBarChart({ data, title }: { data: Array<{name: string, value: number}>, title: string }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No {title.toLowerCase()} data available for the selected period
      </div>
    )
  }

  const maxValue = Math.max(...data.map(item => item.value))
  const colors = ['bg-indigo-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500']

  return (
    <div className="space-y-4">
      {data.slice(0, 7).map((item, index) => {
        const percentage = (item.value / maxValue) * 100
        return (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">{item.name}</span>
              <span className="text-sm text-gray-600">{item.value}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${colors[index % colors.length]}`}
                style={{ width: `${Math.max(percentage, 5)}%` }}
              ></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Sankey diagram component (simplified for now - would use D3 in production)
function SankeyDiagram({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No Sankey data available for the selected period
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Source to Caller Type Flow</h3>
      <div className="space-y-2">
        {data.slice(0, 10).map((item, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <span className="text-sm font-medium">{item.source}</span>
              <span className="text-gray-400">→</span>
              <span className="text-sm">{item.caller_type}</span>
            </div>
            <span className="text-sm font-medium text-indigo-600">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Recent calls table component
function RecentCallsTable({ calls }: { calls: any[] }) {
  if (!calls || calls.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No recent calls available for the selected period
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date & Time
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Source
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Caller Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Duration
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {calls.map((call, index) => (
            <tr key={call.incoming_call_id || index} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatDate(call.created_at)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {call.source || 'Unknown'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {call.caller_type || 'Unknown'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatDuration(call.duration)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  call.status === 'completed' ? 'bg-green-100 text-green-800' :
                  call.status === 'missed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {call.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function IncomingCallsClient({ businessId, userRole }: IncomingCallsClientProps) {
  const [timePeriod, setTimePeriod] = useState<IncomingCallsTimePeriod>('30')
  
  const {
    sourceDistribution,
    callerTypeDistribution,
    sankeyData,
    recentCalls,
    isLoading,
    error,
    refetch
  } = useIncomingCallsData({ timePeriod, businessId })

  const handleTimePeriodChange = (newPeriod: string) => {
    const mappedPeriod = timePeriodMapping[newPeriod]
    if (mappedPeriod) {
      setTimePeriod(mappedPeriod)
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <ErrorDisplay message={error} onRetry={refetch} />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Incoming Calls Analytics</h1>
            <p className="mt-2 text-gray-600">
              Analyze call sources, caller types, and call flow patterns
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { value: '7', label: '7 days' },
                { value: '15', label: '15 days' },
                { value: '30', label: '30 days' },
                { value: '60', label: '60 days' },
                { value: '90', label: '90 days' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTimePeriodChange(option.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    timePeriod === option.value
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Source Distribution Chart */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Phone className="w-5 h-5 mr-2 text-indigo-600" />
                  Source Distribution
                </h3>
                <SimpleBarChart 
                  data={sourceDistribution ? sourceDistribution.map(item => ({ name: item.source, value: item.count })) : []}
                  title="Source Distribution"
                />
              </div>

              {/* Caller Type Distribution Chart */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-indigo-600" />
                  Caller Type Distribution
                </h3>
                <SimpleBarChart 
                  data={callerTypeDistribution ? callerTypeDistribution.map(item => ({ name: item.caller_type, value: item.count })) : []}
                  title="Caller Type Distribution"
                />
              </div>
            </div>

            {/* Sankey Diagram */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Call Flow Analysis</h3>
              </div>
              <SankeyDiagram data={sankeyData || []} />
            </div>

            {/* Recent Calls Table */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Recent Calls</h3>
                </div>
                <span className="text-sm text-gray-500">
                  Last {recentCalls?.length || 0} calls
                </span>
              </div>
              <RecentCallsTable calls={recentCalls || []} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}