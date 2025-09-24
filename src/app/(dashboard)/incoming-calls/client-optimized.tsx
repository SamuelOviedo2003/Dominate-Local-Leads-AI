'use client'

import { useState } from 'react'
import { useIncomingCallsDataOptimized } from '@/hooks/useIncomingCallsDataOptimized'
import { IncomingCallsTimePeriod, CallerTypeDistribution } from '@/types/leads'
import { Phone, Users, Calendar } from 'lucide-react'
import { ComponentLoading } from '@/components/LoadingSystem'
import { HoverCallerTypePopup } from '@/components/HoverCallerTypePopup'
import RecentCallsPopup from '@/components/RecentCallsPopup'
import { useBusinessContext } from '@/contexts/BusinessContext'

interface IncomingCallsClientProps {
  businessId?: string
  userRole?: number | null
}

// Unified loading component
function UnifiedLoadingState() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Incoming Calls Analytics</h1>
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
                  disabled
                  className="px-4 py-2 text-sm font-medium rounded-md bg-white text-indigo-600 shadow-sm opacity-50"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Unified Loading Display */}
        <div className="py-12">
          <ComponentLoading message="Loading incoming calls analytics..." />
        </div>
      </div>
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

// Simple bar chart component with hover support
interface SimpleBarChartProps {
  data: Array<{name: string, value: number}>
  title: string
  onItemHover?: (item: {name: string, value: number}, event: React.MouseEvent) => void
  onItemLeave?: () => void
}

function SimpleBarChart({ data, title, onItemHover, onItemLeave }: SimpleBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No {title.toLowerCase()} data available for the selected period
      </div>
    )
  }

  const maxValue = Math.max(...data.map(item => item.value))
  const colors = ['bg-indigo-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500']
  const hoverColors = ['hover:bg-indigo-600', 'hover:bg-cyan-600', 'hover:bg-emerald-600', 'hover:bg-amber-600', 'hover:bg-red-600', 'hover:bg-purple-600', 'hover:bg-pink-600']

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
            <div className="w-full bg-gray-200 rounded-full h-2 relative">
              <div
                className={`h-2 rounded-full transition-colors duration-200 cursor-pointer ${colors[index % colors.length]} ${hoverColors[index % hoverColors.length]}`}
                style={{ width: `${Math.max(percentage, 5)}%` }}
                onMouseEnter={(e) => onItemHover?.(item, e)}
                onMouseLeave={onItemLeave}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Recent calls table component
function RecentCallsTable({ calls, onCallClick }: { calls: any[], onCallClick: (callId: string) => void }) {
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
              Assigned
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {calls.map((call, index) => (
            <tr
              key={call.incoming_call_id || index}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onCallClick(call.incoming_call_id)}
            >
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
                  call.assigned_name ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {call.assigned_name || 'Unassigned'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function IncomingCallsClientOptimized({ businessId, userRole }: IncomingCallsClientProps) {
  // Get the effective business ID from BusinessContext (like NewLeadsClient)
  const { currentBusinessId, isLoading: businessContextLoading } = useBusinessContext()
  const effectiveBusinessId = currentBusinessId || ''

  const [timePeriod, setTimePeriod] = useState<IncomingCallsTimePeriod>('30')
  const [popupState, setPopupState] = useState<{
    show: boolean
    source: string
    data: CallerTypeDistribution[] | null
    isLoading: boolean
    position: { x: number; y: number }
  }>({
    show: false,
    source: '',
    data: null,
    isLoading: false,
    position: { x: 0, y: 0 }
  })

  // Recent Calls Popup State
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)

  const {
    sourceDistribution,
    callerTypeDistribution,
    recentCalls,
    isLoading,
    error,
    refetch,
    fetchSourceCallerTypes
  } = useIncomingCallsDataOptimized({ timePeriod, businessId: effectiveBusinessId })

  // Coordinated loading states to prevent flash of empty content (like NewLeadsClient)
  const isDataLoadingCoordinated = businessContextLoading || isLoading || !effectiveBusinessId

  const handleTimePeriodChange = (newPeriod: string) => {
    const mappedPeriod = timePeriodMapping[newPeriod]
    if (mappedPeriod) {
      setTimePeriod(mappedPeriod)
    }
  }

  const handleSourceHover = async (item: {name: string, value: number}, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const position = {
      x: rect.right + 10, // Position to the right of the bar
      y: rect.top + rect.height / 2 // Center vertically
    }

    setPopupState({
      show: true,
      source: item.name,
      data: null,
      isLoading: true,
      position
    })

    // Fetch source-specific caller type data
    const data = await fetchSourceCallerTypes(item.name)

    setPopupState(prev => ({
      ...prev,
      data,
      isLoading: false
    }))
  }

  const handleSourceLeave = () => {
    setPopupState({
      show: false,
      source: '',
      data: null,
      isLoading: false,
      position: { x: 0, y: 0 }
    })
  }

  // Recent Calls Popup Handlers
  const handleCallClick = (callId: string) => {
    setSelectedCallId(callId)
  }

  const handleCloseCallPopup = () => {
    setSelectedCallId(null)
  }

  // Show unified loading state while data is loading (coordinated like NewLeadsClient)
  if (isDataLoadingCoordinated) {
    return <UnifiedLoadingState />
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

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Source Distribution Chart with Hover Popup */}
          <div className="bg-white rounded-lg shadow-sm border p-6 relative">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Phone className="w-5 h-5 mr-2 text-indigo-600" />
              Source Distribution
            </h3>
            <SimpleBarChart
              data={sourceDistribution ? sourceDistribution.map(item => ({ name: item.source, value: item.count })) : []}
              title="Source Distribution"
              onItemHover={handleSourceHover}
              onItemLeave={handleSourceLeave}
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
          <RecentCallsTable calls={recentCalls || []} onCallClick={handleCallClick} />
        </div>

        {/* Hover Popup */}
        {popupState.show && (
          <HoverCallerTypePopup
            source={popupState.source}
            data={popupState.data}
            isLoading={popupState.isLoading}
            position={popupState.position}
            onClose={handleSourceLeave}
          />
        )}

        {/* Recent Calls Popup */}
        {selectedCallId && (
          <RecentCallsPopup
            callId={selectedCallId}
            isOpen={!!selectedCallId}
            onClose={handleCloseCallPopup}
          />
        )}
      </div>
    </div>
  )
}