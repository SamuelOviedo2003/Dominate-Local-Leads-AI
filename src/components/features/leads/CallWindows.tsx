'use client'

import { CallWindow } from '@/types/leads'
import { useMemo, useCallback, memo } from 'react'
import { Clock, Phone, Headphones, PhoneCall } from 'lucide-react'
import { LoadingSystem } from '@/components/LoadingSystem'
import { formatTimeOnly } from '@/lib/utils/dateFormat'
import { logger } from '@/lib/logging'

interface CallWindowsProps {
  callWindows?: CallWindow[] | null
  isLoading?: boolean
  error?: string | null
  businessTimezone?: string // IANA timezone identifier
  workingHours?: boolean // Working hours indicator from lead data
}

const CallWindowsComponent = ({ callWindows, isLoading = false, error = null, businessTimezone = 'UTC', workingHours }: CallWindowsProps) => {
  // ALL HOOKS MUST BE DECLARED FIRST - React Rules of Hooks requirement

  // Determine working hours status display
  const getWorkingHoursStatus = useCallback(() => {
    // According to requirements: true if working_hours is true or null, false otherwise
    if (workingHours === true || workingHours === null || workingHours === undefined) {
      return { isWorkingHours: true, label: 'Working Hours', color: 'text-green-600 bg-green-50' }
    } else {
      return { isWorkingHours: false, label: 'After Hours', color: 'text-orange-600 bg-orange-50' }
    }
  }, [workingHours])

  const workingHoursStatus = getWorkingHoursStatus()

  // Format time range for display (time only, no date)
  const formatTimeRange = useCallback((startTime: string | null, endTime: string | null) => {
    if (!startTime || !endTime) return 'Time TBD'

    const start = formatTimeOnly(startTime, businessTimezone)
    const end = formatTimeOnly(endTime, businessTimezone)
    return `${start} - ${end}`
  }, [businessTimezone])

  // Get status tag configuration - simplified without medal system
  const getStatusConfig = useCallback((statusName: string) => {
    const status = statusName.toLowerCase().trim()

    switch (status) {
      case 'done on time':
        return { text: 'DONE ON TIME', bgColor: 'bg-green-500', textColor: 'text-white' }
      case 'done late':
        return { text: 'DONE LATE', bgColor: 'bg-orange-500', textColor: 'text-white' }
      case 'due':
        return { text: 'DUE', bgColor: 'bg-yellow-500', textColor: 'text-white' }
      case 'missed':
        return { text: 'MISSED', bgColor: 'bg-red-500', textColor: 'text-white' }
      default:
        return { text: statusName.toUpperCase(), bgColor: 'bg-gray-500', textColor: 'text-white' }
    }
  }, [])


  // Filter and sort active call windows
  const activeCallWindows = useMemo(() => {
    if (!callWindows) return []

    return callWindows
      .filter(window => window.active === true)
      .sort((a, b) => a.callNumber - b.callNumber)
  }, [callWindows])

  // Debug logging
  logger.debug('CallWindows component received props', {
    businessTimezone,
    callWindowsCount: callWindows?.length || 0,
    activeCallWindowsCount: activeCallWindows.length,
    workingHours,
    workingHoursStatus,
    callWindowsData: activeCallWindows.map(cw => ({
      callNumber: cw.callNumber,
      active: cw.active,
      status_name: cw.status_name
    }))
  })

  // Handle loading state
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#1C2833] rounded-lg shadow-sm p-4 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <PhoneCall className="w-6 h-6 text-blue-600" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          </div>
          <div className="flex-1 flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Call Windows</h3>
            <div className={`px-2 py-1 rounded-full text-xs font-medium border ${workingHoursStatus.color} border-current`}>
              {workingHoursStatus.label}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center flex-1">
          <LoadingSystem size="md" message="Loading call windows..." />
        </div>
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div className="bg-white dark:bg-[#1C2833] rounded-lg shadow-sm p-4 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <PhoneCall className="w-6 h-6 text-blue-600" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
          </div>
          <div className="flex-1 flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Call Windows</h3>
            <div className={`px-2 py-1 rounded-full text-xs font-medium border ${workingHoursStatus.color} border-current`}>
              {workingHoursStatus.label}
            </div>
          </div>
        </div>
        <div className="text-center flex-1 flex items-center justify-center">
          <div>
            <div className="text-red-500 text-lg font-medium mb-2 flex items-center gap-2 justify-center">
              <Phone className="w-5 h-5" />
              Error Loading Call Data
            </div>
            <p className="text-gray-600 dark:text-gray-300">{error}</p>
          </div>
        </div>
      </div>
    )
  }


  return (
    <div className="bg-white dark:bg-[#1C2833] rounded-lg shadow-sm p-4 h-full flex flex-col w-full">
      {/* Header with Phone Icon and Working Hours Indicator */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <PhoneCall className="w-6 h-6 text-blue-600" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        </div>
        <div className="flex-1 flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Call Windows</h3>
          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${workingHoursStatus.color} border-current`}>
            {workingHoursStatus.label}
          </div>
        </div>
      </div>

      {/* Active Call Windows - New Simplified Design */}
      <div className="flex-1 space-y-3">
        {activeCallWindows.map((window) => {
          const timeRange = formatTimeRange(window.window_start_at, window.window_end_at)
          const hasStatus = window.status_name && window.status_name.trim() !== ''
          const statusConfig = hasStatus ? getStatusConfig(window.status_name) : null

          // Check conditions for showing called_at time
          const shouldShowCalledAt =
            window.active === true &&
            window.callNumber === 1 &&
            workingHours === true &&
            window.calledAt

          const calledAtTime = shouldShowCalledAt ? formatTimeOnly(window.calledAt!, businessTimezone) : null

          // Debug logging for called_at feature
          if (window.callNumber === 1) {
            logger.debug('Call Window 1 called_at logic', {
              active: window.active,
              callNumber: window.callNumber,
              workingHours,
              hasCalledAt: !!window.calledAt,
              shouldShow: shouldShowCalledAt,
              calledAtTime
            })
          }

          return (
            <div
              key={window.callNumber}
              className="bg-white dark:bg-[#1C2833] p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow duration-200"
            >
              {/* Left Side - Call Info */}
              <div className="flex flex-col">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Call {window.callNumber}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {timeRange}
                </p>
              </div>

              {/* Right Side - Status Tag and called_at time (always on right) */}
              <div className="flex flex-col items-end gap-1">
                {hasStatus && statusConfig && (
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.textColor}`}
                  >
                    {statusConfig.text}
                  </span>
                )}
                {/* Show called_at time on right side - below status tag if it exists, or just on right if no status */}
                {calledAtTime && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Called at {calledAtTime}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State for No Active Call Windows */}
      {activeCallWindows.length === 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 text-center flex-1 flex flex-col items-center justify-center border border-blue-100 dark:border-gray-700">
          <div className="relative mb-4">
            {/* Phone Icon with Animation */}
            <div className="relative">
              <Headphones className="w-12 h-12 text-blue-400 mx-auto" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full" />
            </div>
            {/* Sound Waves */}
            <div className="absolute -left-8 top-1/2 transform -translate-y-1/2">
              <div className="flex items-center gap-1">
                <div className="w-1 h-2 bg-blue-300 rounded animate-pulse" style={{animationDelay: '0ms'}} />
                <div className="w-1 h-4 bg-blue-400 rounded animate-pulse" style={{animationDelay: '150ms'}} />
                <div className="w-1 h-3 bg-blue-300 rounded animate-pulse" style={{animationDelay: '300ms'}} />
              </div>
            </div>
            <div className="absolute -right-8 top-1/2 transform -translate-y-1/2">
              <div className="flex items-center gap-1">
                <div className="w-1 h-3 bg-blue-300 rounded animate-pulse" style={{animationDelay: '100ms'}} />
                <div className="w-1 h-4 bg-blue-400 rounded animate-pulse" style={{animationDelay: '250ms'}} />
                <div className="w-1 h-2 bg-blue-300 rounded animate-pulse" style={{animationDelay: '400ms'}} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-gray-600 dark:text-gray-300 font-medium flex items-center gap-2 justify-center">
              <Phone className="w-4 h-4" />
              No Active Call Windows
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Scheduled call windows will appear here when they become active</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const CallWindows = memo(CallWindowsComponent)