'use client'

import { CallWindow } from '@/types/leads'
import { useMemo, useCallback, memo } from 'react'
import { Clock, Phone, Headphones, PhoneCall } from 'lucide-react'
import { LoadingSystem } from '@/components/LoadingSystem'
import { MetallicTierCard } from '@/components/ui/MetallicTierCard'
import { formatCallWindowTime } from '@/lib/utils/dateFormat'
import { logger } from '@/lib/logging'

interface CallWindowsProps {
  callWindows?: CallWindow[] | null
  isLoading?: boolean
  error?: string | null
  businessTimezone?: string // IANA timezone identifier
}

const CallWindowsComponent = ({ callWindows, isLoading = false, error = null, businessTimezone = 'UTC' }: CallWindowsProps) => {
  // Debug logging
  logger.debug('CallWindows component received props', {
    businessTimezone,
    callWindowsCount: callWindows?.length || 0,
    callWindowsData: callWindows?.map(cw => ({ 
      callNumber: cw.callNumber, 
      calledAt: cw.calledAt 
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
          <h3 className="text-lg font-semibold text-gray-900">Call Windows</h3>
        </div>
        <div className="flex items-center justify-center flex-1">
          <LoadingSystem size="md" message="Loading call response data..." />
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
          <h3 className="text-lg font-semibold text-gray-900">Call Windows</h3>
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
  const formatTime = useCallback((dateString: string) => {
    logger.debug('Formatting call window time', { dateString, businessTimezone })
    const formatted = formatCallWindowTime(dateString, businessTimezone)
    logger.debug('Call window time formatted', { input: dateString, output: formatted, timezone: businessTimezone })
    return formatted
  }, [businessTimezone])


  // Sort call windows by call number - only show actual calls, no placeholders
  const sortedCallWindows = useMemo(() => {
    if (!callWindows) return []
    
    return [...callWindows].sort((a, b) => a.callNumber - b.callNumber)
  }, [callWindows])


  return (
    <div className="bg-white rounded-lg shadow-sm p-4 h-full flex flex-col w-full">
      {/* Header with Phone Icon */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <PhoneCall className="w-6 h-6 text-blue-600" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Call Windows</h3>
      </div>

      {/* Call Performance Cards - Single Column Layout */}
      <div className="flex-1 flex flex-col items-center justify-start">
        <div className="w-full max-w-md space-y-1 mb-3">
          {sortedCallWindows.map((window) => (
            <MetallicTierCard 
              key={window.callNumber}
              window={window}
              formatTime={formatTime}
            />
          ))}
        </div>
      </div>

      {/* Enhanced Empty State with Call Context */}
      {(!callWindows || callWindows.length === 0) && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 text-center flex-1 flex flex-col items-center justify-center border border-blue-100">
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
            <p className="text-gray-600 font-medium flex items-center gap-2 justify-center">
              <Phone className="w-4 h-4" />
              No Call Data Available
            </p>
            <p className="text-gray-500 text-sm">Call response times will appear here once you start making calls to leads</p>
            <div className="mt-4 flex items-center justify-center gap-3 text-xs text-gray-400 flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gradient-to-r from-slate-300 to-blue-300 rounded-full" />
                Diamond: &lt;1min
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                Gold: 1-2min
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                Silver: 2-5min
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-amber-600 rounded-full" />
                Bronze: 5-10min
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const CallWindows = memo(CallWindowsComponent)