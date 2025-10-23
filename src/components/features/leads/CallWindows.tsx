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
  // Based on working_hours from leads table (single source of truth)
  const getWorkingHoursStatus = useCallback(() => {
    // Only show working hours status if we have at least one call window
    const hasCallWindows = callWindows && callWindows.length > 0

    if (!hasCallWindows) {
      return null // No call windows, don't show any tag
    }

    // If working_hours = TRUE -> "Working Hours"
    if (workingHours === true) {
      return { isWorkingHours: true, label: 'Working Hours', color: 'text-green-600 bg-green-50' }
    }

    // If working_hours = FALSE OR working_hours IS NULL -> "After Hours"
    if (workingHours === false || workingHours === null || workingHours === undefined) {
      return { isWorkingHours: false, label: 'After Hours', color: 'text-orange-600 bg-orange-50' }
    }

    return null
  }, [callWindows, workingHours])

  const workingHoursStatus = getWorkingHoursStatus()

  // Format time range for display (time only, no date)
  const formatTimeRange = useCallback((startTime: string | null, endTime: string | null) => {
    if (!startTime || !endTime) return 'Time TBD'

    const start = formatTimeOnly(startTime, businessTimezone)
    const end = formatTimeOnly(endTime, businessTimezone)
    return `${start} - ${end}`
  }, [businessTimezone])

  // Get status tag configuration using numeric status - optimized for database consistency
  const getStatusConfig = useCallback((status: number | null) => {
    if (!status) return null

    switch (status) {
      case 1: // Green
        return { text: 'DONE ON TIME', bgColor: 'bg-green-500', textColor: 'text-white' }
      case 2: // Orange
        return { text: 'DONE LATE', bgColor: 'bg-orange-500', textColor: 'text-white' }
      case 3: // Yellow
        return { text: 'DUE', bgColor: 'bg-yellow-500', textColor: 'text-white' }
      case 4: // Red
        return { text: 'MISSED', bgColor: 'bg-red-500', textColor: 'text-white' }
      case 10: // Diamond
        return { text: 'DIAMOND', bgColor: 'bg-gradient-to-br from-blue-100 to-indigo-200', textColor: 'text-blue-900' }
      case 11: // Gold
        return { text: 'GOLD', bgColor: 'bg-gradient-to-br from-yellow-400 to-yellow-600', textColor: 'text-white' }
      case 12: // Silver
        return { text: 'SILVER', bgColor: 'bg-gradient-to-br from-gray-400 to-gray-600', textColor: 'text-white' }
      case 13: // Bronze (Copper tone)
        return { text: 'BRONZE', bgColor: 'bg-gradient-to-br from-orange-600 to-red-800', textColor: 'text-white' }
      default:
        return { text: `STATUS ${status}`, bgColor: 'bg-gray-500', textColor: 'text-white' }
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
      status: cw.status
    }))
  })

  // Handle loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <PhoneCall className="w-6 h-6 text-blue-600" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          </div>
          <div className="flex-1 flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Call Windows</h3>
            {workingHoursStatus && (
              <div className={`px-2 py-1 rounded-full text-xs font-medium border ${workingHoursStatus.color} border-current`}>
                {workingHoursStatus.label}
              </div>
            )}
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
      <div className="bg-white rounded-lg shadow-sm p-4 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <PhoneCall className="w-6 h-6 text-blue-600" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
          </div>
          <div className="flex-1 flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Call Windows</h3>
            {workingHoursStatus && (
              <div className={`px-2 py-1 rounded-full text-xs font-medium border ${workingHoursStatus.color} border-current`}>
                {workingHoursStatus.label}
              </div>
            )}
          </div>
        </div>
        <div className="text-center flex-1 flex items-center justify-center">
          <div>
            <div className="text-red-500 text-lg font-medium mb-2 flex items-center gap-2 justify-center">
              <Phone className="w-5 h-5" />
              Error Loading Call Data
            </div>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }


  return (
    <div className="bg-white rounded-lg shadow-sm p-4 h-full flex flex-col w-full">
      {/* Header with Phone Icon and Working Hours Indicator */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <PhoneCall className="w-6 h-6 text-blue-600" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        </div>
        <div className="flex-1 flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Call Windows</h3>
          {workingHoursStatus && (
            <div className={`px-2 py-1 rounded-full text-xs font-medium border ${workingHoursStatus.color} border-current`}>
              {workingHoursStatus.label}
            </div>
          )}
        </div>
      </div>

      {/* Active Call Windows - New Simplified Design */}
      <div className="flex-1 flex flex-col">
        {activeCallWindows.length > 0 && (
          <div className="space-y-3">
            {activeCallWindows.map((window) => {
          const timeRange = formatTimeRange(window.window_start_at, window.window_end_at)
          const hasStatus = window.status !== null && window.status !== undefined
          const statusConfig = hasStatus ? getStatusConfig(window.status) : null

          // Check conditions for showing called_at time (applies to all calls)
          // Show called_at if: active=true AND calledAt exists
          // Working hours condition has been removed - display call time regardless of working hours
          const shouldShowCalledAt =
            window.active === true &&
            window.calledAt

          const calledAtTime = shouldShowCalledAt ? formatTimeOnly(window.calledAt!, businessTimezone) : null

          // Debug logging for called_at feature
          logger.debug('Call Window called_at logic', {
            active: window.active,
            callNumber: window.callNumber,
            hasCalledAt: !!window.calledAt,
            shouldShow: shouldShowCalledAt,
            calledAtTime
          })

          return (
            <div
              key={window.callNumber}
              className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow duration-200"
            >
              {/* Left Side - Call Info */}
              <div className="flex flex-col">
                <h3 className="text-base font-semibold text-gray-900">
                  Call {window.callNumber}
                </h3>
                <p className="text-sm text-gray-600">
                  {timeRange}
                </p>
              </div>

              {/* Right Side - Status Tag and called_at time (always on right) */}
              <div className="flex flex-col items-end gap-1">
                {hasStatus && statusConfig && (
                  <span
                    className={`relative px-2 py-1 text-xs font-medium rounded-full shadow-sm overflow-hidden transition-transform duration-200 hover:scale-105 ${statusConfig.bgColor} ${statusConfig.textColor}`}
                  >
                    <span className="relative z-10">{statusConfig.text}</span>

                    {/* Diamond sparkle effects for status 10 */}
                    {window.status === 10 && (
                      <>
                        <div className="absolute top-0.5 left-1 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{animationDelay: '0s'}} />
                        <div className="absolute top-1 right-1 w-0.5 h-0.5 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '0.3s'}} />
                        <div className="absolute bottom-0.5 left-1.5 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{animationDelay: '0.6s'}} />
                      </>
                    )}

                    {/* Subtle glow effect for medal statuses (Gold, Silver, Bronze) */}
                    {[11, 12, 13].includes(window.status || 0) && (
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse" style={{animationDelay: '1s', animationDuration: '3s'}} />
                    )}
                  </span>
                )}
                {/* Show called_at time on right side - below status tag if it exists, or just on right if no status */}
                {calledAtTime && (
                  <p className="text-xs text-blue-600">
                    Called at {calledAtTime}
                  </p>
                )}
              </div>
            </div>
          )
        })}
          </div>
        )}

        {/* Empty State for No Active Call Windows */}
        {activeCallWindows.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="mb-4">
              <Headphones className="w-12 h-12 text-gray-400 mx-auto" />
            </div>

            <div className="space-y-2">
              <p className="text-gray-500 font-medium flex items-center gap-2 justify-center">
                <Phone className="w-4 h-4" />
                No Active Call Windows
              </p>
              <p className="text-gray-400 text-sm">Scheduled call windows will appear here when they become active</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const CallWindows = memo(CallWindowsComponent)