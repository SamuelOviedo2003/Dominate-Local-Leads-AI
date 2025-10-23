'use client'

import { useEffect, useState } from 'react'
import { Clock, Info } from 'lucide-react'
import { getTimezoneDebugInfo, getTimezoneAbbreviation } from '@/lib/utils/timezoneDebug'

interface TimezoneIndicatorProps {
  timezone?: string
  showDetails?: boolean
  compact?: boolean
  className?: string
}

/**
 * Visual Timezone Indicator Component
 *
 * Displays the current timezone being used for rendering timestamps.
 * Useful for debugging and user awareness of timezone context.
 *
 * @param timezone - IANA timezone identifier (e.g., 'America/New_York')
 * @param showDetails - Show detailed timezone info on hover (default: true)
 * @param compact - Use compact layout (default: false)
 * @param className - Additional CSS classes
 */
export function TimezoneIndicator({
  timezone = 'UTC',
  showDetails = true,
  compact = false,
  className = ''
}: TimezoneIndicatorProps) {
  const [currentTime, setCurrentTime] = useState<string>('')
  const [showTooltip, setShowTooltip] = useState(false)
  const [debugInfo, setDebugInfo] = useState<ReturnType<typeof getTimezoneDebugInfo> | null>(null)

  // Update current time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
      setCurrentTime(formatter.format(now))
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [timezone])

  // Get debug info when timezone changes
  useEffect(() => {
    if (showDetails) {
      setDebugInfo(getTimezoneDebugInfo(timezone, 'TimezoneIndicator'))
    }
  }, [timezone, showDetails])

  const abbreviation = getTimezoneAbbreviation(timezone)

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium ${className}`}
        title={`Timezone: ${timezone}`}
      >
        <Clock className="w-3 h-3" />
        <span>{abbreviation}</span>
      </div>
    )
  }

  return (
    <div
      className={`relative inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Clock className="w-4 h-4" />
      <div className="flex items-center gap-1.5">
        <span className="font-medium">{abbreviation}</span>
        <span className="text-blue-600">{currentTime}</span>
      </div>
      {showDetails && (
        <Info className="w-3.5 h-3.5 text-blue-500 opacity-70" />
      )}

      {/* Tooltip with detailed timezone info */}
      {showTooltip && showDetails && debugInfo && (
        <div className="absolute top-full left-0 mt-2 z-50 w-80 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
              <Clock className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-gray-900 text-sm">Timezone Information</h4>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500 font-medium">Timezone:</span>
              </div>
              <div className="font-mono text-gray-900">
                {debugInfo.timezone}
              </div>

              <div>
                <span className="text-gray-500 font-medium">Abbreviation:</span>
              </div>
              <div className="font-semibold text-gray-900">
                {debugInfo.abbreviation}
              </div>

              <div>
                <span className="text-gray-500 font-medium">UTC Offset:</span>
              </div>
              <div className="font-mono text-gray-900">
                {debugInfo.offset}
              </div>

              <div>
                <span className="text-gray-500 font-medium">DST Active:</span>
              </div>
              <div className="font-semibold text-gray-900">
                {debugInfo.isDST ? 'Yes' : 'No'}
              </div>

              <div className="col-span-2 mt-2 pt-2 border-t border-gray-200">
                <div className="text-gray-500 font-medium mb-1">Current Time:</div>
                <div className="font-mono text-sm text-gray-900">
                  {debugInfo.currentTime}
                </div>
              </div>

              <div className="col-span-2 mt-2 pt-2 border-t border-gray-200">
                <div className="text-gray-500 font-medium mb-1">Example Format:</div>
                <div className="font-mono text-sm text-gray-900">
                  {debugInfo.formattedExample}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  (Oct 22, 2025 2:38 PM UTC)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Minimal timezone badge for use in headers or compact spaces
 */
export function TimezoneBadge({
  timezone = 'UTC',
  className = ''
}: {
  timezone?: string
  className?: string
}) {
  return <TimezoneIndicator timezone={timezone} compact className={className} />
}
