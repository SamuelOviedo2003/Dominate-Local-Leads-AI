'use client'

import { CallWindow } from '@/types/leads'
import { useMemo, useCallback, memo } from 'react'
import { AlertTriangle, Clock, Phone } from 'lucide-react'
import { LoadingSystem } from '@/components/LoadingSystem'

interface CallWindowsProps {
  callWindows?: CallWindow[] | null
  isLoading?: boolean
  error?: string | null
}

const CallWindowsComponent = ({ callWindows, isLoading = false, error = null }: CallWindowsProps) => {
  // Handle loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Windows</h3>
        <div className="flex items-center justify-center flex-1">
          <LoadingSystem size="md" message="Loading call windows..." />
        </div>
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Windows</h3>
        <div className="text-center flex-1 flex items-center justify-center">
          <div>
            <div className="text-red-500 text-lg font-medium mb-2">Error Loading Call Windows</div>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }
  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }, [])

  const formatResponseTime = useCallback((minutes: number | null) => {
    if (!minutes) return 'N/A'
    if (minutes < 1) return '< 1 min'
    if (minutes < 60) return `${Math.round(minutes)} min`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.round(minutes % 60)
    return `${hours}h ${remainingMinutes}m`
  }, [])

  const getMedalIcon = useCallback((medalTier: 'gold' | 'silver' | 'bronze' | null) => {
    switch (medalTier) {
      case 'gold':
        return <span className="text-lg" title="Gold Medal - Response time < 1 minute">🥇</span>
      case 'silver':
        return <span className="text-lg" title="Silver Medal - Response time 1-2 minutes">🥈</span>
      case 'bronze':
        return <span className="text-lg" title="Bronze Medal - Response time 2-5 minutes">🥉</span>
      default:
        return null
    }
  }, [])

  // Sort and ensure exactly 6 calls are displayed (1-6)
  const sortedCallWindows = useMemo(() => {
    if (!callWindows) return []
    
    // Create array of 6 calls, filling missing ones with placeholders
    const calls = Array.from({ length: 6 }, (_, index) => {
      const callNumber = index + 1
      const existingCall = callWindows.find(cw => cw.callNumber === callNumber || cw.call_window === callNumber)
      
      if (existingCall) {
        return existingCall
      }
      
      // Return placeholder for missing calls
      return {
        call_window: callNumber,
        callNumber: callNumber,
        window_start_at: '',
        window_end_at: '',
        created_at: '',
        called_at: null,
        called_out: null,
        responseTimeMinutes: null,
        medalTier: null,
        isMissed: false,
        isPlaceholder: true
      } as CallWindow & { isPlaceholder: true }
    })
    
    return calls
  }, [callWindows])


  return (
    <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Windows</h3>
      
      <div className="overflow-y-auto space-y-4 pr-2" style={{ height: '480px', maxHeight: '480px' }}>
        {sortedCallWindows.map((window, index) => {
          const isPlaceholder = 'isPlaceholder' in window && window.isPlaceholder
          const isMissed = window.isMissed && !isPlaceholder
          
          return (
            <div 
              key={window.callNumber} 
              className={`
                rounded-lg p-6 border-2 transition-all duration-200 min-h-[200px]
                ${isMissed 
                  ? 'bg-red-50 border-red-200 shadow-md ring-1 ring-red-300' 
                  : isPlaceholder 
                    ? 'bg-gray-50 border-gray-200 opacity-60' 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }
              `}
            >
              {/* Call Number Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-base font-bold
                    ${isMissed 
                      ? 'bg-red-600 text-white' 
                      : isPlaceholder 
                        ? 'bg-gray-300 text-gray-500' 
                        : 'bg-purple-600 text-white'
                    }
                  `}>
                    {window.callNumber}
                  </div>
                  {isMissed && (
                    <div className="flex items-center space-x-1 text-red-600">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-base font-medium">MISSED CALL</span>
                    </div>
                  )}
                </div>
                
                {/* Medal and Response Time */}
                {!isPlaceholder && window.responseTimeMinutes !== null && (
                  <div className="flex items-center space-x-2">
                    {getMedalIcon(window.medalTier)}
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Response Time</div>
                      <div className="text-base font-medium text-gray-900">
                        {formatResponseTime(window.responseTimeMinutes)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {isPlaceholder ? (
                <div className="text-center py-6">
                  <Clock className="w-8 h-8 mx-auto text-gray-400 mb-3" />
                  <p className="text-base text-gray-500">Call window not scheduled</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Window Times */}
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Window Start
                      </div>
                      <div className="text-gray-900 font-medium text-base">
                        {formatTime(window.window_start_at)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Window End
                      </div>
                      <div className="text-gray-900 font-medium text-base">
                        {formatTime(window.window_end_at)}
                      </div>
                    </div>
                  </div>

                  {/* Call Status */}
                  <div>
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Call Status
                    </div>
                    <div className="text-gray-900 font-medium text-base">
                      {window.called_at ? (
                        <span className="inline-flex items-center">
                          <Phone className="w-5 h-5 text-green-500 mr-2" />
                          <div>
                            <div className="text-green-700 font-medium">Called</div>
                            <div className="text-sm text-gray-600">
                              {formatTime(window.called_at)}
                            </div>
                          </div>
                        </span>
                      ) : window.called_out ? (
                        <span className="inline-flex items-center">
                          <Phone className="w-5 h-5 text-orange-500 mr-2" />
                          <div>
                            <div className="text-orange-700 font-medium">Called Out</div>
                            <div className="text-sm text-gray-600">
                              {formatTime(window.called_out)}
                            </div>
                          </div>
                        </span>
                      ) : (
                        <span className="inline-flex items-center">
                          <Clock className="w-5 h-5 text-gray-400 mr-2" />
                          <span className={isMissed ? 'text-red-700 font-medium' : 'text-gray-600'}>
                            {isMissed ? 'Not called' : 'Pending'}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {(!callWindows || callWindows.length === 0) && (
        <div className="bg-gray-50 rounded-lg p-6 text-center mt-4">
          <div className="text-gray-400 mb-2">
            <Clock className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-gray-500 text-sm">No call windows scheduled for this lead</p>
          <p className="text-gray-400 text-xs mt-1">Call windows will appear here when they are created</p>
        </div>
      )}
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const CallWindows = memo(CallWindowsComponent)