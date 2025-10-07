'use client'

import { useState } from 'react'
import { useIncomingCallsDataOptimized } from '@/hooks/useIncomingCallsDataOptimized'
import { IncomingCallsTimePeriod, CallerTypeDistribution } from '@/types/leads'
import { Phone, Users, Calendar } from 'lucide-react'
import { HoverCallerTypePopup } from '@/components/HoverCallerTypePopup'
import RecentCallsPopup from '@/components/RecentCallsPopup'
import { useBusinessContext } from '@/contexts/BusinessContext'
import { EmptyTableState } from '@/components/ui/EmptyTableState'

interface IncomingCallsClientProps {
  businessId?: string
  userRole?: number | null
}

// Component loading spinner (consistent with other pages)
function ComponentLoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin-smooth" />
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

// Move helper functions outside component to prevent recreation on every render
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Simple bar chart component with hover support
interface SimpleBarChartProps {
  data: Array<{name: string, value: number}>
  title: string
  onItemHover?: (item: {name: string, value: number}, event: React.MouseEvent) => void
  onItemLeave?: () => void
  isLoading?: boolean
}

function SimpleBarChart({ data, title, onItemHover, onItemLeave, isLoading = false }: SimpleBarChartProps) {
  if (isLoading) {
    return <ComponentLoadingSpinner />
  }

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
function RecentCallsTable({ calls, onCallClick, isLoading = false }: { calls: any[], onCallClick: (callId: string) => void, isLoading?: boolean }) {
  if (isLoading) {
    return <ComponentLoadingSpinner />
  }

  if (!calls || calls.length === 0) {
    return <EmptyTableState tableName="Recent Calls" />
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
  // Get the effective business ID from BusinessContext
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

  // Individual loading states for component-level loading
  const isChartsLoading = businessContextLoading || isLoading || !effectiveBusinessId
  const isTableLoading = businessContextLoading || isLoading || !effectiveBusinessId

  const handleTimePeriodChange = (newPeriod: string) => {
    const mappedPeriod = timePeriodMapping[newPeriod]
    if (mappedPeriod) {
      setTimePeriod(mappedPeriod)
    }
  }

  const handleSourceHover = async (item: {name: string, value: number}, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const position = {
      x: rect.right + 10,
      y: rect.top + rect.height / 2
    }

    setPopupState({
      show: true,
      source: item.name,
      data: null,
      isLoading: true,
      position
    })

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

  const handleCallClick = (callId: string) => {
    setSelectedCallId(callId)
  }

  const handleCloseCallPopup = () => {
    setSelectedCallId(null)
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
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
                  disabled={isLoading}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    timePeriod === option.value
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <ErrorDisplay message={error} onRetry={refetch} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              isLoading={isChartsLoading}
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-600" />
              Caller Type Distribution
            </h3>
            <SimpleBarChart
              data={callerTypeDistribution ? callerTypeDistribution.map(item => ({ name: item.caller_type, value: item.count })) : []}
              title="Caller Type Distribution"
              isLoading={isChartsLoading}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">Recent Calls</h3>
            </div>
            {!isTableLoading && (
              <span className="text-sm text-gray-500">
                Last {recentCalls?.length || 0} calls
              </span>
            )}
          </div>
          <RecentCallsTable
            calls={recentCalls || []}
            onCallClick={handleCallClick}
            isLoading={isTableLoading}
          />
        </div>

        {popupState.show && (
          <HoverCallerTypePopup
            source={popupState.source}
            data={popupState.data}
            isLoading={popupState.isLoading}
            position={popupState.position}
            onClose={handleSourceLeave}
          />
        )}

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
